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

// 請求佇列：避免同時太多請求打爆 CoinGecko 免費 API
const queue = [];
let running = false;
function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    if (!running) processQueue();
  });
}
async function processQueue() {
  if (!queue.length) { running = false; return; }
  running = true;
  const { fn, resolve, reject } = queue.shift();
  try { resolve(await fn()); } catch (e) { reject(e); }
  setTimeout(processQueue, 600); // 每個請求間隔 600ms
}

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

// CoinGecko 價格（合併成一次請求，不走佇列）
app.get("/prices", async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: "缺少 ids" });
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
      { timeout: 10000 }
    );
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: e.message });
  }
});

// CoinGecko OHLC — 走佇列，避免速率限制
app.get("/ohlc", async (req, res) => {
  const { id, days } = req.query;
  if (!id || !days) return res.status(400).json({ error: "缺少參數" });
  try {
    const data = await enqueue(() =>
      axios.get(
        `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`,
        { timeout: 15000 }
      ).then(r => r.data)
    );
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: e.message });
  }
});

// CoinGecko 搜尋
app.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "缺少 query" });
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      { timeout: 10000 }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ok", queue: queue.length }));
app.listen(process.env.PORT || 3000, () => console.log("Proxy 已啟動"));
