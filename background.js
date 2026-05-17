const CACHE_TTL_MS = 60 * 60 * 1000;
const STORAGE_KEY_RATE = "rate";
const STORAGE_KEY_SETTINGS = "settings";

const SOURCES = [
  {
    name: "jsdelivr",
    url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    extract: (data) => data?.usd?.try,
  },
  {
    name: "open-er-api",
    url: "https://open.er-api.com/v6/latest/USD",
    extract: (data) => data?.rates?.TRY,
  },
];

async function fetchFreshRate() {
  let lastError = null;
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.url, { cache: "no-store" });
      if (!res.ok) {
        lastError = new Error(`${src.name} HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const value = src.extract(data);
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        lastError = new Error(`${src.name} returned invalid rate`);
        continue;
      }
      console.log(`[USD-TRY] Rate fetched from ${src.name}: ${value}`);
      return { value, fetchedAt: Date.now(), source: src.name };
    } catch (err) {
      lastError = err;
      console.warn(`[USD-TRY] Source ${src.name} failed:`, err.message);
    }
  }
  throw lastError ?? new Error("All sources failed");
}

async function getCachedRate() {
  const result = await chrome.storage.local.get(STORAGE_KEY_RATE);
  return result[STORAGE_KEY_RATE] ?? null;
}

async function setCachedRate(rate) {
  await chrome.storage.local.set({ [STORAGE_KEY_RATE]: rate });
}

function isFresh(rate) {
  return rate && Date.now() - rate.fetchedAt < CACHE_TTL_MS;
}

async function getRate({ force = false } = {}) {
  const cached = await getCachedRate();
  if (!force && isFresh(cached)) {
    return { ...cached, fromCache: true };
  }
  try {
    const fresh = await fetchFreshRate();
    await setCachedRate(fresh);
    return { ...fresh, fromCache: false };
  } catch (err) {
    if (cached) {
      console.warn("[USD-TRY] Fetch failed, serving stale cache:", err.message);
      return { ...cached, fromCache: true, stale: true };
    }
    throw err;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return false;

  if (msg.type === "getRate") {
    getRate({ force: false })
      .then((rate) => sendResponse({ ok: true, rate }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "forceRefresh") {
    getRate({ force: true })
      .then((rate) => sendResponse({ ok: true, rate }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "getSettings") {
    chrome.storage.local.get(STORAGE_KEY_SETTINGS).then((res) => {
      sendResponse({ ok: true, settings: res[STORAGE_KEY_SETTINGS] ?? { autoScan: false } });
    });
    return true;
  }

  if (msg.type === "setSettings") {
    chrome.storage.local
      .set({ [STORAGE_KEY_SETTINGS]: msg.settings })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  getRate({ force: false }).catch((err) => {
    console.warn("[USD-TRY] Initial rate fetch failed:", err.message);
  });
});
