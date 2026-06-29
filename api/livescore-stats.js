// Vercel Serverless Function: aggregate LiveScore player-stats pages
// and return a single normalized JSON payload. Caches the upstream
// pages in-memory for the lifetime of the function instance.

const LIVESCORE_BASE = "https://www.livescore.com/en/football/international/world-cup-2026/stats";
const GROUPS = ["goals", "assists", "shots"];
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 90 * 1000;

const memoryCache = {
  expiresAt: 0,
  payload: null
};

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

function extractPlayersFromHtml(html, group) {
  const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const players = parsed?.props?.pageProps?.initialData?.stats?.players;
  return Array.isArray(players) ? players : [];
}

async function fetchGroup(group) {
  const url = `${LIVESCORE_BASE}/${group}/`;
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "WC26VN-VercelProxy/1.0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`LiveScore ${group} ${response.status}`);
  }

  const html = await response.text();
  return extractPlayersFromHtml(html, group);
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

  const now = Date.now();
  if (memoryCache.payload && now < memoryCache.expiresAt) {
    setCommonHeaders(res, 200);
    return res.end(JSON.stringify(memoryCache.payload));
  }

  try {
    const results = await Promise.all(GROUPS.map(async (group) => {
      try {
        const players = await fetchGroup(group);
        return [group, players];
      } catch {
        return [group, []];
      }
    }));

    const payload = {
      goals: [],
      assists: [],
      shots: []
    };
    for (const [group, players] of results) {
      payload[group] = players;
    }

    memoryCache.payload = payload;
    memoryCache.expiresAt = now + CACHE_TTL_MS;

    setCommonHeaders(res, 200);
    return res.end(JSON.stringify(payload));
  } catch (error) {
    setCommonHeaders(res, 502);
    return res.end(JSON.stringify({
      error: "Upstream fetch failed",
      message: error?.message || String(error)
    }));
  }
}
