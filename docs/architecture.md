# System Architecture

## Overview

The AI Response Validation System evaluates AI-generated responses for quality, accuracy, and reliability. It uses multiple specialized evaluation agents orchestrated through a central pipeline, with a reference knowledge base providing supporting evidence.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│                                                             │
│  ┌──────────────┐    ┌────────────────────────────────┐     │
│  │  Ask AI Tab   │    │  Evaluate Response Tab          │     │
│  │  (Question)   │    │  (Question + AI Response +      │     │
│  │               │    │   Reference + Source Material)   │     │
│  └──────┬───────┘    └───────────────┬────────────────┘     │
│         │                            │                      │
│         └────────────┬───────────────┘                      │
│                      │                                      │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │           Results & Evaluation Dashboard              │   │
│  │  (Scores, Evidence, Reasoning, Verdict)               │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP API
┌──────────────────────▼──────────────────────────────────────┐
│                 Backend / API Layer (FastAPI)                │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ POST /chat   │  │POST /evaluate│  │  GET /health     │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────────────┘   │
│         │                │                                  │
│         ▼                ▼                                  │
│  ┌─────────────┐  ┌──────────────────────────────────┐     │
│  │  Gemini API  │  │  Evaluation Input Processing     │     │
│  │  (Generate)  │  │  Module                          │     │
│  └─────────────┘  └──────────────┬───────────────────┘     │
│                                  │                          │
│                   ┌──────────────▼──────────────────┐       │
│                   │    RAG Retrieval Pipeline       │       │
│                   │  (Query → Embed → Search →     │       │
│                   │   Retrieve Evidence)            │       │
│                   └──────────────┬──────────────────┘       │
│                                  │                          │
│                   ┌──────────────▼──────────────────┐       │
│                   │    Agent Orchestrator           │       │
│                   │  (Coordinates all judge agents) │       │
│                   └──┬───┬───┬───┬───┬─────────────┘       │
│                      │   │   │   │   │                      │
│              ┌───────┘   │   │   │   └──────────┐           │
│              ▼           ▼   ▼   ▼              ▼           │
│        ┌──────────┐ ┌─────┐ ┌─────┐ ┌──────┐ ┌────────┐   │
│        │Relevance │ │Accu-│ │Hall-│ │Compl-│ │Verdict │   │
│        │  Judge   │ │racy │ │ucin-│ │eten- │ │ Agent  │   │
│        │  Agent   │ │Judge│ │ation│ │ess   │ │        │   │
│        │          │ │Agent│ │Det. │ │Judge │ │        │   │
│        └──────────┘ └─────┘ └─────┘ └──────┘ └────────┘   │
│                                                             │
│                   ┌────────────────────────────────┐        │
│                   │  Structured Evaluation Results │        │
│                   │  (Scores + Evidence +          │        │
│                   │   Reasoning + Verdict)         │        │
│                   └────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Reference Knowledge Base                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Benchmark Dataset Ingestion                         │   │
│  │  (TruthfulQA + SQuAD from Hugging Face)              │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Data Cleaning & Chunking Pipeline                   │   │
│  │  (Clean → Standardize → Chunk)                       │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Embedding Generation (Sentence Transformers)        │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Vector Database (FAISS)                             │   │
│  │  (Indexed chunks with metadata)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### 1. Evaluation Input / User Interface (Frontend)
- Provides two interaction modes: Ask AI and Evaluate Response.
- Collects user input: question, AI response, optional reference answer, optional source material.
- Displays evaluation results with scores, evidence, and reasoning.

### 2. Backend / API Layer (FastAPI)
- `POST /api/chat` — Sends question to Gemini, returns AI response.
- `POST /api/evaluate` — Receives evaluation submission, triggers evaluation pipeline.
- `GET /` — Health check.
- Handles input validation, error handling, and CORS.

### 3. Evaluation Input Processing Module
- Validates and preprocesses the evaluation submission.
- Packages the question, AI response, reference answer, and source material for the pipeline.
- Triggers RAG retrieval for additional evidence.

### 4. RAG Retrieval Pipeline
- Embeds the submitted question using Sentence Transformers.
- Searches the FAISS vector store for semantically similar content.
- Returns relevant reference chunks as supporting evidence.
- Evidence is passed to evaluation agents for informed assessment.

### 5. Agent Orchestrator
- Coordinates the execution of all evaluation agents.
- Passes the question, AI response, reference material, and retrieved evidence to each agent.
- Collects results from all agents.
- Passes all results to the Verdict Agent for final assessment.

