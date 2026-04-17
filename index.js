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

// LINE 通知
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

// CryptoCompare 價格與 OHLC 路由 (透過 Proxy 解決 CORS 並帶入 API Key)
const CC_URL = "https://min-api.cryptocompare.com/data";

app.get("/prices", async (req, res) => {
  const apiKey = process.env.CC_API_KEY;
  try {
    const { fsyms, tsyms } = req.query;
    const { data } = await axios.get(`${CC_URL}/pricemultifull?fsyms=${fsyms}&tsyms=${tsyms}`, {
      headers: { authorization: `Apikey ${apiKey}` }
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/ohlc", async (req, res) => {
  const apiKey = process.env.CC_API_KEY;
  try {
    const { fsym, tsym, limit, aggregate, type } = req.query;
    // type 可為 histohour, histoday 等
    const url = `${CC_URL}/v2/${type}?fsym=${fsym}&tsym=${tsym}&limit=${limit}&aggregate=${aggregate}`;
    const { data } = await axios.get(url, {
      headers: { authorization: `Apikey ${apiKey}` }
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    cc_key: process.env.CC_API_KEY ? "✓ 已設定" : "✗ 未設定" 
  });
});

app.listen(process.env.PORT || 3000, () => console.log("Proxy is running"));