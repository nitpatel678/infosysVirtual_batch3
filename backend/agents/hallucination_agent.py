from agents.base import generate_with_fallback


def evaluate_hallucination(
    question,
    ai_response,
    reference_answer=None,
    source_document_text=None,
    retrieved_evidence=None,
):
    has_reference = bool(reference_answer and reference_answer.strip())
    has_doc = bool(source_document_text and source_document_text.strip())

    # Filter for meaningful retrieved chunks
    valid_chunks = []
    if retrieved_evidence:
        for ev in retrieved_evidence:
            text = ev.get("text", "").strip()
            # Chunks must meet semantic threshold (>= 0.35) or have no score attached (e.g. direct test injection)
            if text and ("score" not in ev or ev.get("score") is None or ev.get("score", 0.0) >= 0.35):
                valid_chunks.append(ev)






    has_kb_evidence = len(valid_chunks) > 0

    # EDGE CASE A: Completely ungrounded context (no reference answer, no doc, no matching KB chunks)
    # Per Project Coordinator directive: Do NOT guess hallucination without grounding context.
    if not has_reference and not has_doc and not has_kb_evidence:
        claims_prompt = f"""
Extract 2 to 3 distinct factual statements from this AI Response:
"{ai_response}"

Return JSON:
{{
  "claims": ["statement 1", "statement 2"]
}}
"""
        extracted = generate_with_fallback(claims_prompt)
        raw_claims = extracted.get("claims", [])
        if not isinstance(raw_claims, list):
            raw_claims = [ai_response[:120]]

        cleaned_claims = [
            {
                "claim_text": str(c),
                "grounding_status": "Uncertain",
                "evidence_ref": "None",
                "explanation": "Cannot verify grounding because no reference answer was provided and no benchmark knowledge base chunks match this query."
            }
            for c in raw_claims if c
        ]

        return {
            "score": 3.0,
            "hallucination_level": "Undetermined / Insufficient Context",
            "reasoning": "Cannot determine hallucination status due to absence of reference ground truth and benchmark knowledge base evidence. Claims marked as Uncertain.",
            "hallucination_detected": False,
            "hallucination_count": 0,
            "flagged_claims": cleaned_claims,
            "is_insufficient_evidence": True
        }

    evidence_text = ""
    for idx, ev in enumerate(valid_chunks, 1):
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

CRITICAL INSTRUCTION - STRICT CLOSED-WORLD GROUNDING:
1. Cross-reference individual claims ONLY against the provided Reference Ground Truth, Source Document, and Grounding Benchmark Chunks.
2. DO NOT use external pre-training memory to assume claims are true.
3. If an assertion is contradicted or unsupported by the provided context, mark it as "Ungrounded" or "Uncertain".
4. Flag specific statements and explain clearly why each is considered unsupported or fabricated.

User Query:
{question}

AI Response to Audit:
{ai_response}

Reference Ground Truth:
{reference_answer if has_reference else "None provided"}

Uploaded Source Document Excerpt:
{source_doc_excerpt if has_doc else "None provided"}

Grounding Benchmark Chunks (TruthfulQA & SQuAD):
{evidence_text if evidence_text else "None retrieved"}

Evaluation Criteria (Faithfulness & Hallucination Resistance):
- Score 5.0 (Zero Hallucination): Every claim is strictly grounded in the provided reference ground truth or benchmark evidence.
- Score 4.0 (Low Hallucination): Soundly grounded with minor ungrounded speculation or rhetorical phrasing that causes no factual distortion.
- Score 3.0 (Moderate Hallucination): Contains at least one ungrounded claim or treats an unverified myth/misconception as fact.
- Score 2.0 (High Hallucination): Contains clear fabrications, false attributions, or validates widely debunked misconceptions.
- Score 1.0 (Severe Hallucination): The response is predominantly fabricated, fictitious, or dangerously misleading.

Task:
1. Break down the AI response into key claims/statements (2 to 5 statements).
2. For each statement, determine its grounding status: "Grounded", "Ungrounded", or "Uncertain".
3. If ungrounded, cite which evidence chunk contradicts it or explain that no evidence supports it.
4. Count the number of ungrounded statements.
5. Assign a final hallucination score (1.0 to 5.0), assign hallucination_level, and write a clear reasoning paragraph.

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "hallucination_level": "Zero Hallucination (Clean)",
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

    # Determine qualitative severity level
    raw_level = str(result.get("hallucination_level", "")).strip()
    valid_levels = [
        "Zero Hallucination (Clean)",
        "Low Hallucination",
        "Moderate Hallucination",
        "High Hallucination",
        "Severe Hallucination"
    ]
    matched_level = None
    for vl in valid_levels:
        if vl.lower() in raw_level.lower():
            matched_level = vl
            break
    if not matched_level:
        if score >= 4.5 and ungrounded_count == 0:
            matched_level = "Zero Hallucination (Clean)"
        elif score >= 4.0:
            matched_level = "Low Hallucination"
        elif score >= 3.0:
            matched_level = "Moderate Hallucination"
        elif score >= 2.0:
            matched_level = "High Hallucination"
        else:
            matched_level = "Severe Hallucination"

    return {
        "score": score,
        "hallucination_level": matched_level,
        "reasoning": reasoning,
        "hallucination_detected": bool(hal_detected),
        "hallucination_count": int(result.get("hallucination_count", ungrounded_count)),
        "flagged_claims": cleaned_claims,
        "is_insufficient_evidence": False
    }

