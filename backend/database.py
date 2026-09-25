import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not found in .env")
    return psycopg2.connect(DATABASE_URL)


def init_db():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS evaluation_records (
                    id SERIAL PRIMARY KEY,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    question TEXT NOT NULL,
                    ai_response TEXT NOT NULL,
                    reference_answer TEXT,
                    source_document_name TEXT,
                    source_document_text TEXT,
                    relevance_score REAL NOT NULL,
                    relevance_reasoning TEXT NOT NULL,
                    accuracy_score REAL NOT NULL,
                    accuracy_reasoning TEXT NOT NULL,
                    hallucination_score REAL NOT NULL,
                    hallucination_reasoning TEXT NOT NULL,
                    completeness_score REAL NOT NULL,
                    completeness_reasoning TEXT NOT NULL,
                    composite_score REAL NOT NULL,
                    final_verdict VARCHAR(30) NOT NULL,
                    verdict_summary TEXT NOT NULL,
                    retrieved_evidence JSONB,
                    relevance_details JSONB,
                    accuracy_details JSONB,
                    hallucination_details JSONB,
                    completeness_details JSONB,
                    verdict_details JSONB,
                    batch_id VARCHAR(64)
                );
                ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS relevance_details JSONB;
                ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS accuracy_details JSONB;
                ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS hallucination_details JSONB;
                ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS completeness_details JSONB;
                ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS verdict_details JSONB;
                ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS batch_id VARCHAR(64);

                CREATE TABLE IF NOT EXISTS batch_evaluations (
                    batch_id VARCHAR(64) PRIMARY KEY,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    filename TEXT,
                    total_count INT NOT NULL DEFAULT 0,
                    processed_count INT NOT NULL DEFAULT 0,
                    status VARCHAR(20) NOT NULL DEFAULT 'processing',
                    statistics JSONB,
                    error TEXT
                );
            """)
            conn.commit()
    finally:
        conn.close()


def save_evaluation(
    question,
    ai_response,
    reference_answer,
    source_document_name,
    source_document_text,
    relevance_score,
    relevance_reasoning,
    accuracy_score,
    accuracy_reasoning,
    hallucination_score,
    hallucination_reasoning,
    completeness_score,
    completeness_reasoning,
    composite_score,
    final_verdict,
    verdict_summary,
    retrieved_evidence,
    relevance_details=None,
    accuracy_details=None,
    hallucination_details=None,
    completeness_details=None,
    verdict_details=None,
    batch_id=None,
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO evaluation_records (
                    question,
                    ai_response,
                    reference_answer,
                    source_document_name,
                    source_document_text,
                    relevance_score,
                    relevance_reasoning,
                    accuracy_score,
                    accuracy_reasoning,
                    hallucination_score,
                    hallucination_reasoning,
                    completeness_score,
                    completeness_reasoning,
                    composite_score,
                    final_verdict,
                    verdict_summary,
                    retrieved_evidence,
                    relevance_details,
                    accuracy_details,
                    hallucination_details,
                    completeness_details,
                    verdict_details,
                    batch_id
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING *;
            """, (
                question,
                ai_response,
                reference_answer,
                source_document_name,
                source_document_text,
                relevance_score,
                relevance_reasoning,
                accuracy_score,
                accuracy_reasoning,
                hallucination_score,
                hallucination_reasoning,
                completeness_score,
                completeness_reasoning,
                composite_score,
                final_verdict,
                verdict_summary,
                json.dumps(retrieved_evidence or []),
                json.dumps(relevance_details or {}),
                json.dumps(accuracy_details or {}),
                json.dumps(hallucination_details or {}),
                json.dumps(completeness_details or {}),
                json.dumps(verdict_details or {}),
                batch_id,
            ))
            row = cur.fetchone()
            conn.commit()
            return dict(row)
    finally:
        conn.close()


