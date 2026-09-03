# System Architecture

## Overview

The AI Response Validation System evaluates AI-generated responses for quality, accuracy, and reliability. It uses specialized evaluation agents orchestrated through a central pipeline, with a reference knowledge base and persistent PostgreSQL database storage for grounded evidence and audit tracking.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Evaluation Submission Module                         │  │
│  │  (Question * + AI Response * + Ref Answer + PDF File) │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │  Multi-Stage Agent Progress & Verdict Banner          │  │
│  │  (PASS / FAIL, Composite Score, Neon DB Record ID)    │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │  Evaluation History Dashboard (Top-Right Navbar)      │  │
│  │  (Audit Log of Past Runs Fetched from Neon DB)        │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP API / Multipart
┌──────────────────────────────▼──────────────────────────────┐
│                 Backend / API Layer (FastAPI)                │
│                                                             │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ POST /evaluate │  │  GET /history │  │ POST /retrieve │  │
│  └───────┬────────┘  └───────┬───────┘  └────────────────┘  │
│          │                   │                              │
│          ▼                   ▼                              │
│  ┌────────────────┐  ┌───────────────┐                      │
│  │ PDF Parser     │  │  Neon DB      │                      │
│  │ (pypdf Text)   │  │  (PostgreSQL) │                      │
│  └───────┬────────┘  └───────────────┘                      │
│          │                                                  │
│          ▼                                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ RAG Retrieval Pipeline (Top-10 FAISS Search)          │  │
│  │ (TruthfulQA + SQuAD Benchmark Knowledge Base)         │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│          ┌───────────────────▼───────────────────┐          │
│          │          Agent Orchestrator           │          │
│          │        (Powered by Google Gemini)     │          │
│          └─┬─────────────┬─────────────┬───────┬─┘          │
│            │             │             │       │            │
│            ▼             ▼             ▼       ▼            │
│     ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │
│     │ Relevance  │ │ Accuracy  │ │ Hallucin-│ │ Complete │  │
│     │   Judge    │ │   Judge   │ │  ation   │ │  Judge   │  │
│     │   Agent    │ │   Agent   │ │Detection │ │  Agent   │  │
│     └──────┬─────┘ └─────┬─────┘ └────┬─────┘ └────┬─────┘  │
│            └─────────────┼────────────┴────────────┘        │
│                          ▼                                  │
│                 ┌──────────────────┐                        │
│                 │  Verdict Agent   │                        │
│                 │  (PASS / FAIL)   │                        │
│                 └────────┬─────────┘                        │
│                          │                                  │
│                          ▼                                  │
│                 ┌──────────────────┐                        │
│                 │ Neon PostgreSQL  │                        │
│                 │  Record Storage  │                        │
│                 └──────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## System Components

### 1. Evaluation Input / User Interface (Frontend)
- Single submission interface accepting User Question (required), AI Response to validate (required), optional Reference Ground Truth, and optional PDF Source Document.
- Live multi-stage agent execution progress bar showing active pipeline status.
- Results view featuring large PASS/FAIL verdict banner, composite score (out of 5.00), color-coded agent metric cards (Green/Yellow/Red), and top-10 retrieved evidence cards.
- Evaluation History dashboard accessible from the top-right navbar to view past evaluations stored in Neon PostgreSQL.

### 2. Backend / API Layer (FastAPI)
- `POST /api/evaluate` — Multipart endpoint receiving question, AI response, reference answer, and PDF file. Coordinates PDF parsing, top-10 RAG retrieval, multi-agent evaluation, and Neon DB persistence.
- `GET /api/history` — Fetches past evaluation audit records from Neon PostgreSQL.
- `GET /api/history/{id}` — Fetches details of a specific evaluation run.
- `POST /api/retrieve` — Direct semantic vector search against FAISS benchmark index.
- `GET /` — Backend health check.

### 3. Evaluation Input Processing & PDF Module
- Validates non-empty input payloads.
- Parses uploaded PDF files using `pypdf`, extracting plain text across all document pages and supplying text excerpts directly to the evaluation agents.

