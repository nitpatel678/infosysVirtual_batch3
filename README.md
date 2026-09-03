# AI Response Validation System

**Infosys Springboard Virtual Internship**  
- **Project:** Development of AI Response Validation System with Hallucination Detection Assistance  
- **Project Code:** #M-3-5 
---

## About the Project

This system is built to verify AI-generated answers and check whether the content is accurate, relevant, or hallucinated.

Users provide a question, the AI response to validate, optional reference answers, and optional source documents (PDF). The system retrieves relevant grounding facts from a reference benchmark knowledge base (TruthfulQA & SQuAD) using FAISS vector search, executes a multi-agent LLM evaluation layer (Relevance, Accuracy, Hallucination Detection, and Completeness Judge Agents), produces an authoritative PASS/FAIL verdict, and stores all evaluation records permanently in a Neon PostgreSQL database.


## Tech Stack

- **Frontend:** React, Vite, Vanilla CSS, Lucide React
- **Backend:** Python, FastAPI, Uvicorn
- **AI Models:** Google Gemini (`gemini-3.5-flash`)
- **Evaluation Agents:** Multi-Agent Architecture (Relevance, Accuracy, Hallucination, Completeness, Verdict)
- **Embeddings:** Sentence Transformers (`all-MiniLM-L6-v2`, 384 dimensions)
- **Vector Database:** FAISS (`IndexFlatIP`, Cosine Similarity)
- **Relational Database:** Neon PostgreSQL
- **Document Processing:** pypdf (PDF text extraction)
- **Benchmark Knowledge Base:** TruthfulQA (817 QAs) and SQuAD (1,000 contexts) from Hugging Face


## How to Run

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
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