def get_evaluations(limit=50):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    id,
                    created_at,
                    question,
                    ai_response,
                    reference_answer,
                    source_document_name,
                    relevance_score,
                    accuracy_score,
                    hallucination_score,
                    completeness_score,
                    composite_score,
                    final_verdict,
                    verdict_summary,
                    relevance_details,
                    accuracy_details,
                    hallucination_details,
                    completeness_details,
                    verdict_details,
                    batch_id
                FROM evaluation_records
                ORDER BY created_at DESC
                LIMIT %s;
            """, (limit,))
            rows = cur.fetchall()
            results = []
            json_cols = [
                "relevance_details",
                "accuracy_details",
                "hallucination_details",
                "completeness_details",
                "verdict_details"
            ]
            for r in rows:
                rec = dict(r)
                for col in json_cols:
                    val = rec.get(col)
                    if isinstance(val, str):
                        try:
                            rec[col] = json.loads(val)
                        except Exception:
                            rec[col] = {}
                acc_details = rec.get("accuracy_details") or {}
                acc_score = float(rec.get("accuracy_score") or 0.0)
                if acc_score <= 2.0 and acc_details.get("accuracy_category") == "Correct":
                    acc_details["accuracy_category"] = "Incorrect"
                    rec["accuracy_details"] = acc_details
                results.append(rec)
            return results
    finally:
        conn.close()


def get_evaluation_by_id(eval_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM evaluation_records
                WHERE id = %s;
            """, (eval_id,))
            row = cur.fetchone()
            if not row:
                return None
            record = dict(row)
            json_cols = [
                "retrieved_evidence",
                "relevance_details",
                "accuracy_details",
                "hallucination_details",
                "completeness_details",
                "verdict_details"
            ]
            for col in json_cols:
                val = record.get(col)
                if isinstance(val, str):
                    try:
                        record[col] = json.loads(val)
                    except Exception:
                        record[col] = {} if col != "retrieved_evidence" else []
            acc_details = record.get("accuracy_details") or {}
            acc_score = float(record.get("accuracy_score") or 0.0)
            if acc_score <= 2.0 and acc_details.get("accuracy_category") == "Correct":
                acc_details["accuracy_category"] = "Incorrect"
                record["accuracy_details"] = acc_details
            return record
    finally:
        conn.close()


def create_batch_job(batch_id, filename, total_count):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO batch_evaluations (batch_id, filename, total_count, processed_count, status)
                VALUES (%s, %s, %s, 0, 'processing')
                RETURNING *;
            """, (batch_id, filename, total_count))
            row = cur.fetchone()
            conn.commit()
            return dict(row)
    finally:
        conn.close()


def update_batch_progress(batch_id, processed_count, status, statistics=None, error=None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE batch_evaluations
                SET processed_count = %s,
                    status = %s,
                    statistics = %s,
                    error = %s
                WHERE batch_id = %s
                RETURNING *;
            """, (processed_count, status, json.dumps(statistics) if statistics else None, error, batch_id))
            row = cur.fetchone()
            conn.commit()
            return dict(row) if row else None
    finally:
        conn.close()


def get_batch_job(batch_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM batch_evaluations
                WHERE batch_id = %s;
            """, (batch_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def get_batch_records(batch_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM evaluation_records
                WHERE batch_id = %s
                ORDER BY id ASC;
            """, (batch_id,))
            rows = cur.fetchall()
            results = []
            json_cols = [
                "relevance_details",
                "accuracy_details",
                "hallucination_details",
                "completeness_details",
                "verdict_details"
            ]
            for r in rows:
                rec = dict(r)
                for col in json_cols:
                    val = rec.get(col)
                    if isinstance(val, str):
                        try:
                            rec[col] = json.loads(val)
                        except Exception:
                            rec[col] = {}
                    elif val is None:
                        rec[col] = {}
                for score_col in ["relevance_score", "accuracy_score", "hallucination_score", "completeness_score", "composite_score"]:
                    if rec.get(score_col) is not None:
                        try:
                            rec[score_col] = float(rec[score_col])
                        except Exception:
                            rec[score_col] = 1.0
                results.append(rec)
            return results
    finally:
        conn.close()


