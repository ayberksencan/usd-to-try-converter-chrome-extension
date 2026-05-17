const CACHE_TTL_MS = 60 * 60 * 1000;
const STORAGE_KEY_RATES = "rates";
const STORAGE_KEY_SETTINGS = "settings";

const TARGET_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CNY"];

const SOURCES = [
  {
    name: "jsdelivr",
    url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    extract: (data) => {
      const usd = data?.usd;
      if (!usd) return null;
      const usdToTry = usd.try;
      if (!Number.isFinite(usdToTry) || usdToTry <= 0) return null;
      const rates = {};
      for (const code of TARGET_CURRENCIES) {
        if (code === "USD") {
          rates.USD = usdToTry;
          continue;
        }
        const usdToCode = usd[code.toLowerCase()];
        if (!Number.isFinite(usdToCode) || usdToCode <= 0) return null;
        rates[code] = usdToTry / usdToCode;
      }
      return rates;
    },
  },
  {
    name: "open-er-api",
    url: "https://open.er-api.com/v6/latest/USD",
    extract: (data) => {
      const r = data?.rates;
      if (!r) return null;
      const usdToTry = r.TRY;
      if (!Number.isFinite(usdToTry) || usdToTry <= 0) return null;
      const rates = {};
      for (const code of TARGET_CURRENCIES) {
        if (code === "USD") {
          rates.USD = usdToTry;
          continue;
        }
        const usdToCode = r[code];
        if (!Number.isFinite(usdToCode) || usdToCode <= 0) return null;
        rates[code] = usdToTry / usdToCode;
      }
      return rates;
    },
  },
];

async function fetchFreshRates() {
  let lastError = null;
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.url, { cache: "no-store" });
      if (!res.ok) {
        lastError = new Error(`${src.name} HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const rates = src.extract(data);
      if (!rates) {
        lastError = new Error(`${src.name} returned invalid rate set`);
        continue;
      }
      console.log(`[FX-TRY] Rates from ${src.name}:`, rates);
      return { rates, fetchedAt: Date.now(), source: src.name };
    } catch (err) {
      lastError = err;
      console.warn(`[FX-TRY] Source ${src.name} failed:`, err.message);
    }
  }
  throw lastError ?? new Error("All sources failed");
}

async function getCachedRates() {
  const result = await chrome.storage.local.get(STORAGE_KEY_RATES);
  return result[STORAGE_KEY_RATES] ?? null;
}

async function setCachedRates(value) {
  await chrome.storage.local.set({ [STORAGE_KEY_RATES]: value });
}

function isFresh(entry) {
  return entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

function hasAllTargets(entry) {
  if (!entry || !entry.rates) return false;
  return TARGET_CURRENCIES.every(
    (c) => Number.isFinite(entry.rates[c]) && entry.rates[c] > 0
  );
}

async function getRates({ force = false } = {}) {
  const cached = await getCachedRates();
  if (!force && isFresh(cached) && hasAllTargets(cached)) {
    return { ...cached, fromCache: true };
  }
  try {
    const fresh = await fetchFreshRates();
    await setCachedRates(fresh);
    return { ...fresh, fromCache: false };
  } catch (err) {
    if (cached && hasAllTargets(cached)) {
      console.warn("[FX-TRY] Fetch failed, serving stale cache:", err.message);
      return { ...cached, fromCache: true, stale: true };
    }
    throw err;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return false;

  if (msg.type === "getRates") {
    getRates({ force: false })
      .then((rates) => sendResponse({ ok: true, rates }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "forceRefresh") {
    getRates({ force: true })
      .then((rates) => sendResponse({ ok: true, rates }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "getSettings") {
    chrome.storage.local.get(STORAGE_KEY_SETTINGS).then((res) => {
      sendResponse({
        ok: true,
        settings: res[STORAGE_KEY_SETTINGS] ?? { autoScan: false },
      });
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
  getRates({ force: false }).catch((err) => {
    console.warn("[FX-TRY] Initial rate fetch failed:", err.message);
  });
});
