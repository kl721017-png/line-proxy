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
const CC_KEY = process.env.CC_API_KEY || process.env.cc_api_key || "";
app.get("/prices", async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: "missing symbols" });
  try {
    const { data } = await axios.get("https://min-api.cryptocompare.com/data/pricemultifull", {
      params: { fsyms: symbols, tsyms: "USD", api_key: CC_KEY }, timeout: 10000
    });
    res.json(data);
  } catch (e) { res.json({ RAW: {} }); }
});
app.get("/klines", async (req, res) => {
  const { symbol, interval, limit } = req.query;
  if (!symbol || !interval) return res.status(400).json({ error: "missing params" });
  const endpointMap = { "1H": "histohour", "4H": "histohour", "1D": "histoday" };
  const aggregateMap = { "1H": 1, "4H": 4, "1D": 1 };
  const endpoint = endpointMap[interval] || "histohour";
  const aggregate = aggregateMap[interval] || 1;
  const lim = parseInt(limit, 10) || 120;
  try {
    const { data } = await axios.get(`https://min-api.cryptocompare.com/data/v2/${endpoint}`, {
      params: { fsym: symbol, tsym: "USD", limit: lim, aggregate, api_key: CC_KEY }, timeout: 10000
    });
    if (data.Response === "Error") return res.json([]);
    res.json(data.Data?.Data || []);
  } catch (e) { res.json([]); }
});
app.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "missing query" });
  try {
    const { data } = await axios.get("https://min-api.cryptocompare.com/data/all/coinlist", {
      params: { summary: true, api_key: CC_KEY }, timeout: 10000
    });
    const q = query.toUpperCase();
    const coins = Object.values(data.Data || {})
      .filter(c => c.Symbol && (c.Symbol.toUpperCase().includes(q) || (c.CoinName || "").toUpperCase().includes(q)))
      .sort((a,b)=>(parseInt(a.SortOrder)||999999)-(parseInt(b.SortOrder)||999999))
      .slice(0, 8)
      .map(c => ({ symbol: c.Symbol, name: c.CoinName || c.Symbol }));
    res.json({ coins });
  } catch (e) { res.json({ coins: [] }); }
});
app.get("/", (req, res) => res.json({ status: "ok", service: "autotrade-radar-proxy", cc_key: CC_KEY ? "set" : "missing" }));
app.listen(process.env.PORT || 3000, () => console.log("AutoTrade Radar proxy started"));
