// ================================
// ====== Lifetime counter ========
// ================================
const LIFETIME_KEY = "searchLifetimeCount";

function incLifetime(n = 1) {
  chrome.storage.local.get({ [LIFETIME_KEY]: 0 }, (res) => {
    const next = Number(res[LIFETIME_KEY] || 0) + (Number(n) || 1);
    chrome.storage.local.set({ [LIFETIME_KEY]: next });
  });
}

// ================================
// ========== CLIPBOARD ===========
// ================================
async function readClipboardFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        try {
          const text = await navigator.clipboard.readText();
          return text || null;
        } catch {
          return null;
        }
      }
    });
    return results?.[0]?.result || null;
  } catch {
    // No possible to inject (chrome://, Web Store, visor PDF, etc.)
    return null;
  }
}

// ================================
// ============ COMMANDS ==========
// ================================
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd === "open_popup") {
    try { await chrome.action.openPopup(); } catch {}
    return;
  }

  if (cmd === "open_from_clipboard") {
    const text = await readClipboardFromActiveTab();
    const keys = parseKeys(text || "");
    if (!keys.length) {
      // Fallback: abrir popup para pegar manualmente
      try { await chrome.action.openPopup(); } catch {}
      return;
    }
    await openIssuesFromBg(keys);
    return;
  }
});

// ================================================
// === Context menu: Open Jira issue(s) selection ===
// ================================================
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "jira-search-selection",
    title: 'Open Jira issue(s): "%s"',
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "jira-search-selection") return;
  const text = info.selectionText || "";
  const keys = parseKeys(text);
  if (!keys.length) {
    chrome.notifications.create(`no-keys-${Date.now()}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("src/icons/icon48.png"),
      title: "No Jira keys found",
      message: "Select text like MAG-1234 (you can select many, separated by commas).",
      priority: 0
    });
    return;
  }
  await openIssuesFromBg(keys);
});

// =========================================
// ======= SHARED / MAPPINGS / HISTORY =====
// =========================================

// Utils
function parseKeys(raw) {
  const m = (raw || "").toUpperCase().match(/[A-Z][A-Z0-9]+-\d+/g);
  return m ? m.slice(0, 50) : [];
}
function extractPrefix(key) {
  const i = key.indexOf("-");
  return i > 0 ? key.slice(0, i) : null;
}
function getMappings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ mappings: [] }, ({ mappings }) => resolve(mappings || []));
  });
}

// History
const KEY_HISTORY = 'searchHistory';

function loadHistoryBg() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [KEY_HISTORY]: { count: 0, items: [] } }, (res) =>
      resolve(res[KEY_HISTORY] || { count: 0, items: [] })
    );
  });
}
async function saveHistoryBg(data) {
  await chrome.storage.sync.set({ [KEY_HISTORY]: data });
}
async function recordSearchBg({ key, url, title }) {
  const now = Date.now();
  const hist = await loadHistoryBg();
  hist.count = (hist.count || 0) + 1;

  const items = Array.isArray(hist.items) ? hist.items : [];
  const idx = items.findIndex(x => x.key === key);
  if (idx >= 0) {
    items[idx].lastAccessTs = now;
    if (!items[idx].title && title) items[idx].title = title;
    if (url) items[idx].url = url;
  } else {
    items.unshift({ key, url, title: title || '', lastAccessTs: now });
  }

  hist.items = items
    .sort((a, b) => (b.lastAccessTs || 0) - (a.lastAccessTs || 0))
    .slice(0, 20);

  await saveHistoryBg(hist);
}

// ================================
// ======= OPEN & TITLE CAP =======
// ================================

const pendingTitleMap = new Map(); // tabId -> { key, url }

// Abre issues SIEMPRE desde BG y registra + prepara captura de título
async function openIssuesFromBg(keys) {
  if (!keys?.length) return;

  const mappings = await getMappings();
  const map = new Map();
  for (const m of mappings) {
    if (!m?.prefix || !m?.baseUrl) continue;
    map.set(m.prefix.toUpperCase(), m.baseUrl.endsWith('/') ? m.baseUrl : m.baseUrl + '/');
  }

  const notFound = [];

  for (const raw of keys) {
    const key = (raw || '').toUpperCase();
    const prefix = extractPrefix(key);
    const base = prefix ? map.get(prefix.toUpperCase()) : null;
    if (!base) {
      notFound.push(key);
      continue;
    }
    incLifetime(1);
    const url = base + key;
    const tab = await chrome.tabs.create({ url });
    await recordSearchBg({ key, url, title: '' });
    pendingTitleMap.set(tab.id, { key, url });
  }

  if (notFound.length) {
    chrome.notifications.create(`missing-config-${Date.now()}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("src/icons/icon48.png"),
      title: "Missing prefix mapping",
      message: "Add mapping for: " + notFound.join(", "),
      priority: 1
    });
  }
}

