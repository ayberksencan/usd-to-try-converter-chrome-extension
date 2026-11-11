const ratesListEl = document.getElementById("rates-list");
const sourceEl = document.getElementById("source");
const updatedEl = document.getElementById("updated");
const refreshBtn = document.getElementById("refresh");
const autoScanCheckbox = document.getElementById("autoscan");
const convertAmountEl = document.getElementById("convert-amount");
const convertCurrencyEl = document.getElementById("convert-currency");
const convertResultEl = document.getElementById("convert-result");

let latestRates = null;

const TARGET_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CNY"];
const CURRENCY_LABELS = {
  USD: { symbol: "$", name: "ABD Doları" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "İngiliz Sterlini" },
  JPY: { symbol: "¥", name: "Japon Yeni" },
  CHF: { symbol: "Fr", name: "İsviçre Frangı" },
  CNY: { symbol: "¥", name: "Çin Yuanı" },
};

const RATE_FORMATTER = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function formatAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce güncellendi";
  if (mins < 60) return `${mins} dk önce güncellendi`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce güncellendi`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce güncellendi`;
}

function sourceLabel(name) {
  const map = {
    jsdelivr: "jsDelivr CDN",
    "open-er-api": "open-er-api.com",
  };
  return map[name] || name || "—";
}

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { ok: false, error: "Yanıt yok" });
      }
    });
  });
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function renderRatePlaceholder(message) {
  clearChildren(ratesListEl);
  const div = document.createElement("div");
  div.className = "rates-placeholder";
  div.textContent = message;
  ratesListEl.appendChild(div);
}

function renderRates(response) {
  if (!response.ok) {
    renderRatePlaceholder(response.error || "Kur alınamadı");
    sourceEl.textContent = "Hata";
    updatedEl.textContent = "";
    updateConverter();
    return;
  }
  const r = response.rates;
  latestRates = r;
  clearChildren(ratesListEl);
  for (const code of TARGET_CURRENCIES) {
    const meta = CURRENCY_LABELS[code];
    const value = r.rates[code];
    const row = document.createElement("div");
    row.className = "rate-row";

    const left = document.createElement("div");
    left.className = "rate-left";
    const sym = document.createElement("span");
    sym.className = "rate-sym";
    sym.textContent = meta.symbol;
    const code3 = document.createElement("span");
    code3.className = "rate-code";
    code3.textContent = code;
    left.appendChild(sym);
    left.appendChild(code3);

    const right = document.createElement("div");
    right.className = "rate-right";
    if (Number.isFinite(value) && value > 0) {
      right.textContent = `${RATE_FORMATTER.format(value)} ₺`;
    } else {
      right.textContent = "—";
      right.classList.add("rate-missing");
    }

    row.appendChild(left);
    row.appendChild(right);
    ratesListEl.appendChild(row);
  }
  sourceEl.textContent = sourceLabel(r.source) + (r.stale ? " · eski" : "");
  updatedEl.textContent = formatAgo(r.fetchedAt);
  updateConverter();
}

const TRY_FORMATTER_CONV = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

function parseConverterAmount(raw) {
  if (!raw) return NaN;
  const s = String(raw).trim().replace(/\s/g, "");
  if (!s) return NaN;
  const hasComma = s.includes(","), hasDot = s.includes(".");
  if (hasComma && hasDot) {
    const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
    return ld > lc ? parseFloat(s.replace(/,/g, "")) : parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  if (hasComma) {
    const p = s.split(",");
    if (p.length > 2 || (p.length === 2 && p[1].length === 3)) return parseFloat(p.join(""));
    return parseFloat(s.replace(",", "."));
  }
  if (hasDot) {
    const p = s.split(".");
    if (p.length > 2 || (p.length === 2 && p[1].length === 3)) return parseFloat(p.join(""));
    return parseFloat(s);
  }
  return parseFloat(s);
}

function updateConverter() {
  if (!convertAmountEl || !convertCurrencyEl || !convertResultEl) return;
  if (!latestRates || !latestRates.rates) {
    convertResultEl.textContent = "Kur bekleniyor…";
    convertResultEl.classList.add("converter-result-dim");
    return;
  }
  const amount = parseConverterAmount(convertAmountEl.value);
  const code = convertCurrencyEl.value;
  const rate = latestRates.rates[code];
  if (!Number.isFinite(amount) || amount < 0) {
    convertResultEl.textContent = "—";
    convertResultEl.classList.add("converter-result-dim");
    return;
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    convertResultEl.textContent = `${code} kuru bulunamadı`;
    convertResultEl.classList.add("converter-result-dim");
    return;
  }
  convertResultEl.textContent = TRY_FORMATTER_CONV.format(amount * rate);
  convertResultEl.classList.remove("converter-result-dim");
}

if (convertAmountEl) convertAmountEl.addEventListener("input", updateConverter);
if (convertCurrencyEl) convertCurrencyEl.addEventListener("change", updateConverter);

async function loadRates() {
  renderRatePlaceholder("Yükleniyor…");
  const response = await sendMessage({ type: "getRates" });
  renderRates(response);
}

async function forceRefresh() {
  refreshBtn.classList.add("loading");
  refreshBtn.disabled = true;
  try {
    const response = await sendMessage({ type: "forceRefresh" });
    renderRates(response);
  } finally {
    refreshBtn.classList.remove("loading");
    refreshBtn.disabled = false;
  }
}

async function loadSettings() {
  const response = await sendMessage({ type: "getSettings" });
  if (response.ok) {
    autoScanCheckbox.checked = !!response.settings.autoScan;
  }
}

async function setAutoScan(enabled) {
  await sendMessage({
    type: "setSettings",
    settings: { autoScan: enabled },
  });
}

refreshBtn.addEventListener("click", forceRefresh);
autoScanCheckbox.addEventListener("change", (e) => {
  setAutoScan(e.target.checked);
});

loadRates();
loadSettings();
