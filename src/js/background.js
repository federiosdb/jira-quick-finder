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