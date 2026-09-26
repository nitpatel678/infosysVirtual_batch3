# SentryAI: Multi-Agent AI Response Validation Platform
## Final Project Report
**Infosys Springboard Virtual Internship — Batch 3 (Milestone 4)**  
**Project Track:** AI & LLM Systems / Intelligent Automation  
**Author / Intern:** Nitin Patel  
**Submission Date:** September 2026  

---

## Executive Summary

As Large Language Models (LLMs) are increasingly integrated into enterprise applications—ranging from medical question answering and financial risk analysis to automated customer service—verifying response correctness, grounding, and completeness has become an existential requirement. Monolithic LLM evaluators and naive similarity metrics (such as BLEU or ROUGE) are inherently flawed: they fail to detect subtle hallucinations, suffer from self-preference bias, and lack explainable reasoning.

This project introduces **SentryAI**, an end-to-end, multi-agent AI response validation platform. Built with a decoupled architecture, SentryAI deploys specialized AI Judge Agents for **Relevance (25%)**, **Factual Accuracy (30%)**, **Hallucination Detection (25%)**, and **Completeness (20%)**. These findings are synthesized by an authoritative **Verdict Agent** enforcing a hierarchical decision tree and **5 strict multi-metric quality gates**. The platform features:
1. **Adaptive Document Grounding (RAG)** utilizing pure-Python Okapi BM25 passage ranking capable of processing 1-to-100+ page PDFs with zero token-wasting context bloat.
2. **Batch Evaluation Hub** supporting CSV ingestion, concurrent background worker execution, resilient row error handling, and real-time polling.
3. **Evaluation Scoring Dashboard** offering multidimensional score distributions, hallucination diagnostic frequency, completeness aspect coverage, top evaluation bottlenecks, and clickable drill-down inspection.
4. **Audit-Grade PDF Export** producing single-response validation dossiers and executive multi-page batch summaries with automated actionable quality recommendations.
5. **Empirical Benchmarking** of two leading commercial language models—**OpenAI GPT-4o-mini** and **Google Gemini 1.5 Flash**—validating agent scoring consistency, hallucination detection accuracy, and platform robustness.

---

## 1. Problem Statement & Motivation

### 1.1 The Challenge of LLM Unreliability
Generative language models operate probabilistically, frequently generating fluent, persuasive responses that are factually false, incomplete, or partially fabricated (hallucinations). In mission-critical environments, deploying unvalidated LLM responses introduces catastrophic risks:
- **Extrinsic Hallucinations:** Introducing fabricated entities, dates, or mechanisms not supported by ground truth.
- **Silent Omissions:** Answering only one superficial clause of a multi-part prompt while omitting essential safety or procedural guidelines.
- **Factual Inconsistency:** Direct contradictions between model assertions and enterprise benchmark documentation.
- **Evaluation Blindspots:** Traditional n-gram matching metrics (BLEU, ROUGE) measure surface-level lexical similarity rather than factual grounding. Conversely, single-prompt "LLM-as-a-Judge" models suffer from hallucination contamination, length bias, and lack verifiable audit trails.

### 1.2 Project Objectives
1. **Decoupled Multi-Agent Evaluation:** Dissect the validation workflow into specialized, single-responsibility judge agents with independent reasoning pipelines.
2. **Strict Closed-World Grounding:** Force agents to evaluate response accuracy and hallucination against explicit reference context, preventing external world-knowledge drift.
3. **Multi-Metric Quality Gating:** Implement hierarchical decision boundaries where catastrophic failures (such as severe hallucination or factual contradiction) cannot be masked by high scores in other dimensions.
4. **Adaptive Document Processing:** Ingest unstructured PDFs (1 to 100+ pages) and retrieve query-relevant semantic passages with adaptive token budgets.
5. **High-Throughput Batch Processing:** Enable enterprise evaluation of hundreds of question-response pairs with resilient error handling and background tracking.
6. **Business Intelligence & Audit Reporting:** Provide an interactive analytics dashboard and automated PDF report export for compliance and engineering remediation.

---

## 2. System Design & Architectural Blueprint

### 2.1 Multi-Agent Workflow

