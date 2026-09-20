import os
import re
import json
import time
import threading
from dotenv import load_dotenv
import google.generativeai as genai
from google.ai import generativelanguage as glm
from google.api_core import client_options as client_options_lib

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)

PRIMARY_MODEL = "gemini-3.1-flash-lite"
FALLBACK_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
]

_api_keys = []
key1 = os.getenv("GEMINI_API_KEY")
key2 = os.getenv("GEMINI_API_KEY_2")
if key1 and key1.strip():
    _api_keys.append(key1.strip())
if key2 and key2.strip() and key2.strip() != key1.strip():
    _api_keys.append(key2.strip())

_key_index = 0
_pool_lock = threading.Lock()
_client_cache = {}
_client_cache_lock = threading.Lock()


def get_client_for_key(key: str) -> glm.GenerativeServiceClient:
    with _client_cache_lock:
        if key not in _client_cache:
            opts = client_options_lib.ClientOptions(api_key=key)
            _client_cache[key] = glm.GenerativeServiceClient(client_options=opts)
        return _client_cache[key]


def get_ordered_api_keys():
    global _key_index
    with _pool_lock:
        if not _api_keys:
            raise RuntimeError("No GEMINI_API_KEY found in environment or .env file")
        keys = list(_api_keys)
        if len(keys) > 1:
            idx = _key_index % len(keys)
            _key_index += 1
            return keys[idx:] + keys[:idx]
        return keys


def parse_agent_json(text):
    cleaned = re.sub(r"^```json\s*", "", text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()
    match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return json.loads(cleaned)


def generate_with_fallback(prompt, max_retries=2):
    candidate_models = [PRIMARY_MODEL] + FALLBACK_MODELS
    keys = get_ordered_api_keys()
    last_err = None

    for attempt in range(max_retries):
        for key in keys:
            client = get_client_for_key(key)
            for model_name in candidate_models:
                try:
                    model = genai.GenerativeModel(model_name)
                    model._client = client
                    response = model.generate_content(
                        prompt,
                        generation_config={
                            "temperature": 0.1,
                            "response_mime_type": "application/json",
                        },
                    )
                    return parse_agent_json(response.text)
                except Exception as e:
                    err_str = str(e).lower()
                    last_err = e
                    if "404" in err_str or "not found" in err_str:
                        continue
                    if "429" in err_str or "quota" in err_str or "resourceexhausted" in err_str:
                        # Continue to next candidate model because Google Free Tier quota is per-model
                        continue
                    continue

        if attempt < max_retries - 1:
            time.sleep(0.5)

    raise RuntimeError(f"All generative models and API keys failed: {last_err}")
