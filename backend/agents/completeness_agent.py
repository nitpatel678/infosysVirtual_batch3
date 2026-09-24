from agents.base import generate_with_fallback


def evaluate_completeness(
    question,
    ai_response,
    reference_answer=None,
    source_document_text=None,
    retrieved_evidence=None,
):
    has_reference = bool(reference_answer and reference_answer.strip())
    has_doc = bool(source_document_text and source_document_text.strip())

    valid_chunks = []
    if retrieved_evidence:
        for ev in retrieved_evidence:
            text = ev.get("text", "").strip()
            score = ev.get("score", 0.0)
            if text and ("score" not in ev or score is None or score >= 0.30):
                valid_chunks.append(ev)

    has_kb_evidence = len(valid_chunks) > 0

    if not has_reference and not has_doc and not has_kb_evidence:
        prompt_reqs = f"""
Identify the core requirements or sub-questions in this User Query:
"{question}"

Return JSON:
{{
  "requirements": ["requirement 1", "requirement 2"]
}}
"""
        try:
            reqs_data = generate_with_fallback(prompt_reqs, preferred_model="gemini-3.5-flash-lite")
            reqs = reqs_data.get("requirements", [question])
        except Exception:
            reqs = [question]

        return {
            "score": 3.0,
            "completeness_category": "Unverified / Insufficient Evidence",
            "identified_requirements": reqs if isinstance(reqs, list) else [question],
            "addressed_aspects": ["General response provided without verified reference ground truth"],
            "missing_aspects": ["Cannot verify missing domain nuances because no reference ground truth or benchmark evidence is available"],
            "source_conflict_detected": False,
            "is_insufficient_evidence": True,
            "reasoning": "Completeness could not be definitively verified against ground truth because neither a reference answer nor matching benchmark chunks were available in the knowledge base.",
        }

    evidence_text = ""
    for idx, ev in enumerate(valid_chunks[:5], 1):
        source = ev.get("source", "Knowledge Base")
        score = ev.get("score", 0.0)
        q = ev.get("question", "")
        ans = ev.get("answer", "")
        ctx = ev.get("text", "").strip()
        evidence_text += f"[Chunk {idx}] Source: {source} (Match: {score:.2f})\n"
        if q:
            evidence_text += f"  Benchmark Query: {q}\n"
        if ans:
            evidence_text += f"  Ground Truth: {ans}\n"
        evidence_text += f"  Context: {ctx[:400]}\n\n"

    source_doc_excerpt = source_document_text[:2000].strip() if has_doc else ""

    prompt = f"""
You are the Completeness Judge Agent in an AI Response Validation System.
Your job is to evaluate whether the AI-generated response sufficiently and thoroughly addresses all relevant aspects, sub-questions, and required details of the submitted query.

GROUNDING RULES:
1. Deconstruct the User Query into its discrete sub-questions, requirements, or expected components.
2. If a Reference Ground Truth is available, use it to identify all expected information that should be covered by the AI response.
3. If no Reference Ground Truth is available, use the Retrieved Benchmark Evidence and Source Document Excerpt to determine the necessary components of a complete response.
4. Check for Source Conflict: If the Reference Answer and the Retrieved Benchmark Evidence prescribe contradictory requirements or facts, set "source_conflict_detected": true and detail the discrepancy.
5. Identify specific omissions, unanswered sub-questions, missing explanations, or insufficiently covered aspects.

User Query:
{question}

AI Response to Assess:
{ai_response}

Reference Ground Truth (if provided):
{reference_answer if has_reference else "None provided"}

Source Document Excerpt (if uploaded):
{source_doc_excerpt if has_doc else "None provided"}

Retrieved Benchmark Evidence (TruthfulQA / SQuAD):
{evidence_text if evidence_text else "None retrieved"}

Scoring Rubric (1.0 to 5.0):
- 5.0 (Fully Complete): Comprehensively answers all explicit requirements and implicit sub-questions with thorough depth, helpful context, and complete clarity.
- 4.0 (Mostly Complete): Directly answers the primary question and core requirements; only minor optional context, secondary nuances, or peripheral details are omitted.
- 3.0 (Partially Complete): Answers the main prompt on a high level, but omits important sub-questions, specific mechanisms, examples, or actionable depth.
- 2.0 (Substantially Incomplete): Answers only a minor fragment or single sub-point, leaving the majority of necessary information unaddressed.
- 1.0 (Severely Deficient): Fails to answer the question, provides an evasive or trivial fragment, or completely omits required substance.

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "completeness_category": "Mostly Complete",
  "identified_requirements": [
    "Identify requirement or sub-question 1",
    "Identify requirement or sub-question 2"
  ],
  "addressed_aspects": [
    "Specific aspect fully or satisfactorily covered in the response"
  ],
  "missing_aspects": [
    "Specific omission, unanswered sub-question, or missing detail"
  ],
  "source_conflict_detected": false,
  "conflict_details": "",
  "reasoning": "Detailed justification explaining why information is considered complete, partially complete, or missing, citing specific requirements."
}}
"""
    result = generate_with_fallback(prompt, preferred_model="gemini-3.5-flash-lite")
    score = float(result.get("score", 3.0))
    score = min(5.0, max(1.0, score))

    category = str(result.get("completeness_category", ""))
    if not category:
        if score >= 4.5:
            category = "Fully Complete"
        elif score >= 3.5:
            category = "Mostly Complete"
        elif score >= 2.5:
            category = "Partially Complete"
        elif score >= 1.5:
            category = "Substantially Incomplete"
        else:
            category = "Severely Deficient"

    reqs = result.get("identified_requirements", [])
    if not isinstance(reqs, list) or not reqs:
        reqs = [question]

    addressed = result.get("addressed_aspects", [])
    if not isinstance(addressed, list):
        addressed = [str(addressed)] if addressed else []

    missing = result.get("missing_aspects", [])
    if not isinstance(missing, list):
        missing = [str(missing)] if missing else []

    conflict = bool(result.get("source_conflict_detected", False))
    reasoning = str(result.get("reasoning", "Completeness assessed against query requirements and reference ground truth."))

    return {
        "score": round(score, 2),
        "completeness_category": category,
        "identified_requirements": reqs,
        "addressed_aspects": addressed,
        "missing_aspects": missing,
        "source_conflict_detected": conflict,
        "conflict_details": str(result.get("conflict_details", "")),
        "is_insufficient_evidence": False,
        "reasoning": reasoning,
    }
