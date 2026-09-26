# SentryAI — Final Mentor Demonstration & Walkthrough Guide
**Infosys Springboard Virtual Internship — Batch 3 (Milestone 4 Final Presentation)**  
**Platform:** SentryAI — Multi-Agent AI Response Validation System  
**Lead Auditor / Presenter:** Nitin Patel  

---

## Presentation Overview & Objectives (40% Weightage)

This guide provides a structured, step-by-step presentation script for the final internship demonstration. It covers all 4 stages of Milestone 4:
1. **M4.1 — Evaluation Scoring Dashboard:** Multi-attribute filtering, score distributions, diagnostic deep-dives, top bottlenecks, batch trends, and clickable drill-down inspection.
2. **M4.2 — Evaluation Report Export:** Single inspection dossiers and multi-page batch executive summaries with Section 4 Automated Recommendations.
3. **M4.3 — End-to-End System Validation:** Verification of multi-agent scoring consistency, quality gates, BM25 context retrieval, and error resilience.
4. **M4.4 — Comparative Evaluation of Two Distinct AI Systems:** Head-to-head benchmarking of OpenAI GPT-4o-mini vs. Google Gemini 1.5 Flash.

---

## 1. Environment & Setup Verification

Before starting the demonstration, verify that the backend and frontend services are running:

### Backend Health Check:
- Terminal 1:
  ```bash
  cd "c:\Users\HP\Desktop\infoyss spring\backend"
  python main.py
  ```
  *Status:* Uvicorn running on `http://localhost:8000`.

### Frontend Development Server:
- Terminal 2:
  ```bash
  cd "c:\Users\HP\Desktop\infoyss spring\frontend"
  npm run dev
  ```
  *Status:* Vite client running on `http://localhost:5173`.

### Offline Test Suite Check (0 Token Consumption):
- To show the mentor that the system is 100% verified without consuming API tokens:
  ```bash
  cd "c:\Users\HP\Desktop\infoyss spring\backend"
  python -m unittest tests/test_milestone4_validation.py
  ```
  *Expected Output:* `Ran 17 tests in ~11s — OK`.

---

## 2. Stage-by-Stage Demonstration Script

### Stage 1: Single-Response Evaluation & Quality Gating
**Goal:** Demonstrate how 4 specialized agents evaluate an AI response under strict closed-world grounding and how the Verdict Agent enforces quality gates.

1. **Navigate to the Single Evaluation Tab:**
   - In the top navigation bar, ensure **Single Evaluation** is active.
   - Point out the **Model Engine Toggle** in the top navbar displaying the official OpenAI and Gemini brand logos.

2. **Run a Grounded, High-Quality Case:**
   - **User Query:** `What is reinforcement learning from human feedback (RLHF) and how does it work?`
   - **AI Response:** `RLHF is a machine learning technique where an initial language model is fine-tuned using human preferences. Human annotators rank multiple model outputs, a reward model is trained on these comparisons, and PPO optimizes the policy against the reward model.`
   - **Reference Ground Truth:** `RLHF aligns AI models with human intent using preference rankings and algorithms like PPO.`
   - Click **Run Multi-Agent Evaluation**.
   - **Showcase to Mentor:**
     - Concurrent agent execution across Relevance, Accuracy, Hallucination, and Completeness.
     - The **Composite Quality Score** (`~4.65/5.00`) and the certified **`Pass (High Quality & Fully Verified)`** verdict badge.
     - The **Radar Chart** visualizing balanced performance across all 4 axes.
     - The **5 Multi-Metric Quality Gates** (all green checkmarks).

3. **Demonstrate a Quality Gate Override (Severe Hallucination):**
   - **User Query:** `What causes the Northern Lights (Aurora Borealis)?`
   - **AI Response:** `The Northern Lights are caused by nuclear radiation released by deep sea hydrothermal vents interacting with cosmic rays in the lower troposphere.`
   - **Reference Ground Truth:** `Auroras are caused by solar wind particles (electrons and protons) colliding with oxygen and nitrogen atoms in Earth's upper atmosphere, guided by Earth's magnetic field.`
   - Click **Run Multi-Agent Evaluation**.
   - **Showcase to Mentor:**
     - The Hallucination Agent scores `1.0/5.0` with `Severe Hallucination` level and flags the fabricated claim.
     - Explain how the **Hallucination Quality Gate breaches**, immediately overriding any other score and forcing a **`Fail (Severe Hallucination)`** verdict.

4. **Demonstrate PDF Source Document Grounding (1 to 100+ Pages):**
   - Upload a PDF document under the **Source Document (PDF)** uploader.
   - Enter a query targeted at an excerpt within the PDF.
   - Explain how SentryAI's **pure-Python Okapi BM25 ranker** extracts only the top relevant passage chunks ($\le 1400$ chars for small PDFs, $\le 2800$ chars for large PDFs), completely eliminating context bloat and token waste.

---

### Stage 2: Batch CSV Evaluation Hub
**Goal:** Show how enterprise batch datasets are evaluated asynchronously with resilient error handling.

1. **Navigate to the Batch Evaluation Tab.**
2. **Upload Dataset A:**
   - Select `datasets/demo_system_openai_gpt4o.csv` (10 curated benchmark test cases).
   - Click **Start Batch Evaluation**.
   - **Showcase to Mentor:**
     - Real-time progress bar polling the background worker.
     - Individual rows populating with distinct verdict badges: `Pass`, `Needs Improvement`, and `Fail`.
     - Explain how SentryAI handles malformed rows or missing columns without crashing the rest of the batch.
