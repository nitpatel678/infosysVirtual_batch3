import os
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"

import io
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pypdf
import uvicorn

from database import init_db, save_evaluation, get_evaluations, get_evaluation_by_id
from agents.evaluator import evaluate_response

load_dotenv()

init_db()

app = FastAPI(title="AI Response Validation System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RetrieveRequest(BaseModel):
    query: str
    top_k: Optional[int] = 10


@app.get("/")
def root():
    return {"status": "running"}


@app.post("/api/retrieve")
def api_retrieve(request: RetrieveRequest):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    top_k = max(1, min(request.top_k or 10, 20))
    try:
        from knowledge_base.retrieval import retrieve
        results = retrieve(query, top_k=top_k)
        return {"query": query, "top_k": top_k, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieval error: {str(e)}")


@app.post("/api/evaluate")
async def evaluate(
    question: str = Form(...),
    ai_response: str = Form(...),
    reference_answer: Optional[str] = Form(None),
    source_document: Optional[UploadFile] = File(None),
):
    trimmed_question = question.strip()
    trimmed_response = ai_response.strip()

    if not trimmed_question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if not trimmed_response:
        raise HTTPException(status_code=400, detail="AI response cannot be empty")

    trimmed_reference = reference_answer.strip() if reference_answer and reference_answer.strip() else None

    source_doc_name = None
    source_doc_text = None

    if source_document and source_document.filename:
        filename = source_document.filename
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF documents are supported")

        source_doc_name = filename
        try:
            content = await source_document.read()
            pdf_reader = pypdf.PdfReader(io.BytesIO(content))
            extracted_pages = []
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    extracted_pages.append(text)
            source_doc_text = "\n\n".join(extracted_pages).strip()
            if not source_doc_text:
                source_doc_text = None
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF document: {str(e)}")

    retrieved_evidence = []
    try:
        from knowledge_base.retrieval import retrieve
        retrieved_evidence = retrieve(trimmed_question, top_k=10)
    except Exception as e:
        print(f"Warning: RAG retrieval failed: {e}")

    try:
        eval_result = evaluate_response(
            question=trimmed_question,
            ai_response=trimmed_response,
            reference_answer=trimmed_reference,
            source_document_text=source_doc_text,
            retrieved_evidence=retrieved_evidence,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation agent error: {str(e)}")

    rel_score = float(eval_result.get("relevance", {}).get("score", 3.0))
    rel_reason = str(eval_result.get("relevance", {}).get("reasoning", ""))

    acc_score = float(eval_result.get("accuracy", {}).get("score", 3.0))
    acc_reason = str(eval_result.get("accuracy", {}).get("reasoning", ""))

    hal_score = float(eval_result.get("hallucination", {}).get("score", 3.0))
    hal_reason = str(eval_result.get("hallucination", {}).get("reasoning", ""))

    comp_score = float(eval_result.get("completeness", {}).get("score", 3.0))
    comp_reason = str(eval_result.get("completeness", {}).get("reasoning", ""))

    composite = float(eval_result.get("composite_score", round((0.25*rel_score) + (0.35*acc_score) + (0.25*hal_score) + (0.15*comp_score), 2)))
    final_verdict = str(eval_result.get("final_verdict", "PASS" if composite >= 3.5 and hal_score >= 3.0 else "FAIL"))
    verdict_summary = str(eval_result.get("verdict_summary", ""))

    saved_record = None
    try:
        saved_record = save_evaluation(
            question=trimmed_question,
            ai_response=trimmed_response,
            reference_answer=trimmed_reference,
            source_document_name=source_doc_name,
            source_document_text=source_doc_text,
            relevance_score=rel_score,
            relevance_reasoning=rel_reason,
            accuracy_score=acc_score,
            accuracy_reasoning=acc_reason,
            hallucination_score=hal_score,
            hallucination_reasoning=hal_reason,
            completeness_score=comp_score,
            completeness_reasoning=comp_reason,
            composite_score=composite,
            final_verdict=final_verdict,
            verdict_summary=verdict_summary,
            retrieved_evidence=retrieved_evidence,
        )
    except Exception as e:
        print(f"Warning: Failed to save to database: {e}")

    return {
        "id": saved_record.get("id") if saved_record else None,
        "created_at": str(saved_record.get("created_at")) if saved_record else None,
        "input": {
            "question": trimmed_question,
            "ai_response": trimmed_response,
            "reference_answer": trimmed_reference,
            "source_document_name": source_doc_name,
        },
        "retrieved_evidence": retrieved_evidence,
        "scores": {
            "relevance": {"score": rel_score, "reasoning": rel_reason},
            "accuracy": {"score": acc_score, "reasoning": acc_reason},
            "hallucination": {"score": hal_score, "reasoning": hal_reason},
            "completeness": {"score": comp_score, "reasoning": comp_reason},
            "composite": composite,
        },
        "verdict": {
            "status": final_verdict,
            "summary": verdict_summary,
        },
    }


@app.get("/api/history")
def history(limit: Optional[int] = 50):
    try:
        records = get_evaluations(limit=min(max(limit or 50, 1), 100))
        return {"records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")


@app.get("/api/history/{eval_id}")
def history_item(eval_id: int):
    try:
        record = get_evaluation_by_id(eval_id)
        if not record:
            raise HTTPException(status_code=404, detail="Evaluation record not found")
        return {"record": record}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
