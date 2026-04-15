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

// ── LINE 通知 ─────────────────────────────────────────────────────────────
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

// ── Binance 即時價格 ──────────────────────────────────────────────────────
// GET /prices?symbols=BTCUSDT,ETHUSDT
app.get("/prices", async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: "缺少 symbols" });
  try {
    const list = symbols.split(",");
    // Binance ticker/24hr 支援批次
    const { data } = await axios.get(
      "https://api.binance.com/api/v3/ticker/24hr",
      { params: { symbols: JSON.stringify(list) }, timeout: 10000 }
    );
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ── Binance K線（RSI / ADX 用）────────────────────────────────────────────
// GET /klines?symbol=BTCUSDT&interval=1h&limit=100
app.get("/klines", async (req, res) => {
  const { symbol, interval, limit } = req.query;
  if (!symbol || !interval) return res.status(400).json({ error: "缺少參數" });
  try {
    const { data } = await axios.get("https://api.binance.com/api/v3/klines", {
      params: { symbol, interval, limit: limit || 100 },
      timeout: 10000
    });
    // 回傳格式: [[openTime, open, high, low, close, volume, ...], ...]
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ── 搜尋（仍用 CoinGecko，只有搜尋才用，頻率低）────────────────────────
app.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "缺少 query" });
  try {
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      { timeout: 10000 }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ok" }));
app.listen(process.env.PORT || 3000, () => console.log("Proxy 已啟動"));
