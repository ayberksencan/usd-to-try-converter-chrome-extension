(() => {
  if (window.__usdTrlyLoaded) return;
  window.__usdTrlyLoaded = true;

  const USD_REGEX_GLOBAL =
    /(?:\$\s*([0-9]{1,3}(?:[,.\s][0-9]{3})*(?:[,.][0-9]+)?|[0-9]+(?:[,.][0-9]+)?)|USD\s+([0-9]{1,3}(?:[,.\s][0-9]{3})*(?:[,.][0-9]+)?|[0-9]+(?:[,.][0-9]+)?)|([0-9]{1,3}(?:[,.\s][0-9]{3})*(?:[,.][0-9]+)?|[0-9]+(?:[,.][0-9]+)?)\s*USD\b)/gi;

  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "IFRAME",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
    "CODE",
    "PRE",
  ]);

  const HL_CLASS = "usd-trly-hl";
  const HL_ATTR = "data-usd-trly-amount";

  const TRY_FORMATTER = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  });
  const RATE_FORMATTER = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function normalizeNumber(raw) {
    if (!raw) return NaN;
    const s = String(raw).trim().replace(/\s/g, "");
    if (!s) return NaN;
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");

    if (hasComma && hasDot) {
      const lastComma = s.lastIndexOf(",");
      const lastDot = s.lastIndexOf(".");
      if (lastDot > lastComma) {
        return parseFloat(s.replace(/,/g, ""));
      }
      return parseFloat(s.replace(/\./g, "").replace(",", "."));
    }

    if (hasComma) {
      const parts = s.split(",");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        return parseFloat(parts.join(""));
      }
      return parseFloat(s.replace(",", "."));
    }

    if (hasDot) {
      const parts = s.split(".");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        return parseFloat(parts.join(""));
      }
      return parseFloat(s);
    }

    return parseFloat(s);
  }

  function parseUsdAmount(text) {
    if (!text || typeof text !== "string") return null;
    const all = text.match(USD_REGEX_GLOBAL);
    if (!all) return null;
    for (const matchStr of all) {
      const single = matchStr.match(
        /(?:\$\s*([0-9.,\s]+)|USD\s+([0-9.,\s]+)|([0-9.,\s]+)\s*USD)/i
      );
      if (!single) continue;
      const numStr = single[1] || single[2] || single[3];
      const value = normalizeNumber(numStr);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return null;
  }

  function findAllUsdMatches(text) {
    const out = [];
    const iter = text.matchAll(USD_REGEX_GLOBAL);
    for (const m of iter) {
      const numStr = m[1] || m[2] || m[3];
      const value = normalizeNumber(numStr);
      if (!Number.isFinite(value) || value <= 0) continue;
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        amount: value,
      });
    }
    return out;
  }

  let tooltipHost = null;
  let tooltipEl = null;
  let tooltipHideTimer = null;

  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipHost = document.createElement("div");
    tooltipHost.id = "usd-trly-tooltip-host";
    Object.assign(tooltipHost.style, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "2147483647",
      pointerEvents: "none",
    });
    const shadow = tooltipHost.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      .tooltip {
        position: absolute;
        background: #111827;
        color: #f9fafb;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        font-size: 13px;
        line-height: 1.35;
        padding: 8px 10px;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05);
        max-width: 280px;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 120ms ease, transform 120ms ease;
        pointer-events: auto;
        white-space: nowrap;
      }
      .tooltip.show { opacity: 1; transform: translateY(0); }
      .tooltip .amount { font-weight: 600; font-size: 14px; }
      .tooltip .meta { color: #9ca3af; font-size: 11px; margin-top: 3px; }
      .tooltip.error .amount { color: #fca5a5; }
    `;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "tooltip";
    shadow.appendChild(style);
    shadow.appendChild(tooltipEl);
    document.documentElement.appendChild(tooltipHost);
    return tooltipEl;
  }

  function formatAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "az önce";
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} sa önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
  }

  function renderTooltipContent(usdAmount, rate) {
    const el = ensureTooltip();
    el.classList.remove("error");
    clearChildren(el);
    const tryValue = usdAmount * rate.value;
    const amountDiv = document.createElement("div");
    amountDiv.className = "amount";
    amountDiv.textContent = `≈ ${TRY_FORMATTER.format(tryValue)}`;
    const metaDiv = document.createElement("div");
    metaDiv.className = "meta";
    const rateStr = RATE_FORMATTER.format(rate.value);
    const agoStr = formatAgo(rate.fetchedAt);
    const staleStr = rate.stale ? " · eski" : "";
    metaDiv.textContent = `$${usdAmount.toLocaleString("tr-TR")} · kur ${rateStr} · ${agoStr}${staleStr}`;
    el.appendChild(amountDiv);
    el.appendChild(metaDiv);
  }

  function renderTooltipError(message) {
    const el = ensureTooltip();
    el.classList.add("error");
    clearChildren(el);
    const amountDiv = document.createElement("div");
    amountDiv.className = "amount";
    amountDiv.textContent = "Kur alınamadı";
    const metaDiv = document.createElement("div");
    metaDiv.className = "meta";
    metaDiv.textContent = message || "";
    el.appendChild(amountDiv);
    el.appendChild(metaDiv);
  }

  function positionTooltip(rect) {
    const el = ensureTooltip();
    el.classList.add("show");
    el.style.left = "0px";
    el.style.top = "0px";
    const tipRect = el.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const margin = 6;
    let left = rect.left + scrollX + rect.width / 2 - tipRect.width / 2;
    let top = rect.top + scrollY - tipRect.height - margin;

    const minLeft = scrollX + 4;
    const maxLeft = scrollX + document.documentElement.clientWidth - tipRect.width - 4;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    if (top < scrollY + 4) {
      top = rect.bottom + scrollY + margin;
    }

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  function hideTooltip(immediate = false) {
    if (!tooltipEl) return;
    if (tooltipHideTimer) {
      clearTimeout(tooltipHideTimer);
      tooltipHideTimer = null;
    }
    if (immediate) {
      tooltipEl.classList.remove("show");
    } else {
      tooltipHideTimer = setTimeout(() => {
        if (tooltipEl) tooltipEl.classList.remove("show");
      }, 100);
    }
  }

  async function fetchRate(force = false) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: force ? "forceRefresh" : "getRate" },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { ok: false, error: "Yanıt yok" });
          }
        }
      );
    });
  }

  async function showTooltipForAmount(usdAmount, rect) {
    if (tooltipHideTimer) {
      clearTimeout(tooltipHideTimer);
      tooltipHideTimer = null;
    }
    const response = await fetchRate(false);
    if (!response.ok) {
      renderTooltipError(response.error);
      positionTooltip(rect);
      return;
    }
    renderTooltipContent(usdAmount, response.rate);
    positionTooltip(rect);
  }

  let lastSelectionAmount = null;
  let selectionTimer = null;

  function handleSelectionChange() {
    if (selectionTimer) clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        if (lastSelectionAmount !== null) {
          lastSelectionAmount = null;
          hideTooltip();
        }
        return;
      }
      const text = sel.toString();
      if (!text || text.length > 200) return;
      const amount = parseUsdAmount(text);
      if (amount === null) {
        if (lastSelectionAmount !== null) {
          lastSelectionAmount = null;
          hideTooltip();
        }
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      lastSelectionAmount = amount;
      showTooltipForAmount(amount, rect);
    }, 120);
  }

  document.addEventListener("mouseup", handleSelectionChange, true);
  document.addEventListener(
    "keyup",
    (e) => {
      if (e.shiftKey || e.key === "Shift" || (e.key && e.key.startsWith("Arrow"))) {
        handleSelectionChange();
      }
    },
    true
  );
  document.addEventListener(
    "mousedown",
    (e) => {
      if (!tooltipHost || !tooltipHost.contains(e.target)) {
        hideTooltip(true);
      }
    },
    true
  );

  let autoScanEnabled = false;
  let mutationObserver = null;

  function shouldSkipNode(node) {
    let el = node.parentElement;
    while (el) {
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.isContentEditable) return true;
      if (el.hasAttribute && el.hasAttribute("data-usd-trly-skip")) return true;
      if (el.classList && el.classList.contains(HL_CLASS)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function wrapTextNode(node) {
    const text = node.nodeValue;
    if (!text || text.length < 2) return false;
    if (!/\$|USD/i.test(text)) return false;
    const matches = findAllUsdMatches(text);
    if (matches.length === 0) return false;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const m of matches) {
      if (m.start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
      }
      const span = document.createElement("span");
      span.className = HL_CLASS;
      span.setAttribute(HL_ATTR, String(m.amount));
      span.textContent = m.text;
      frag.appendChild(span);
      cursor = m.end;
    }
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }
    node.parentNode.replaceChild(frag, node);
    return true;
  }

  function unwrapAllHighlights() {
    const spans = document.querySelectorAll(`span.${HL_CLASS}`);
    spans.forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize();
    });
  }

  function collectTextNodes(root) {
    const out = [];
    if (!root) return out;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || node.nodeValue.length < 2) {
          return NodeFilter.FILTER_REJECT;
        }
        if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  function processBatch(nodes) {
    if (!nodes.length) return;
    const CHUNK = 50;
    let i = 0;
    const ric =
      window.requestIdleCallback ||
      function (cb) {
        return setTimeout(() => cb({ timeRemaining: () => 10 }), 0);
      };
    function tick() {
      const end = Math.min(i + CHUNK, nodes.length);
      for (; i < end; i++) {
        try {
          wrapTextNode(nodes[i]);
        } catch (_) {
          /* swallow per-node errors */
        }
      }
      if (i < nodes.length) ric(tick);
    }
    ric(tick);
  }

  function setupMutationObserver() {
    if (mutationObserver) return;
    const pendingNodes = new Set();
    let scheduled = false;
    function flush() {
      scheduled = false;
      const nodes = [...pendingNodes];
      pendingNodes.clear();
      const textNodes = [];
      for (const n of nodes) {
        if (!n.isConnected) continue;
        if (n.nodeType === Node.TEXT_NODE) {
          if (!shouldSkipNode(n)) textNodes.push(n);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          if (SKIP_TAGS.has(n.tagName)) continue;
          if (n.classList && n.classList.contains(HL_CLASS)) continue;
          textNodes.push(...collectTextNodes(n));
        }
      }
      processBatch(textNodes);
    }
    mutationObserver = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        if (mut.type === "childList") {
          mut.addedNodes.forEach((n) => pendingNodes.add(n));
        } else if (mut.type === "characterData") {
          pendingNodes.add(mut.target);
        }
      }
      if (!scheduled && pendingNodes.size > 0) {
        scheduled = true;
        setTimeout(flush, 250);
      }
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function teardownMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
  }

  function enableAutoScan() {
    if (autoScanEnabled) return;
    autoScanEnabled = true;
    if (document.body) {
      processBatch(collectTextNodes(document.body));
      setupMutationObserver();
    }
  }

  function disableAutoScan() {
    if (!autoScanEnabled) return;
    autoScanEnabled = false;
    teardownMutationObserver();
    unwrapAllHighlights();
  }

  document.addEventListener(
    "mouseover",
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.classList.contains(HL_CLASS)) return;
      const amount = parseFloat(target.getAttribute(HL_ATTR));
      if (!Number.isFinite(amount) || amount <= 0) return;
      const rect = target.getBoundingClientRect();
      showTooltipForAmount(amount, rect);
    },
    true
  );

  document.addEventListener(
    "mouseout",
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.classList.contains(HL_CLASS)) return;
      const related = e.relatedTarget;
      if (related && tooltipHost && tooltipHost.contains(related)) return;
      hideTooltip();
    },
    true
  );

  function applySettings(settings) {
    if (settings && settings.autoScan) {
      enableAutoScan();
    } else {
      disableAutoScan();
    }
  }

  function loadSettings() {
    chrome.runtime.sendMessage({ type: "getSettings" }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.ok) applySettings(response.settings);
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.settings) applySettings(changes.settings.newValue);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSettings, { once: true });
  } else {
    loadSettings();
  }
})();
