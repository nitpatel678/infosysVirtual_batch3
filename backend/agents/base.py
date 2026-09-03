import os
import re
import json
import google.generativeai as genai

PRIMARY_MODEL = "gemini-3.5-flash"
FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"]


def configure_genai():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not found in environment")
    genai.configure(api_key=api_key.strip())


def parse_agent_json(text):
    cleaned = re.sub(r"^```json\s*", "", text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()
    match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return json.loads(cleaned)


def generate_with_fallback(prompt):
    configure_genai()
    candidate_models = [PRIMARY_MODEL] + FALLBACK_MODELS
    last_err = None

    for model_name in candidate_models:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.1,
                    "response_mime_type": "application/json",
                },
            )
            return parse_agent_json(response.text)
        except Exception as e:
            last_err = e
            continue

    raise RuntimeError(f"All generative models failed: {last_err}")
