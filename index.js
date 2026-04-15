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

const CC_KEY = process.env.cc_api_key || process.env.CC_API_KEY || "";

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

// ── 價格（CryptoCompare pricemultifull）──────────────────────────────────
app.get("/prices", async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: "缺少 symbols" });
  try {
    const { data } = await axios.get("https://min-api.cryptocompare.com/data/pricemultifull", {
      params: { fsyms: symbols, tsyms: "USD", api_key: CC_KEY },
      timeout: 10000
    });
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ── K線（CryptoCompare histohour / histoday）─────────────────────────────
app.get("/klines", async (req, res) => {
  const { symbol, interval, limit } = req.query;
  if (!symbol || !interval) return res.status(400).json({ error: "缺少參數" });
  const endpointMap = { "1H": "histohour", "4H": "histohour", "1D": "histoday" };
  const aggregateMap = { "1H": 1, "4H": 4, "1D": 1 };
  const endpoint  = endpointMap[interval]  || "histohour";
  const aggregate = aggregateMap[interval] || 1;
  const lim = parseInt(limit) || 120;
  try {
    const { data } = await axios.get(`https://min-api.cryptocompare.com/data/v2/${endpoint}`, {
      params: { fsym: symbol, tsym: "USD", limit: lim, aggregate, api_key: CC_KEY },
      timeout: 10000
    });
    if (data.Response === "Error") throw new Error(data.Message);
    res.json(data.Data.Data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 搜尋（CryptoCompare coinlist）────────────────────────────────────────
app.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "缺少 query" });
  try {
    const { data } = await axios.get("https://min-api.cryptocompare.com/data/all/coinlist", {
      params: { summary: true, api_key: CC_KEY },
      timeout: 10000
    });
    const q = query.toUpperCase();
    const results = Object.values(data.Data || {})
      .filter(c => c.Symbol && (
        c.Symbol.toUpperCase().includes(q) ||
        (c.CoinName || "").toUpperCase().includes(q)
      ))
      .sort((a, b) => (parseInt(a.SortOrder) || 9999) - (parseInt(b.SortOrder) || 9999))
      .slice(0, 8)
      .map(c => ({ symbol: c.Symbol, name: c.CoinName || c.Symbol }));
    res.json({ coins: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ok", cc_key: CC_KEY ? "✓ 已設定" : "✗ 未設定" }));
app.listen(process.env.PORT || 3000, () => console.log("Proxy 已啟動"));
