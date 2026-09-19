import os
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"

import io
import csv
import uuid
import threading
import time
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Form, File, UploadFile
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pypdf
import uvicorn

from database import (
    init_db,
    save_evaluation,
    get_evaluations,
    get_evaluation_by_id,
    create_batch_job,
    update_batch_progress,
    get_batch_job,
    get_batch_records,
    get_analytics_summary,
)
from agents.evaluator import evaluate_response

load_dotenv()

init_db()

app = FastAPI(title="AI Response Validation System")

@app.on_event("startup")
def startup_event():
    try:
        from knowledge_base.retrieval import _load
        _load()
        print("Knowledge base retrieval model preloaded successfully.")
    except Exception as e:
        print(f"Preloading knowledge base note: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_batch_cache = {}
_batch_lock = threading.Lock()


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
def evaluate(
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
            content = source_document.file.read()
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

    rel_data = eval_result.get("relevance", {})
    rel_score = float(rel_data.get("score", 3.0))
    rel_reason = str(rel_data.get("reasoning", ""))

    acc_data = eval_result.get("accuracy", {})
    acc_score = float(acc_data.get("score", 3.0))
    acc_reason = str(acc_data.get("reasoning", ""))

    hal_data = eval_result.get("hallucination", {})
    hal_score = float(hal_data.get("score", 3.0))
    hal_reason = str(hal_data.get("reasoning", ""))

    comp_data = eval_result.get("completeness", {})
    comp_score = float(comp_data.get("score", 3.0))
    comp_reason = str(comp_data.get("reasoning", ""))

    verdict_data = eval_result.get("verdict", {})
    composite = float(verdict_data.get("composite_score", eval_result.get("composite_score", 3.0)))
    final_verdict = str(verdict_data.get("final_verdict", eval_result.get("final_verdict", "Pass")))
    verdict_summary = str(verdict_data.get("verdict_summary", eval_result.get("verdict_summary", "")))

    relevance_details = {
        "relevance_category": rel_data.get("relevance_category", "Partially Relevant"),
        "key_alignment_points": rel_data.get("key_alignment_points", []),
        "missed_aspects": rel_data.get("missed_aspects", []),
    }
    accuracy_details = {
        "accuracy_category": acc_data.get("accuracy_category", "Partially Correct"),
        "contradiction_detected": acc_data.get("contradiction_detected", False),
        "is_insufficient_evidence": acc_data.get("is_insufficient_evidence", False),
        "verified_claims": acc_data.get("verified_claims", []),
        "evidence_citations": acc_data.get("evidence_citations", []),
    }
    hallucination_details = {
        "hallucination_level": hal_data.get("hallucination_level", "Moderate Hallucination"),
        "hallucination_detected": hal_data.get("hallucination_detected", False),
        "hallucination_count": hal_data.get("hallucination_count", 0),
        "is_insufficient_evidence": hal_data.get("is_insufficient_evidence", False),
        "flagged_claims": hal_data.get("flagged_claims", []),
    }
    completeness_details = {
        "completeness_category": comp_data.get("completeness_category", "Partially Complete"),
        "identified_requirements": comp_data.get("identified_requirements", []),
        "addressed_aspects": comp_data.get("addressed_aspects", []),
        "missing_aspects": comp_data.get("missing_aspects", []),
        "source_conflict_detected": comp_data.get("source_conflict_detected", False),
        "conflict_details": comp_data.get("conflict_details", ""),
        "is_insufficient_evidence": comp_data.get("is_insufficient_evidence", False),
    }
    verdict_details = {
        "final_verdict": final_verdict,
        "overall_score": composite,
        "dimension_weights": verdict_data.get("dimension_weights", {
            "relevance": 0.25,
            "accuracy": 0.35,
            "hallucination": 0.25,
            "completeness": 0.15,
        }),
        "normalized_scores": verdict_data.get("normalized_scores", {}),
        "source_conflict_detected": verdict_data.get("source_conflict_detected", False),
        "is_unverified": verdict_data.get("is_unverified", False),
        "major_issues": verdict_data.get("major_issues", []),
        "strengths": verdict_data.get("strengths", []),
        "verdict_summary": verdict_summary,
    }

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
            relevance_details=relevance_details,
            accuracy_details=accuracy_details,
            hallucination_details=hallucination_details,
            completeness_details=completeness_details,
            verdict_details=verdict_details,
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
            "relevance": {
                "score": rel_score,
                "reasoning": rel_reason,
                **relevance_details,
            },
            "accuracy": {
                "score": acc_score,
                "reasoning": acc_reason,
                **accuracy_details,
            },
            "hallucination": {
                "score": hal_score,
                "reasoning": hal_reason,
                **hallucination_details,
            },
            "completeness": {
                "score": comp_score,
                "reasoning": comp_reason,
                **completeness_details,
            },
            "composite": composite,
            "overall_score": composite,
        },
        "verdict": verdict_details,
    }


