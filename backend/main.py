import os
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not set in .env")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-3.6-flash")

app = FastAPI(title="AI Response Validation System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str


class EvaluateRequest(BaseModel):
    question: str
    ai_response: str
    reference_answer: Optional[str] = None
    source_material: Optional[str] = None


@app.get("/")
def root():
    return {"status": "running"}


@app.post("/api/chat")
def chat(request: ChatRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        result = model.generate_content(question)
        return {"response": result.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")


@app.post("/api/evaluate")
def evaluate(request: EvaluateRequest):
    question = request.question.strip()
    ai_response = request.ai_response.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if not ai_response:
        raise HTTPException(status_code=400, detail="AI response cannot be empty")

    reference_answer = (request.reference_answer or "").strip() or None
    source_material = (request.source_material or "").strip() or None

    # Evaluation agents will be connected in future milestones.
    # For now, return the processed input with placeholder scores.
    return {
        "input": {
            "question": question,
            "ai_response": ai_response,
            "reference_answer": reference_answer,
            "source_material": source_material,
        },
        "scores": {
            "relevance": None,
            "accuracy": None,
            "hallucination": None,
            "completeness": None,
        },
        "verdict": None,
        "message": "Evaluation input received. Agents not yet connected.",
    }

