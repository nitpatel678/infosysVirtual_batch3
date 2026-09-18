from agents.base import generate_with_fallback


def generate_verdict(
    question,
    ai_response,
    relevance_data,
    accuracy_data,
    hallucination_data,
    completeness_data,
):
    rel = float(relevance_data.get("score", 3.0))
    acc = float(accuracy_data.get("score", 3.0))
    hal = float(hallucination_data.get("score", 3.0))
    comp = float(completeness_data.get("score", 3.0))

    weights = {
        "relevance": 0.25,
        "accuracy": 0.35,
        "hallucination": 0.25,
        "completeness": 0.15,
    }

    overall_score = round(
        (weights["relevance"] * rel)
        + (weights["accuracy"] * acc)
        + (weights["hallucination"] * hal)
        + (weights["completeness"] * comp),
        2,
    )

    normalized_scores = {
        "relevance": round((rel / 5.0) * 100, 1),
        "accuracy": round((acc / 5.0) * 100, 1),
        "hallucination": round((hal / 5.0) * 100, 1),
        "completeness": round((comp / 5.0) * 100, 1),
        "overall": round((overall_score / 5.0) * 100, 1),
    }

    acc_unverified = accuracy_data.get("is_insufficient_evidence", False)
    hal_unverified = hallucination_data.get("is_insufficient_evidence", False)
    comp_unverified = completeness_data.get("is_insufficient_evidence", False)
    is_unverified = acc_unverified and hal_unverified

    source_conflict = bool(
        accuracy_data.get("contradiction_detected", False)
        or completeness_data.get("source_conflict_detected", False)
    )

    severe_hallucination = hal < 2.50 or (
        hallucination_data.get("hallucination_detected", False) and hal < 2.80
    )
    factual_contradiction = accuracy_data.get("contradiction_detected", False) and acc < 3.00

    if is_unverified:
        final_verdict = "Unverified"
    elif severe_hallucination or factual_contradiction or overall_score < 2.70:
        final_verdict = "Fail"
    elif overall_score >= 3.50 and hal >= 3.00 and acc >= 3.00:
        final_verdict = "Pass"
    else:
        final_verdict = "Needs Improvement"

    prompt = f"""
You are the Verdict Agent in an AI Response Validation System.
Your job is to synthesize findings from all 4 specialized evaluation dimensions (Relevance, Accuracy, Hallucination Detection, Completeness) and generate an authoritative executive summary.

Evaluation Context:
- User Question: {question}
- AI Response: {ai_response}

Agent Scores & Findings:
1. Relevance Judge ({weights['relevance']*100:.0f}% weight): {rel:.2f}/5.0
   Finding: {relevance_data.get('reasoning', '')}
   Category: {relevance_data.get('relevance_category', 'N/A')}

2. Accuracy Judge ({weights['accuracy']*100:.0f}% weight): {acc:.2f}/5.0
   Finding: {accuracy_data.get('reasoning', '')}
   Category: {accuracy_data.get('accuracy_category', 'N/A')}

3. Hallucination Detection Agent ({weights['hallucination']*100:.0f}% weight): {hal:.2f}/5.0
   Finding: {hallucination_data.get('reasoning', '')}
   Level: {hallucination_data.get('hallucination_level', 'N/A')}

4. Completeness Judge ({weights['completeness']*100:.0f}% weight): {comp:.2f}/5.0
   Finding: {completeness_data.get('reasoning', '')}
   Category: {completeness_data.get('completeness_category', 'N/A')}

Calculated Overall Weighted Score: {overall_score:.2f} / 5.00
Calculated Verdict Category: {final_verdict}
Source Conflict Status: {"Conflict between reference answer and benchmark evidence detected" if source_conflict else "No source conflict detected"}

Generate a JSON object containing:
1. "major_issues": A list of up to 3 major weaknesses, hallucinations, missing aspects, or contradictions identified. If none, provide an empty list.
2. "strengths": A list of up to 3 major strengths of the response.
3. "verdict_summary": A clear 2-3 sentence executive validation paragraph summarizing the quality of the response, justifying the {final_verdict} verdict, and explicitly addressing any source conflict or evidence limitations.

Return ONLY a JSON object strictly matching this schema:
{{
  "major_issues": ["Issue 1...", "Issue 2..."],
  "strengths": ["Strength 1...", "Strength 2..."],
  "verdict_summary": "Executive summary..."
}}
"""
    try:
        res = generate_with_fallback(prompt)
        major_issues = res.get("major_issues", [])
        if not isinstance(major_issues, list):
            major_issues = [str(major_issues)] if major_issues else []

        strengths = res.get("strengths", [])
        if not isinstance(strengths, list):
            strengths = [str(strengths)] if strengths else []

        summary = str(res.get("verdict_summary", ""))
        if not summary:
            summary = f"Evaluation completed with overall score {overall_score:.2f}/5.00. The response is classified as {final_verdict}."
    except Exception:
        major_issues = []
        if severe_hallucination:
            major_issues.append("Severe hallucination or unsupported claims detected.")
        if factual_contradiction:
            major_issues.append("Direct factual contradiction against reference grounding.")
        if comp < 3.0:
            major_issues.append("Significant omission of required question aspects.")

        strengths = []
        if rel >= 4.0:
            strengths.append("Directly relevant to the user query.")
        if acc >= 4.0:
            strengths.append("High factual accuracy grounded in reference context.")

        summary = f"Evaluation completed with overall weighted score {overall_score:.2f}/5.00. The response receives a final verdict of {final_verdict}."

    return {
        "final_verdict": final_verdict,
        "composite_score": overall_score,
        "overall_score": overall_score,
        "dimension_weights": weights,
        "normalized_scores": normalized_scores,
        "source_conflict_detected": source_conflict,
        "is_unverified": is_unverified,
        "major_issues": major_issues,
        "strengths": strengths,
        "verdict_summary": summary,
    }
