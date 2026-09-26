# SentryAI — Technical Documentation & Architecture Specification
**Infosys Springboard Virtual Internship — Batch 3 (Milestone 4)**  
**Project:** AI Response Validation Platform Using Multi-Agent Architecture  
**Author:** Nitin Patel  
**Technology Stack:** FastAPI, React (Vite), PostgreSQL / SQLite, ReportLab, Okapi BM25, OpenAI GPT-4o-mini, Google Gemini 1.5  

---

## 1. System Overview & Architecture

The **SentryAI Response Validation Platform** is an enterprise-grade evaluation engine designed to rigorously inspect, score, and certify AI-generated responses against verified ground truth and unstructured reference documents. 

Rather than relying on a single, monolithic LLM prompt (which suffers from self-evaluation bias and hallucination contamination), SentryAI employs a **decoupled multi-agent judge architecture** where specialized evaluators assess distinct cognitive dimensions concurrently under strict closed-world grounding.

### 1.1 High-Level Architecture Diagram

```
+--------------------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER (React Vite UI)                            |
|  +------------------------+  +--------------------------+  +----------------------------------+  |
|  | Single Evaluation View |  | Batch CSV Evaluation Hub |  | Analytics & Scoring Dashboard    |  |
|  +------------------------+  +--------------------------+  +----------------------------------+  |
+-------------------------------------------------+------------------------------------------------+
                                                  | (RESTful JSON / Multipart Form-Data)
                                                  v
+--------------------------------------------------------------------------------------------------+
|                               FASTAPI APPLICATION GATEWAY & ORCHESTRATION                        |
|  - Engine Toggle (OpenAI GPT-4o-mini <-> Google Gemini 1.5 Flash)                                |
|  - Request Validation (Pydantic Models) & Multipart Stream Ingestion                             |
|  - Asynchronous Batch Task Worker (ThreadPoolExecutor)                                           |
+-------------------------------------------------+------------------------------------------------+
                                                  |
           +--------------------------------------+--------------------------------------+
           |                                                                             |
           v                                                                             v
+------------------------------------+                         +-----------------------------------+
|      RAG & CONTEXT PIPELINE        |                         |     MULTI-AGENT JUDGE ENGINE      |
|  - Reference Knowledge Base (SQL)  |                         |  - Relevance Judge (25%)          |
|  - Pure-Python Okapi BM25 Ranker   | === Context Stream ===> |  - Accuracy Judge (30%)           |
|  - Semantic Sliding Window Chunker |                         |  - Hallucination Detector (25%)   |
|  - 1-to-100+ Page PDF Ingestion    |                         |  - Completeness Judge (20%)       |
|  - Adaptive Token Budgeting Engine |                         |  - Verdict Agent & Quality Gates  |
+------------------------------------+                         +-----------------+-----------------+
                                                                                 |
                                                                                 v
+--------------------------------------------------------------------------------+-----------------+
|                                    PERSISTENCE & EXPORT LAYER                                    |
|  - Relational Database: PostgreSQL / NeonDB (with auto-sqlite fallback)                          |
|  - ReportLab PDF Generation: Single Audit Dossiers & Executive Batch Multi-Page Summaries        |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Multi-Agent Evaluation Engine

The evaluation process is partitioned into four concurrent domain-specific Judge Agents coordinated by a central Orchestrator, culminating in an authoritative decision produced by the Verdict Agent.

### 2.1 Agent Responsibilities and Workflows

| Agent | Dimension | Weight | Primary Responsibility & Method |
| :--- | :--- | :---: | :--- |
| **Relevance Judge** | Relevance | **25%** | Evaluates query alignment, semantic intent preservation, and flags topic drift or non-answers. |
| **Accuracy Judge** | Accuracy | **30%** | Extracts 2–5 discrete assertions from the response, compares each against reference context, and cites supporting evidence. |
| **Hallucination Agent**| Grounding | **25%** | Classifies every claim as *Supported*, *Unsupported*, *Fabricated*, or *Contradictory*. Detects ungrounded extrinsic hallucination. |
| **Completeness Judge** | Completeness | **20%** | Deconstructs question requirements into sub-aspects and flags missing critical information or partial answers. |
| **Verdict Agent** | Synthesis | **Enforcer**| Applies balanced mathematical weighting, checks 5 multi-metric quality gates, and enforces hierarchical verdicts. |

### 2.2 Mathematical Scoring & Weighted Formulation

The composite quality score ($S_{composite}$) is computed as a weighted linear combination bounded in $[1.0, 5.0]$:

$$S_{composite} = (0.25 \times S_{relevance}) + (0.30 \times S_{accuracy}) + (0.25 \times S_{hallucination}) + (0.20 \times S_{completeness})$$

Normalized Percentage Metric:
$$Score_{\%} = \left(\frac{S_{composite}}{5.0}\right) \times 100$$

### 2.3 Five Strict Multi-Metric Quality Gates

High composite scores cannot mask severe critical deficiencies. The Verdict Agent enforces 5 non-negotiable Quality Gates:

1. **Relevance Gate:** Requires $S_{relevance} \ge 3.5$ and no *Poor Relevance* or *Irrelevant* classifications.
2. **Accuracy Gate:** Requires $S_{accuracy} \ge 3.5$ and zero factual contradictions.
3. **Hallucination Gate:** Requires $S_{hallucination} \ge 3.5$ and no severe ungrounded claims.
4. **Completeness Gate:** Requires $S_{completeness} \ge 3.5$ and no severe omissions of core prompt requirements.
5. **Grounding Consistency Gate:** Requires zero contradictory discrepancies between user reference answers and retrieved benchmark knowledge chunks.

### 2.4 Verdict Hierarchy & Decision Tree

```
                     +----------------------------+
                     | Check Source Discrepancies |
                     +--------------+-------------+
                                    |
            [Discrepancy Exists]   / \   [Consistent]
                    +-------------+   +-------------+
                    v                               v
    +------------------------------+     +-------------------------------+
    | Conflict in Information      |     | Severe Hallucination (<2.8)   |
    | (Source Discrepancy Flagged) |     | OR Inaccuracy (<2.3)          |
    +------------------------------+     | OR Irrelevance (<1.8)         |
                                         | OR Composite < 2.50?          |
                                         +---------------+---------------+
                                                         |
                                                 [Yes]  / \  [No]
                                         +-------------+   +-------------+
                                         v                               v
                                  +--------------+      +-------------------------------+
                                  |     FAIL     |      | Insufficient Context &        |
                                  +--------------+      | Needs External Grounding?     |
                                                        +---------------+---------------+
                                                                        |
                                                                [Yes]  / \  [No]
                                                        +-------------+   +-------------+
                                                        v                               v
                                        +-----------------------+     +-------------------+
                                        | Insufficient Evidence |     | All 5 Gates Pass  |
                                        +-----------------------+     | & Score >= 3.70?  |
                                                                      +---------+---------+
                                                                                |
                                                                        [Yes]  / \  [No]
                                                                +-------------+   +-------------+
                                                                v                               v
                                                         +--------------+      +-------------------+
                                                         |     PASS     |      | Needs Improvement |
                                                         +--------------+      +-------------------+
