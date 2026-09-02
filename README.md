# AI Response Validation System

**Infosys Springboard Virtual Internship**  
- **Project:** Development of AI Response Validation System with Hallucination Detection Assistance  
- **Project Code:** #M-3-5  
- **Batch:** 3  
- **Intern:** Nitin Patel  
- **Mentor:** Devender Pratap  
- **Repository:** https://github.com/nitpatel678/infosysVirtual_batch3.git  

---

## About the Project

This system is built to verify AI-generated answers and check whether the content is accurate, relevant, or hallucinated. 

When a user asks a question, the system gets a response from Gemini, then searches a reference knowledge base (built from TruthfulQA and SQuAD benchmark datasets) using vector similarity search to find grounded facts and evidence.

---

## Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Python, FastAPI, Uvicorn
- **AI Model:** Google Gemini API
- **Embeddings:** Sentence Transformers (`all-MiniLM-L6-v2`)
- **Vector Search:** FAISS
- **Benchmark Data:** TruthfulQA and SQuAD (via Hugging Face)

---

## How to Run

### 1. Backend Setup

Make sure requirements are installed and `.env` has your Gemini API key:

```bash
cd backend
pip install -r requirements.txt
```

Run the backend:
```bash
python main.py
```
*(Runs on `http://127.0.0.1:8000`)*

### 2. Frontend Setup

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:5173`)*

---

## Project Structure

```
├── backend/
│   ├── main.py                     # FastAPI server
│   ├── build_knowledge_base.py     # Script to build FAISS index
│   ├── test_retrieval.py           # Retrieval test script
│   ├── knowledge_base/
│   │   ├── ingest.py               # Downloads TruthfulQA & SQuAD
│   │   ├── embeddings.py           # Vector embeddings generator
│   │   └── retrieval.py            # Semantic search module
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/             # UI components
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
├── docs/
│   ├── research.md                 # Research documentation
│   └── architecture.md             # System architecture design
└── README.md
```

---

## Current Status (Milestone 1)

- Research documentation on LLM evaluation, RAG, and hallucination detection.
- System architecture design and component workflow.
- Submission interface with automated Gemini response generation.
- Knowledge base seeded with TruthfulQA and SQuAD benchmark data.
- FAISS vector search and semantic retrieval pipeline connected.