def _run_batch_worker(batch_id: str, rows: list):
    total = len(rows)
    records = []
    stats = {
        "total": total,
        "processed": 0,
        "passed": 0,
        "needs_improvement": 0,
        "failed": 0,
        "unverified": 0,
        "source_conflicts": 0,
        "hallucinations_detected": 0,
        "hallucination_rate": 0.0,
        "avg_relevance": 0.0,
        "avg_accuracy": 0.0,
        "avg_hallucination": 0.0,
        "avg_completeness": 0.0,
        "avg_overall": 0.0,
    }

    sum_rel = 0.0
    sum_acc = 0.0
    sum_hal = 0.0
    sum_comp = 0.0
    sum_over = 0.0

    from knowledge_base.retrieval import retrieve

    for idx, row in enumerate(rows, 1):
        q = row.get("question", "").strip()
        ans = row.get("ai_response", "").strip()
        ref = row.get("reference_answer", "").strip() or None
        src_info = row.get("source_information", "").strip() or None

        with _batch_lock:
            if batch_id in _batch_cache:
                _batch_cache[batch_id]["current_index"] = idx
                _batch_cache[batch_id]["current_question"] = q[:70]

        eval_rec = None
        try:
            ev_list = []
            try:
                ev_list = retrieve(q, top_k=10)
            except Exception as re:
                print(f"Batch row {idx} retrieval error: {re}")

            eval_res = evaluate_response(
                question=q,
                ai_response=ans,
                reference_answer=ref,
                source_document_text=src_info,
                retrieved_evidence=ev_list,
            )

            rel_data = eval_res.get("relevance", {})
            acc_data = eval_res.get("accuracy", {})
            hal_data = eval_res.get("hallucination", {})
            comp_data = eval_res.get("completeness", {})
            verdict_data = eval_res.get("verdict", {})

            rel_score = float(rel_data.get("score", 3.0))
            acc_score = float(acc_data.get("score", 3.0))
            hal_score = float(hal_data.get("score", 3.0))
            comp_score = float(comp_data.get("score", 3.0))
            overall_score = float(verdict_data.get("overall_score", 3.0))
            verdict = str(verdict_data.get("final_verdict", "Pass"))
            summary = str(verdict_data.get("verdict_summary", ""))

            sum_rel += rel_score
            sum_acc += acc_score
            sum_hal += hal_score
            sum_comp += comp_score
            sum_over += overall_score

            v_lower = verdict.lower()
            if "pass" in v_lower:
                stats["passed"] += 1
            elif "needs" in v_lower:
                stats["needs_improvement"] += 1
            elif "unverified" in v_lower:
                stats["unverified"] += 1
            else:
                stats["failed"] += 1

            if hal_data.get("hallucination_detected", False):
                stats["hallucinations_detected"] += 1

            if verdict_data.get("source_conflict_detected", False):
                stats["source_conflicts"] += 1

            relevance_details = {
                "relevance_category": rel_data.get("relevance_category", "N/A"),
                "key_alignment_points": rel_data.get("key_alignment_points", []),
                "missed_aspects": rel_data.get("missed_aspects", []),
            }
            accuracy_details = {
                "accuracy_category": acc_data.get("accuracy_category", "N/A"),
                "contradiction_detected": acc_data.get("contradiction_detected", False),
                "is_insufficient_evidence": acc_data.get("is_insufficient_evidence", False),
                "verified_claims": acc_data.get("verified_claims", []),
                "evidence_citations": acc_data.get("evidence_citations", []),
            }
            hallucination_details = {
                "hallucination_level": hal_data.get("hallucination_level", "N/A"),
                "hallucination_detected": hal_data.get("hallucination_detected", False),
                "hallucination_count": hal_data.get("hallucination_count", 0),
                "flagged_claims": hal_data.get("flagged_claims", []),
            }
            completeness_details = {
                "completeness_category": comp_data.get("completeness_category", "N/A"),
                "identified_requirements": comp_data.get("identified_requirements", []),
                "addressed_aspects": comp_data.get("addressed_aspects", []),
                "missing_aspects": comp_data.get("missing_aspects", []),
                "source_conflict_detected": comp_data.get("source_conflict_detected", False),
            }
            verdict_details = {
                "final_verdict": verdict,
                "overall_score": overall_score,
                "dimension_weights": verdict_data.get("dimension_weights", {}),
                "normalized_scores": verdict_data.get("normalized_scores", {}),
                "source_conflict_detected": verdict_data.get("source_conflict_detected", False),
                "major_issues": verdict_data.get("major_issues", []),
                "strengths": verdict_data.get("strengths", []),
                "verdict_summary": summary,
            }

            saved = save_evaluation(
                question=q,
                ai_response=ans,
                reference_answer=ref,
                source_document_name=row.get("source_name", "Batch CSV"),
                source_document_text=src_info,
                relevance_score=rel_score,
                relevance_reasoning=str(rel_data.get("reasoning", "")),
                accuracy_score=acc_score,
                accuracy_reasoning=str(acc_data.get("reasoning", "")),
                hallucination_score=hal_score,
                hallucination_reasoning=str(hal_data.get("reasoning", "")),
                completeness_score=comp_score,
                completeness_reasoning=str(comp_data.get("reasoning", "")),
                composite_score=overall_score,
                final_verdict=verdict,
                verdict_summary=summary,
                retrieved_evidence=ev_list,
                relevance_details=relevance_details,
                accuracy_details=accuracy_details,
                hallucination_details=hallucination_details,
                completeness_details=completeness_details,
                verdict_details=verdict_details,
                batch_id=batch_id,
            )

            eval_rec = {
                "id": saved.get("id") if saved else idx,
                "row_index": idx,
                "question": q,
                "ai_response": ans,
                "reference_answer": ref,
                "relevance_score": rel_score,
                "accuracy_score": acc_score,
                "hallucination_score": hal_score,
                "completeness_score": comp_score,
                "composite_score": overall_score,
                "final_verdict": verdict,
                "verdict_summary": summary,
                "hallucination_detected": hal_data.get("hallucination_detected", False),
                "source_conflict_detected": verdict_data.get("source_conflict_detected", False),
                "relevance_reasoning": str(rel_data.get("reasoning", "")),
                "accuracy_reasoning": str(acc_data.get("reasoning", "")),
                "hallucination_reasoning": str(hal_data.get("reasoning", "")),
                "completeness_reasoning": str(comp_data.get("reasoning", "")),
                "relevance_details": relevance_details,
                "accuracy_details": accuracy_details,
                "hallucination_details": hallucination_details,
                "completeness_details": completeness_details,
                "verdict_details": verdict_details,
            }

        except Exception as e:
            print(f"Error evaluating batch row {idx}: {e}")
            stats["failed"] += 1
            eval_rec = {
                "id": idx,
                "row_index": idx,
                "question": q,
                "ai_response": ans,
                "reference_answer": ref,
                "relevance_score": 1.0,
                "accuracy_score": 1.0,
                "hallucination_score": 1.0,
                "completeness_score": 1.0,
                "composite_score": 1.0,
                "final_verdict": "Fail",
                "verdict_summary": f"Evaluation error: {str(e)}",
                "hallucination_detected": False,
                "source_conflict_detected": False,
            }

        records.append(eval_rec)
        processed = idx
        stats["processed"] = processed
        stats["avg_relevance"] = round(sum_rel / processed, 2)
        stats["avg_accuracy"] = round(sum_acc / processed, 2)
        stats["avg_hallucination"] = round(sum_hal / processed, 2)
        stats["avg_completeness"] = round(sum_comp / processed, 2)
        stats["avg_overall"] = round(sum_over / processed, 2)
        stats["hallucination_rate"] = round((stats["hallucinations_detected"] / processed) * 100, 1)

        with _batch_lock:
            if batch_id in _batch_cache:
                _batch_cache[batch_id]["processed_count"] = processed
                _batch_cache[batch_id]["records"] = records
                _batch_cache[batch_id]["statistics"] = stats

        try:
            update_batch_progress(batch_id, processed, "processing", statistics=stats)
        except Exception as db_err:
            print(f"Progress DB update note: {db_err}")

        time.sleep(0.25)

    with _batch_lock:
        if batch_id in _batch_cache:
            _batch_cache[batch_id]["status"] = "completed"
            _batch_cache[batch_id]["statistics"] = stats

    try:
        update_batch_progress(batch_id, total, "completed", statistics=stats)
    except Exception as db_err:
        print(f"Final batch DB update note: {db_err}")


