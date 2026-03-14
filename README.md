# DocSense

RAG-based document Q&A — upload a PDF, ask questions, get answers pulled from the document itself.

---

## Stack

| | |
|---|---|
| Backend | FastAPI (Python) |
| Embeddings | SentenceTransformers |
| Vector Store | ChromaDB |
| LLM | Groq API |
| Frontend | React |

---

## Architecture

```
PDF upload → parse → chunk → embed (SentenceTransformers) → store in ChromaDB

Query → embed → similarity search (ChromaDB) → top-k chunks + query → Groq LLM → streamed response
```

---

## Setup

**Prerequisites:** Python 3.9+, Node.js, Groq API key

```bash
git clone https://github.com/Dpk738/DocSense.git

# Backend
cd DocSense/backend
pip install -r requirements.txt
echo "GROQ_API_KEY=your_key_here" > .env
uvicorn app:app --reload

# Frontend
cd ../frontend
npm install
npm start
```

API runs on `http://localhost:8000` — interactive docs at `/docs`.

---

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/upload` | Upload and index a PDF |
| POST | `/query` | Ask a question, returns streamed response |

---

## Project structure

```
DocSense/
├── backend/
│   ├── app.py            # routes, request handling
│   ├── rag.py            # chunking, embedding, retrieval
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── components/
    └── package.json
```

---

## Limitations

- Text-based PDFs only — scanned/image PDFs not supported
- No cross-session memory — each session is stateless
- Single document per session
