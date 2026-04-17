const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const CC_URL = "https://min-api.cryptocompare.com/data";

// 1. 價格路由 (API Key 直接帶入網址)
app.get("/prices", async (req, res) => {
  try {
    const { fsyms, tsyms } = req.query;
    const apiKey = process.env.CC_API_KEY || "";
    const url = `${CC_URL}/pricemultifull?fsyms=${fsyms}&tsyms=${tsyms}&api_key=${apiKey}`;
    const { data } = await axios.get(url);
    if (data.Response === "Error") throw new Error(data.Message);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.Message || e.message });
  }
});

// 2. K線/指標路由 (API Key 直接帶入網址)
app.get("/ohlc", async (req, res) => {
  try {
    const { fsym, tsym, limit, type, aggregate } = req.query;
    const apiKey = process.env.CC_API_KEY || "";
    const url = `${CC_URL}/v2/${type}?fsym=${fsym}&tsym=${tsym}&limit=${limit}&aggregate=${aggregate}&api_key=${apiKey}`;
    const { data } = await axios.get(url);
    if (data.Response === "Error") throw new Error(data.Message);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.Message || e.message });
  }
});

// 3. LINE 通知
app.post("/notify", async (req, res) => {
  const { message } = req.body;
  const token = process.env.LINE_TOKEN;
  const userId = process.env.LINE_USER_ID;
  if (!token || !userId) return res.status(500).json({ error: "未設定 LINE 環境變數" });
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

app.get("/", (req, res) => res.json({ 
  status: "ok", 
  cc_key: process.env.CC_API_KEY ? "✓ 已設定" : "✗ 未設定" 
}));

app.listen(process.env.PORT || 3000, () => console.log("Proxy is running"));