```

---

## 3. RAG Architecture & Context Processing

SentryAI includes a production-ready, deployment-friendly document ingestion and retrieval system that scales seamlessly from 1-page snippets to 100+ page enterprise PDFs.

### 3.1 PDF Parsing & Semantic Passage Chunking
- **Parser:** `pypdf` extracts UTF-8 text page-by-page, preserving 1-based page indices for traceable audit citations.
- **Sliding Window Chunking:** Documents are segmented into semantic passage windows of ~650 characters with an 80-character boundary overlap, preventing sentence clipping.

### 3.2 Pure-Python Okapi BM25 Ranking Engine
To guarantee zero cold-start latency and prevent RAM bloat on containerized/serverless tiers (e.g. Render 512MB limits), SentryAI implements an ultra-lightweight pure-Python Okapi BM25 ranking algorithm:

$$BM25(D, Q) = \sum_{i=1}^{N} IDF(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$

- $k_1 = 1.5$, $b = 0.75$.
- Query tokens receive a $2.0\times$ priority weighting.
- AI response claim tokens receive a $1.0\times$ correlation weighting.
- Multi-word continuous phrase matches receive a $+3.5$ bonus boost.

### 3.3 Adaptive Token Budgeting
- **Short Documents ($\le 2$ pages):** Capped at 2 top-ranked passages ($\le 1400$ characters).
- **Large Documents ($3$ to $100+$ pages):** Capped at 4 top-ranked passages ($\le 2800$ characters).
This eliminates token burning and ensures LLM context windows receive only the highest-density grounding evidence.

---

## 4. API Endpoints & Data Contracts

### 4.1 Core REST Endpoints

| Endpoint | Method | Payload / Params | Response | Description |
| :--- | :---: | :--- | :--- | :--- |
| `/api/evaluate` | `POST` | `question`, `ai_response`, `reference_answer`, `engine`, `pdf_file` | `JSON (SingleEval)` | Executes single evaluation across 4 judges + verdict. |
| `/api/batch/upload` | `POST` | Multipart CSV file, `engine` | `JSON (BatchMeta)` | Ingests CSV dataset, spawns async batch worker. |
| `/api/batch/{id}/status`| `GET`| `batch_id` | `JSON (Status)` | Polls batch progress (processed/total, percent). |
| `/api/batch/{id}/results`|`GET`| `batch_id` | `JSON (Results)` | Retrieves all evaluated rows for a completed batch. |
| `/api/analytics` | `GET` | `batch_id`, `verdict`, `engine` | `JSON (Analytics)` | Computes aggregated KPIs, distributions, trends. |
| `/api/report/{id}` | `GET` | `record_id` | `PDF (Binary)` | Generates single-audit PDF inspection dossier. |
| `/api/batch/{id}/pdf` | `GET`| `batch_id` | `PDF (Binary)` | Generates multi-page batch executive PDF summary. |

### 4.2 Database Schemas (`database.py`)

- **`evaluation_records` Table:**
  - `id`: Serial primary key
  - `question`, `ai_response`, `reference_answer`: Text
  - `composite_score`, `relevance_score`, `accuracy_score`, `hallucination_score`, `completeness_score`: Float
  - `final_verdict`, `verdict_tag`: String
  - `relevance_data`, `accuracy_data`, `hallucination_data`, `completeness_data`, `verdict_data`: JSONB
  - `batch_id`: Foreign key string (indexed)
  - `engine`: `openai` or `gemini`
  - `created_at`: Timestamp UTC (indexed)

- **`batch_evaluations` Table:**
  - `batch_id`: Primary key string
  - `filename`: Original uploaded filename
  - `status`: `pending`, `processing`, `completed`, `failed`
  - `total_rows`, `processed_rows`: Integer
  - `engine`: Engine used
  - `statistics`: JSONB summary metrics

---

## 5. Analytics Engine Calculation Methodology

The Analytics Engine computes dynamic, database-grounded business intelligence:

1. **Pass / Needs Improvement / Fail Rates:**
   $$\text{Pass Rate (\%)} = \left(\frac{N_{\text{Pass}}}{N_{\text{Total}}}\right) \times 100$$
2. **Dimension Score Distributions (4 Tiers):**
   - Tier 1 (Excellent): $[4.0, 5.0]$
   - Tier 2 (Good): $[3.0, 3.99]$
   - Tier 3 (Fair): $[2.0, 2.99]$
   - Tier 4 (Poor): $[1.0, 1.99]$
3. **Hallucination Frequency:**
   $$\text{Ungrounded Frequency (\%)} = \left(\frac{N_{\text{Hallucinated}}}{N_{\text{Total}}}\right) \times 100$$
4. **Top Bottlenecks Identification:**
   Counts occurrences of Low Accuracy ($< 3.5$), Low Relevance ($< 3.5$), Incomplete Coverage ($< 3.5$), Fabricated Claims, and Source Conflicts, ranking them by percentage impact.
5. **Cross-Batch Trend Tracking:**
   Aggregates chronological batches to plot historical score trajectory ($S_{composite}$) and verdict drift across deployment milestones.

---

## 6. ReportLab PDF Export Architecture

SentryAI leverages ReportLab Platypus flowable document templates to generate high-resolution, audit-grade PDF documents.

### 6.1 Key PDF Structural Elements
1. **Executive Metadata Banner:** Batch ID, filename, timestamp, evaluated records, engine indicator.
2. **KPI Summary Table:** Color-coded metrics for Pass Rate, Needs Improvement, Fail Rate, Hallucination Frequency, and Source Discrepancies.
3. **Dimension Score Breakdown:** Side-by-side comparison of individual dimension scores with their respective weights (25%, 30%, 25%, 20%).
4. **Automated Actionable Quality Improvement Recommendations:** Dynamic diagnostic rules synthesize targeted remediation advice based on empirical batch results.
5. **Full Audit Logs:** Row-by-row question context, AI response, ground truth, individual agent scores, and verdict rationale formatted with defensive page-breaking and zero text overlap.
