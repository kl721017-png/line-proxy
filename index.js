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
  const token  = process.env.LINE_TOKEN;
  const userId = process.env.LINE_USER_ID;
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

// CoinGecko 價格
app.get("/prices", async (req, res) => {
  try {
    const { ids } = req.query;
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CoinGecko OHLC（RSI / ADX 用）
app.get("/ohlc", async (req, res) => {
  try {
    const { id, days } = req.query;
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CoinGecko 搜尋
app.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ok" }));
app.listen(process.env.PORT || 3000, () => console.log("Proxy 已啟動"));