3. **Upload Dataset B:**
   - Select `datasets/demo_system_gemini_15.csv`.
   - Process the batch to generate comparative data for cross-model analysis.

---

### Stage 3: Evaluation Scoring Dashboard & Analytics (M4.1)
**Goal:** Showcase the central Milestone 4 analytics hub visualizing batch-over-batch quality, distributions, and diagnostics.

1. **Navigate to the Analytics Dashboard Tab.**
2. **Highlight the Executive KPI Metric Cards:**
   - **Total Responses Evaluated:** Live database count.
   - **Pass Rate:** Total passes and exact percentage.
   - **Needs Improvement:** Marginal responses flagged for refinement.
   - **Critical Failures:** Responses failing quality gates.
3. **Demonstrate Multi-Attribute Filtering:**
   - Use the **Batch Filter Dropdown** to select a specific evaluation batch.
   - Use the **Verdict Filter Dropdown** to isolate only `Fail` or `Needs Improvement` records.
   - Use the **Model Engine Filter** to switch between OpenAI and Gemini results.
   - Click **Reset Filters** to restore combined analytics.
4. **Showcase Dimension Score Distributions:**
   - Point out the 5 distribution cards: **Composite Score**, **Relevance**, **Accuracy**, **Hallucination**, and **Completeness**.
   - Explain the 4-tier distribution bars: Excellent $[4.0-5.0]$, Good $[3.0-3.9]$, Fair $[2.0-2.9]$, and Poor $[1.0-1.9]$.
5. **Demonstrate Deep-Dive Diagnostic Insights:**
   - **Hallucination & Grounding Insights:** Total ungrounded claims, overall ungrounded percentage, and severity distribution (None, Low, Moderate, High, Severe).
   - **Completeness Coverage Insights:** Total omitted aspects, completion status categories (Fully Complete, Mostly Complete, Partially Complete, Incomplete).
6. **Showcase Frequently Occurring Quality Bottlenecks:**
   - Highlight the ranked bottleneck cards showing the exact percentage impact of issues like Low Accuracy, Incomplete Coverage, or Fabricated Claims.
7. **Showcase Cross-Batch Progression & Trends:**
   - Review the batch trends table showing score trajectory across consecutive batch submissions.
   - Click **Filter Batch** directly from a trend row to drill into that batch's isolated metrics.
8. **Demonstrate Drill-Down Navigation:**
   - Scroll to the **Recent Trajectory & Evaluation Audit** table.
   - Click the blue **Inspect Audit →** button on any record.
   - Observe how SentryAI instantly routes the user back to the Single Evaluation tab with the full context, individual agent scores, and evidence pre-loaded for microscopic inspection.

---

### Stage 4: Evaluation Report Export (M4.2)
**Goal:** Demonstrate the export of audit-grade, professional PDF reports for single records and batch evaluations.

1. **Export Single Evaluation Dossier:**
   - On the Single Evaluation tab, click **Export Audit Report (PDF)**.
   - Open the generated PDF:
     - Highlight the executive metadata banner, weighted dimension scorecard, radar breakdown, and verified claim citations.
2. **Export Batch Executive Summary Report:**
   - On the Batch Evaluation tab (or History Dashboard), click **Download Batch Audit Report (PDF)**.
   - Open the multi-page generated PDF:
     - **Section 1: Executive Summary & Quality Rates:** KPI table and dimension averages (Relevance 25%, Accuracy 30%, Hallucination 25%, Completeness 20%).
     - **Section 2: Dimension Breakdown & Quality Gate Status:** Tabular scorecard of gates passed.
     - **Section 3: Complete Multi-Agent Evaluation Audit Logs:** Detailed per-record question, response, reference, agent scores, and verdict rationale.
     - **Section 4: Automated Actionable Quality Improvement Recommendations:** Point out how the system programmatically generates tailored advice based on empirical failure patterns (e.g. prompt engineering recommendations for incomplete answers or RAG grounding advice for hallucinated assertions).
     - **Section 5: Audit Sign-off:** Lead auditor verification stamp.

---

### Stage 5: Comparative Evaluation of Two Distinct AI Systems (M4.4)
**Goal:** Present the head-to-head empirical findings comparing OpenAI GPT-4o-mini and Google Gemini 1.5 Flash.

1. **Present the Comparative Matrix:**
   - Share the comparative findings documented in `docs/FINAL_PROJECT_REPORT.md`:
     - **OpenAI GPT-4o-mini:** Higher completeness on complex architectural queries ($3.95/5.0$), higher Pass rate ($60\%$), but suffered from detailed, fluent hallucinations when knowledge was absent ($20\%$ Fail).
     - **Google Gemini 1.5 Flash:** Higher factual accuracy ($4.28/5.0$) and cleaner hallucination grounding ($4.45/5.0$), but favored concise responses that frequently tripped the Completeness Quality Gate on multi-part medical prompts ($40\%$ Needs Improvement).
2. **Summary Statement to Mentors:**
   > *"SentryAI proves that validating generative AI is not a one-size-fits-all exercise. By deploying specialized judge agents with mathematical weighting and strict quality gates, our platform empowers enterprise teams to detect subtle hallucinations, certify deployment readiness, and export audit-ready evidence in seconds."*
