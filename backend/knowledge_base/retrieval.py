"""
Semantic retrieval from the FAISS knowledge base.
Loads the pre-built index and metadata, then retrieves
relevant chunks for a given query.
"""
import json
import os
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_NAME = "all-MiniLM-L6-v2"

_model = None
_index = None
_metadata = None


def _load():
    """Lazy-load the model, index, and metadata."""
    global _model, _index, _metadata

    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)

    if _index is None:
        index_path = os.path.join(DATA_DIR, "faiss.index")
        if not os.path.exists(index_path):
            raise FileNotFoundError("FAISS index not found. Run build_knowledge_base.py first.")
        _index = faiss.read_index(index_path)

    if _metadata is None:
        meta_path = os.path.join(DATA_DIR, "metadata.json")
        with open(meta_path, "r", encoding="utf-8") as f:
            _metadata = json.load(f)


def retrieve(query, top_k=5):
    """Retrieve the top-k most relevant chunks for a query."""
    _load()

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
