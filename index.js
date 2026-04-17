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

// 1. 價格路由
app.get("/prices", async (req, res) => {
  try {
    const { fsyms, tsyms } = req.query;
    const { data } = await axios.get(`${CC_URL}/pricemultifull?fsyms=${fsyms}&tsyms=${tsyms}`, {
      headers: { authorization: `Apikey ${process.env.CC_API_KEY}` }
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. K線/指標路由 (對應 CryptoCompare 格式)
app.get("/ohlc", async (req, res) => {
  try {
    const { fsym, tsym, limit, type, aggregate } = req.query;
    const url = `${CC_URL}/v2/${type}?fsym=${fsym}&tsym=${tsym}&limit=${limit}&aggregate=${aggregate}`;
    const { data } = await axios.get(url, {
      headers: { authorization: `Apikey ${process.env.CC_API_KEY}` }
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. LINE 通知
app.post("/notify", async (req, res) => {
  const { message } = req.body;
  try {
    await axios.post("https://api.line.me/v2/bot/message/push", 
      { to: process.env.LINE_USER_ID, messages: [{ type: "text", text: message }] },
      { headers: { Authorization: `Bearer ${process.env.LINE_TOKEN}` } }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.json({ 
  status: "ok", 
  cc_key: process.env.CC_API_KEY ? "✓ 已設定" : "✗ 未設定" 
}));

app.listen(process.env.PORT || 3000);