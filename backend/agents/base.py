import os
import re
import json
import time
import google.generativeai as genai

PRIMARY_MODEL = "gemini-3.6-flash"
FALLBACK_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
]


def configure_genai():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        load_dotenv(env_path)
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


def generate_with_fallback(prompt, max_retries=2):
    configure_genai()
    candidate_models = [PRIMARY_MODEL] + FALLBACK_MODELS
    last_err = None

    for attempt in range(max_retries):
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
                err_str = str(e)
                last_err = e
                if "404" in err_str or "not found" in err_str.lower():
                    continue
                if "429" in err_str or "quota" in err_str.lower() or "resourceexhausted" in err_str.lower():
                    time.sleep(1.0)
                    continue
                time.sleep(1.0)
                continue

    raise RuntimeError(f"All generative models failed: {last_err}")

