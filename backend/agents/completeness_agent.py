from agents.base import generate_with_fallback


def evaluate_completeness(question, ai_response, reference_answer=None):
    prompt = f"""
You are the Completeness Judge Agent in an AI Response Validation System.
Your job is to assess whether the AI-generated response provides a comprehensive and thorough answer covering the key aspects of the user question.

User Query:
{question}

AI Response:
{ai_response}

Reference Ground Truth (if provided):
{reference_answer if reference_answer else "None provided"}

Evaluation Criteria:
- Score 5.0: Highly comprehensive. Fully addresses every dimension of the query with necessary detail and helpful context.
- Score 4.0: Complete. Covers the necessary core points of the question with good depth.
- Score 3.0: Moderately complete. Answers the immediate question but leaves out helpful context or secondary dimensions.
- Score 2.0: Incomplete. Answers only a fragment of the question and leaves major questions unanswered.
- Score 1.0: Severely deficient. Only provides a trivial or evasive fragment.

Provide an explicit, detailed reasoning paragraph explaining why you assigned this score. Mention which aspects of the question were answered and which were omitted.

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "reasoning": "The response comprehensively covers both the physical outcome of breaking a mirror and..."
}}
"""
    result = generate_with_fallback(prompt)
    score = float(result.get("score", 3.0))
    reasoning = str(result.get("reasoning", "Completeness evaluated based on response depth."))
    return {"score": min(5.0, max(1.0, score)), "reasoning": reasoning}
