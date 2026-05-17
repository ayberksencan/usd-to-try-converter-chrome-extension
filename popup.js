const rateEl = document.getElementById("rate");
const sourceEl = document.getElementById("source");
const updatedEl = document.getElementById("updated");
const refreshBtn = document.getElementById("refresh");
const autoScanCheckbox = document.getElementById("autoscan");

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

function renderRate(response) {
  if (!response.ok) {
    rateEl.textContent = "—";
    sourceEl.textContent = "Hata";
    updatedEl.textContent = response.error || "Kur alınamadı";
    return;
  }
  const r = response.rate;
  rateEl.textContent = `${RATE_FORMATTER.format(r.value)} ₺`;
  sourceEl.textContent = sourceLabel(r.source) + (r.stale ? " · eski" : "");
  updatedEl.textContent = formatAgo(r.fetchedAt);
}

async function loadRate() {
  const response = await sendMessage({ type: "getRate" });
  renderRate(response);
}

async function forceRefresh() {
  refreshBtn.classList.add("loading");
  refreshBtn.disabled = true;
  try {
    const response = await sendMessage({ type: "forceRefresh" });
    renderRate(response);
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

loadRate();
loadSettings();
