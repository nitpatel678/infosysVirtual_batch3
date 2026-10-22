# 🛡️ SentryAI — Multi-Agent AI Response Validation Platform

<p align="center">
  <img src="https://img.shields.io/badge/Live%20Demo-Vercel%20Deployed-10b981?style=for-the-badge&logo=vercel" alt="Live Demo" />
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20Render-blue?style=for-the-badge&logo=fastapi" alt="Backend" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL%20%7C%20NeonDB-00e599?style=for-the-badge&logo=postgresql" alt="NeonDB" />
  <img src="https://img.shields.io/badge/Python-3.11%2B-3776ab?style=for-the-badge&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61dafb?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="MIT License" />
</p>

<p align="center">
  <strong>An open-source, enterprise-grade multi-agent platform to inspect, score, and certify AI-generated responses against verified ground truth and unstructured reference documents.</strong>
</p>

<p align="center">
  <a href="https://sentryai-aivalidator.vercel.app/"><strong>🌐 Open Live Demo</strong></a> •
  <a href="#-quickstart-run-locally-in-5-minutes"><strong>🚀 Quickstart</strong></a> •
  <a href="#-how-it-works-the-multi-agent-engine"><strong>🧠 How It Works</strong></a> •
  <a href="#-environment-variables-setup"><strong>🔑 Configuration</strong></a> •
  <a href="#-api-endpoints"><strong>📡 API Reference</strong></a>
</p>

---

## 💡 What is SentryAI?

Large Language Models (LLMs) are probabilistic engines. They frequently generate answers that sound articulate and authoritative, but are **factually wrong, subtly fabricated (hallucinations), or partially incomplete**.

Traditional evaluation methods fail:
- **BLEU / ROUGE metrics:** Measure superficial word overlap without semantic or factual understanding.
- **Monolithic "LLM-as-a-Judge":** Using a single prompt with an LLM leads to **self-preference bias**, **hallucination contagion**, and non-deterministic scoring drift.

**SentryAI solves this by implementing a decoupled multi-agent judge architecture.** Four specialized, domain-specific Judge Agents evaluate the response concurrently in parallel under strict closed-world grounding, synthesized by an authoritative **Verdict Gatekeeper** enforcing **5 non-negotiable Quality Gates**.

```
[ User Prompt & AI Response ] + [ Reference Context / PDF Document ]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 [ Pure-Python Okapi BM25 Ranking ]      [ Parallel Judge Agents Dispatch ]
 - Semantic sliding-window chunking       1. Relevance Judge      (25% Weight)
 - Adaptive token budgeting (<=2800)      2. Factual Accuracy     (30% Weight)
 - Page-level citation tagging            3. Hallucination Agent  (25% Weight)
                                          4. Completeness Judge   (20% Weight)
            │                                     │
            └──────────────────┬──────────────────┘
                               ▼
                [ Authoritative Verdict Agent ]
                - Weighted mathematical scoring
                - 5 Multi-Metric Quality Gates
                - Root-cause reasoning & evidence
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 [ Real-Time Analytics Dashboard ]     [ Publication-Grade PDF Audit Export ]
 - 4-tier score distributions          - NumberedCanvas dynamic pagination
 - Hallucination diagnostic hub        - Color-coded assertion tables
 - Multi-attribute dynamic filtering   - Automated engineering recommendations
```

---

## 🌟 Key Features

- **🎯 Single Response Deep Audit:** Interactive dual-column interface with live status indicators, multi-dimensional radar charts, line-by-line evidence quotes, and Quality Gate verification badges.
- **⚡ High-Throughput Batch CSV Evaluation:** Drag-and-drop CSV datasets, background worker execution via `ThreadPoolExecutor`, real-time progress bar polling, and fault-tolerant row error recovery.
- **📊 Business Intelligence Scoring Dashboard:** Visualizes pass/fail rates, 4-tier dimension distributions ($[4.0-5.0], [3.0-3.9], [2.0-2.9], [1.0-1.9]$), hallucination frequency breakdowns, completeness coverage, and top recurring quality bottlenecks.
- **🔍 Multi-Attribute Data Filtering:** Filter evaluation records simultaneously by Timeline (7d, 30d, 90d, All Time), Batch ID, Verdict category, and AI Model Engine (`openai` vs `gemini`), with one-click drilldown navigation.
- **📄 Executive PDF Report Generator:** Built using ReportLab Platypus with custom `NumberedCanvas` running headers and dynamic footers (*"Page X of Y"*). Includes **Section 4: Automated Actionable Quality Improvement Recommendations** for prompt and retrieval engineering.
- **🔄 Dual AI Model Engine:** Seamlessly toggle between **OpenAI GPT-4o-mini** and **Google Gemini 1.5 Flash** with automated API key rotation and fallback handling.
- **📚 Adaptive Hybrid RAG:** Ingests 1-to-100+ page enterprise PDFs with semantic sliding-window chunking (~650 chars with 80-char overlap) and pure-Python Okapi BM25 ranking ($k_1=1.5, b=0.75$) with exact phrase boosting ($+3.5$).

