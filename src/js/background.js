async function readClipboardFromActiveTab() {
  // Obtiene la pestaña activa
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        try {
          // Esto se ejecuta en el contexto de la página
          const text = await navigator.clipboard.readText();
          return text || null;
        } catch (e) {
          return null;
        }
      }
    });
    const val = results?.[0]?.result || null;
    return val;
  } catch (e) {
    // Not possible to read(ex. chrome://, Web Store, PDF viewer, etc.)
    return null;
  }
}

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd === "open_popup") {
    chrome.action.openPopup();
    return;
  }

  if (cmd === "open_from_clipboard") {
    const text = await readClipboardFromActiveTab();
    if (text) {
      // Send to popup if clipboard has text
      chrome.runtime.sendMessage({ type: "OPEN_KEYS", payload: text });
    } else {
      // Fallback: openb popup directly
      chrome.action.openPopup();
    }
  }
});
// ======================================================
// === Context menu: Open Jira issue(s) from selection ===
// ======================================================

// Utility locals
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
async function openIssuesFromBackground(keys) {
  if (!keys?.length) return;

  const mappings = await getMappings();
  const map = new Map();
  for (const m of mappings) {
    if (!m?.prefix || !m?.baseUrl) continue;
    map.set(m.prefix.toUpperCase(), m.baseUrl.endsWith("/") ? m.baseUrl : m.baseUrl + "/");
  }

  const notFound = [];
  for (const rawKey of keys) {
    const key = rawKey.toUpperCase();
    const prefix = extractPrefix(key);
    const base = prefix ? map.get(prefix.toUpperCase()) : null;
    if (base) {
      chrome.tabs.create({ url: base + key });
    } else {
      notFound.push(key);
    }
  }

  if (notFound.length) {
    chrome.notifications.create(`missing-config-${Date.now()}`, {
      type: "basic",
      iconUrl: "/src/icons/icon48.png",
      title: "Missing prefix mapping",
      message: "Add mapping for: " + notFound.join(", "),
      priority: 1
    });
  }
}

// Crear el menú al instalar/actualizar
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "jira-search-selection",
    title: 'Open Jira issue(s): "%s"',
    contexts: ["selection"]
  });
});

// Gestionar clicks del menú
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "jira-search-selection") return;
  const text = info.selectionText || "";
  const keys = parseKeys(text);
  if (!keys.length) {
    chrome.notifications.create(`no-keys-${Date.now()}`, {
      type: "basic",
      iconUrl: "/src/icons/icon48.png",
      title: "No Jira keys found",
      message: "Select text like JAG-1234 (you can select many, separated by commas).",
      priority: 0
    });
    return;
  }
  await openIssuesFromBackground(keys);
});