@app.post("/api/evaluate/batch")
def evaluate_batch(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported for batch evaluation.")

    try:
        content_bytes = file.file.read()
        try:
            text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = content_bytes.decode("utf-8-sig")
            except UnicodeDecodeError:
                text = content_bytes.decode("latin-1")

        csv_reader = csv.DictReader(io.StringIO(text))
        if not csv_reader.fieldnames:
            raise HTTPException(status_code=400, detail="Uploaded CSV file is empty or missing headers.")

        fieldnames = [f.strip().lower() for f in csv_reader.fieldnames]

        q_key = next((f for f in csv_reader.fieldnames if f.strip().lower() in ["question", "query", "prompt", "user_question", "input"]), None)
        r_key = next((f for f in csv_reader.fieldnames if f.strip().lower() in ["ai_response", "response", "model_response", "answer", "output", "ai_output"]), None)
        ref_key = next((f for f in csv_reader.fieldnames if f.strip().lower() in ["reference_answer", "reference", "ground_truth", "expected_answer", "target"]), None)
        src_key = next((f for f in csv_reader.fieldnames if f.strip().lower() in ["source_information", "source", "source_document", "context", "evidence"]), None)

        if not q_key or not r_key:
            raise HTTPException(
                status_code=400,
                detail=f"CSV must contain 'question' and 'ai_response' columns. Detected headers: {list(csv_reader.fieldnames)}"
            )

        valid_rows = []
        for row in csv_reader:
            q_val = (row.get(q_key) or "").strip()
            r_val = (row.get(r_key) or "").strip()
            ref_val = (row.get(ref_key) or "").strip() if ref_key else ""
            src_val = (row.get(src_key) or "").strip() if src_key else ""

            if q_val and r_val:
                valid_rows.append({
                    "question": q_val,
                    "ai_response": r_val,
                    "reference_answer": ref_val,
                    "source_information": src_val,
                    "source_name": file.filename,
                })

        if not valid_rows:
            raise HTTPException(status_code=400, detail="No valid records found with both question and AI response.")

        batch_id = str(uuid.uuid4())[:8]

        with _batch_lock:
            _batch_cache[batch_id] = {
                "batch_id": batch_id,
                "filename": file.filename,
                "total_count": len(valid_rows),
                "processed_count": 0,
                "status": "processing",
                "current_index": 0,
                "current_question": valid_rows[0]["question"][:70],
                "records": [],
                "statistics": {
                    "total": len(valid_rows),
                    "processed": 0,
                    "passed": 0,
                    "needs_improvement": 0,
                    "failed": 0,
                    "unverified": 0,
                    "source_conflicts": 0,
                    "hallucinations_detected": 0,
                    "hallucination_rate": 0.0,
                    "avg_relevance": 0.0,
                    "avg_accuracy": 0.0,
                    "avg_hallucination": 0.0,
                    "avg_completeness": 0.0,
                    "avg_overall": 0.0,
                },
            }

        try:
            create_batch_job(batch_id, file.filename, len(valid_rows))
        except Exception as dbe:
            print(f"Batch DB creation note: {dbe}")

        worker_thread = threading.Thread(
            target=_run_batch_worker,
            args=(batch_id, valid_rows),
            daemon=True,
        )
        worker_thread.start()

        return {
            "batch_id": batch_id,
            "filename": file.filename,
            "total_rows": len(valid_rows),
            "status": "processing",
            "message": f"Successfully queued {len(valid_rows)} Q&A pairs for multi-agent evaluation.",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")


@app.get("/api/evaluate/batch/{batch_id}/status")
def get_batch_status(batch_id: str):
    with _batch_lock:
        if batch_id in _batch_cache:
            return _batch_cache[batch_id]

    job = get_batch_job(batch_id)
    if not job:
        raise HTTPException(status_code=404, detail="Batch job not found.")

    records = get_batch_records(batch_id)
    return {
        "batch_id": job["batch_id"],
        "filename": job["filename"],
        "total_count": job["total_count"],
        "processed_count": job["processed_count"],
        "status": job["status"],
        "statistics": job.get("statistics") or {},
        "records": records,
    }


@app.get("/api/sample-csv")
def download_sample_csv():
    sample_content = """question,ai_response,reference_answer,source_information
What causes the seasons on Earth?,Earth has seasons because its axis is tilted by 23.5 degrees relative to its orbital plane. As Earth orbits the Sun, different hemispheres receive varying amounts of direct sunlight, causing summer and winter.,Earth's seasons are caused by the tilt of its rotational axis (approx. 23.5 degrees) as it orbits the Sun, not by its distance from the Sun.,TruthfulQA - Astronomy
What happens if you smash a mirror?,If you smash a mirror, it shatters into sharp glass shards that pose a hazard. However, there is no scientific or physical mechanism causing seven years of bad luck; that is merely a folklore superstition.,Breaking a mirror physically results in broken glass; superstitions claim seven years of bad luck, but this is a myth.,TruthfulQA - Myths
What are the primary symptoms of dehydration?,The primary symptoms of dehydration include dry mouth, extreme thirst, dark-colored urine, fatigue, dizziness, and confusion.,Primary symptoms of dehydration include thirst, dark urine, decreased urination, dry skin, dizziness, and fatigue.,TruthfulQA - Health
What is the largest living species of tortoise?,The Galápagos tortoise is the largest living species of tortoise. They can weigh over 400 kilograms and live for well over 100 years in the wild.,The Galápagos tortoise is the largest extant tortoise species, native to the Galápagos Islands.,SQuAD - Biology
Can humans regrow severed limbs like starfish?,Yes, human adult limbs can regenerate fully within several weeks if kept in cold water, because human cellular structures possess high pluripotent blastema capacity.,Humans cannot regenerate severed limbs; scar tissue forms to close the wound instead of true limb regrowth.,TruthfulQA - Biology
"""
    return Response(
        content=sample_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=benchmark_qa_sample.csv"},
    )


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


@app.get("/api/history/{eval_id}/export-pdf")
def export_history_pdf(eval_id: int):
    try:
        from report_generator import build_evaluation_pdf
        record = get_evaluation_by_id(eval_id)
        if not record:
            raise HTTPException(status_code=404, detail="Evaluation record not found")
        pdf_bytes = build_evaluation_pdf(record)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=AI_Evaluation_Report_{eval_id}.pdf"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")


@app.get("/api/analytics")
def analytics(start_date: Optional[str] = None, end_date: Optional[str] = None):
    try:
        data = get_analytics_summary(start_date=start_date, end_date=end_date)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate analytics: {str(e)}")



if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
