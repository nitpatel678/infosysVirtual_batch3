# AI Response Validation System

**Infosys Springboard Virtual Internship**  
- **Project:** Development of AI Response Validation System with Hallucination Detection Assistance  
- **Project Code:** #M-3-5  
- **Batch:** 3
---

## About the Project

This system is built to verify AI-generated answers and check whether the content is accurate, relevant, or hallucinated. 

When a user asks a question, the system gets a response from Gemini, then searches a reference knowledge base (built from TruthfulQA and SQuAD benchmark datasets) using vector similarity search to find grounded facts and evidence.

---

## Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Python, FastAPI
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

