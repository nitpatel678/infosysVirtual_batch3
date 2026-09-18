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
            return [dict(r) for r in rows]
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
            return dict(row) if row else None
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
            return [dict(r) for r in rows]
    finally:
        conn.close()
