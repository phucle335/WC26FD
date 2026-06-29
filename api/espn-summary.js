// Vercel Serverless Function: proxy for ESPN match summary API.

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";
const EVENT_ID_PATTERN = /^\d{1,12}$/;
const FETCH_TIMEOUT_MS = 8000;

function setCommonHeaders(res, status = 200) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cache-Control, Pragma");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = status;
}

async function fetchWithTimeout(url, init = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    setCommonHeaders(res, 204);
    return res.end();
  }

  if (req.method !== "GET") {
    setCommonHeaders(res, 405);
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  const url = new URL(req.url, `https://${req.headers.host || "vercel.app"}`);
  const event = String(url.searchParams.get("event") || "").trim();

  if (!EVENT_ID_PATTERN.test(event)) {
    setCommonHeaders(res, 400);
    return res.end(JSON.stringify({ error: "Invalid or missing 'event' parameter" }));
  }

  const target = `${ESPN_BASE}?event=${encodeURIComponent(event)}`;

  try {
    const upstream = await fetchWithTimeout(target, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WC26VN-VercelProxy/1.0"
      },
      cache: "no-store"
    });

    if (!upstream.ok) {
      setCommonHeaders(res, upstream.status);
      return res.end(JSON.stringify({
        error: "Upstream error",
        status: upstream.status
      }));
    }

    const data = await upstream.json();
    setCommonHeaders(res, 200);
    return res.end(JSON.stringify(data));
  } catch (error) {
    const isTimeout = error?.name === "AbortError";
    setCommonHeaders(res, isTimeout ? 504 : 502);
    return res.end(JSON.stringify({
      error: isTimeout ? "Upstream timeout" : "Upstream fetch failed",
      message: error?.message || String(error)
    }));
  }
}
