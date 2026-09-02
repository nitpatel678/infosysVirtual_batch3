"""
Embedding generation and FAISS index building.
Loads preprocessed chunks, generates embeddings using Sentence Transformers,
and builds a FAISS index for semantic search.
"""
import json
import os
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_NAME = "all-MiniLM-L6-v2"


def load_chunks():
    """Load preprocessed chunks from JSON."""
    chunks_path = os.path.join(DATA_DIR, "chunks.json")
    with open(chunks_path, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_embeddings(chunks):
    """Generate embeddings for all chunk texts."""
    print(f"Loading embedding model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    texts = [chunk["text"] for chunk in chunks]
    print(f"Generating embeddings for {len(texts)} chunks...")
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=64)

    return np.array(embeddings, dtype="float32")


def build_faiss_index(embeddings):
    """Build a FAISS index from embeddings."""
    dimension = embeddings.shape[1]
    print(f"Building FAISS index (dimension={dimension}, vectors={embeddings.shape[0]})")

    index = faiss.IndexFlatIP(dimension)
    faiss.normalize_L2(embeddings)
    index.add(embeddings)

    return index


def save_index(index, chunks):
    """Save the FAISS index and chunk metadata."""
    os.makedirs(DATA_DIR, exist_ok=True)

    index_path = os.path.join(DATA_DIR, "faiss.index")
    faiss.write_index(index, index_path)
    print(f"Saved FAISS index to {index_path}")

    meta_path = os.path.join(DATA_DIR, "metadata.json")
    metadata = []
    for chunk in chunks:
        metadata.append({
            "id": chunk["id"],
            "text": chunk["text"],
            "question": chunk["question"],
            "answer": chunk["answer"],
            "source": chunk["source"],
            "category": chunk["category"],
        })
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Saved metadata ({len(metadata)} entries) to {meta_path}")


def build():
    """Main pipeline: load chunks → embed → index → save."""
    chunks = load_chunks()
    print(f"Loaded {len(chunks)} chunks")

    embeddings = generate_embeddings(chunks)
    index = build_faiss_index(embeddings)
    save_index(index, chunks)

    print("Knowledge base built successfully!")
    return index, chunks


if __name__ == "__main__":
    build()
