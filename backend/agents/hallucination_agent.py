from agents.base import generate_with_fallback


def evaluate_hallucination(
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
            evidence_text += f"[Evidence {idx}] {source} (Match: {score:.2f})\n"
            if q:
                evidence_text += f"  Topic Question: {q}\n"
            if ans:
                evidence_text += f"  Verified Answer: {ans}\n"
            evidence_text += f"  Context: {ctx}\n\n"

    source_doc_excerpt = ""
    if source_document_text:
        source_doc_excerpt = source_document_text[:3000].strip()

    prompt = f"""
You are the Hallucination Detection Agent in an AI Response Validation System.
Your job is to detect ungrounded claims, fabricated facts, myths presented as truth, or hallucinations in the AI-generated response by cross-referencing against reference ground truth and RAG benchmark evidence.

User Query:
{question}

AI Response to Audit:
{ai_response}

Reference Ground Truth:
{reference_answer if reference_answer else "None provided"}

Uploaded Source Document Excerpt:
{source_doc_excerpt if source_doc_excerpt else "None provided"}

Grounding Benchmark Chunks (TruthfulQA & SQuAD):
{evidence_text if evidence_text else "None retrieved"}

Evaluation Criteria (Faithfulness & Hallucination Resistance):
- Score 5.0: Zero hallucination. Every claim is strictly grounded in verifiable evidence, reality, or correctly debunks myths.
- Score 4.0: Low hallucination. Soundly grounded with minor ungrounded speculation or rhetorical phrasing that causes no factual distortion.
- Score 3.0: Moderate hallucination. Contains at least one ungrounded claim or treats an unverified myth/misconception as fact.
- Score 2.0: High hallucination. Contains clear fabrications, false attribution, or validates widely debunked misconceptions.
- Score 1.0: Severe hallucination. The response is predominantly fabricated, fictitious, or dangerously misleading.

Task:
1. Break down the AI response into key claims/statements (2 to 5 statements).
2. For each statement, determine its grounding status: "Grounded" (verified by evidence or objective truth), "Ungrounded" (fabricated, contradicted, or hallucinated), or "Uncertain" (unverifiable from context).
3. If ungrounded or contradicted, flag it explicitly with an explanation.
4. Count the number of ungrounded statements.
5. Assign a final hallucination resistance score (1.0 to 5.0) and write a clear reasoning paragraph.

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "reasoning": "The response demonstrates zero hallucination...",
  "hallucination_detected": false,
  "hallucination_count": 0,
  "flagged_claims": [
    {{
      "claim_text": "Claim from AI response",
      "grounding_status": "Grounded",
      "evidence_ref": "Evidence 1 (TruthfulQA) or Reference Ground Truth",
      "explanation": "Rationale for why it is grounded or ungrounded"
    }}
  ]
}}
"""
    result = generate_with_fallback(prompt)
    raw_score = float(result.get("score", 3.0))
    score = round(min(5.0, max(1.0, raw_score)), 1)
    reasoning = str(result.get("reasoning", "Hallucination evaluated against verified facts."))
    
    raw_claims = result.get("flagged_claims", [])
    if not isinstance(raw_claims, list):
        raw_claims = []

    cleaned_claims = []
    ungrounded_count = 0
    for c in raw_claims:
        if isinstance(c, dict):
            status = str(c.get("grounding_status", "Uncertain")).capitalize()
            if status not in ["Grounded", "Ungrounded", "Uncertain"]:
                status = "Uncertain"
            if status == "Ungrounded":
                ungrounded_count += 1
            cleaned_claims.append({
                "claim_text": str(c.get("claim_text", "")),
                "grounding_status": status,
                "evidence_ref": str(c.get("evidence_ref", "None")),
                "explanation": str(c.get("explanation", ""))
            })

    hal_detected = result.get("hallucination_detected")
    if hal_detected is None:
        hal_detected = ungrounded_count > 0 or score < 3.5

    return {
        "score": score,
        "reasoning": reasoning,
        "hallucination_detected": bool(hal_detected),
        "hallucination_count": int(result.get("hallucination_count", ungrounded_count)),
        "flagged_claims": cleaned_claims
    }