### 6. Evaluation Agents

#### Relevance Judge Agent
- **Input**: Question, AI response.
- **Task**: Assess whether the response directly addresses the question.
- **Output**: Relevance score (1-5) with reasoning.

#### Accuracy Judge Agent
- **Input**: Question, AI response, reference answer, retrieved evidence.
- **Task**: Verify factual correctness of the response.
- **Output**: Accuracy score (1-5) with reasoning.

#### Hallucination Detection Agent
- **Input**: Question, AI response, reference answer, source material, retrieved evidence.
- **Task**: Identify claims not supported by evidence or reference material.
- **Output**: Hallucination score (1-5, where 5 = no hallucination) with reasoning and flagged claims.

#### Completeness Judge Agent
- **Input**: Question, AI response, reference answer.
- **Task**: Assess whether all aspects of the question are thoroughly answered.
- **Output**: Completeness score (1-5) with reasoning.

#### Verdict Agent
- **Input**: All scores and reasoning from the four judge agents.
- **Task**: Produce final overall assessment.
- **Output**: Overall verdict, confidence level, summary reasoning.

### 7. Reference Knowledge Base
- Stores preprocessed benchmark data from TruthfulQA and SQuAD.
- Data is cleaned, chunked, embedded, and indexed in FAISS.
- Provides semantic search for retrieving relevant reference content.
- Each chunk includes metadata: source dataset, question, answer, category.

### 8. Structured Evaluation Results
- Aggregates all evaluation outputs into a structured format.
- Contains individual dimension scores, reasoning, evidence, and final verdict.

## Scoring System

### Dimensions and Scale

| Dimension | Scale | Description |
|-----------|-------|-------------|
| Relevance | 1-5 | How well the response addresses the question |
| Accuracy | 1-5 | Factual correctness of the response |
| Hallucination | 1-5 | Degree of unsupported or fabricated content (5 = none) |
| Completeness | 1-5 | Thoroughness of the response |

### Overall Verdict

| Verdict | Criteria |
|---------|----------|
| Reliable | Average score >= 4, no dimension below 3 |
| Partially Reliable | Average score >= 3, hallucination score >= 3 |
| Unreliable | Average score < 3 or hallucination score < 3 |

## Data Flow

```
1. User submits question + AI response (+ optional reference/source)
       ↓
2. Backend validates input
       ↓
3. RAG pipeline retrieves relevant evidence from knowledge base
       ↓
4. Orchestrator sends data to all four judge agents
       ↓
5. Each agent evaluates and returns score + reasoning
       ↓
6. Verdict Agent aggregates results → final verdict
       ↓
7. Structured results returned to frontend
       ↓
8. Dashboard displays scores, evidence, reasoning, verdict
```

## Implementation Status (Milestone 1)

| Component | Status | Completed In |
|-----------|--------|--------------|
| Frontend (Ask AI) | ✅ Done | Day 1 |
| Backend API (Chat) | ✅ Done | Day 1 |
| Gemini API Integration | ✅ Done | Day 1 |
| Research Documentation (M1.1) | ✅ Done | Day 2 (`docs/research.md`) |
| System Architecture Design (M1.2) | ✅ Done | Day 2 (`docs/architecture.md`) |
| Evaluation Input Module - API & UI (M1.3) | ✅ Done | Day 2 |
| Benchmark Ingestion - TruthfulQA & SQuAD (M1.4) | ✅ Done | Day 3 (`backend/knowledge_base/ingest.py`) |
| Embedding Generation - Sentence Transformers (M1.4) | ✅ Done | Day 3 (`backend/knowledge_base/embeddings.py`) |
| Vector Database - FAISS Indexing (M1.4) | ✅ Done | Day 3 (`faiss.index`, 2,766 vectors) |
| Semantic Retrieval & RAG Pipeline (M1.4) | ✅ Done | Day 3 (`POST /api/retrieve`, `POST /api/evaluate`) |
| Results Dashboard Evidence Display (M1.4) | ✅ Done | Day 3 |
| AI Evaluation Agents Layer (Scoring logic) | ⬜ Planned | Future Milestones |
| Verdict Agent Logic | ⬜ Planned | Future Milestones |
| Batch Evaluation Module | ⬜ Planned | Future Milestones |
| Evaluation Report Generation | ⬜ Planned | Future Milestones |