def get_all_batches(limit=30):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    batch_id,
                    created_at,
                    filename,
                    total_count,
                    processed_count,
                    status,
                    statistics,
                    error
                FROM batch_evaluations
                ORDER BY created_at DESC
                LIMIT %s;
            """, (limit,))
            rows = cur.fetchall()
            results = []
            for r in rows:
                rec = dict(r)
                if isinstance(rec.get("statistics"), str):
                    try:
                        rec["statistics"] = json.loads(rec["statistics"])
                    except Exception:
                        rec["statistics"] = {}
                elif rec.get("statistics") is None:
                    rec["statistics"] = {}
                results.append(rec)
            return results
    finally:
        conn.close()


def get_analytics_summary(start_date=None, end_date=None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    id,
                    created_at,
                    final_verdict,
                    composite_score,
                    relevance_score,
                    accuracy_score,
                    hallucination_score,
                    completeness_score,
                    hallucination_details,
                    verdict_details
                FROM evaluation_records
                WHERE 1=1
            """
            params = []
            if start_date:
                query += " AND created_at >= %s"
                params.append(start_date)
            if end_date:
                if len(end_date) == 10:
                    end_date_full = f"{end_date} 23:59:59.999999"
                else:
                    end_date_full = end_date
                query += " AND created_at <= %s"
                params.append(end_date_full)

            query += " ORDER BY created_at ASC;"
            cur.execute(query, tuple(params))
            records = cur.fetchall()

            total = len(records)
            if total == 0:
                return {
                    "total": 0,
                    "passed": 0,
                    "needs_improvement": 0,
                    "failed": 0,
                    "unverified": 0,
                    "hallucinations": 0,
                    "conflicts": 0,
                    "rates": {
                        "pass_rate": 0.0,
                        "needs_rate": 0.0,
                        "fail_rate": 0.0,
                        "unverified_rate": 0.0,
                        "hallucination_rate": 0.0,
                    },
                    "averages": {
                        "composite": 0.0,
                        "relevance": 0.0,
                        "accuracy": 0.0,
                        "hallucination": 0.0,
                        "completeness": 0.0,
                    },
                    "monthly_trends": [],
                    "recent_trajectory": [],
                }

            passed = 0
            needs = 0
            failed = 0
            unverified = 0
            hallucinations = 0
            conflicts = 0

            sum_comp = 0.0
            sum_rel = 0.0
            sum_acc = 0.0
            sum_hal = 0.0
            sum_com = 0.0

            from collections import defaultdict
            monthly_groups = defaultdict(lambda: {"total": 0, "passed": 0, "needs": 0, "failed": 0, "unverified": 0, "sum_score": 0.0})

            recent_trajectory = []

            for r in records:
                v = (r["final_verdict"] or "").lower()
                c_score = float(r["composite_score"] or 0.0)
                r_score = float(r["relevance_score"] or 0.0)
                a_score = float(r["accuracy_score"] or 0.0)
                h_score = float(r["hallucination_score"] or 0.0)
                co_score = float(r["completeness_score"] or 0.0)

                sum_comp += c_score
                sum_rel += r_score
                sum_acc += a_score
                sum_hal += h_score
                sum_com += co_score

                is_pass = "pass" in v and "needs" not in v and "fail" not in v
                is_needs = "needs" in v or "moderate" in v
                is_unver = "unverified" in v or "insufficient" in v or "more info" in v
                is_conflict = "conflict" in v

                if is_pass:
                    passed += 1
                elif is_needs:
                    needs += 1
                elif is_unver or is_conflict:
                    unverified += 1
                else:
                    failed += 1


                hal_details = r["hallucination_details"] or {}
                if isinstance(hal_details, str):
                    try:
                        hal_details = json.loads(hal_details)
                    except Exception:
                        hal_details = {}
                if hal_details.get("hallucination_detected", False) or (hal_details.get("hallucination_count", 0) > 0) or h_score < 3.0:
                    hallucinations += 1

                verd_details = r["verdict_details"] or {}
                if isinstance(verd_details, str):
                    try:
                        verd_details = json.loads(verd_details)
                    except Exception:
                        verd_details = {}
                if verd_details.get("source_conflict_detected", False):
                    conflicts += 1

                created = r["created_at"]
                month_key = created.strftime("%b %Y") if hasattr(created, "strftime") else "Current"
                m_entry = monthly_groups[month_key]
                m_entry["total"] += 1
                m_entry["sum_score"] += c_score
                if is_pass:
                    m_entry["passed"] += 1
                elif is_needs:
                    m_entry["needs"] += 1
                elif is_unver:
                    m_entry["unverified"] += 1
                else:
                    m_entry["failed"] += 1

                recent_trajectory.append({
                    "id": r["id"],
                    "score": round(c_score, 2),
                    "verdict": r["final_verdict"],
                    "date": created.strftime("%d %b") if hasattr(created, "strftime") else "",
                })

            monthly_trends = []
            for m_key, m_data in monthly_groups.items():
                monthly_trends.append({
                    "month": m_key,
                    "total": m_data["total"],
                    "passed": m_data["passed"],
                    "needs": m_data["needs"],
                    "failed": m_data["failed"],
                    "unverified": m_data["unverified"],
                    "avg_score": round(m_data["sum_score"] / m_data["total"], 2),
                })

            return {
                "total": total,
                "passed": passed,
                "needs_improvement": needs,
                "failed": failed,
                "unverified": unverified,
                "hallucinations": hallucinations,
                "conflicts": conflicts,
                "rates": {
                    "pass_rate": round((passed / total) * 100, 1),
                    "needs_rate": round((needs / total) * 100, 1),
                    "fail_rate": round((failed / total) * 100, 1),
                    "unverified_rate": round((unverified / total) * 100, 1),
                    "hallucination_rate": round((hallucinations / total) * 100, 1),
                },
                "averages": {
                    "composite": round(sum_comp / total, 2),
                    "relevance": round(sum_rel / total, 2),
                    "accuracy": round(sum_acc / total, 2),
                    "hallucination": round(sum_hal / total, 2),
                    "completeness": round(sum_com / total, 2),
                },
                "monthly_trends": monthly_trends,
                "recent_trajectory": recent_trajectory[-30:],
            }
    finally:
        conn.close()

