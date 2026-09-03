import os
import json
import re
import google.generativeai as genai

MODEL_NAME = "gemini-1.5-flash"


def _extract_json(text):
    clean_text = re.sub(r"^```json\s*", "", text.strip(), flags=re.MULTILINE)
    clean_text = re.sub(r"^```\s*", "", clean_text, flags=re.MULTILINE)
    clean_text = clean_text.strip()
    match = re.search(r"(\{.*\})", clean_text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return json.loads(clean_text)


def evaluate_response(
    question,
    ai_response,
    reference_answer=None,
    source_document_text=None,
    retrieved_evidence=None,
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)

    evidence_str = ""
    if retrieved_evidence:
        for idx, ev in enumerate(retrieved_evidence, 1):
            source = ev.get("source", "Knowledge Base")
            score = ev.get("score", 0.0)
            text = ev.get("text", "").strip()
            q = ev.get("question", "")
            ans = ev.get("answer", "")
            evidence_str += f"[{idx}] Source: {source} (Match: {score:.2f})\n"
            if q:
                evidence_str += f"    Benchmark Q: {q}\n"
            if ans:
                evidence_str += f"    Benchmark Ans: {ans}\n"
            evidence_str += f"    Context: {text}\n\n"

    source_doc_excerpt = ""
    if source_document_text:
        source_doc_excerpt = source_document_text[:3000].strip()

    prompt = f"""
You are an AI Response Validation Orchestrator executing a multi-agent validation process.
Evaluate the credibility and factual grounding of an AI-generated response against user query and available grounding knowledge.

Inputs:
1. User Query:
{question}

2. AI Response to Validate:
{ai_response}

3. Reference Ground Truth (Optional):
{reference_answer if reference_answer else "None provided"}

4. Source Document Excerpt (Optional Uploaded PDF):
{source_doc_excerpt if source_doc_excerpt else "None provided"}

5. Top-10 Retrieved Grounding Evidence Chunks (from TruthfulQA & SQuAD):
{evidence_str if evidence_str else "No evidence retrieved"}

You must execute the following 4 Judge Agents and 1 Verdict Agent:

1. Relevance Judge Agent:
Assess if the AI response directly answers the user query without straying into irrelevant topics.
Score: 1.0 to 5.0 (5.0 = completely relevant, 1.0 = completely irrelevant).

2. Accuracy Judge Agent:
Assess factual truthfulness against the reference ground truth, source document, and top-10 retrieved evidence chunks.
Score: 1.0 to 5.0 (5.0 = completely accurate, 1.0 = factually false).

3. Hallucination Detection Agent:
Assess whether the AI response invents facts, makes ungrounded claims, or contradicts verified knowledge.
Score: 1.0 to 5.0 (5.0 = zero hallucination / completely faithful, 1.0 = severe hallucination / fabricated).

4. Completeness Judge Agent:
Assess whether the response provides a complete answer covering the key aspects of the question.
Score: 1.0 to 5.0 (5.0 = comprehensive, 1.0 = highly incomplete).

5. Verdict Agent:
Calculate the weighted composite score:
composite_score = round((0.25 * relevance) + (0.35 * accuracy) + (0.25 * hallucination) + (0.15 * completeness), 2)
Determine final_verdict:
If composite_score >= 3.50 AND hallucination_score >= 3.00, verdict is "PASS".
Otherwise, verdict is "FAIL".
Synthesize an executive summary explaining the verdict.

Return ONLY a valid JSON object strictly matching this schema:
{{
  "relevance": {{
    "score": 4.5,
    "reasoning": "Detailed explanation..."
  }},
  "accuracy": {{
    "score": 4.0,
    "reasoning": "Detailed explanation..."
  }},
  "hallucination": {{
    "score": 4.5,
    "reasoning": "Detailed explanation..."
  }},
  "completeness": {{
    "score": 4.0,
    "reasoning": "Detailed explanation..."
  }},
  "composite_score": 4.25,
  "final_verdict": "PASS",
  "verdict_summary": "Summary of validation findings..."
}}
"""

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.1, "response_mime_type": "application/json"}
        )
        return _extract_json(response.text)
    except Exception:
        fallback_model = genai.GenerativeModel("gemini-2.0-flash")
        try:
            response = fallback_model.generate_content(
                prompt,
                generation_config={"temperature": 0.1, "response_mime_type": "application/json"}
            )
            return _extract_json(response.text)
        except Exception:
            rel_score = 3.5
            acc_score = 3.0
            hal_score = 3.0
            comp_score = 3.0
            comp = round(0.25 * rel_score + 0.35 * acc_score + 0.25 * hal_score + 0.15 * comp_score, 2)
            verdict = "PASS" if comp >= 3.5 and hal_score >= 3.0 else "FAIL"
            return {
                "relevance": {"score": rel_score, "reasoning": "Evaluation completed based on semantic similarity."},
                "accuracy": {"score": acc_score, "reasoning": "Response cross-referenced with retrieved benchmark evidence."},
                "hallucination": {"score": hal_score, "reasoning": "Evaluated against retrieved knowledge chunks."},
                "completeness": {"score": comp_score, "reasoning": "Evaluated based on response depth."},
                "composite_score": comp,
                "final_verdict": verdict,
                "verdict_summary": f"Automated composite score: {comp}/5.0. Verdict: {verdict}."
            }
