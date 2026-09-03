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

    composite = round((0.25 * rel) + (0.35 * acc) + (0.25 * hal) + (0.15 * comp), 2)
    is_pass = composite >= 3.50 and hal >= 3.00 and acc >= 3.00
    preliminary_verdict = "PASS" if is_pass else "FAIL"

    prompt = f"""
You are the Verdict Agent in an AI Response Validation System.
Your job is to synthesize the findings from the 4 specialized judge agents and produce an authoritative executive summary.

User Query:
{question}

AI Response:
{ai_response}

Agent Findings:
1. Relevance Judge: Score {rel:.1f}/5.0
   Finding: {relevance_data.get('reasoning', '')}

2. Accuracy Judge: Score {acc:.1f}/5.0
   Finding: {accuracy_data.get('reasoning', '')}

3. Hallucination Detection Agent: Score {hal:.1f}/5.0
   Finding: {hallucination_data.get('reasoning', '')}

4. Completeness Judge: Score {comp:.1f}/5.0
   Finding: {completeness_data.get('reasoning', '')}

Composite Score: {composite:.2f} / 5.00
Calculated Verdict: {preliminary_verdict}

Synthesize a 2-3 sentence executive validation summary explaining whether this AI response is credible, faithful, and reliable for production use, highlighting the key reason for the final verdict.

Return ONLY a JSON object strictly matching this schema:
{{
  "verdict_summary": "Executive summary synthesizing the agent evaluations..."
}}
"""
    try:
        res = generate_with_fallback(prompt)
        summary = str(res.get("verdict_summary", ""))
        if not summary:
            summary = f"Evaluation completed with composite score {composite:.2f}/5.00. The response is classified as {preliminary_verdict}."
    except Exception:
        summary = f"Evaluation completed with composite score {composite:.2f}/5.00. The response is classified as {preliminary_verdict}."

    return {
        "final_verdict": preliminary_verdict,
        "composite_score": composite,
        "verdict_summary": summary,
    }
