"""
Build the complete knowledge base: ingest datasets, generate embeddings, build FAISS index.
Run this script once to set up the knowledge base.

Usage: python build_knowledge_base.py
"""
from knowledge_base.ingest import ingest
from knowledge_base.embeddings import build


def main():
    print("=" * 50)
    print("Building Knowledge Base")
    print("=" * 50)

    print("\nStep 1: Ingesting datasets...")
    ingest()

    print("\nStep 2: Generating embeddings and building index...")
    build()

    print("\n" + "=" * 50)
    print("Knowledge base ready!")
    print("=" * 50)


if __name__ == "__main__":
    main()
