// Vercel Serverless Function: proxy for ESPN scoreboard API.
// Bypasses CORS for the deployed site; keeps caching on the edge.

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ALLOWED_PARAMS = ["dates", "limit", "lang", "region", "utcOffset"];
const FETCH_TIMEOUT_MS = 8000;

function setCommonHeaders(res, status = 200) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cache-Control, Pragma");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = status;
}

function pickAllowedParams(searchParams) {
  const out = new URLSearchParams();
  for (const key of ALLOWED_PARAMS) {
    const value = searchParams.get(key);
    if (value !== null && value !== "") {
      out.set(key, value);
    }
  }
  return out;
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
  const params = pickAllowedParams(url.searchParams);
  params.set("limit", params.get("limit") || "200");

  const target = `${ESPN_BASE}?${params.toString()}`;

  try {
    const upstream = await fetchWithTimeout(target, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WC26VN-VercelProxy/1.0"
      },
      cache: "no-store",
      redirect: "follow"
    });

    if (!upstream.ok) {
      setCommonHeaders(res, upstream.status);
      return res.end(JSON.stringify({
        error: "Upstream error",
        status: upstream.status,
        source: target
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
