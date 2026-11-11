(() => {
  if (window.__fxTrlyLoaded) return;
  window.__fxTrlyLoaded = true;

  const SYMBOL_TO_CURRENCY = {
    $: "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
  };
  const CODE_ALIASES = {
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP",
    JPY: "JPY",
    CHF: "CHF",
    CNY: "CNY",
    RMB: "CNY",
  };
  const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CNY"];

  const AMOUNT_PATTERN =
    "[0-9]{1,3}(?:[,.\\s][0-9]{3})+(?:[,.][0-9]+)?|[0-9]+(?:[,.][0-9]+)?";
  const CODES_ALT = Object.keys(CODE_ALIASES).join("|");
  const SYMBOLS_CHARCLASS = "\\$€£¥";

  const FX_REGEX_GLOBAL = new RegExp(
    "(?:" +
      `(?<sym>[${SYMBOLS_CHARCLASS}])\\s*(?<symAmt>${AMOUNT_PATTERN})` +
      "|" +
      `(?<postSymAmt>${AMOUNT_PATTERN})\\s*(?<postSym>[${SYMBOLS_CHARCLASS}])` +
      "|" +
      `(?<preCode>${CODES_ALT})\\s+(?<preAmt>${AMOUNT_PATTERN})` +
      "|" +
      `(?<postAmt>${AMOUNT_PATTERN})\\s*(?<postCode>${CODES_ALT})\\b` +
      ")",
    "gi"
  );

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

  const HL_CLASS = "fx-trly-hl";
  const HL_AMOUNT_ATTR = "data-fx-trly-amount";
  const HL_CURRENCY_ATTR = "data-fx-trly-currency";

  const TRY_FORMATTER = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  });
  const RATE_FORMATTER = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const CURRENCY_FORMATTERS = Object.fromEntries(
    SUPPORTED_CURRENCIES.map((c) => [
      c,
      new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: c,
        maximumFractionDigits: 2,
      }),
    ])
  );

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function normalizeSelectionText(text) {
    if (!text) return text;
    const supDigits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
    text = text.replace(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, intPart, supPart) => {
      const frac = supPart.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) =>
        String(supDigits.indexOf(ch))
      );
      return `${intPart},${frac}`;
    });
    text = text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) =>
      String(supDigits.indexOf(ch))
    );
    text = text.replace(
      /(\d+)[\s  ]+(\d{1,2})[\s  ]*([$€£¥])/g,
      "$1,$2$3"
    );
    text = text.replace(
      /(\d+)[\s  ]+(\d{1,2})[\s  ]+(USD|EUR|GBP|JPY|CHF|CNY|RMB)\b/gi,
      "$1,$2 $3"
    );
    return text;
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
      if (lastDot > lastComma) return parseFloat(s.replace(/,/g, ""));
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

  function matchToEntry(m) {
    const g = m.groups || {};
    let currency, amountStr;
    if (g.sym) {
      currency = SYMBOL_TO_CURRENCY[g.sym];
      amountStr = g.symAmt;
    } else if (g.postSym) {
      currency = SYMBOL_TO_CURRENCY[g.postSym];
      amountStr = g.postSymAmt;
    } else if (g.preCode) {
      currency = CODE_ALIASES[g.preCode.toUpperCase()];
      amountStr = g.preAmt;
    } else if (g.postCode) {
      currency = CODE_ALIASES[g.postCode.toUpperCase()];
      amountStr = g.postAmt;
    }
    if (!currency || !amountStr) return null;
    const value = normalizeNumber(amountStr);
    if (!Number.isFinite(value) || value <= 0) return null;
    return {
      start: m.index,
      end: m.index + m[0].length,
      text: m[0],
      amount: value,
      currency,
    };
  }

  function parseFxAmount(text) {
    if (!text || typeof text !== "string") return null;
    const normalized = normalizeSelectionText(text);
    const iter = normalized.matchAll(FX_REGEX_GLOBAL);
    for (const m of iter) {
      const entry = matchToEntry(m);
      if (entry) return { amount: entry.amount, currency: entry.currency };
    }
    return null;
  }

  function parseFxAmountsAll(text) {
    if (!text || typeof text !== "string") return [];
    const normalized = normalizeSelectionText(text);
    const out = [];
    for (const m of normalized.matchAll(FX_REGEX_GLOBAL)) {
      const entry = matchToEntry(m);
      if (entry) out.push({ amount: entry.amount, currency: entry.currency });
    }
    return out;
  }

  function detectDiscountPair(amounts) {
    if (!amounts || amounts.length < 2) return null;
    const currency = amounts[0].currency;
    if (!amounts.every((a) => a.currency === currency)) return null;
    const uniqAmts = [...new Set(amounts.map((a) => a.amount))];
    if (uniqAmts.length < 2) return null;
    uniqAmts.sort((a, b) => a - b);
    const current = uniqAmts[0];
    const original = uniqAmts[uniqAmts.length - 1];
    if (current <= 0 || original <= 0 || current >= original) return null;
    return { currency, current, original };
  }

  function findAllFxMatches(text) {
    const out = [];
    const iter = text.matchAll(FX_REGEX_GLOBAL);
    for (const m of iter) {
      const entry = matchToEntry(m);
      if (entry) out.push(entry);
    }
    return out;
  }

  let tooltipHost = null;
  let tooltipEl = null;
  let tooltipHideTimer = null;

  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipHost = document.createElement("div");
    tooltipHost.id = "fx-trly-tooltip-host";
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
        max-width: 320px;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 120ms ease, transform 120ms ease;
        pointer-events: auto;
        white-space: nowrap;
      }
      .tooltip.show { opacity: 1; transform: translateY(0); }
      .tooltip .amount { font-weight: 600; font-size: 14px; }
      .tooltip .meta { color: #9ca3af; font-size: 11px; margin-top: 3px; }
      .tooltip .meta.discount { color: #4ade80; }
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

  function renderTooltipContent(currency, amount, rateInfo) {
    const el = ensureTooltip();
    el.classList.remove("error");
    clearChildren(el);
    const rate = rateInfo.rates[currency];
    if (!Number.isFinite(rate) || rate <= 0) {
      renderTooltipError(`${currency} kuru bulunamadı`);
      return;
    }
    const tryValue = amount * rate;
    const amountDiv = document.createElement("div");
    amountDiv.className = "amount";
    amountDiv.textContent = `≈ ${TRY_FORMATTER.format(tryValue)}`;
    const metaDiv = document.createElement("div");
    metaDiv.className = "meta";
    const sourceStr = CURRENCY_FORMATTERS[currency].format(amount);
    const rateStr = RATE_FORMATTER.format(rate);
    const agoStr = formatAgo(rateInfo.fetchedAt);
    const staleStr = rateInfo.stale ? " · eski" : "";
    metaDiv.textContent = `${sourceStr} · 1 ${currency} = ${rateStr} ₺ · ${agoStr}${staleStr}`;
    el.appendChild(amountDiv);
    el.appendChild(metaDiv);
  }

  function renderTooltipDiscount(currency, current, original, rateInfo) {
    const el = ensureTooltip();
    el.classList.remove("error");
    clearChildren(el);
    const rate = rateInfo.rates[currency];
    if (!Number.isFinite(rate) || rate <= 0) {
      renderTooltipError(`${currency} kuru bulunamadı`);
      return;
    }
    const currentTry = current * rate;
    const originalTry = original * rate;
    const savingsTry = originalTry - currentTry;
    const pct = Math.round(((original - current) / original) * 100);

    const amountDiv = document.createElement("div");
    amountDiv.className = "amount";
    amountDiv.textContent = `≈ ${TRY_FORMATTER.format(currentTry)}`;

    const metaDiv = document.createElement("div");
    metaDiv.className = "meta";
    const sourceStr = CURRENCY_FORMATTERS[currency].format(current);
    const rateStr = RATE_FORMATTER.format(rate);
    const agoStr = formatAgo(rateInfo.fetchedAt);
    const staleStr = rateInfo.stale ? " · eski" : "";
    metaDiv.textContent = `${sourceStr} · 1 ${currency} = ${rateStr} ₺ · ${agoStr}${staleStr}`;

    const discountDiv = document.createElement("div");
    discountDiv.className = "meta discount";
    const originalSourceStr = CURRENCY_FORMATTERS[currency].format(original);
    discountDiv.textContent = `Eski: ${originalSourceStr} (${TRY_FORMATTER.format(originalTry)}) · tasarruf ${TRY_FORMATTER.format(savingsTry)} (-%${pct})`;

    el.appendChild(amountDiv);
    el.appendChild(metaDiv);
    el.appendChild(discountDiv);
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

    if (top < scrollY + 4) top = rect.bottom + scrollY + margin;

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

  async function fetchRates(force = false) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: force ? "forceRefresh" : "getRates" },
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

  async function showTooltipForMatch(currency, amount, rect) {
    if (tooltipHideTimer) {
      clearTimeout(tooltipHideTimer);
      tooltipHideTimer = null;
    }
    const response = await fetchRates(false);
    if (!response.ok) {
      renderTooltipError(response.error);
      positionTooltip(rect);
      return;
    }
    renderTooltipContent(currency, amount, response.rates);
    positionTooltip(rect);
  }

  async function showTooltipForDiscount(pair, rect) {
    if (tooltipHideTimer) {
      clearTimeout(tooltipHideTimer);
      tooltipHideTimer = null;
    }
    const response = await fetchRates(false);
    if (!response.ok) {
      renderTooltipError(response.error);
      positionTooltip(rect);
      return;
    }
    renderTooltipDiscount(pair.currency, pair.current, pair.original, response.rates);
    positionTooltip(rect);
  }

  let lastSelectionKey = null;
  let selectionTimer = null;

  function handleSelectionChange() {
    if (selectionTimer) clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        if (lastSelectionKey !== null) {
          lastSelectionKey = null;
          hideTooltip();
        }
        return;
      }
      const text = sel.toString();
      if (!text || text.length > 200) return;
      const allAmounts = parseFxAmountsAll(text);
      if (allAmounts.length === 0) {
        if (lastSelectionKey !== null) {
          lastSelectionKey = null;
          hideTooltip();
        }
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const pair = detectDiscountPair(allAmounts);
      if (pair) {
        lastSelectionKey = `D:${pair.currency}:${pair.current}:${pair.original}`;
        showTooltipForDiscount(pair, rect);
      } else {
        const first = allAmounts[0];
        lastSelectionKey = `${first.currency}:${first.amount}`;
        showTooltipForMatch(first.currency, first.amount, rect);
      }
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
      if (!tooltipHost) return;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [e.target];
      if (!path.includes(tooltipHost)) hideTooltip(true);
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
      if (el.hasAttribute && el.hasAttribute("data-fx-trly-skip")) return true;
      if (el.classList && el.classList.contains(HL_CLASS)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function wrapTextNode(node) {
    const text = node.nodeValue;
    if (!text || text.length < 2) return false;
    if (!/[\$€£¥]|USD|EUR|GBP|JPY|CHF|CNY|RMB/i.test(text)) return false;
    const matches = findAllFxMatches(text);
    if (matches.length === 0) return false;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const m of matches) {
      if (m.start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
      }
      const span = document.createElement("span");
      span.className = HL_CLASS;
      span.setAttribute("data-fx-trly-wrapped", "1");
      span.setAttribute(HL_AMOUNT_ATTR, String(m.amount));
      span.setAttribute(HL_CURRENCY_ATTR, m.currency);
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

  function markCompoundElement(el) {
    if (!el || !el.classList) return false;
    if (el.classList.contains(HL_CLASS)) return false;
    if (el.hasAttribute(HL_CURRENCY_ATTR)) return false;
    if (SKIP_TAGS.has(el.tagName)) return false;
    if (el.isContentEditable) return false;
    if (el.closest(`.${HL_CLASS}`)) return false;
    if (el.querySelector(`.${HL_CLASS}`)) return false;

    const raw = el.textContent;
    if (!raw) return false;
    if (raw.length < 3 || raw.length > 100) return false;
    if (!/\d/.test(raw)) return false;
    if (!/[\$€£¥]|(?:USD|EUR|GBP|JPY|CHF|CNY|RMB)\b/i.test(raw)) return false;

    const trimmed = raw.replace(/\s+/g, " ").trim();
    if (!trimmed) return false;
    const normalized = normalizeSelectionText(trimmed);
    const matches = findAllFxMatches(normalized);
    if (matches.length === 0) return false;

    const distinct = new Set(matches.map((m) => `${m.currency}:${m.amount}`));
    if (distinct.size > 1) return false;

    const totalCoverage = matches.reduce((s, m) => s + m.text.length, 0);
    if (totalCoverage / normalized.length < 0.4) return false;

    el.classList.add(HL_CLASS);
    el.setAttribute(HL_AMOUNT_ATTR, String(matches[0].amount));
    el.setAttribute(HL_CURRENCY_ATTR, matches[0].currency);
    return true;
  }

  const COMPOUND_TAG_SELECTOR =
    "span, a, td, em, strong, b, mark, small, ins, del, p, h1, h2, h3, h4, h5, h6, li, label, button, dd, dt";

  function forEachShadowRoot(root, cb) {
    if (!root) return;
    const walker = root.querySelectorAll ? root.querySelectorAll("*") : [];
    for (const el of walker) {
      if (el.shadowRoot) {
        cb(el.shadowRoot);
        forEachShadowRoot(el.shadowRoot, cb);
      }
    }
  }

  function collectCompoundCandidates(root) {
    if (!root) return [];
    if (root.nodeType === Node.DOCUMENT_NODE) root = document.body;
    if (!root || (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE)) return [];
    const out = [];
    const pushFrom = (scope) => {
      if (!scope || !scope.querySelectorAll) return;
      for (const el of scope.querySelectorAll(COMPOUND_TAG_SELECTOR)) {
        if (el.classList.contains(HL_CLASS)) continue;
        if (el.hasAttribute(HL_CURRENCY_ATTR)) continue;
        if (SKIP_TAGS.has(el.tagName)) continue;
        const tc = el.textContent;
        if (!tc) continue;
        const len = tc.length;
        if (len < 3 || len > 100) continue;
        out.push(el);
      }
    };
    pushFrom(root);
    forEachShadowRoot(root, pushFrom);
    return out;
  }

  function processCompoundBatch(elements) {
    if (!elements.length) return;
    const CHUNK = 60;
    let i = 0;
    const ric =
      window.requestIdleCallback ||
      function (cb) {
        return setTimeout(() => cb({ timeRemaining: () => 10 }), 0);
      };
    function tick() {
      const end = Math.min(i + CHUNK, elements.length);
      for (; i < end; i++) {
        try {
          markCompoundElement(elements[i]);
        } catch (_) {
          /* swallow per-element errors */
        }
      }
      if (i < elements.length) ric(tick);
    }
    ric(tick);
  }

  function unwrapAllHighlights() {
    const scopes = [document];
    forEachShadowRoot(document.body, (sr) => scopes.push(sr));
    for (const scope of scopes) {
      const wrapped = scope.querySelectorAll
        ? scope.querySelectorAll(`span[data-fx-trly-wrapped="1"]`)
        : [];
      wrapped.forEach((span) => {
        const parent = span.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize();
      });
      const marked = scope.querySelectorAll
        ? scope.querySelectorAll(`.${HL_CLASS}`)
        : [];
      marked.forEach((el) => {
        el.classList.remove(HL_CLASS);
        el.removeAttribute(HL_AMOUNT_ATTR);
        el.removeAttribute(HL_CURRENCY_ATTR);
      });
    }
  }

  function collectTextNodes(root) {
    const out = [];
    if (!root) return out;
    const walkScope = (scope) => {
      if (!scope) return;
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || node.nodeValue.length < 2) return NodeFilter.FILTER_REJECT;
          if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let n;
      while ((n = walker.nextNode())) out.push(n);
    };
    walkScope(root);
    forEachShadowRoot(root, walkScope);
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

  let shadowObservers = [];
  let observedShadowRoots = new WeakSet();

  function setupMutationObserver() {
    if (mutationObserver) return;
    const pendingNodes = new Set();
    let scheduled = false;
    function flush() {
      scheduled = false;
      const nodes = [...pendingNodes];
      pendingNodes.clear();
      const textNodes = [];
      const compoundCandidates = [];
      for (const n of nodes) {
        if (!n.isConnected) continue;
        if (n.nodeType === Node.TEXT_NODE) {
          if (!shouldSkipNode(n)) textNodes.push(n);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          if (SKIP_TAGS.has(n.tagName)) continue;
          if (n.classList && n.classList.contains(HL_CLASS)) continue;
          textNodes.push(...collectTextNodes(n));
          compoundCandidates.push(...collectCompoundCandidates(n));
          attachToNewShadowRoots(n, pendingNodes, scheduleFlush);
        } else if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          textNodes.push(...collectTextNodes(n));
          compoundCandidates.push(...collectCompoundCandidates(n));
          attachToNewShadowRoots(n, pendingNodes, scheduleFlush);
        }
      }
      processBatch(textNodes);
      processCompoundBatch(compoundCandidates);
    }
    function scheduleFlush() {
      if (!scheduled && pendingNodes.size > 0) {
        scheduled = true;
        setTimeout(flush, 250);
      }
    }
    function makeObserver() {
      return new MutationObserver((mutations) => {
        for (const mut of mutations) {
          if (mut.type === "childList") {
            mut.addedNodes.forEach((n) => pendingNodes.add(n));
          } else if (mut.type === "characterData") {
            pendingNodes.add(mut.target);
          }
        }
        scheduleFlush();
      });
    }
    mutationObserver = makeObserver();
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    // Attach observers to every shadow root already present
    forEachShadowRoot(document.body, (sr) => {
      if (observedShadowRoots.has(sr)) return;
      observedShadowRoots.add(sr);
      const obs = makeObserver();
      obs.observe(sr, { childList: true, subtree: true, characterData: true });
      shadowObservers.push(obs);
    });
  }

  function attachToNewShadowRoots(root, pendingNodes, scheduleFlush) {
    forEachShadowRoot(root, (sr) => {
      if (observedShadowRoots.has(sr)) return;
      observedShadowRoots.add(sr);
      const obs = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          if (mut.type === "childList") mut.addedNodes.forEach((n) => pendingNodes.add(n));
          else if (mut.type === "characterData") pendingNodes.add(mut.target);
        }
        scheduleFlush();
      });
      obs.observe(sr, { childList: true, subtree: true, characterData: true });
      shadowObservers.push(obs);
      // Seed-process what's already inside this new shadow root
      pendingNodes.add(sr);
    });
  }

  function teardownMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    shadowObservers.forEach((o) => o.disconnect());
    shadowObservers = [];
    observedShadowRoots = new WeakSet();
  }

  function enableAutoScan() {
    if (autoScanEnabled) return;
    autoScanEnabled = true;
    if (document.body) {
      processBatch(collectTextNodes(document.body));
      processCompoundBatch(collectCompoundCandidates(document.body));
      setupMutationObserver();
    }
  }

  function disableAutoScan() {
    if (!autoScanEnabled) return;
    autoScanEnabled = false;
    teardownMutationObserver();
    unwrapAllHighlights();
  }

  function findHighlightHost(e) {
    const path = typeof e.composedPath === "function" ? e.composedPath() : [e.target];
    for (const el of path) {
      if (!(el instanceof Element)) continue;
      if (el.classList && el.classList.contains(HL_CLASS)) return el;
    }
    return null;
  }

  document.addEventListener(
    "mouseover",
    (e) => {
      const host = findHighlightHost(e);
      if (!host) return;
      const amount = parseFloat(host.getAttribute(HL_AMOUNT_ATTR));
      const currency = host.getAttribute(HL_CURRENCY_ATTR);
      if (!Number.isFinite(amount) || amount <= 0 || !currency) return;
      const rect = host.getBoundingClientRect();
      showTooltipForMatch(currency, amount, rect);
    },
    true
  );

  document.addEventListener(
    "mouseout",
    (e) => {
      const host = findHighlightHost(e);
      if (!host) return;
      const related = e.relatedTarget;
      if (related instanceof Element && host.contains(related)) return;
      if (related instanceof Element && tooltipHost && tooltipHost.contains(related)) return;
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