// Capturar título cuando la pestaña termine de cargar
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const pending = pendingTitleMap.get(tabId);
  if (!pending) return;
  pendingTitleMap.delete(tabId);

  const title = tab?.title || '';
  if (!title) return;

  const hist = await loadHistoryBg();
  const items = Array.isArray(hist.items) ? hist.items : [];
  const idx = items.findIndex(x => x.key === pending.key);
  if (idx >= 0 && !items[idx].title) {
    items[idx].title = title;
    await saveHistoryBg({ ...hist, items });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (pendingTitleMap.has(tabId)) pendingTitleMap.delete(tabId);
});

// ================================
// ====== POPUP → OPEN MESSAGE ====
// ================================
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'OPEN_KEYS_FROM_POPUP' && Array.isArray(msg.payload)) {
    openIssuesFromBg(msg.payload);
  }
});

// =========================================
// =============== OMNIBOX =================
// =========================================
// Keyword defined in manifest: "jira"
// Examples of input:
//  - jira MAG-1234
//  - jira MAG-1234,MAG-1235
//  - jira foo bar   (without keys -> sugerences / open Options)

chrome.omnibox.setDefaultSuggestion({
  description: 'Type Jira keys (e.g., MAG-1234 or multiple: MAG-1,MAG-2).'
});

// Formatea descripción segura para omnibox (sin HTML)
function omniDesc(txt) {
  return txt.replace(/[<>]/g, '');
}

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const raw = (text || '').trim();
  const keys = parseKeys(raw);
  const mappings = await getMappings();
  const map = new Map();
  for (const m of mappings) {
    if (!m?.prefix || !m?.baseUrl) continue;
    map.set(m.prefix.toUpperCase(), m.baseUrl.endsWith('/') ? m.baseUrl : m.baseUrl + '/');
  }

  const suggestions = [];

  if (keys.length) {
    // Recomend open by URL (if mapping)
    const unique = Array.from(new Set(keys)).slice(0, 5);
    for (const key of unique) {
      const prefix = extractPrefix(key);
      const base = prefix ? map.get(prefix.toUpperCase()) : null;
      const url = base ? (base + key) : null;
      suggestions.push({
        content: key, // Push Enter on the recomendation, send the content (key)
        description: omniDesc(
          url ? `Open ${key} → ${url}` : `Missing mapping for ${key} (open Options to configure)`
        )
      });
    }

    // COmpacted recomendation to open all
    const joined = unique.join(',');
    suggestions.unshift({
      content: joined,
      description: omniDesc(`Open ${unique.length} issue(s): ${joined}`)
    });
  } else if (raw.length) {
    // No kjeys detected: open Options
    suggestions.push({
      content: '__OPEN_OPTIONS__',
      description: omniDesc('No valid keys detected. Open Options to configure mappings.')
    });
  } else {
    // Empty input: hint to open popup
    suggestions.push({
      content: '__OPEN_POPUP__',
      description: omniDesc('Hint: type a Jira key like MAG-1234 or multiple separated by comma.')
    });
  }

  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const raw = (text || '').trim();

  // Special action onInputChanged
  if (raw === '__OPEN_OPTIONS__') {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (raw === '__OPEN_POPUP__') {
    try { await chrome.action.openPopup(); } catch {}
    return;
  }

  const keys = parseKeys(raw);

  if (keys.length) {
    // Open ALWAYS from bg
    await openIssuesFromBg(keys);
    return;
  }

  // If no keys, open Options as fallback
  chrome.runtime.openOptionsPage();
});

// ===== Expose by message =====
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GET_LIFETIME_COUNT") {
    chrome.storage.local.get({ [LIFETIME_KEY]: 0 }, (res) => {
      sendResponse({ lifetime: Number(res[LIFETIME_KEY] || 0) });
    });
    return true; // <-- necesario para respuesta asíncrona
  }
});