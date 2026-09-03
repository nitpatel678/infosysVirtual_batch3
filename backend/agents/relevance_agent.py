from agents.base import generate_with_fallback


def evaluate_relevance(question, ai_response):
    prompt = f"""
You are the Relevance Judge Agent in an AI Response Validation System.
Your job is to assess how directly and faithfully the AI-generated response addresses the user query.

User Query:
{question}

AI Response:
{ai_response}

Evaluation Criteria:
- Score 5.0: Perfectly relevant. Directly and concisely addresses the user's specific question without irrelevant tangents.
- Score 4.0: Mostly relevant. Answers the main question but includes slight tangential or superfluous information.
- Score 3.0: Moderately relevant. Partially answers the query, but misses a key aspect or spends excessive time on unrelated topics.
- Score 2.0: Poor relevance. Barely addresses the topic asked; mostly discusses an adjacent concept.
- Score 1.0: Completely irrelevant or off-topic. Fails to address the user question.

Provide an explicit, detailed reasoning paragraph explaining why you assigned this score. Mention specific phrases from the query and response.

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "reasoning": "The response directly answers the user query regarding..."
}}
"""
    result = generate_with_fallback(prompt)
    score = float(result.get("score", 3.0))
    reasoning = str(result.get("reasoning", "Relevance assessed based on query intent."))
    return {"score": min(5.0, max(1.0, score)), "reasoning": reasoning}
