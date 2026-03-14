import { useState, useRef } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function App() {
  const [collection, setCollection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const { data } = await axios.post(`${API}/upload`, form);
    setCollection(data.collection);
    setMessages([{ role: "assistant",
      text: `✅ Loaded "${file.name}" (${data.chunks} chunks). Ask me anything!` }]);
    setUploading(false);
  };

  const ask = async () => {
    if (!input.trim() || !collection) return;
    const question = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setLoading(true);

    const res = await fetch(`${API}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, collection }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let answer = "";
    setMessages(prev => [...prev, { role: "assistant", text: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      answer += decoder.decode(value);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", text: answer };
        return updated;
      });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>📄 DocuQuery</h1>
      <p style={{ color: "#666" }}>Upload a PDF and ask questions about it</p>

      {/* Upload */}
      <div style={{ border: "2px dashed #ccc", borderRadius: 10, padding: 24,
                    textAlign: "center", cursor: "pointer", marginBottom: 24 }}
           onClick={() => fileRef.current.click()}>
        <input ref={fileRef} type="file" accept=".pdf" hidden onChange={uploadFile} />
        {uploading ? "⏳ Processing..." : collection
          ? "✅ Document loaded — upload another"
          : "Click to upload a PDF"}
      </div>

      {/* Chat */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 10,
                    minHeight: 300, maxHeight: 480, overflowY: "auto", padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12,
            textAlign: m.role === "user" ? "right" : "left" }}>
            <span style={{
              display: "inline-block", padding: "8px 14px", borderRadius: 14,
              background: m.role === "user" ? "#0066ff" : "#f1f1f1",
              color: m.role === "user" ? "#fff" : "#111",
              maxWidth: "80%", textAlign: "left", lineHeight: 1.5
            }}>{m.text}</span>
          </div>
        ))}
        {!collection && <p style={{ color: "#aaa", textAlign: "center", marginTop: 60 }}>
          Upload a PDF to start chatting
        </p>}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          placeholder={collection ? "Ask about your document..." : "Upload a PDF first"}
          disabled={!collection || loading}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8,
                   border: "1px solid #ddd", fontSize: 15 }} />
        <button onClick={ask} disabled={!collection || loading || !input.trim()}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none",
                   background: "#0066ff", color: "#fff", cursor: "pointer", fontSize: 15 }}>
          {loading ? "..." : "Ask"}
        </button>
      </div>
    </div>
  );
}