### 4. RAG Retrieval Pipeline
- Embeds user queries using Sentence Transformers (`all-MiniLM-L6-v2`, 384 dimensions).
- Searches normalized FAISS `IndexFlatIP` index using cosine similarity.
- Retrieves the top 10 most relevant evidence chunks from TruthfulQA and SQuAD benchmark datasets.

### 5. Agent Orchestrator & Evaluation Agents (Google Gemini)
- **Relevance Judge Agent**: Evaluates if the AI response directly answers the user prompt (1.0 to 5.0 score + reasoning).
- **Accuracy Judge Agent**: Verifies factual truthfulness against reference ground truth, PDF source text, and top-10 retrieved chunks (1.0 to 5.0 score + reasoning).
- **Hallucination Detection Agent**: Scans specifically for fabricated statements, unsupported claims, or contradictions (1.0 to 5.0 score where 5 = zero hallucination + reasoning).
- **Completeness Judge Agent**: Evaluates coverage depth and whether critical aspects are omitted (1.0 to 5.0 score + reasoning).
- **Verdict Agent**: Computes weighted composite score `(0.25 * relevance) + (0.35 * accuracy) + (0.25 * hallucination) + (0.15 * completeness)`, issues final `PASS` or `FAIL` verdict, and provides an executive summary.

### 6. Neon PostgreSQL Database Layer
- Table `evaluation_records` stores full execution payloads: question, AI response, reference answer, source document name and text, individual agent scores and reasonings, composite score, final verdict, and retrieved evidence JSON.

## Scoring Dimensions and Scale

| Dimension | Scale | Thresholds | Description |
|-----------|-------|------------|-------------|
| Relevance | 1.0 - 5.0 | Green: $\ge 4.0$, Yellow: $3.0 - 3.9$, Red: $< 3.0$ | How directly the response answers the question |
| Accuracy | 1.0 - 5.0 | Green: $\ge 4.0$, Yellow: $3.0 - 3.9$, Red: $< 3.0$ | Factual truthfulness against evidence and ground truth |
| Hallucination | 1.0 - 5.0 | Green: $\ge 4.0$, Yellow: $3.0 - 3.9$, Red: $< 3.0$ | Degree of ungrounded or fabricated claims (5 = none) |
| Completeness | 1.0 - 5.0 | Green: $\ge 4.0$, Yellow: $3.0 - 3.9$, Red: $< 3.0$ | Thoroughness of coverage |

### Verdict Criteria

- **PASS**: Composite Score $\ge 3.50$ AND Hallucination Score $\ge 3.00$
- **FAIL**: Composite Score $< 3.50$ OR Hallucination Score $< 3.00$

## Implementation Status (Milestone 1)

| Component | Status | Implementation Details |
|-----------|--------|------------------------|
| Research Documentation (M1.1) | ✅ Done | `docs/research.md` |
| System Architecture Design (M1.2) | ✅ Done | `docs/architecture.md` |
| Evaluation Input Module (M1.3) | ✅ Done | Single submission form with PDF upload |
| Benchmark Ingestion (M1.4) | ✅ Done | TruthfulQA & SQuAD (`backend/knowledge_base/ingest.py`) |
| Vector Embeddings (M1.4) | ✅ Done | MiniLM-L6-v2 (`backend/knowledge_base/embeddings.py`) |
| FAISS Indexing (M1.4) | ✅ Done | 2,766 vectors in `backend/knowledge_base/data/faiss.index` |
| Top-10 RAG Retrieval Pipeline (M1.4) | ✅ Done | `backend/knowledge_base/retrieval.py` |
| Multi-Agent LLM Judges Layer | ✅ Done | Relevance, Accuracy, Hallucination, Completeness (`backend/agents/evaluator.py`) |
| Verdict Agent | ✅ Done | PASS / FAIL verdict synthesis (`backend/agents/evaluator.py`) |
| Evaluation Storage Database | ✅ Done | Neon PostgreSQL integration (`backend/database.py`) |
| Evaluation History Dashboard | ✅ Done | Persistent history view in frontend navbar |
| Agile & Testing Templates | ✅ Done | Backlog, Defect Tracker, Unit Test Plan |
