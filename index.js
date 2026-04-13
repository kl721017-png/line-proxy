const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// Allow browser to call this proxy (CORS)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// POST /notify  body: { message }
app.post("/notify", async (req, res) => {
  const { message } = req.body;
  const token  = process.env.LINE_TOKEN;   // Channel access token
  const userId = process.env.LINE_USER_ID; // Your user ID

  if (!token || !userId) return res.status(500).json({ error: "未設定環境變數" });
  if (!message) return res.status(400).json({ error: "缺少 message" });

  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      { to: userId, messages: [{ type: "text", text: message }] },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ok" }));
app.listen(process.env.PORT || 3000, () => console.log("Proxy 已啟動"));
