from agents.base import generate_with_fallback


def evaluate_relevance(question, ai_response, engine="openai"):
    prompt = f"""
You are the Relevance Judge Agent in an AI Response Validation System.
Your job is to assess how directly, comprehensively, and appropriately the AI-generated response addresses the user query.

User Query:
{question}

AI Response:
{ai_response}

Evaluation Criteria:
- Score 5.0 (Fully Relevant): Directly and comprehensively addresses the core query without straying or omitting critical context.
- Score 4.0 (Mostly Relevant): Answers the main query clearly, with only minor superfluous details or slight tangents.
- Score 3.0 (Partially Relevant): Addresses part of the query, but omits important aspects or includes excessive unrelated discussion.
- Score 2.0 (Poor Relevance): Barely touches on the subject; primarily discusses adjacent or tangential concepts.
- Score 1.0 (Irrelevant / Off-Topic): Fails to address the user question; answers a completely different question or provides generic non-answers.

Provide:
1. "score": Numerical score between 1.0 and 5.0.
2. "reasoning": Detailed paragraph explaining the score, citing specific phrases from query and response.
3. "relevance_category": One of "Fully Relevant", "Mostly Relevant", "Partially Relevant", "Poor Relevance", "Irrelevant / Off-Topic".
4. "key_alignment_points": Array of 1-4 strings describing specific topics/questions from the query that were directly answered.
5. "missed_aspects": Array of strings describing any sub-questions or nuances of the query that were ignored or unanswered (empty array if none missed).

Return ONLY a JSON object strictly matching this schema:
{{
  "score": 4.5,
  "reasoning": "The response directly answers the query regarding...",
  "relevance_category": "Mostly Relevant",
  "key_alignment_points": ["Addressed X directly", "Provided definition of Y"],
  "missed_aspects": []
}}
"""
    result = generate_with_fallback(prompt, preferred_model="gemini-3.1-flash-lite", engine=engine)
    raw_score = float(result.get("score", 3.0))
    score = round(min(5.0, max(1.0, raw_score)), 1)
    reasoning = str(result.get("reasoning", "Relevance assessed based on query intent."))
    
    raw_category = str(result.get("relevance_category", "")).strip()
    valid_categories = [
        "Fully Relevant",
        "Mostly Relevant",
        "Partially Relevant",
        "Poor Relevance",
        "Irrelevant / Off-Topic",
    ]
    matched_category = None
    for vc in valid_categories:
        if vc.lower() in raw_category.lower():
            matched_category = vc
            break
    if not matched_category:
        if score >= 4.5:
            matched_category = "Fully Relevant"
        elif score >= 3.5:
            matched_category = "Mostly Relevant"
        elif score >= 2.5:
            matched_category = "Partially Relevant"
        elif score >= 1.8:
            matched_category = "Poor Relevance"
        else:
            matched_category = "Irrelevant / Off-Topic"

    key_points = result.get("key_alignment_points", [])
    if not isinstance(key_points, list):
        key_points = [str(key_points)]
    missed = result.get("missed_aspects", [])
    if not isinstance(missed, list):
        missed = [str(missed)]

    return {
        "score": score,
        "reasoning": reasoning,
        "relevance_category": matched_category,
        "key_alignment_points": [str(p) for p in key_points if p],
        "missed_aspects": [str(m) for m in missed if m],
    }

