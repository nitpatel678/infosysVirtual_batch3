from agents.base import generate_with_fallback


def evaluate_accuracy(
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
            score = ev.get("score", 0.0)
            text = ev.get("text", "").strip()
            if text and ("score" not in ev or ev.get("score") is None or ev.get("score", 0.0) >= 0.35):
                valid_chunks.append(ev)

    has_kb_evidence = len(valid_chunks) > 0

    if not has_reference and not has_doc and not has_kb_evidence:
        claims_prompt = f"""
Extract 2 to 3 distinct factual claims made in this AI Response:
"{ai_response}"

Return JSON:
{{
  "claims": ["claim 1", "claim 2"]
}}
"""
        extracted = generate_with_fallback(claims_prompt)
        raw_claims = extracted.get("claims", [])
        if not isinstance(raw_claims, list):
            raw_claims = [ai_response[:120]]

        cleaned_claims = [
            {
                "claim": str(c),
                "verdict": "Unverified",
                "evidence_source": "None",
                "explanation": "No reference answer was provided and no matching benchmark evidence was found in the knowledge base."
            }
            for c in raw_claims if c
        ]

        return {
            "score": 3.0,
            "accuracy_category": "Insufficient Evidence / Unverified",
            "reasoning": "Cannot determine factual accuracy because no reference answer was provided, no source document was uploaded, and the benchmark knowledge base (TruthfulQA/SQuAD) contains no matching grounding context for this query.",
            "verified_claims": cleaned_claims,
            "evidence_citations": [],
            "contradiction_detected": False,
            "is_insufficient_evidence": True
        }

    evidence_text = ""
    for idx, ev in enumerate(valid_chunks, 1):
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

CRITICAL INSTRUCTION - STRICT CLOSED-WORLD GROUNDING:
1. DO NOT use external world knowledge or pre-training memory to verify facts.
2. Evaluate factual assertions SOLELY based on the provided Reference Ground Truth, Source Document Excerpt, or Retrieved Benchmark Grounding Chunks.
3. If an assertion is not verifiable from the provided context, mark its verdict as "Unverified" rather than assuming it is true.
4. Check if the Reference Ground Truth directly CONTRADICTS the Retrieved Benchmark Evidence. If so, set "contradiction_detected": true and detail the conflict.

User Query:
{question}

AI Response to Verify:
{ai_response}

Reference Ground Truth (if provided):
{reference_answer if has_reference else "None provided"}

Source Document Excerpt (if uploaded):
{source_doc_excerpt if has_doc else "None provided"}

Retrieved Benchmark Grounding Evidence (TruthfulQA & SQuAD):
{evidence_text if evidence_text else "None retrieved"}

Evaluation Criteria:
- Score 5.0 (Correct): Every factual assertion is fully supported by the provided evidence / ground truth.
- Score 4.0 (Mostly Correct): Core factual assertions are supported; minor details are unverified but do not distort facts.
- Score 3.0 (Partially Correct): Mixture of supported facts and unsupported or inaccurate claims.
- Score 2.0 (Incorrect): Contains clear factual errors that contradict provided reference ground truth or benchmark chunks.
- Score 1.0 (Completely False / Fabricated): Entire premise directly contradicts provided ground truth or benchmark evidence.

Categories:
- "Correct": All claims supported by evidence.
- "Partially Correct": Part of response is verified, but has inaccuracies or unverified gaps.
- "Incorrect": Factually wrong or contradicts evidence.
- "Contradictory": Direct contradiction detected between reference answer and benchmark evidence.
- "Insufficient Evidence / Unverified": Inadequate context to evaluate.

Task:
1. Extract 2 to 5 distinct factual claims from the AI Response.
2. For each claim, evaluate whether it is "Supported", "Partially Correct", "Incorrect", "Contradicted", or "Unverified" based ONLY on the provided context.
3. Cite the exact evidence chunk ([Chunk 1], [Reference Ground Truth], etc.) used for verification.
4. If a contradiction exists between the Reference Ground Truth and Benchmark Chunks, flag it.
5. Assign a numerical score (1.0 - 5.0), assign an accuracy_category, and provide a clear reasoning paragraph.

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "accuracy_category": "Correct",
  "contradiction_detected": false,
  "reasoning": "The response accurately asserts...",
  "verified_claims": [
    {{
      "claim": "Statement or factual assertion extracted from response",
      "verdict": "Supported",
      "evidence_source": "Chunk 1 (TruthfulQA) or Reference Ground Truth",
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
    contradiction = bool(result.get("contradiction_detected", False))
    
    raw_category = str(result.get("accuracy_category", "")).strip()
    valid_categories = [
        "Insufficient Evidence / Unverified",
        "Contradictory",
        "Partially Correct",
        "Incorrect",
        "Correct"
    ]
    matched_category = None
    # 1. Exact match first (case-insensitive)
    for vc in valid_categories:
        if raw_category.lower() == vc.lower():
            matched_category = vc
            break

    # 2. If no exact match, check from most specific to least specific
    if not matched_category:
        for vc in [
            "Insufficient Evidence / Unverified",
            "Contradictory",
            "Partially Correct",
            "Incorrect",
            "Correct"
        ]:
            if vc.lower() in raw_category.lower():
                # Prevent matching "correct" inside "incorrect" or "partially correct"
                if vc == "Correct" and ("incorrect" in raw_category.lower() or "partially" in raw_category.lower()):
                    continue
                matched_category = vc
                break

    # 3. Guardrails: enforce consistency between numerical score and accuracy category
    if contradiction:
        matched_category = "Contradictory"
    elif not matched_category:
        if score >= 4.5:
            matched_category = "Correct"
        elif score >= 3.0:
            matched_category = "Partially Correct"
        else:
            matched_category = "Incorrect"
    else:
        # Prevent contradictory category labels
        if score <= 2.0 and matched_category == "Correct":
            matched_category = "Incorrect"
        elif score < 3.5 and matched_category == "Correct":
            matched_category = "Partially Correct"
        elif score >= 4.5 and matched_category == "Incorrect":
            matched_category = "Correct"

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
        "accuracy_category": matched_category,
        "contradiction_detected": contradiction,
        "reasoning": reasoning,
        "verified_claims": cleaned_claims,
        "evidence_citations": [str(x) for x in citations if x],
        "is_insufficient_evidence": False
    }

