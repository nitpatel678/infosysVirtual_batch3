import os
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"

import json
import re
from typing import List, Dict, Any

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_NAME = "all-MiniLM-L6-v2"

_model = None
_index = None
_metadata = None


def _load_faiss():
    """Lazy load FAISS index and local embedding model."""
    global _model, _index, _metadata

    if _index is None:
        index_path = os.path.join(DATA_DIR, "faiss.index")
        if not os.path.exists(index_path):
            return False
        try:
            import faiss
            _index = faiss.read_index(index_path)
        except Exception as e:
            print(f"Note: FAISS index load error: {e}")
            return False

    if _metadata is None:
        meta_path = os.path.join(DATA_DIR, "metadata.json")
        if not os.path.exists(meta_path):
            return False
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                _metadata = json.load(f)
        except Exception as e:
            print(f"Note: metadata.json load error: {e}")
            return False

    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(MODEL_NAME)
        except Exception as e:
            print(f"Note: SentenceTransformer load error (fallback to DB retrieval): {e}")
            return False

    return True


def _retrieve_faiss(query: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """Retrieve evidence using local FAISS index."""
    import numpy as np
    import faiss

    query_embedding = _model.encode([query])
    query_embedding = np.array(query_embedding, dtype="float32")
    faiss.normalize_L2(query_embedding)

    scores, indices = _index.search(query_embedding, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(_metadata):
            continue
        entry = _metadata[idx].copy()
        entry["score"] = float(score)
        results.append(entry)

    return results


def _retrieve_db(query: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """Retrieve evidence using PostgreSQL GIN full-text index on NeonDB (Zero RAM)."""
    try:
        from database import get_connection
        from psycopg2.extras import RealDictCursor

        conn = get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cleaned_words = [w for w in re.sub(r"[^\w\s]", " ", query).split() if len(w) > 1]
            if not cleaned_words:
                cur.execute(
                    "SELECT chunk_id, text, question, answer, source, category FROM knowledge_chunks LIMIT %s;",
                    (top_k,),
                )
                rows = cur.fetchall()
            else:
                clean_query = " ".join(cleaned_words)
                # 1. Try websearch_to_tsquery
                cur.execute("""
                    SELECT 
                        chunk_id, text, question, answer, source, category,
                        ts_rank_cd(search_vector, websearch_to_tsquery('english', %s)) AS rank
                    FROM knowledge_chunks
                    WHERE search_vector @@ websearch_to_tsquery('english', %s)
                    ORDER BY rank DESC
                    LIMIT %s;
                """, (clean_query, clean_query, top_k))
                rows = cur.fetchall()

                # 2. If no rows, try plainto_tsquery (OR matching)
                if not rows:
                    cur.execute("""
                        SELECT 
                            chunk_id, text, question, answer, source, category,
                            ts_rank_cd(search_vector, plainto_tsquery('english', %s)) AS rank
                        FROM knowledge_chunks
                        WHERE search_vector @@ plainto_tsquery('english', %s)
                        ORDER BY rank DESC
                        LIMIT %s;
                    """, (clean_query, clean_query, top_k))
                    rows = cur.fetchall()

                # 3. Fallback to keyword ILIKE
                if not rows and cleaned_words:
                    kw = cleaned_words[0]
                    cur.execute("""
                        SELECT 
                            chunk_id, text, question, answer, source, category,
                            0.45 AS rank
                        FROM knowledge_chunks
                        WHERE text ILIKE %s OR question ILIKE %s
                        LIMIT %s;
                    """, (f"%{kw}%", f"%{kw}%", top_k))
                    rows = cur.fetchall()

            conn.close()

            results = []
            max_rank = max([float(r.get("rank") or 1.0) for r in rows], default=1.0) or 1.0
            for r in rows:
                raw_rank = float(r.get("rank") or 0.5)
                norm_score = min(0.99, max(0.40, raw_rank / max_rank))
                results.append({
                    "id": r["chunk_id"],
                    "text": r["text"],
                    "question": r.get("question"),
                    "answer": r.get("answer"),
                    "source": r.get("source"),
                    "category": r.get("category"),
                    "score": round(norm_score, 4),
                })
            return results

    except Exception as e:
        print(f"Warning: Database retrieval error: {e}")
        return []


def retrieve(query: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """
    Hybrid Smart Retrieval:
    - Automatically uses PostgreSQL NeonDB full-text retrieval on Render (0 RAM, instant response).
    - Uses local FAISS embeddings when available locally, with automatic graceful fallback.
    """
    # Check if cloud mode or forced DB mode is enabled
    use_db_mode = os.getenv("USE_DB_RETRIEVAL", "").lower() in ("1", "true") or os.getenv("RENDER") is not None

    if use_db_mode:
        db_results = _retrieve_db(query, top_k=top_k)
        if db_results:
            return db_results

    # Try FAISS if available
    faiss_ok = _load_faiss()
    if faiss_ok:
        try:
            return _retrieve_faiss(query, top_k=top_k)
        except Exception as fe:
            print(f"FAISS search failed ({fe}), falling back to database retrieval.")

    # Graceful fallback to DB retrieval
    return _retrieve_db(query, top_k=top_k)


def _load():
    """Startup warm-up hook."""
    if os.getenv("USE_DB_RETRIEVAL", "").lower() in ("1", "true") or os.getenv("RENDER") is not None:
        print("[Retrieval] Initialized in Cloud / NeonDB Database Search Mode (Zero RAM).")
        return
    try:
        _load_faiss()
        print("[Retrieval] Initialized in Local FAISS Vector Search Mode.")
    except Exception as e:
        print(f"[Retrieval] Note: FAISS preload skipped: {e}")
