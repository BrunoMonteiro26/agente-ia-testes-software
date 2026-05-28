require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql2"); // ◄ Adicionado: Ferramenta do Banco de Dados

const app = express();
app.use(cors());
app.use(express.json());

// 🗄️ Conexão com o Banco de Dados (XAMPP)
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "agente_ia"
});

db.connect((err) => {
  if (err) {
    console.error("❌ Erro ao conectar no MySQL do XAMPP:", err.message);
  } else {
    console.log("💾 Conectado com sucesso ao Banco de Dados MySQL!");
  }
});

// 🧠 Memória em memória (simples para aula)
const sessions = {};

// 🛠️ Tools do agente
const tools = {
  getTime: () => {
    return new Date().toLocaleString();
  },

  calculate: (expression) => {
    try {
      return eval(expression).toString();
    } catch {
      return "Erro ao calcular";
    }
  }
};

// 🎯 Prompt do agente
const SYSTEM_PROMPT = `
Você é um Agente de IA inteligente.

Você pode:
- Conversar naturalmente
- Usar ferramentas quando necessário

TOOLS DISPONÍVEIS:
1. getTime → retorna horário atual
2. calculate(expression) → faz cálculos

Quando precisar usar uma ferramenta, responda no formato:
TOOL: nome_da_tool | argumento

Exemplo:
TOOL: calculate | 2+2

Caso contrário, responda normalmente.
`;

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  const id = sessionId || uuidv4();

  if (!sessions[id]) {
    sessions[id] = [
      { role: "system", content: SYSTEM_PROMPT }
    ];
  }

  sessions[id].push({ role: "user", content: message });

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: sessions[id]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    let reply = response.data.choices[0].message.content;

    // 🛠️ Verifica se é chamada de tool
    if (reply.startsWith("TOOL:")) {
      const [, rest] = reply.split("TOOL:");
      const [toolName, arg] = rest.split("|").map(s => s.trim());

      if (tools[toolName]) {
        const result = tools[toolName](arg);

        sessions[id].push({
          role: "assistant",
          content: `Resultado da tool ${toolName}: ${result}`
        });

        reply = `🛠️ Resultado: ${result}`;
      } else {
        reply = "Tool não encontrada";
      }
    } else {
      sessions[id].push({ role: "assistant", content: reply });
    }

    // 💾 SALVAR NO BANCO DE DADOS (MySQL do XAMPP)
    const sql = "INSERT INTO mensagens (pergunta, resposta) VALUES (?, ?)";
    db.query(sql, [message, reply], (err, result) => {
      if (err) {
        console.error("❌ Erro ao salvar mensagem no banco:", err.message);
      } else {
        console.log("📝 Conversa gravada com sucesso no MySQL!");
      }
    });

    res.json({ reply, sessionId: id });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Erro no agente" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🤖 Agente rodando em http://localhost:${process.env.PORT}`);
});