# SentryAI — Enterprise Multi-Agent AI Response Validation & Certification Platform

[![Live App](https://img.shields.io/badge/Live%20Demo-Vercel%20Deployed-10b981?style=for-the-badge&logo=vercel)](https://sentryai-aivalidator.vercel.app/)
[![Backend Status](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Render-blue?style=for-the-badge&logo=fastapi)](https://sentryai-aivalidator.vercel.app/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20NeonDB-00e599?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776ab?style=for-the-badge&logo=python)](https://www.python.org/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61dafb?style=for-the-badge&logo=react)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/Internship-Infosys%20Springboard%20Batch%203-FF9900?style=for-the-badge)](https://springboard.infosys.com/)

> **Infosys Springboard Virtual Internship — Batch 3 (Milestone 4)**  
> **Project Title:** AI Response Validation Platform Using Multi-Agent Architecture with Hallucination Detection Assistance  
> **Author / Developer:** Nitin Patel  
> **Live Production Application:** [https://sentryai-aivalidator.vercel.app/](https://sentryai-aivalidator.vercel.app/)

---

## 🌐 Live Deployments & URLs

- **Frontend Web Application (Vercel):** [https://sentryai-aivalidator.vercel.app/](https://sentryai-aivalidator.vercel.app/)
- **Backend API Gateway (Render):** FastAPI application with automated health check pings (`HEAD /api/health` and `GET /api/health`).
- **Cloud Database (NeonDB):** Serverless PostgreSQL instance hosting verified benchmark knowledge chunks, evaluation audit logs, and batch jobs.

---

## 📖 Executive Overview & Project Purpose

As Large Language Models (LLMs) are increasingly integrated into enterprise workflows—ranging from customer advisory and technical support to medical summaries and regulatory compliance—**unverified model outputs pose catastrophic business and legal risks**. LLMs operate probabilistically, frequently generating fluent, persuasive responses that contain:
1. **Extrinsic Hallucinations:** Fabricating entities, dates, or scientific mechanisms that have no grounding in source evidence.
2. **Factual Contradictions:** Directly asserting claims that conflict with verified reference truth.
3. **Silent Omissions:** Answering only one clause of a multi-part query while omitting critical procedural guidelines.

Traditional evaluation approaches rely on naive n-gram lexical overlap (BLEU, ROUGE) or monolithic "LLM-as-a-Judge" single prompts. Both methods are fundamentally flawed: BLEU/ROUGE cannot evaluate semantic truth, while monolithic LLMs suffer from **self-preference bias**, **non-deterministic scoring drift**, and **hallucination contagion**.

### The SentryAI Solution
**SentryAI** is an end-to-end, decoupled multi-agent AI response validation platform. Instead of a single evaluator, SentryAI deploys four specialized domain-specific Judge Agents running concurrently in parallel under strict closed-world grounding:
- **Relevance Judge Agent (25%)**
- **Factual Accuracy Judge Agent (30%)**
- **Hallucination Detection Agent (25%)**
- **Completeness Judge Agent (20%)**

Findings are synthesized by an authoritative **Verdict Agent** enforcing a strict hierarchical decision tree and **5 non-negotiable Multi-Metric Quality Gates**, guaranteeing that catastrophic failures (such as severe hallucination or factual contradiction) can never be masked by high scores in other dimensions.

---

## 🏗️ System Architecture

```
+--------------------------------------------------------------------------------------------------+
|                                  PRESENTATION LAYER (React 18 + Vite)                            |
|  +------------------------+  +--------------------------+  +----------------------------------+  |
|  | Single Evaluation Hub  |  | Batch CSV Evaluation Hub |  | Analytics & Scoring Dashboard    |  |
|  +------------------------+  +--------------------------+  +----------------------------------+  |
+-------------------------------------------------+------------------------------------------------+
                                                  | (RESTful JSON / Multipart Form-Data)
                                                  v
+--------------------------------------------------------------------------------------------------+
|                               FASTAPI APPLICATION GATEWAY & ORCHESTRATION                        |
|  - Engine Toggle (OpenAI GPT-4o-mini <-> Google Gemini 1.5 Flash) with Key Rotation              |
|  - Request Validation (Pydantic Models) & Multipart Stream Ingestion                             |
|  - Asynchronous Batch Task Worker (ThreadPoolExecutor) & Progress Poller                         |
+-------------------------------------------------+------------------------------------------------+
                                                  |
           +--------------------------------------+--------------------------------------+
           |                                                                             |
           v                                                                             v
+------------------------------------+                         +-----------------------------------+
|      HYBRID RAG & CONTEXT PIPELINE |                         |     MULTI-AGENT JUDGE ENGINE      |
|  - 2,766 Benchmark Knowledge Chunks|                         |  - Relevance Judge (25%)          |
|  - Pure-Python Okapi BM25 Ranker   | === Context Stream ===> |  - Accuracy Judge (30%)           |
|  - Semantic Sliding Window Chunker |                         |  - Hallucination Detector (25%)   |
|  - 1-to-100+ Page PDF Ingestion    |                         |  - Completeness Judge (20%)       |
|  - NeonDB PostgreSQL GIN Search    |                         |  - Verdict Agent & Quality Gates  |
|  - Adaptive Token Budgeting Engine |                         +-----------------+-----------------+
+------------------------------------+                                           |
                                                                                 v
+--------------------------------------------------------------------------------+-----------------+
|                                    PERSISTENCE & EXPORT LAYER                                    |
|  - Relational Database: PostgreSQL / NeonDB (with auto-sqlite fallback)                          |
|  - ReportLab PDF Generation: Single Audit Dossiers & Executive Batch Multi-Page Summaries        |
+--------------------------------------------------------------------------------------------------+
```

---

## 🌟 Key Features

### 1. Single Query Validation & Audit Dossier
- Dual-column interactive evaluation workspace with real-time progress indicators.
- Multidimensional radar charts visualizing individual agent scores.
- Atomic assertion breakdown citing exact line-by-line evidence from retrieved documents.
- Five color-coded Quality Gate status badges and final certified verdict.

### 2. High-Throughput Batch CSV Evaluation Hub
- Drag-and-drop CSV dataset ingestion supporting hundreds of query-response pairs.
- Non-blocking asynchronous background execution via Python `ThreadPoolExecutor`.
- Defensive row-level error handling: malformed CSV records or individual agent timeouts never terminate the remaining batch.
- Real-time progress bar polling (`/api/batch/{batch_id}/status`) with processed/total counters.

### 3. Evaluation Scoring Dashboard (Milestone 4.1)
- **Aggregate KPI Overview:** Total Queries Evaluated, Pass Rate (%), Needs Improvement (%), Fail Rate (%), and Ground-Truth Conflicts.
- **4-Tier Dimension Score Distributions:** Granular breakdown across Relevance, Accuracy, Hallucination Resistance, and Completeness into Optimal (4.0–5.0), Good (3.0–3.9), Fair (2.0–2.9), and Critical (1.0–1.9) tiers.
- **Diagnostic Deep-Dives:** Quantifies Clean Responses, Moderate Speculation, Severe Fabrications, and Completeness aspect coverage.
- **Quality Bottlenecks Ranking:** Highlights ranked recurring failure modes (e.g. Incomplete Coverage, Unsupported Claims, Off-Topic Drift).
- **Synchronized Multi-Attribute Filtering:** Filter dynamically by Timeline (All Time, 7d, 30d, 90d), Evaluation Batch, Verdict category, and AI Model Engine (`openai` vs `gemini`).
- **One-Click Audit Drilldown:** Instant navigation from aggregate dashboard cards directly to detailed single evaluation records.

### 4. Publication-Grade Executive PDF Report Export (Milestone 4.2)
- High-resolution, multi-page PDF generation built with ReportLab Platypus.
- Custom `NumberedCanvas` engine calculating two-pass exact page numbering (**"Page X of Y"**) and rendering running headers (**"SentryAI • Multi-Agent Response Validation & Audit Report • Infosys Springboard Batch 3"**).
- **Section 4: Automated Actionable Quality Improvement Recommendations** programmatically synthesizes targeted prompt engineering, retrieval tuning, and confidence thresholding guidelines based on identified failure patterns.

### 5. Dual AI Engine Switching & Quota Rotation
- Seamless toggle between **OpenAI GPT-4o-mini** (Primary high-adherence engine) and **Google Gemini 1.5 Flash** (Secondary engine).
- Automatic API key rotation across multiple backup keys (`GEMINI_API_KEY`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`) with exponential backoff.

### 6. Cloud-Optimized Dual-Mode Retrieval
- **Local Mode:** FAISS dense vector search (`IndexFlatIP`) paired with `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions).
- **Cloud Mode (Render 512 MB RAM Optimization):** 2,766 verified benchmark chunks indexed into NeonDB PostgreSQL with GIN search vectors and `ts_rank_cd`, consuming **0 MB local RAM on Render** and delivering 3ms retrieval latency.
- **Adaptive Token Budgeting:** Restricts retrieved context to $\le 1400$ characters (2 chunks) for short PDFs ($\le 2$ pages) and $\le 2800$ characters (4 chunks) for large PDFs ($3-100+$ pages).

---

## ⚖️ Multi-Agent Scoring Model & Quality Gates

The composite evaluation score is computed as a weighted linear combination bounded in $[1.0, 5.0]$:

$$S_{\text{composite}} = (0.25 \times S_{\text{relevance}}) + (0.30 \times S_{\text{accuracy}}) + (0.25 \times S_{\text{hallucination}}) + (0.20 \times S_{\text{completeness}})$$

$$\text{Normalized Score (\%)} = \left(\frac{S_{\text{composite}}}{5.0}\right) \times 100$$

### The Five Non-Negotiable Quality Gates
To prevent high scores in one dimension from masking catastrophic factual contradictions or fabrications:

| Quality Gate | Minimum Threshold | Enforced Rule |
| :--- | :---: | :--- |
| **1. Relevance Gate** | $\ge 3.50$ | Query intent preserved; response must not be classified as *Poor* or *Irrelevant*. |
| **2. Accuracy Gate** | $\ge 3.50$ | Factual assertions verified against ground truth; **zero contradictions allowed**. |
| **3. Hallucination Gate** | $\ge 3.50$ | Assertions strictly grounded in source context; **zero severe fabrications allowed**. |
| **4. Completeness Gate** | $\ge 3.50$ | All primary and implicit requirements of the prompt must be answered. |
| **5. Grounding Consistency Gate** | Binary Pass | Zero contradictory discrepancies between user reference answers and retrieved knowledge. |

### Verdict Threshold Hierarchy
- **`Pass`:** All 5 Quality Gates cleared AND $S_{\text{composite}} \ge 3.70$.
- **`Needs Improvement`:** Composite score between $2.50$ and $3.69$, or minor omissions without factual contradictions.
- **`Fail`:** Severe hallucination ($S_{\text{hal}} < 2.8$), factual contradiction ($S_{\text{acc}} < 2.3$), severe irrelevance ($S_{\text{rel}} < 1.8$), or composite score $< 2.50$.
- **`Conflict in Information`:** Discrepancy detected between user reference answer and retrieved ground truth.
- **`Insufficient Evidence`:** Context lacks sufficient verifiable evidence to certify or debunk claims.

---

## 🛠️ Technology Stack

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Frontend Presentation** | React 18, Vite, Vanilla CSS (Glassmorphism & Dark Mode Tokens), Lucide Icons, Custom SVG Charts |
| **Backend & Application Gateway** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, Python-Multipart |
| **AI Evaluation Models** | OpenAI GPT-4o-mini, Google Gemini 1.5 Flash (`google-genai` / `google-generativeai`) |
| **Retrieval & RAG Engine** | Pure-Python Okapi BM25 ($k_1=1.5, b=0.75$), PyMuPDF / `pypdf`, Sliding Window Chunker |
| **Vector & Cloud Search** | FAISS (`faiss-cpu`), Sentence Transformers (`all-MiniLM-L6-v2`), NeonDB PostgreSQL GIN Full-Text Index |
| **Relational Persistence** | PostgreSQL 16 (NeonDB Serverless Pooler), `psycopg2-binary`, SQLite3 local fallback |
| **Audit Document Generation** | ReportLab Platypus, Flowables, Two-Pass `NumberedCanvas`, Dynamic Headings & Tables |
| **DevOps & Cloud Hosting** | Vercel (Frontend SPA), Render (Backend Web Service), GitHub Actions, UptimeRobot |

---

## 📂 Repository Structure

```
infoyss spring/
├── backend/
│   ├── agents/                     # Specialized Judge Agents
│   │   ├── relevance_agent.py      # Relevance Judge (25%)
│   │   ├── accuracy_agent.py       # Accuracy Judge (30%)
│   │   ├── hallucination_agent.py  # Hallucination Detector (25%)
│   │   ├── completeness_agent.py   # Completeness Judge (20%)
│   │   └── verdict_agent.py        # Verdict Agent & 5 Quality Gates
│   ├── database.py                 # NeonDB PostgreSQL / SQLite persistence & analytics
│   ├── main.py                     # FastAPI routes, batch worker, and health checks
│   ├── pdf_processor.py            # BM25 ranker, sliding window chunker, token budget
│   ├── report_generator.py         # ReportLab NumberedCanvas executive PDF engine
│   ├── requirements.txt            # Pinned backend Python dependencies
│   ├── tests/
│   │   └── test_milestone4_validation.py # 17 automated offline test cases
│   └── .env                        # Backend environment configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/             # React modular UI components
│   │   │   ├── AnalyticsDashboard.jsx     # BI charts, metrics, filters, and drill-downs
│   │   │   ├── BatchEvaluationModule.jsx  # CSV upload, progress polling, results table
│   │   │   ├── SingleEvaluationModule.jsx # Two-column audit workspace & radar charts
│   │   │   ├── HistoryModule.jsx          # Certified audit logs and PDF downloads
│   │   │   └── KnowledgeBaseModule.jsx    # Benchmark knowledge browser
│   │   ├── config/
│   │   │   └── api.js              # Centralized dynamic API base URL binding
│   │   ├── App.jsx                 # Navigation state & multi-agent routing
│   │   ├── App.css                 # Premium glassmorphic design system
│   │   └── index.css               # Typography & global dark theme
│   ├── package.json                # Frontend npm dependencies
│   ├── vercel.json                 # Vercel SPA client routing rewrites
│   └── vite.config.js              # Vite bundler configuration
│
├── datasets/                       # Benchmark evaluation datasets
│   ├── demo_system_openai_gpt4o.csv       # 10 benchmark QA pairs for OpenAI GPT-4o-mini
│   ├── demo_system_gemini_15.csv          # 10 benchmark QA pairs for Google Gemini 1.5
│   └── sample_evaluation_queries_10.csv   # General cross-domain testing dataset
│
├── docs/                           # Technical documentation & reports
│   ├── FINAL_PROJECT_REPORT.md            # Comprehensive project report (Milestone 4.4)
│   ├── TECHNICAL_DOCUMENTATION.md         # Full architecture specification & APIs
│   ├── FINAL_DEMONSTRATION_GUIDE.md       # Demonstration manual & system comparison
│   ├── architecture.md                    # Multi-agent flow & sequence diagrams
│   └── SentryAI_Final_Project_Report_and_Technical_Documentation.docx # Formal Word docx
│
├── agile_methodologyFiles/         # Industry Agile tracking templates
│   ├── Agile_Template_v0.1.xls            # Product Backlog, Sprint Backlog, Standups, Retros
│   ├── Defect_Tracker Template_v0.1.xlsx  # Defect tracking (#1 to #26)
│   └── Unit_Test_Plan_v0.1.xlsx           # Unit test executions (UT_01 to UT_32)
│
├── render.yaml                     # Render cloud infrastructure-as-code blueprint
├── .gitignore                      # Git exclusion rules (keeps reports & envs private)
└── README.md                       # Comprehensive platform documentation
```

---

## ⚙️ Environment Variables Configuration (`.env`)

To run SentryAI locally or in production, configure the respective `.env` files:

### 1. Backend Environment Configuration (`backend/.env`)

Create a file named `.env` inside the `backend/` directory:

```env
# =====================================================================
# SentryAI Backend Configuration
# =====================================================================

# 1. Primary AI Model Engine (OpenAI)
OPEN_AI_API_KEY=sk-proj-your-openai-api-key-here

# 2. Secondary AI Model Engine (Google Gemini) with Backup Rotation
GEMINI_API_KEY=your-primary-gemini-api-key
GEMINI_API_KEY_2=your-second-gemini-api-key
GEMINI_API_KEY_3=your-third-gemini-api-key

# 3. Relational Database Connection (NeonDB PostgreSQL or Local PostgreSQL)
# Format: postgresql://[user]:[password]@[host]/[dbname]?sslmode=require
DATABASE_URL=postgresql://neondb_owner:your_password@ep-your-subdomain.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# 4. Retrieval Mode Configuration
# Set to 'true' in cloud/production (Render) for 0 MB RAM NeonDB GIN full-text search.
# Set to 'false' in local environments if you want to use local dense FAISS vector index.
USE_DB_RETRIEVAL=true

# 5. Optional Server Port
PORT=8000
```

> **Note on Database Fallback:** If `DATABASE_URL` is omitted, the application automatically falls back to an embedded SQLite database (`backend/evaluations_fallback.db`), ensuring zero-friction local setup without external dependencies.

---

### 2. Frontend Environment Configuration (`frontend/.env`)

Create a file named `.env` inside the `frontend/` directory (optional for local dev):

```env
# =====================================================================
# SentryAI Frontend Configuration
# =====================================================================

# For local development (defaults to http://127.0.0.1:8000 if not specified):
VITE_API_BASE_URL=http://127.0.0.1:8000

# For production deployment on Vercel:
# Set this in Vercel Project Settings -> Environment Variables
# VITE_API_BASE_URL=https://sentryai-backend.onrender.com
```

---

## 🚀 Step-by-Step Local Setup & Execution Guide

Follow these steps to run SentryAI locally on your workstation:

### Prerequisites
- **Python:** Version 3.11 or higher installed ([python.org](https://www.python.org/downloads/))
- **Node.js:** Version 18.x or higher and `npm` installed ([nodejs.org](https://nodejs.org/))
- **Git:** Installed on your operating system

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/nitpatel678/infosysVirtual_batch3.git
cd infosysVirtual_batch3
```

---

### Step 2: Backend Setup & Execution

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. *(Recommended)* Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create and configure your `backend/.env` file as documented in the [Environment Variables](#1-backend-environment-configuration-backendenv) section.

5. Start the FastAPI development server:
   ```bash
   python main.py
   ```
   *The backend will initialize and listen on `http://127.0.0.1:8000`.*
   *Interactive API Docs (Swagger UI) available at `http://127.0.0.1:8000/docs`.*

---

### Step 3: Frontend Setup & Execution

1. Open a second terminal window and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend application will compile and launch on `http://localhost:5173`.*

4. Open your browser and navigate to **`http://localhost:5173`** to use SentryAI!

---

## 🧪 Testing & System Verification (100% Offline / Zero Token Burn)

SentryAI includes a comprehensive offline automated integration test suite in `backend/tests/test_milestone4_validation.py`. The suite validates all scoring calculations, decision tree paths, quality gates, RAG ranking, and PDF generation **using mocked responses so that zero live LLM API tokens are consumed**.

Run the test suite from the repository root:

```bash
python backend/tests/test_milestone4_validation.py
```

### Test Suite Execution Output
```text
----------------------------------------------------------------------
Ran 17 tests in 18.100s

OK (0 failures, 0 errors, 100% offline verification)
```

| Test Case | Scope & Scenario Verified | Result |
| :--- | :--- | :---: |
| `test_weighted_scoring_calculation` | Validates exact 25/30/25/20 weighted composite formulation | **PASSED** |
| `test_quality_gate_severe_hallucination` | Forces Fail verdict when hallucination score $< 2.8$ | **PASSED** |
| `test_quality_gate_factual_contradiction`| Forces Fail verdict on factual contradiction ($< 2.3$) | **PASSED** |
| `test_quality_gate_source_conflict` | Triggers Conflict in Information on ground truth mismatch | **PASSED** |
| `test_quality_gate_insufficient_evidence`| Correctly flags unverified context | **PASSED** |
| `test_relevance_agent` | Validates prompt alignment and intent preservation | **PASSED** |
| `test_accuracy_agent_with_evidence` | Verifies atomic assertion verification and citation | **PASSED** |
| `test_hallucination_agent_flagging` | Validates unsupported claim extraction and flagging | **PASSED** |
| `test_completeness_agent_missing_aspects`| Deconstructs query and flags partial omissions | **PASSED** |
| `test_orchestrator_full_pipeline_consistency`| Repeated evaluation consistency across runs | **PASSED** |
| `test_lightweight_bm25_ranking` | Accurate passage ranking over distractor chunks | **PASSED** |
| `test_pdf_extraction_and_budget_truncation` | Multi-page text extraction and sliding window chunking | **PASSED** |
| `test_csv_batch_resilient_handling` | Malformed CSV row recovery without batch termination | **PASSED** |
| `test_analytics_score_distribution_and_kpis`| 4-tier distributions and KPI percentage calculations | **PASSED** |
| `test_single_pdf_report_generation` | Single evaluation PDF binary compilation | **PASSED** |
| `test_batch_pdf_report_with_recommendations`| Batch executive PDF with automated engineering advice | **PASSED** |
| `test_analytics_scalability_performance` | Sub-50ms analytics aggregation over 500 records | **PASSED** |

---

## 📡 Core API Endpoints

| HTTP Method | Route | Parameters / Payload | Description |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/health` | None | Returns service health status and database connectivity. |
| `HEAD` | `/api/health` | None | Zero-overhead keep-alive ping for cloud monitor services. |
| `POST` | `/api/evaluate` | `question`, `ai_response`, `reference_answer`, `pdf_file`, `engine` | Executes single evaluation across 4 judges + verdict. |
| `POST` | `/api/evaluate/batch` | Multipart CSV file, `engine` | Ingests batch dataset and spawns background worker. |
| `GET` | `/api/evaluate/batch/{batch_id}/status` | `batch_id` | Returns real-time batch processing progress and status. |
| `GET` | `/api/evaluate/batch/{batch_id}/results` | `batch_id` | Retrieves all evaluated records for a completed batch. |
| `GET` | `/api/analytics` | `batch_id`, `verdict`, `engine`, `timeline` | Computes dynamic KPI statistics, distributions, and trends. |
| `GET` | `/api/history` | `limit`, `offset` | Retrieves paginated historical evaluation records. |
| `GET` | `/api/export-pdf/{record_id}` | `record_id` | Generates audit-grade single evaluation PDF inspection dossier. |
| `GET` | `/api/batch/{batch_id}/export-pdf` | `batch_id` | Generates multi-page batch executive PDF summary with recommendations. |

---

## 📊 Dual AI Model Empirical Comparison (Milestone 4.4)

As part of Milestone 4.4, two distinct commercial AI systems were evaluated across an identical standardized 10-query benchmark dataset spanning science, history, medicine, and systems architecture:

| Evaluation Metric | System A: OpenAI GPT-4o-mini | System B: Google Gemini 1.5 Flash | Empirical Analysis & Observations |
| :--- | :---: | :---: | :--- |
| **Total Test Records** | 10 | 10 | Standardized identical benchmark questions |
| **Pass Rate (%)** | **60.0%** (6/10) | **50.0%** (5/10) | OpenAI showed higher adherence to complex multi-part queries |
| **Needs Improvement (%)** | **20.0%** (2/10) | **40.0%** (4/10) | Gemini favored concise responses, triggering completeness gates |
| **Fail Rate (%)** | **20.0%** (2/10) | **10.0%** (1/10) | OpenAI experienced 1 severe hallucination & 1 factual error |
| **Average Relevance** | **4.38 / 5.0** | **4.21 / 5.0** | Both systems maintained tight query intent alignment |
| **Average Accuracy** | **4.10 / 5.0** | **4.28 / 5.0** | Gemini demonstrated high factual accuracy when answering |
| **Hallucination Resistance** | **4.25 / 5.0** | **4.45 / 5.0** | Gemini produced fewer ungrounded claims |
| **Completeness Score** | **3.95 / 5.0** | **3.52 / 5.0** | OpenAI provided more exhaustive multi-aspect breakdowns |
| **Overall Composite Average** | **4.19 / 5.00** | **4.15 / 5.00** | Highly competitive composite quality ($0.04$ delta) |

---

## ☁️ Cloud Deployment Blueprint

SentryAI is engineered for production deployment across separated cloud tiers:

1. **Frontend Presentation (Vercel):**
   - Configured with `frontend/vercel.json` for client-side SPA route rewrites.
   - Connected to GitHub for automatic zero-downtime deployment on push to `main`.
   - Dynamic API binding configured via `VITE_API_BASE_URL`.

2. **Backend Application Gateway (Render):**
   - Deployed as a Python 3.11 Web Service using `render.yaml`.
   - Build Command: `pip install -r requirements.txt`.
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
   - Health check path set to `/api/health`.
   - Configured with `USE_DB_RETRIEVAL=true` to ensure zero RAM consumption by offloading retrieval to NeonDB.

3. **Database Layer (NeonDB Serverless PostgreSQL):**
   - Hosted on AWS `ap-southeast-1` region with serverless connection pooling.
   - Auto-initializes `evaluation_records`, `batch_evaluations`, and `knowledge_chunks` tables on initial startup.

---

## 👥 Acknowledgements & Credits

- **Infosys Springboard:** For providing the Virtual Internship platform, structured curriculum, and technical mentorship.
- **Academic Datasets:** Hugging Face TruthfulQA and SQuAD 2.0 benchmark datasets.
- **Open Source Communities:** FastAPI, React, Vite, ReportLab, and NeonDB.

---

## 📄 License & Academic Integrity

This project is submitted in partial fulfillment of the requirements for the **Infosys Springboard Virtual Internship (Batch 3)** and Bachelor of Technology degree. Developed by **Nitin Patel**. All rights reserved.
