from knowledge_base.retrieval import retrieve

test_queries = [
    "What happens if you smash a mirror?",
    "Where was Nikola Tesla born?",
    "What causes the Northern Lights?",
    "What is the capital of France?"
]

print("=" * 65)
print("SEMANTIC RETRIEVAL QUALITY VALIDATION")
print("=" * 65)

for query in test_queries:
    print(f"\nQuery: {query}")
    print("-" * 50)
    results = retrieve(query, top_k=2)
    for i, r in enumerate(results, 1):
        source = r.get("source", "Unknown")
        score = r.get("score", 0.0)
        text_preview = r.get("text", "").replace("\n", " ")[:150]
        safe_preview = text_preview.encode("ascii", errors="replace").decode("ascii")
        print(f"  [{i}] Source: {source} | Similarity Score: {score:.4f}")
        print(f"      Content: {safe_preview}...")

print("\n" + "=" * 65)
print("Retrieval validation completed successfully!")
print("=" * 65)
