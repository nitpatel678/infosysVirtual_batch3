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
                    final_verdict VARCHAR(20) NOT NULL,
                    verdict_summary TEXT NOT NULL,
                    retrieved_evidence JSONB
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
):
    init_db()
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
                    retrieved_evidence
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
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
            ))
            row = cur.fetchone()
            conn.commit()
            return dict(row)
    finally:
        conn.close()


def get_evaluations(limit=50):
    init_db()
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
                    verdict_summary
                FROM evaluation_records
                ORDER BY created_at DESC
                LIMIT %s;
            """, (limit,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()


def get_evaluation_by_id(eval_id):
    init_db()
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