---

## 🚀 Quickstart: Run Locally in 5 Minutes

### Prerequisites
- **Python 3.11+** installed ([python.org](https://www.python.org/downloads/))
- **Node.js 18+** & `npm` installed ([nodejs.org](https://nodejs.org/))
- An API Key from **OpenAI** or **Google Gemini**

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/nitpatel678/infosysVirtual_batch3.git
cd infosysVirtual_batch3
```

---

### Step 2: Backend Setup (FastAPI)

1. Open a terminal and enter the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` configuration:
   ```bash
   # Windows
   copy .env.example .env

   # Linux / macOS
   cp .env.example .env
   ```

5. Open `.env` and configure your API keys and Neon DB connection:
   ```env
   # 🐘 Neon DB (Serverless PostgreSQL) - Recommended
   # Get a free database at https://neon.tech
   DATABASE_URL=postgresql://neondb_owner:your_password@ep-your-subdomain-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

   # 🚀 Cloud Retrieval Mode (Uses Neon DB GIN index, 0 MB local RAM)
   USE_DB_RETRIEVAL=true

   # 🤖 OpenAI API Key (Primary Multi-Agent Evaluation Engine)
   OPEN_AI_API_KEY=sk-proj-your-openai-key-here

   # ♊ Google Gemini API Key (Secondary Multi-Agent Evaluation Engine)
   GEMINI_API_KEY=your-gemini-key-here
   ```
   > 💡 **Zero-Friction Fallback:** If you don't have a Neon DB account yet, simply leave `DATABASE_URL` empty or commented out. SentryAI will automatically initialize and run on an embedded local SQLite database (`evaluations_fallback.db`) with zero manual setup!

6. Start the backend server:
   ```bash
   python main.py
   ```
   *The backend starts at `http://127.0.0.1:8000` (Swagger docs available at `http://127.0.0.1:8000/docs`).*

---

### Step 3: Frontend Setup (React + Vite)

1. Open a second terminal window and enter the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to:
   ```
   http://localhost:5173
   ```
   *You're all set! Submit a question and response to run your first multi-agent evaluation.*

---

## 🔑 Environment Variables Setup

### Backend (`backend/.env`)

SentryAI reads configuration from `backend/.env`. A complete template is provided in `backend/.env.example`:

```env
# ==============================================================================
# SentryAI Backend Configuration (.env)
# ==============================================================================

# ------------------------------------------------------------------------------
# 🐘 1. Neon DB (Serverless PostgreSQL Database)
# ------------------------------------------------------------------------------
# Neon DB powers all persistent storage in SentryAI, including 2,766 verified
# benchmark knowledge chunks (TruthfulQA + SQuAD 2.0), evaluation audit logs,
# and asynchronous batch jobs.
#
# Free Setup:
# 1. Sign up at: https://neon.tech (free tier includes 500 MB storage & pooling)
# 2. Create a project and select your preferred AWS region
# 3. Copy the connection string from the Dashboard (use the Pooled URL)
# 4. Paste below (make sure ?sslmode=require is present):
DATABASE_URL=postgresql://neondb_owner:your_password@ep-your-subdomain-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# ------------------------------------------------------------------------------
# 🚀 2. Retrieval Mode (Neon DB GIN Search vs Local FAISS)
# ------------------------------------------------------------------------------
# - 'true'  : Queries Neon DB directly using PostgreSQL GIN search vectors and
#             ts_rank_cd. Consumes 0 MB local RAM (vital for Render free tier).
# - 'false' : Uses local FAISS vector index with sentence-transformers
#             (requires PyTorch and ~400 MB of local RAM).
USE_DB_RETRIEVAL=true

# ------------------------------------------------------------------------------
# 🤖 3. OpenAI API Key (Primary Evaluation Engine)
# ------------------------------------------------------------------------------
# Powers GPT-4o-mini for high-precision multi-agent reasoning.
# Get your API key: https://platform.openai.com/api-keys
OPEN_AI_API_KEY=sk-proj-your-openai-api-key-here

# ------------------------------------------------------------------------------
# ♊ 4. Google Gemini API Key (Secondary Evaluation Engine)
# ------------------------------------------------------------------------------
# Powers Gemini 1.5 Flash. Supports automatic key rotation when rate limits occur.
# Get your free key: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-primary-gemini-api-key
GEMINI_API_KEY_2=your-second-gemini-api-key   # Optional: backup key for rotation
GEMINI_API_KEY_3=your-third-gemini-api-key    # Optional: backup key for rotation

# ------------------------------------------------------------------------------
# 🌐 5. Server Port
# ------------------------------------------------------------------------------
PORT=8000
```

### Detailed Backend Variables Breakdown

| Variable | Service | Required? | Description |
| :--- | :---: | :---: | :--- |
| `DATABASE_URL` | **Neon DB** | Recommended | PostgreSQL connection string from [neon.tech](https://neon.tech). Includes connection pooling (`-pooler`) and SSL (`?sslmode=require`). Automatically initializes all relational schemas and indexes. |
| `USE_DB_RETRIEVAL` | **Neon DB** | Recommended | Set to `true` to execute hybrid RAG search over Neon DB's GIN full-text index with 0 MB local memory footprint. Set to `false` for local FAISS. |
| `OPEN_AI_API_KEY` | **OpenAI** | Recommended | API key powering the primary GPT-4o-mini multi-agent evaluation engine. |
| `GEMINI_API_KEY` | **Google Gemini** | Recommended | API key powering the secondary Gemini 1.5 Flash engine. |
| `GEMINI_API_KEY_2/3`| **Google Gemini** | Optional | Fallback Gemini API keys for seamless quota rotation during high-volume batch evaluations. |
| `PORT` | **Uvicorn** | Optional | Backend HTTP listener port (default: `8000`). |

### Frontend (`frontend/.env`)

| Variable | Required? | Description | Default |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Optional | Target backend URL. In local dev, leave as default. In production (Vercel), set to your deployed Render URL. | `http://127.0.0.1:8000` |

---

## 🧠 How It Works: The Multi-Agent Engine

SentryAI decomposes evaluation into specialized, single-responsibility agents:

| Agent | Dimension | Weight | Responsibility & Method |
| :--- | :--- | :---: | :--- |
| **Relevance Judge** | Intent Alignment | **25%** | Evaluates query-response semantic alignment and flags off-topic drift or evasive non-answers. |
| **Accuracy Judge** | Factual Grounding | **30%** | Extracts atomic assertions from the response, compares them against reference ground truth, and cites supporting passages. |
| **Hallucination Agent** | Extrinsic Verification | **25%** | Enforces strict closed-world grounding. Classifies claims into *Supported*, *Unsupported*, *Fabricated*, or *Contradictory*. |
| **Completeness Judge** | Requirement Coverage | **20%** | Deconstructs queries into explicit and implicit requirements; identifies omitted sub-aspects or partial answers. |
| **Verdict Gatekeeper** | Synthesis & Gates | **Enforcer** | Calculates composite score and enforces the **5 Multi-Metric Quality Gates**. |

### Mathematical Scoring Formulation
$$S_{\text{composite}} = (0.25 \times S_{\text{rel}}) + (0.30 \times S_{\text{acc}}) + (0.25 \times S_{\text{hal}}) + (0.20 \times S_{\text{comp}})$$

$$\text{Normalized Score (\%)} = \left(\frac{S_{\text{composite}}}{5.0}\right) \times 100$$

### The Five Non-Negotiable Quality Gates
In production, high fluency or high relevance must never excuse factual inaccuracies or fabrications:

1. **Relevance Gate:** $S_{\text{rel}} \ge 3.50$ and no *Poor* or *Irrelevant* categorization.
2. **Accuracy Gate:** $S_{\text{acc}} \ge 3.50$ and **zero factual contradictions**.
3. **Hallucination Gate:** $S_{\text{hal}} \ge 3.50$ and **zero severe fabrications**.
4. **Completeness Gate:** $S_{\text{comp}} \ge 3.50$ and all core question requirements answered.
5. **Grounding Consistency Gate:** Zero contradictory discrepancies between user reference answers and retrieved knowledge.

### Verdict Hierarchy
- **`Pass`:** Cleared all 5 Quality Gates AND $S_{\text{composite}} \ge 3.70$.
- **`Needs Improvement`:** Composite score between $2.50$ and $3.69$, or minor omissions without factual errors.
- **`Fail`:** Severe hallucination ($S_{\text{hal}} < 2.8$), factual contradiction ($S_{\text{acc}} < 2.3$), irrelevance ($S_{\text{rel}} < 1.8$), or composite $< 2.50$.
- **`Conflict in Information`:** Ground truth conflict between user reference answer and retrieved source text.
- **`Insufficient Evidence`:** Neither reference answer nor source document contains enough context to verify the claim.

---

## 🧪 Automated Testing (100% Offline / Zero Token Burn)

SentryAI includes an offline test suite validating all agents, scoring formulas, decision tree branches, and PDF generation **without calling live LLM APIs**:

```bash
python backend/tests/test_milestone4_validation.py
```

Expected output:
```text
Ran 17 tests in 18.100s

OK (0 failures, 0 errors, 100% offline verification)
```

---

## 📡 API Endpoints

| Method | Endpoint | Payload / Params | Description |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/health` | None | Service health status and database connectivity check. |
| `HEAD`| `/api/health` | None | Lightweight keep-alive ping for cloud monitor services. |
| `POST`| `/api/evaluate` | `question`, `ai_response`, `reference_answer`, `pdf_file`, `engine` | Runs single evaluation across 4 judges + verdict. |
| `POST`| `/api/evaluate/batch` | Multipart CSV, `engine` | Ingests CSV dataset and spawns background worker. |
| `GET` | `/api/evaluate/batch/{id}/status` | `batch_id` | Returns real-time processing progress (processed/total). |
| `GET` | `/api/evaluate/batch/{id}/results`| `batch_id` | Fetches all evaluated rows for a completed batch. |
| `GET` | `/api/analytics` | `batch_id`, `verdict`, `engine`, `timeline` | Computes dynamic KPIs, distributions, and trends. |
| `GET` | `/api/history` | `limit`, `offset` | Retrieves paginated historical evaluation records. |
| `GET` | `/api/export-pdf/{id}` | `record_id` | Generates single-response PDF audit dossier. |
| `GET` | `/api/batch/{id}/export-pdf` | `batch_id` | Generates multi-page batch executive PDF summary. |

---

## ☁️ Cloud Deployment Blueprint

Want to deploy your own instance of SentryAI? It is pre-configured for a modern two-tier cloud setup:

### 1. Backend on Render
1. Create a **New Web Service** on [render.com](https://render.com) pointing to your GitHub fork.
2. Root Directory: `backend`
3. Environment: `Python` (Runtime `3.11.9`)
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add Environment Variables:
   - `OPEN_AI_API_KEY`: Your OpenAI Key
   - `GEMINI_API_KEY`: Your Gemini Key
   - `DATABASE_URL`: Your NeonDB PostgreSQL connection string
   - `USE_DB_RETRIEVAL`: `true` *(ensures 0 MB RAM consumption on Render free tier)*

### 2. Frontend on Vercel
1. Import your repository into [vercel.com](https://vercel.com).
2. Framework Preset: `Vite`
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-app.onrender.com`

---

## 📁 Repository Organization

```
├── backend/
│   ├── agents/                     # Specialized Judge Agents (Relevance, Accuracy, etc.)
│   ├── tests/                      # Automated offline regression test suite
│   ├── database.py                 # NeonDB PostgreSQL / SQLite fallback storage & analytics
│   ├── main.py                     # FastAPI routes, health checks, and batch worker
│   ├── pdf_processor.py            # Okapi BM25 ranker, sliding-window chunker, token budget
│   ├── report_generator.py         # ReportLab NumberedCanvas executive PDF exporter
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Backend environment template
│
├── frontend/
│   ├── src/
│   │   ├── components/             # React views (Analytics, Batch, Single, History)
│   │   ├── config/api.js           # Dynamic API base URL resolver
│   │   ├── App.jsx                 # Main navigation & state container
│   │   └── App.css                 # Dark-mode glassmorphic design system
│   ├── package.json                # Frontend dependencies
│   ├── vercel.json                 # SPA routing rewrites for Vercel
│   └── .env.example                # Frontend environment template
│
├── datasets/                       # Benchmark QA datasets (sample_evaluation_queries_10.csv)
├── docs/                           # Architecture, project reports, and demonstration guides
├── render.yaml                     # Infrastructure-as-code for Render deployment
└── README.md                       # Platform documentation
```

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License & Credits

- **License:** Distributed under the **MIT License**. See the [`LICENSE`](./LICENSE) file for full details and permissions.
- **Developer & Maintainer:** Nitin Patel (2026)
- **Origin:** Conceptualized and developed as part of the **Infosys Springboard Virtual Internship (Batch 3)** under the AI & Intelligent Automation track.
- **Reference Datasets:** TruthfulQA (Lin et al., 2022) & SQuAD 2.0 (Rajpurkar et al., 2018).
- **Core Open Source Libraries:** FastAPI, React, Vite, ReportLab, NeonDB, and PyMuPDF.

---

<p align="center">
  Built with ❤️ for reliable, transparent, and grounded AI.
</p>
