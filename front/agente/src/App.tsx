import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3001";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message) return;

    setLoading(true);

    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId })
    });

    const data = await res.json();

    setSessionId(data.sessionId);

    setChat((prev) => [
      ...prev,
      { role: "user", text: message },
      { role: "agent", text: data.reply }
    ]);

    setMessage("");
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Teste de Agente de IA</h1>

      <div className="chat-box">
        {chat.map((msg, i) => (
          <div
            key={i}
            className={`msg ${msg.role === "user" ? "user" : "agent"}`}
          >
            {msg.text}
          </div>
        ))}

        {loading && <div className="loading">⏳ Pensando...</div>}
      </div>

      <div className="input-area">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
        />
        <button onClick={sendMessage} disabled={loading}>
          Enviar
        </button>
      </div>
    </div>
  );
}

export default App;