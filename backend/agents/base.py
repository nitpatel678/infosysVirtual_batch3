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

# OpenAI Integration (gpt-4o-mini: ultra-low cost, ~$0.0003/eval, 500+ RPM)
_openai_client = None
_openai_key = os.getenv("OPEN_AI_API_KEY") or os.getenv("OPENAI_API_KEY")
if _openai_key and _openai_key.strip():
    try:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=_openai_key.strip())
        print(f"[LLM Router] OpenAI client initialized with gpt-4o-mini (Primary Engine).")
    except Exception as oe:
        print(f"[LLM Router] Failed to initialize OpenAI client: {oe}")

_api_keys = []
key1 = os.getenv("GEMINI_API_KEY")
key2 = os.getenv("GEMINI_API_KEY_2")
key3 = os.getenv("GEMINI_API_KEY_3")
if key1 and key1.strip():
    _api_keys.append(key1.strip())
if key2 and key2.strip() and key2.strip() not in _api_keys:
    _api_keys.append(key2.strip())
if key3 and key3.strip() and key3.strip() not in _api_keys:
    _api_keys.append(key3.strip())

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


def generate_with_fallback(prompt, max_retries=3, preferred_model=None, engine="openai"):
    """
    Multi-engine LLM generation router supporting OpenAI GPT-4o-mini and Google Gemini.
    - engine='openai' (Default & Batch Mode): Strictly uses OpenAI gpt-4o-mini with fast retries.
      NEVER falls back to Gemini to avoid 429 quota exhaustion and stalling batch runs.
    - engine='gemini' (Single Eval Toggle): Queries Google Gemini models; falls back to OpenAI
      if Gemini quota is exhausted to prevent presentation failures.
    """
    norm_engine = (engine or "openai").strip().lower()

    # 1. Primary Engine: OpenAI gpt-4o-mini (Tier-1 high RPM, ~$0.0003/eval, ultra-stable)
    if norm_engine == "openai" or not _api_keys:
        if not _openai_client:
            raise RuntimeError("OpenAI API client is not initialized. Please verify OPEN_AI_API_KEY in .env")

        last_oai_err = None
        for attempt in range(max_retries):
            try:
                resp = _openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert AI Response Validation Judge. You must evaluate strictly and return a valid JSON object matching the requested schema.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"},
                )
                raw_text = resp.choices[0].message.content
                return parse_agent_json(raw_text)
            except Exception as oai_err:
                last_oai_err = oai_err
                print(f"[LLM Router] OpenAI gpt-4o-mini attempt {attempt + 1}/{max_retries} failed: {oai_err}")
                if attempt < max_retries - 1:
                    time.sleep(0.4 * (attempt + 1))

        # Do NOT fall back to Gemini in openai mode to protect batch evaluations from 429 freezes
        raise RuntimeError(f"OpenAI gpt-4o-mini generation failed: {last_oai_err}")

    # 2. Gemini Engine (Used when specifically toggled for demonstration)
    if preferred_model:
        remaining = [m for m in ([PRIMARY_MODEL] + FALLBACK_MODELS) if m != preferred_model]
        candidate_models = [preferred_model] + remaining
    else:
        candidate_models = [PRIMARY_MODEL] + FALLBACK_MODELS

    last_err = None
    try:
        keys = get_ordered_api_keys()
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
                    last_err = e
                    err_str = str(e).lower()
                    if "404" in err_str or "not found" in err_str:
                        continue
                    if "429" in err_str or "quota" in err_str or "resourceexhausted" in err_str:
                        continue
                    continue
    except Exception as ge:
        last_err = ge

    # Safety net: If Gemini fails during a live single-eval demonstration, seamlessly serve via OpenAI
    if _openai_client:
        print(f"[LLM Router] Gemini failed ({last_err}). Seamlessly serving via OpenAI gpt-4o-mini...")
        try:
            resp = _openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert AI Response Validation Judge. You must evaluate strictly and return a valid JSON object matching the requested schema.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            raw_text = resp.choices[0].message.content
            return parse_agent_json(raw_text)
        except Exception as oai_err:
            raise RuntimeError(f"Both Gemini ({last_err}) and fallback OpenAI ({oai_err}) failed.")

    raise RuntimeError(f"Generative models failed: {last_err}")
