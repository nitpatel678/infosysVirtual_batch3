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
- Score 5.0: Factually impeccable. Every factual assertion aligns with verified evidence, ground truth, and objective reality.
- Score 4.0: Mostly accurate. Core factual premises are correct with only minor nuances or harmless imprecisions.
- Score 3.0: Partially accurate. Contains a mixture of verified facts and unsupported or inaccurate statements.
- Score 2.0: Substantially inaccurate. Contains major factual errors or misrepresents verified facts.
- Score 1.0: Completely false. Assertions directly contradict scientific consensus, ground truth, or verified benchmark facts.

Task:
1. Extract 2 to 5 distinct factual claims from the AI Response.
2. For each claim, verify whether it is "Supported", "Contradicted", or "Unverified" based on the provided ground truth, source document, or benchmark evidence.
3. Identify which evidence chunks or sources support or contradict each claim.
4. Assign an overall accuracy score (1.0 - 5.0) and provide a comprehensive reasoning paragraph.

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "reasoning": "The response accurately asserts...",
  "verified_claims": [
    {{
      "claim": "Statement or factual assertion extracted from response",
      "verdict": "Supported",
      "evidence_source": "Chunk 1 (TruthfulQA) or Reference Answer",
      "explanation": "Brief rationale for this verdict"
    }}
  ],
  "evidence_citations": ["Chunk 1 (TruthfulQA)", "Reference Ground Truth"]
}}
"""
    result = generate_with_fallback(prompt)
    raw_score = float(result.get("score", 3.0))
    score = round(min(5.0, max(1.0, raw_score)), 1)
    reasoning = str(result.get("reasoning", "Accuracy evaluated against benchmark facts."))
    
    verified_claims = result.get("verified_claims", [])
    if not isinstance(verified_claims, list):
        verified_claims = []
    
    citations = result.get("evidence_citations", [])
    if not isinstance(citations, list):
        citations = []

    cleaned_claims = []
    for c in verified_claims:
        if isinstance(c, dict):
            cleaned_claims.append({
                "claim": str(c.get("claim", "")),
                "verdict": str(c.get("verdict", "Unverified")),
                "evidence_source": str(c.get("evidence_source", "None")),
                "explanation": str(c.get("explanation", ""))
            })

    return {
        "score": score,
        "reasoning": reasoning,
        "verified_claims": cleaned_claims,
        "evidence_citations": [str(x) for x in citations if x]
    }

