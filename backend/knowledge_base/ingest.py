import os
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"

import json
from datasets import load_dataset

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def download_truthfulqa():
    print("Downloading TruthfulQA...")
    ds = load_dataset("truthfulqa/truthful_qa", "multiple_choice", split="validation")
    
    chunks = []
    for i, row in enumerate(ds):
        question = row["question"].strip()
        best_answer = row["mc1_targets"]["choices"][0] if row["mc1_targets"]["choices"] else ""

        chunk_text = f"Question: {question}\nAnswer: {best_answer}"
        chunks.append({
            "id": f"truthfulqa_{i}",
            "text": chunk_text,
            "question": question,
            "answer": best_answer,
            "source": "TruthfulQA",
            "category": row.get("category", "general"),
        })

    print(f"  Extracted {len(chunks)} chunks from TruthfulQA")
    return chunks


def download_squad(max_samples=1000):
    print(f"Downloading SQuAD (first {max_samples} samples)...")
    ds = load_dataset("squad", split="validation")
    if max_samples:
        ds = ds.select(range(min(max_samples, len(ds))))

    chunks = []
    seen_contexts = set()

    for i, row in enumerate(ds):
        context = row["context"].strip()
        question = row["question"].strip()
        answer = row["answers"]["text"][0].strip() if row["answers"]["text"] else ""

        ctx_key = context[:200]
        if ctx_key not in seen_contexts:
            seen_contexts.add(ctx_key)
            chunks.append({
                "id": f"squad_ctx_{len(seen_contexts)}",
                "text": context,
                "question": "",
                "answer": "",
                "source": "SQuAD",
                "category": "context",
            })

        chunk_text = f"Question: {question}\nAnswer: {answer}\nContext: {context[:500]}"
        chunks.append({
            "id": f"squad_qa_{i}",
            "text": chunk_text,
            "question": question,
            "answer": answer,
            "source": "SQuAD",
            "category": "qa_pair",
        })

    print(f"  Extracted {len(chunks)} chunks from SQuAD ({len(seen_contexts)} unique contexts)")
    return chunks


def chunk_long_text(text, max_length=500):
    if len(text) <= max_length:
        return [text]

    sentences = text.replace(". ", ".\n").split("\n")
    chunks = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= max_length:
            current = f"{current} {sentence}".strip()
        else:
            if current:
                chunks.append(current)
            current = sentence

    if current:
        chunks.append(current)

    return chunks if chunks else [text[:max_length]]


def preprocess_chunks(raw_chunks):
    processed = []

    for chunk in raw_chunks:
        text = chunk["text"].strip()
        if not text or len(text) < 10:
            continue

        sub_texts = chunk_long_text(text, max_length=500)

        for j, sub_text in enumerate(sub_texts):
            new_id = f"{chunk['id']}_p{j}" if len(sub_texts) > 1 else chunk["id"]
            processed.append({
                "id": new_id,
                "text": sub_text,
                "question": chunk["question"],
                "answer": chunk["answer"],
                "source": chunk["source"],
                "category": chunk["category"],
            })

    print(f"  Preprocessed into {len(processed)} chunks")
    return processed


def ingest():
    os.makedirs(DATA_DIR, exist_ok=True)

    truthfulqa_chunks = download_truthfulqa()
    squad_chunks = download_squad()

    all_chunks = truthfulqa_chunks + squad_chunks
    print(f"\nTotal raw chunks: {len(all_chunks)}")

    processed = preprocess_chunks(all_chunks)

    output_path = os.path.join(DATA_DIR, "chunks.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(processed, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(processed)} chunks to {output_path}")
    return processed


if __name__ == "__main__":
    ingest()
