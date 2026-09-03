from agents.base import generate_with_fallback


def evaluate_accuracy(
    question,
    ai_response,
    reference_answer=None,
    source_document_text=None,
    retrieved_evidence=None,
):
    evidence_text = ""
    if retrieved_evidence:
        for idx, ev in enumerate(retrieved_evidence, 1):
            source = ev.get("source", "Knowledge Base")
            score = ev.get("score", 0.0)
            q = ev.get("question", "")
            ans = ev.get("answer", "")
            ctx = ev.get("text", "").strip()
            evidence_text += f"[Chunk {idx}] Source: {source} (Match: {score:.2f})\n"
            if q:
                evidence_text += f"  Benchmark Question: {q}\n"
            if ans:
                evidence_text += f"  Ground Truth Answer: {ans}\n"
            evidence_text += f"  Passage: {ctx}\n\n"

    source_doc_excerpt = ""
    if source_document_text:
        source_doc_excerpt = source_document_text[:3000].strip()

    prompt = f"""
You are the Accuracy Judge Agent in an AI Response Validation System.
Your job is to assess the factual correctness of the AI-generated response against verified reference sources and retrieved benchmark evidence.

User Query:
{question}

AI Response to Verify:
{ai_response}

Reference Ground Truth (if provided):
{reference_answer if reference_answer else "None provided"}

Source Document Excerpt (if uploaded):
{source_doc_excerpt if source_doc_excerpt else "None provided"}

Retrieved Benchmark Grounding Evidence (TruthfulQA & SQuAD):
{evidence_text if evidence_text else "None retrieved"}

Evaluation Criteria:
- Score 5.0: Factually impeccable. Every statement aligns with verified evidence, ground truth, and objective reality.
- Score 4.0: Mostly accurate. The core factual premise is sound with minor imprecisions or slight nuances missed.
- Score 3.0: Partially accurate. Contains a mix of true facts and unverified or questionable assertions.
- Score 2.0: Substantially inaccurate. Contains major factual errors or misrepresents key concepts.
- Score 1.0: Completely false. Assertions directly contradict scientific consensus, ground truth, or verified evidence.

Provide an explicit, detailed reasoning paragraph explaining why you assigned this score. Cross-reference specific factual claims made in the AI response against the provided evidence or ground truth.

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "reasoning": "The response accurately asserts that..."
}}
"""
    result = generate_with_fallback(prompt)
    score = float(result.get("score", 3.0))
    reasoning = str(result.get("reasoning", "Accuracy evaluated against benchmark facts."))
    return {"score": min(5.0, max(1.0, score)), "reasoning": reasoning}
