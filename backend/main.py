from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import fitz  # PyMuPDF
import chromadb
from sentence_transformers import SentenceTransformer
from groq import Groq
from dotenv import load_dotenv
import os, uuid, json

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                  allow_methods=["*"], allow_headers=["*"])

# Init models once at startup
embedder = None
chroma = None
groq_client = None

@app.on_event("startup")
def startup():
    global embedder, chroma, groq_client
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    chroma = chromadb.Client()
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def chunk_text(text: str, size=500, overlap=50):
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + size])
        start += size - overlap
    return chunks

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    # 1. Extract text from PDF
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = " ".join(page.get_text() for page in doc)

    # 2. Chunk the text
    chunks = chunk_text(text)

    # 3. Embed and store in ChromaDB
    collection_name = f"doc_{uuid.uuid4().hex[:8]}"
    collection = chroma.create_collection(collection_name)
    embeddings = embedder.encode(chunks).tolist()
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[str(i) for i in range(len(chunks))]
    )
    return {"collection": collection_name, "chunks": len(chunks)}

class QueryRequest(BaseModel):
    question: str
    collection: str

@app.post("/query")
async def query_doc(req: QueryRequest):
    collection = chroma.get_collection(req.collection)

    # 1. Embed the question
    q_embedding = embedder.encode([req.question]).tolist()

    # 2. Retrieve top-5 relevant chunks
    results = collection.query(query_embeddings=q_embedding, n_results=5)
    context = "\n\n".join(results["documents"][0])

    # 3. Stream answer from Groq (Llama 3 - free)
    def stream():
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "Answer questions based only on the provided context."},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {req.question}"}
            ],
            stream=True
        )
        for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    return StreamingResponse(stream(), media_type="text/plain")