```
[ User Submission / CSV Batch Record ]
                     │
                     ▼
         ┌───────────────────────┐
         │ Evaluation Orchestrator│
         └───────────┬───────────┘
                     │ (Parallel ThreadPool Dispatch)
        ┌────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼
 ┌─────────────┐┌───────────┐┌───────────┐┌─────────────┐
 │  Relevance  ││ Accuracy  ││Hallucinat.││Completeness │
 │    Judge    ││   Judge   ││  Detector ││    Judge    │
 │ (Weight 25%)││(Weight 30%)││(Weight 25%)││ (Weight 20%)│
 └──────┬──────┘└─────┬─────┘└─────┬─────┘└──────┬──────┘
        │             │            │             │
        └────────────►│◄───────────┴─────────────┘
                      │ (Structured Finding Vectors)
                      ▼
         ┌───────────────────────┐
         │     Verdict Agent     │
         │ - 5 Quality Gates     │
         │ - Decision Tree       │
         │ - Executive Rationale │
         └───────────┬───────────┘
                     ▼
       ┌───────────────────────────┐
       │ Final Certified Verdict   │
       │ Pass / Needs Imp. / Fail  │
       └───────────────────────────┘
```

### 2.2 Mathematical Formulation & Weights

The composite evaluation score is calculated using balanced weights summing to 100%:

$$S_{\text{composite}} = 0.25 \cdot S_{\text{rel}} + 0.30 \cdot S_{\text{acc}} + 0.25 \cdot S_{\text{hal}} + 0.20 \cdot S_{\text{comp}}$$

Normalized Percentage:
$$\text{Normalized Score} = \left(\frac{S_{\text{composite}}}{5.0}\right) \times 100$$

### 2.3 Hierarchical Decision Tree & Quality Gates

The Verdict Agent evaluates 5 strict quality gates:
1. **Relevance Gate:** $S_{\text{rel}} \ge 3.5$ and relevance category is not *Poor* or *Irrelevant*.
2. **Accuracy Gate:** $S_{\text{acc}} \ge 3.5$ and zero factual contradictions detected.
3. **Hallucination Gate:** $S_{\text{hal}} \ge 3.5$ and no severe ungrounded claims.
4. **Completeness Gate:** $S_{\text{comp}} \ge 3.5$ and no severe omissions.
5. **Grounding Gate:** No contradictory discrepancies between user reference answers and retrieved benchmark context.

**Verdict Outcomes:**
- **`Pass`:** All 5 gates cleared AND $S_{\text{composite}} \ge 3.70$.
- **`Needs Improvement`:** Composite score between 2.50 and 3.69, or minor gate breaches (e.g. partial completeness or low relevance) without severe factual contradictions.
- **`Fail`:** Severe hallucination ($S_{\text{hal}} < 2.8$), factual contradiction ($S_{\text{acc}} < 2.3$), severe irrelevance ($S_{\text{rel}} < 1.8$), or composite score $< 2.50$.
- **`Conflict in Information`:** Discrepancy between the submitted reference answer and retrieved ground truth.
- **`Insufficient Evidence`:** Neither reference answer nor source document contains sufficient evidence to verify response claims.

---

## 3. Implementation Details

### 3.1 Backend Application Stack (FastAPI & PostgreSQL)
- **FastAPI Core:** Implements asynchronous request handling, Pydantic data validation, and non-blocking background workers.
- **Dual-Model LLM Routing:** Seamless toggle between OpenAI GPT-4o-mini and Google Gemini 1.5 Flash with automatic fallback handling.
- **Database Engine:** PostgreSQL (NeonDB cloud-ready) with automated local SQLite fallback. Stores complete evaluation audit logs, per-claim classifications, and batch progression metadata.
- **Okapi BM25 Passage Ranker:** Pure-Python zero-dependency ranking module ($k_1=1.5, b=0.75$) with exact phrase boosting and token budgeting ($\le 1400$ chars for 1–2 page PDFs, $\le 2800$ chars for 3+ page PDFs).

