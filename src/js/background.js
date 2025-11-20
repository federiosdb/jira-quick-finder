import { parseKeys, extractPrefix } from './core/jira-parser.js';
import { ConfigManager } from './core/config-manager.js';
import { HistoryManager } from './core/history-manager.js';
import { ALARM_PREFIX, NOTIFICATION_PREFIX } from './core/constants.js';

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
    try { await chrome.action.openPopup(); } catch { }
    return;
  }

  if (cmd === "open_from_clipboard") {
    const text = await readClipboardFromActiveTab();
    const keys = parseKeys(text || "");
    if (!keys.length) {
      // Fallback: abrir popup para pegar manualmente
      try { await chrome.action.openPopup(); } catch { }
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
      message: "Select text like JAG-1234 (you can select many, separated by commas).",
      priority: 0
    });
    return;
  }
  await openIssuesFromBg(keys);
});

// ================================
// ======= OPEN & TITLE CAP =======
// ================================

const pendingTitleMap = new Map(); // tabId -> { key, url }

// Abre issues SIEMPRE desde BG y registra + prepara captura de título
async function openIssuesFromBg(keys) {
  if (!keys?.length) return;

  const notFound = [];

  for (const raw of keys) {
    const key = (raw || '').toUpperCase();
    const base = await ConfigManager.getBaseUrlForKey(key);

    if (!base) {
      notFound.push(key);
      continue;
    }

    await HistoryManager.incLifetime(1);
    const url = base + key;
    const tab = await chrome.tabs.create({ url });
    await HistoryManager.recordSearch({ key, url, title: '' });
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

  await HistoryManager.updateTitle(pending.key, title);
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

chrome.omnibox.setDefaultSuggestion({
  description: 'Type Jira keys (e.g., JAG-1234 or multiple: JAG-1,JAG-2).'
});

// Fomating omnibox (without HTML)
function omniDesc(txt) {
  return txt.replace(/[<>]/g, '');
}

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const raw = (text || '').trim();
  const keys = parseKeys(raw);

  const suggestions = [];

  if (keys.length) {
    // Recomend open by URL (if mapping)
    const unique = Array.from(new Set(keys)).slice(0, 5);
    for (const key of unique) {
      const base = await ConfigManager.getBaseUrlForKey(key);
      const url = base ? (base + key) : null;
      suggestions.push({
        content: key, // Push Enter on the recomendation, send the content (key)
        description: omniDesc(
          url ? `Open ${key} → ${url}` : `Missing mapping for ${key} (open Options to configure)`
        )
      });
    }

    // Compacted recomendation to open all
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
      description: omniDesc('Hint: type a Jira key like JAG-1234 or multiple separated by comma.')
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
    try { await chrome.action.openPopup(); } catch { }
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
    HistoryManager.getLifetimeCount().then(lifetime => {
      sendResponse({ lifetime });
    });
    return true; // <-- ASYNC RESPONSE
  }

  if (msg?.type === "SET_ALARM") {
    const { key, timestamp, repeats, title, note } = msg.payload;
    const alarmName = `${ALARM_PREFIX}${key}`;

    // Store alarm metadata
    chrome.storage.local.set({
      [alarmName]: { key, title, note, repeats: Number(repeats) || 0 }
    }, () => {
      chrome.alarms.create(alarmName, { when: timestamp });
      sendResponse({ success: true });
    });
    return true;
  }

  if (msg?.type === "CLEAR_ALARM") {
    const { key } = msg.payload;
    const alarmName = `${ALARM_PREFIX}${key}`;
    chrome.alarms.clear(alarmName);
    chrome.storage.local.remove(alarmName);
    sendResponse({ success: true });
    return true;
  }
});

// ================================
// =========== ALARMS =============
// ================================
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;

  console.log('Alarm triggered:', alarm.name);

  chrome.storage.local.get(alarm.name, (res) => {
    const data = res[alarm.name];
    if (!data) {
      console.warn('No data found for alarm:', alarm.name);
      return;
    }

    // Show notification
    const notifId = `${NOTIFICATION_PREFIX}${data.key}-${Date.now()}`;
    chrome.notifications.create(notifId, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon48.png"), // Use root icon
      title: `⏰ Jira Reminder: ${data.key}`,
      message: `${data.title || 'No title'}\n${data.note ? 'Note: ' + data.note : ''}`,
      priority: 2
    }, (createdId) => {
      if (chrome.runtime.lastError) {
        console.error('Notification error:', chrome.runtime.lastError);
      } else {
        console.log('Notification created:', createdId);
      }
    });

    // Handle repeats
    if (data.repeats > 0) {
      const nextRepeats = data.repeats - 1;
      chrome.storage.local.set({
        [alarm.name]: { ...data, repeats: nextRepeats }
      }, () => {
        // Schedule next alarm in 1 minute
        chrome.alarms.create(alarm.name, { delayInMinutes: 1 });
      });
    } else {
      // Clean up if no repeats left
      chrome.storage.local.remove(alarm.name);
    }
  });
});

chrome.notifications.onClicked.addListener(async (notifId) => {
  if (!notifId.startsWith(NOTIFICATION_PREFIX)) return;

  // Extract key from ID: jira-alarm-KEY-TIMESTAMP
  const parts = notifId.split('-');
  if (parts.length >= 3) {
    const key = `${parts[2]}-${parts[3]}`; // Reconstruct key (e.g. JAG-1234)
    await openIssuesFromBg([key]);
  }
  chrome.notifications.clear(notifId);
});