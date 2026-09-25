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

    # Balanced Dimension Weights (100% total)
    weights = {
        "relevance": 0.25,
        "accuracy": 0.30,
        "hallucination": 0.25,
        "completeness": 0.20,
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

    acc_cat = str(accuracy_data.get("accuracy_category", ""))
    rel_cat = str(relevance_data.get("relevance_category", ""))
    hal_lvl = str(hallucination_data.get("hallucination_level", ""))
    comp_cat = str(completeness_data.get("completeness_category", ""))

    acc_unverified = bool(
        accuracy_data.get("is_insufficient_evidence", False)
        or "insufficient" in acc_cat.lower()
        or "unverified" in acc_cat.lower()
    )
    hal_unverified = bool(
        hallucination_data.get("is_insufficient_evidence", False)
        or "insufficient" in hal_lvl.lower()
        or "undetermined" in hal_lvl.lower()
    )
    comp_unverified = bool(
        completeness_data.get("is_insufficient_evidence", False)
        or "insufficient" in comp_cat.lower()
        or "unverified" in comp_cat.lower()
    )
    has_insufficient_context = acc_unverified or comp_unverified or hal_unverified

    source_conflict = bool(
        accuracy_data.get("contradiction_detected", False)
        or completeness_data.get("source_conflict_detected", False)
        or "contradict" in acc_cat.lower()
    )

    severe_hallucination = bool(
        hal < 2.80
        or "severe" in hal_lvl.lower()
        or (hallucination_data.get("hallucination_detected", False) and hal < 3.20)
    )
    factual_contradiction = bool(
        accuracy_data.get("contradiction_detected", False)
        or acc < 2.30
        or "incorrect" in acc_cat.lower()
    )
    severe_irrelevance = bool(
        rel < 1.80 or "irrelevant" in rel_cat.lower() or "off-topic" in rel_cat.lower()
    )
    severe_incompleteness = bool(
        comp < 1.80
        or "severely" in comp_cat.lower()
        or "deficient" in comp_cat.lower()
    )

    # 5 Strict Multi-Metric Quality Gates
    quality_gates = {
        "relevance": {
            "name": "Relevance Gate",
            "score": rel,
            "threshold": 3.5,
            "passed": bool(rel >= 3.5 and "poor" not in rel_cat.lower() and "irrelevant" not in rel_cat.lower()),
            "reason": "Directly and adequately answers user query" if rel >= 3.5 and "poor" not in rel_cat.lower() else f"Score {rel:.1f}/5.0 ({rel_cat}) fails relevance threshold",
        },
        "accuracy": {
            "name": "Accuracy Gate",
            "score": acc,
            "threshold": 3.5,
            "passed": bool(acc >= 3.5 and not factual_contradiction),
            "reason": "Factual assertions verified against ground truth" if acc >= 3.5 and not factual_contradiction else f"Score {acc:.1f}/5.0 ({acc_cat}) contains inaccurate or unverified assertions",
        },
        "hallucination": {
            "name": "Hallucination Gate",
            "score": hal,
            "threshold": 3.5,
            "passed": bool(hal >= 3.5 and not severe_hallucination),
            "reason": "Response is grounded with low/zero hallucination" if hal >= 3.5 and not severe_hallucination else f"Score {hal:.1f}/5.0 ({hal_lvl}) contains unsupported claims",
        },
        "completeness": {
            "name": "Completeness Gate",
            "score": comp,
            "threshold": 3.5,
            "passed": bool(comp >= 3.5 and not severe_incompleteness),
            "reason": "Covers essential question requirements" if comp >= 3.5 and not severe_incompleteness else f"Score {comp:.1f}/5.0 ({comp_cat}) has significant omissions",
        },
        "grounding": {
            "name": "Grounding Consistency Gate",
            "score": None,
            "threshold": None,
            "passed": bool(not source_conflict and not acc_unverified),
            "reason": "Consistent with reference context" if not source_conflict else "Direct conflict detected between reference answer and benchmark evidence",
        },
    }

    gates_passed = sum(1 for g in quality_gates.values() if g["passed"])
    total_gates = len(quality_gates)
    all_gates_cleared = (gates_passed == total_gates) and (overall_score >= 3.70)
    breached_gates = [g["name"] for g in quality_gates.values() if not g["passed"]]

    # Hierarchical Decision Tree
    if source_conflict:
        final_verdict = "Conflict in Information"
        verdict_tag = "Conflict in Information (Source Discrepancy)"
    elif severe_hallucination or factual_contradiction or severe_irrelevance or overall_score < 2.50:
        final_verdict = "Fail"
        if severe_hallucination:
            verdict_tag = "Fail (Severe Hallucination)"
        elif factual_contradiction:
            verdict_tag = "Fail (Factual Contradiction)"
        elif severe_irrelevance:
            verdict_tag = "Fail (Irrelevant / Off-Topic)"
        else:
            verdict_tag = "Fail (Below Minimum Quality Threshold)"
    elif has_insufficient_context and not (severe_incompleteness and severe_irrelevance) and rel >= 3.0 and acc >= 3.0:
        final_verdict = "Insufficient Evidence"
        verdict_tag = "Insufficient Evidence (Needs More Information)"
    elif not all_gates_cleared:
        final_verdict = "Needs Improvement"
        if (severe_incompleteness or comp < 3.5) and (severe_irrelevance or rel < 3.5):
            verdict_tag = "Needs Improvement (Incomplete & Low Relevance)"
        elif severe_incompleteness or comp < 3.5:
            verdict_tag = "Needs Improvement (Incomplete Coverage)"
        elif severe_irrelevance or rel < 3.5:
            verdict_tag = "Needs Improvement (Low Relevance)"
        elif acc < 3.5:
            verdict_tag = "Needs Improvement (Partially Accurate)"
        elif hal < 3.5:
            verdict_tag = "Needs Improvement (Minor Hallucinations)"
        else:
            verdict_tag = "Needs Improvement (Score Below Pass Floor)"
    else:
        final_verdict = "Pass"
        verdict_tag = "Pass (High Quality & Fully Verified)"

    prompt = f"""
You are the Verdict Agent in an AI Response Validation System.
Your job is to synthesize findings from all 4 evaluation dimensions (Relevance, Accuracy, Hallucination Detection, Completeness) and generate an authoritative executive summary.

Evaluation Context:
- User Question: {question}
- AI Response: {ai_response}

Agent Scores & Findings:
1. Relevance Judge ({weights['relevance']*100:.0f}% weight): {rel:.2f}/5.0
   Finding: {relevance_data.get('reasoning', '')}
   Category: {rel_cat}

2. Accuracy Judge ({weights['accuracy']*100:.0f}% weight): {acc:.2f}/5.0
   Finding: {accuracy_data.get('reasoning', '')}
   Category: {acc_cat}

3. Hallucination Detection Agent ({weights['hallucination']*100:.0f}% weight): {hal:.2f}/5.0
   Finding: {hallucination_data.get('reasoning', '')}
   Level: {hal_lvl}

4. Completeness Judge ({weights['completeness']*100:.0f}% weight): {comp:.2f}/5.0
   Finding: {completeness_data.get('reasoning', '')}
   Category: {comp_cat}

Multi-Metric Quality Gating Status:
- Gates Cleared: {gates_passed}/{total_gates}
- Breached Gates: {', '.join(breached_gates) if breached_gates else 'None (All Gates Cleared)'}
- Calculated Weighted Score: {overall_score:.2f} / 5.00
- Enforced Final Verdict: {final_verdict}
- Descriptive Verdict Tag: {verdict_tag}

CRITICAL RULES FOR EXECUTIVE SUMMARY:
1. You MUST justify the ENFORCED FINAL VERDICT: "{final_verdict}" with the specific tag "{verdict_tag}". DO NOT recommend or justify any other verdict.
2. An answer that has high accuracy or clean hallucination on an isolated fragment (e.g. stating only one symptom like 'dry mouth' when primary symptoms were requested) CANNOT PASS if Relevance or Completeness failed.
3. Explicitly explain the specific deficiencies (e.g., omitted symptoms, low relevance, lack of external grounding evidence, or source contradictions).
4. If there is a source conflict or insufficient evidence, call it out clearly.

Generate a JSON object strictly containing:
1. "major_issues": A list of up to 3 major weaknesses, omissions, gate breaches, or contradictions. (Empty list if perfect response).
2. "strengths": A list of up to 3 major strengths or accurate elements.
3. "verdict_summary": A professional 2-3 sentence executive validation paragraph summarizing the response quality, explaining why it received {final_verdict} ({verdict_tag}), and detailing which quality gates failed or passed.

Return ONLY a JSON object strictly matching this schema:
{{
  "major_issues": ["Issue 1...", "Issue 2..."],
  "strengths": ["Strength 1...", "Strength 2..."],
  "verdict_summary": "Executive summary..."
}}
"""
    try:
        res = generate_with_fallback(prompt, preferred_model="gemini-flash-latest")
        major_issues = res.get("major_issues", [])
        if not isinstance(major_issues, list):
            major_issues = [str(major_issues)] if major_issues else []

        strengths = res.get("strengths", [])
        if not isinstance(strengths, list):
            strengths = [str(strengths)] if strengths else []

        summary = str(res.get("verdict_summary", ""))
        if not summary:
            summary = f"Evaluation concluded with composite score {overall_score:.2f}/5.00. Based on multi-metric quality gating ({gates_passed}/{total_gates} gates passed), the response is classified as {final_verdict} [{verdict_tag}]."
    except Exception:
        major_issues = []
        for g_name in breached_gates:
            major_issues.append(f"{g_name} breached: failed quality threshold.")
        if not major_issues and final_verdict != "Pass":
            major_issues.append("Response requires additional detail or grounding.")

        strengths = []
        if rel >= 3.5:
            strengths.append("Directly addresses query intent.")
        if acc >= 3.5:
            strengths.append("High factual accuracy on stated claims.")
        if hal >= 4.0:
            strengths.append("Free of fabricated or hallucinated statements.")

        summary = f"Evaluation concluded with composite score {overall_score:.2f}/5.00. Based on multi-metric quality gating ({gates_passed}/{total_gates} gates passed), the response is classified as {final_verdict} [{verdict_tag}]."

    return {
        "final_verdict": final_verdict,
        "status": final_verdict,
        "verdict_tag": verdict_tag,
        "composite_score": overall_score,
        "overall_score": overall_score,
        "dimension_weights": weights,
        "normalized_scores": normalized_scores,
        "quality_gates": quality_gates,
        "gates_passed": gates_passed,
        "total_gates": total_gates,
        "all_gates_cleared": all_gates_cleared,
        "breached_gates": breached_gates,
        "source_conflict_detected": source_conflict,
        "is_unverified": (final_verdict == "Insufficient Evidence" or acc_unverified or hal_unverified),
        "major_issues": major_issues,
        "strengths": strengths,
        "verdict_summary": summary,
    }