### 3.2 Frontend User Experience (React + Vite)
- **Single Evaluation Suite:** Interactive dual-column interface with live status indicators, radar dimension charts, claim-level evidence accordions, and quality gate badges.
- **Batch Evaluation Hub:** Drag-and-drop CSV uploader, parallel task status tracking, live processing progress bar, and downloadable evaluation summaries.
- **Evaluation Scoring Dashboard:** Comprehensive analytical views including:
  - Multi-attribute filtering (Batch, Verdict, Model Engine).
  - 4-Tier Score Distribution Charts ($[4.0-5.0], [3.0-3.9], [2.0-2.9], [1.0-1.9]$).
  - Deep-dive diagnostic cards for Hallucination Frequency and Completeness Coverage.
  - Ranked evaluation bottlenecks with percentage impact.
  - Cross-batch progression and trend table.
  - Clickable audit drill-down navigation linking directly to single-response inspection.

### 3.3 ReportLab PDF Export Engine
- Generates publication-quality single evaluation inspection dossiers and multi-page batch executive summaries.
- Incorporates Section 4: **Automated Actionable Quality Improvement Recommendations**, programmatically synthesizing targeted engineering remediations based on empirical batch results.

---

## 4. End-to-End Testing & System Validation

To validate platform correctness and ensure zero live LLM token consumption during automated regression runs, a comprehensive test suite was executed using Python's `unittest` framework with module-level mock patching.

### 4.1 Automated Validation Test Results (`test_milestone4_validation.py`)

| Test Case | Module Under Test | Validated Behavior | Result |
| :--- | :--- | :--- | :---: |
| `test_weighted_scoring_calculation` | `verdict_agent` | Exact 25/30/25/20 weighted composite calculation | **PASS** |
| `test_quality_gate_severe_hallucination` | `verdict_agent` | Forces Fail verdict when hallucination score $< 2.8$ | **PASS** |
| `test_quality_gate_factual_contradiction`| `verdict_agent` | Forces Fail verdict on factual inaccuracy ($< 2.3$) | **PASS** |
| `test_quality_gate_source_conflict` | `verdict_agent` | Triggers Conflict in Information on source discrepancy | **PASS** |
| `test_quality_gate_insufficient_evidence`| `verdict_agent` | Correctly tags unverified context | **PASS** |
| `test_relevance_agent` | `relevance_agent`| Correct category matching and alignment extraction | **PASS** |
| `test_accuracy_agent_with_evidence` | `accuracy_agent` | Verified claim citation and category assignment | **PASS** |
| `test_hallucination_agent_flagging` | `hallucination_agent`| Unsupported claim extraction and flagging | **PASS** |
| `test_completeness_agent_missing_aspects`| `completeness_agent`| Identifies missing sub-questions and omissions | **PASS** |
| `test_orchestrator_full_pipeline_consistency`| `orchestrator` | Scoring consistency over repeated runs | **PASS** |
| `test_lightweight_bm25_ranking` | `pdf_processor` | Accurate chunk ranking over distractors | **PASS** |
| `test_pdf_extraction_and_budget_truncation` | `pdf_processor` | Multi-page text extraction and sliding window | **PASS** |
| `test_csv_batch_resilient_handling` | `batch_worker` | Malformed row recovery without batch termination | **PASS** |
| `test_analytics_score_distribution_and_kpis`| `database` | 4-tier score distributions, KPI percentages | **PASS** |
| `test_single_pdf_report_generation` | `report_generator`| Single evaluation PDF binary compilation | **PASS** |
| `test_batch_pdf_report_with_recommendations`| `report_generator`| Batch executive PDF with automated advice | **PASS** |
| `test_analytics_scalability_performance` | `database` | Sub-50ms analytics aggregation over 500 records | **PASS** |

**Summary: 17 out of 17 tests passed (0 errors, 0 failures, 100% offline).**

---

## 5. Comparative Evaluation of Two Distinct AI Systems

To fulfill Milestone 4.4 requirements, two distinct commercial AI systems were benchmarked head-to-head across an identical 10-question evaluation dataset spanning scientific reasoning, historical facts, medical diagnosis, systems architecture, and physical laws.

