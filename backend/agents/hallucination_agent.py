from agents.base import generate_with_fallback


def evaluate_hallucination(
    question,
    ai_response,
    reference_answer=None,
    source_document_text=None,
    retrieved_evidence=None,
    engine="openai",
):
    has_reference = bool(reference_answer and reference_answer.strip())
    has_doc = bool(source_document_text and source_document_text.strip())

    valid_chunks = []
    if retrieved_evidence:
        for ev in retrieved_evidence:
            text = ev.get("text", "").strip()
            if text and ("score" not in ev or ev.get("score") is None or ev.get("score", 0.0) >= 0.35):
                valid_chunks.append(ev)

    has_kb_evidence = len(valid_chunks) > 0

    if not has_reference and not has_doc and not has_kb_evidence:
        context_guidance = """CRITICAL INSTRUCTION - GENERAL KNOWLEDGE & FACTUAL CONSENSUS:
1. No external reference answer or custom source document was uploaded by the user, and no direct benchmark matches were found.
2. Evaluate the statements in the AI Response against verified scientific, historical, and real-world consensus.
3. Check whether the response introduces fictitious entities, made-up statistics, ungrounded speculation, or validates debunked myths.
4. If a statement is accurate according to established facts, mark it as "Supported". If it is fabricated or false, mark it as "Fabricated" or "Contradictory" and flag it.
5. Score hallucination objectively: 5.0 for zero hallucination, 4.0 for minor speculation, 3.0 for 1 clear myth/unsupported claim, 2.0 or 1.0 for multiple fabrications."""
    else:
        context_guidance = """CRITICAL INSTRUCTION - STRICT CLOSED-WORLD GROUNDING:
1. Cross-reference individual claims ONLY against the provided Reference Ground Truth, Source Document, and Grounding Benchmark Chunks.
2. DO NOT use external pre-training memory to assume claims are true.
3. Break the AI response down into individual factual statements/claims.
4. Flag specific statements instead of only marking the entire response as hallucinated.
5. Clearly identify whether each statement is:
   - "Supported": Directly verified and corroborated by the reference or benchmark chunks.
   - "Unsupported": Claim lacks grounding evidence in the provided context.
   - "Fabricated": Introduces fictitious entities, made-up statistics, or validates debunked myths.
   - "Contradictory": Directly conflicts with known facts in the reference or benchmark chunks.
6. Provide an explicit explanation for WHY each flagged statement is considered unsupported, fabricated, or contradictory.
7. SOURCE DOCUMENT VERIFICATION:
   - When Source Document Excerpts with page references (e.g. [Page X]) are provided, rigorously cross-examine claims against them.
   - Assertions directly supported by the source document are NOT hallucinations.
   - Claims that state fabricated details or figures contradicting the source document must be flagged with the specific page discrepancy."""

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
        source_doc_excerpt = source_document_text[:4500].strip()

    prompt = f"""
You are the Hallucination Detection Agent in an AI Response Validation System.
Your job is to identify claims in an AI-generated response that are unsupported, fabricated, or contradicted.

{context_guidance}

User Query:
{question}

AI Response to Audit:
{ai_response}

Reference Ground Truth:
{reference_answer if has_reference else "None provided (use domain consensus)"}

Uploaded Source Document Excerpt:
{source_doc_excerpt if has_doc else "None provided"}

Grounding Benchmark Chunks (TruthfulQA & SQuAD):
{evidence_text if evidence_text else "None retrieved (use domain consensus)"}

Evaluation Criteria:
- Score 5.0 (Zero Hallucination): Every statement is strictly supported by provided ground truth or benchmark evidence (0 flagged).
- Score 4.0 (Low Hallucination): Soundly grounded with minor ungrounded phrasing or rhetorical speculation that causes no factual distortion.
- Score 3.0 (Moderate Hallucination): Contains 1 clear unsupported statement or treats an unverified myth/misconception as fact.
- Score 2.0 (High Hallucination): Contains multiple unsupported, fabricated, or contradictory statements.
- Score 1.0 (Severe Hallucination): The response is predominantly fabricated, fictitious, or dangerously misleading.

Categories:
- "Zero Hallucination (Clean)"
- "Low Hallucination"
- "Moderate Hallucination"
- "High Hallucination"
- "Severe Hallucination"

Task:
1. Extract 2 to 5 distinct factual statements from the AI response.
2. For each statement, determine its classification: "Supported", "Unsupported", "Fabricated", or "Contradictory".
3. Mark "is_flagged": true if it is "Unsupported", "Fabricated", or "Contradictory".
4. Cite supporting or contradicting evidence chunk, or state "None".
5. Provide a clear explanation detailing why each statement is supported or flagged.
6. Return a comprehensive structured JSON.

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "hallucination_level": "Zero Hallucination (Clean)",
  "reasoning": "The response demonstrates zero hallucination...",
  "hallucination_detected": false,
  "hallucination_count": 0,
  "flagged_claims": [
    {{
      "statement": "Extracted sentence or claim from AI response",
      "claim_text": "Same extracted sentence",
      "classification": "Supported",
      "grounding_status": "Supported",
      "is_flagged": false,
      "evidence_ref": "Reference Ground Truth or [Evidence 1]",
      "explanation": "Detailed rationale explaining why it is supported, unsupported, fabricated, or contradictory"
    }}
  ]
}}
"""
    result = generate_with_fallback(prompt, preferred_model="gemini-flash-lite-latest", engine=engine)
    raw_score = float(result.get("score", 3.0))
    score = round(min(5.0, max(1.0, raw_score)), 1)
    reasoning = str(result.get("reasoning", "Hallucination evaluated against verified facts."))
    
    raw_claims = result.get("flagged_claims", [])
    if not isinstance(raw_claims, list):
        raw_claims = []

    cleaned_claims = []
    flagged_statements = []
    supported_statements = []

    for c in raw_claims:
        if isinstance(c, dict):
            stmt = str(c.get("statement") or c.get("claim_text") or "").strip()
            if not stmt:
                continue

            raw_cls = str(c.get("classification") or c.get("grounding_status") or "Unsupported").strip()
            cls_lower = raw_cls.lower()
            if "fabricat" in cls_lower:
                classification = "Fabricated"
                is_flagged = True
            elif "contradict" in cls_lower:
                classification = "Contradictory"
                is_flagged = True
            elif "unsupport" in cls_lower or "unground" in cls_lower or "uncertain" in cls_lower:
                classification = "Unsupported"
                is_flagged = True
            elif "support" in cls_lower or "ground" in cls_lower or "correct" in cls_lower:
                classification = "Supported"
                is_flagged = False
            else:
                classification = "Unsupported"
                is_flagged = True

            ev_ref = str(c.get("evidence_ref") or c.get("evidence_source") or "None").strip()
            expl = str(c.get("explanation") or "").strip()

            claim_obj = {
                "statement": stmt,
                "claim_text": stmt,
                "classification": classification,
                "grounding_status": classification,
                "is_flagged": is_flagged,
                "evidence_ref": ev_ref,
                "explanation": expl,
            }
            cleaned_claims.append(claim_obj)

            if is_flagged:
                flagged_statements.append(claim_obj)
            else:
                supported_statements.append(claim_obj)

    hal_count = len(flagged_statements)
    hal_detected = hal_count > 0 or score < 3.8

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
        if score >= 4.5 and hal_count == 0:
            matched_level = "Zero Hallucination (Clean)"
        elif score >= 4.0:
            matched_level = "Low Hallucination"
        elif score >= 3.0:
            matched_level = "Moderate Hallucination"
        elif score >= 2.0:
            matched_level = "High Hallucination"
        else:
            matched_level = "Severe Hallucination"

    is_insufficient = (
        "insufficient" in raw_level.lower()
        or "undetermined" in raw_level.lower()
        or bool(result.get("is_insufficient_evidence", False))
    )

    return {
        "score": score,
        "hallucination_level": matched_level,
        "reasoning": reasoning,
        "hallucination_detected": bool(hal_detected),
        "hallucination_count": hal_count,
        "flagged_claims": cleaned_claims,
        "flagged_statements": flagged_statements,
        "supported_statements": supported_statements,
        "is_insufficient_evidence": is_insufficient,
        "has_grounding_evidence": bool(has_reference or has_doc or has_kb_evidence)
    }