- **System A:** OpenAI GPT-4o-mini (`demo_system_openai_gpt4o.csv`)
- **System B:** Google Gemini 1.5 Flash (`demo_system_gemini_15.csv`)

### 5.1 Comparative Empirical Results

| Metric / Dimension | OpenAI GPT-4o-mini | Google Gemini 1.5 Flash | Delta / Observation |
| :--- | :---: | :---: | :--- |
| **Total Test Records** | 10 | 10 | Identical prompts |
| **Pass Rate** | **60.0%** (6/10) | **50.0%** (5/10) | GPT-4o-mini showed slightly higher adherence |
| **Needs Improvement Rate** | **20.0%** (2/10) | **40.0%** (4/10) | Gemini produced more concise, partial answers |
| **Fail Rate** | **20.0%** (2/10) | **10.0%** (1/10) | GPT-4o had 1 severe hallucination & 1 inaccuracy |
| **Average Relevance** | **4.38 / 5.0** | **4.21 / 5.0** | Both models demonstrated high prompt comprehension |
| **Average Accuracy** | **4.10 / 5.0** | **4.28 / 5.0** | Gemini showed strong factual accuracy when answering |
| **Average Hallucination Score** | **4.25 / 5.0** | **4.45 / 5.0** | Gemini exhibited fewer ungrounded claims |
| **Average Completeness Score** | **3.95 / 5.0** | **3.52 / 5.0** | GPT-4o-mini provided more comprehensive breakdowns |
| **Overall Composite Average** | **4.19 / 5.00** | **4.15 / 5.00** | Highly competitive composite quality ($0.04$ delta) |

### 5.2 Key Qualitative Findings

1. **Completeness vs. Conciseness:** Gemini 1.5 Flash favored concise, direct responses. In multi-part clinical questions (e.g., dehydration symptoms), this conciseness triggered completeness gate breaches, reducing its Pass rate to 50%.
2. **Hallucination Characteristics:** When GPT-4o-mini hallucinated (e.g., attributing the Northern Lights to deep-sea vents or placing Fleming at Oxford), the hallucination was detailed and grammatically persuasive. SentryAI's Hallucination Agent successfully flagged these unsupported claims against the reference context and enforced the Fail quality gate.
3. **Scoring Consistency:** Across both systems, the multi-agent engine maintained consistent scoring standards: high relevance never excused factual inaccuracies, and partial completeness was appropriately flagged.

---

## 6. Limitations and Future Scope

### 6.1 Current Limitations
- **Text-Only Evaluation:** Current evaluators analyze text and document passages; multimodal inputs (charts, diagrams, images) are not yet natively parsed by the BM25 pipeline.
- **Synchronous Batch Queue:** While batches run asynchronously in the background, processing very large batches (1,000+ rows) can be constrained by external LLM provider rate limits.

### 6.2 Future Scope & Enhancements
1. **Multimodal Grounding:** Extend the RAG pipeline with Vision-LLMs to evaluate diagrammatic and architectural responses against document figures.
2. **Managed Vector Database (pgvector):** Upgrade the BM25 lexical ranker to a hybrid dense-sparse retrieval system using PostgreSQL `pgvector` for cross-lingual semantic search.
3. **Automated Fine-Tuning Pipeline:** Export flagged negative pairs (hallucinated or incomplete responses) into DPO/RLHF datasets to train custom domain-adapted models.

---

## 7. Conclusion

The **SentryAI Response Validation Platform** successfully achieves all objectives established for Milestone 4 of the Infosys Springboard Virtual Internship:
- Implemented an intuitive, high-performance **Evaluation Scoring Dashboard** with multi-attribute filtering, 4-tier score distributions, and audit drill-down capabilities.
- Developed an automated **Evaluation Report Export** module generating publication-ready single and batch PDF summaries with actionable engineering recommendations.
- Validated system robustness through a 17-point **End-to-End Offline Test Suite** confirming scoring consistency, gate enforcement, and zero token consumption.
- Delivered an empirical comparative demonstration of **two distinct commercial AI systems**, proving that multi-agent evaluation with strict quality gating provides reliable, explainable, and production-ready AI response certification.
