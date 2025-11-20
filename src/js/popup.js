import { parseKeys } from './core/jira-parser.js';
import { STORAGE_KEYS } from './core/constants.js';

// =========================================
// ============== HISTORY BADGE ============
// =========================================

async function getLifetimeCount() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_LIFETIME_COUNT" }, (response) => {
      resolve(Number(response?.lifetime || 0));
    });
  });
}

function suffixEmoji(count) {
  if (count === 100) return ' 💯';
  if (count > 100) return ' 🚀';
  if (count > 50) return ' 👍';
  if (count > 0) return ' ✅';
  return '';
}

async function updateHistoryBadge() {
  const wrapper = document.getElementById('searchHistory');
  const a = wrapper?.querySelector('.history-link');
  if (!wrapper || !a) return;

  const lifetime = await getLifetimeCount();
  a.textContent = `${lifetime} Issue/s searched${suffixEmoji(lifetime)}`;
  a.href = chrome.runtime.getURL('src/pages/history.html');
  a.target = '_blank';
  a.rel = 'noreferrer noopener';
}

// =========================================
// =============== PARSER KEYS =============
// =========================================

// Send keys to background to open them
function openIssuesFromPopup(keys) {
  if (!keys?.length) return;
  chrome.runtime.sendMessage({ type: 'OPEN_KEYS_FROM_POPUP', payload: keys });
}

// =========================================
// =============== BOOTSTRAP ===============
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('issueInput');

  // Contador + link a History
  updateHistoryBadge();
  // Refresh the badge when history changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEYS.HISTORY]) updateHistoryBadge();
  });

  // Version of badge (if the tag HTML exists)
  const versionEl = document.getElementById('versionBadge');
  try {
    const { version } = chrome.runtime.getManifest() || {};
    if (versionEl && version) versionEl.textContent = `Beta v${version}`;
  } catch {
    if (versionEl) versionEl.textContent = '';
  }

  // Open issue (click)
  const btnOpen = document.getElementById('btnOpen');
  if (btnOpen) {
    btnOpen.addEventListener('click', async () => {
      openIssuesFromPopup(parseKeys(input.value));
    });
  }

  // Open issue (Enter)
  if (input) {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        openIssuesFromPopup(parseKeys(input.value));
      }
    });
  }

  // Bell / news (if exist button)
  const btnBell = document.getElementById('btnBell');
  if (btnBell) {
    btnBell.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/news.html') });
    });
  }

  // Options
  const btnOptions = document.getElementById('btnOptions');
  if (btnOptions) {
    btnOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
  }

  // Close
  const btnClose = document.getElementById('btnClose');
  if (btnClose) {
    btnClose.addEventListener('click', () => window.close());
  }
});

// =========================================
// (Compatibility) if an older version
// open by OPEN_KEYS in popup, is rediurected
// to the centralized BG.
// =========================================
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'OPEN_KEYS') {
    const keys = parseKeys(msg.payload);
    if (keys.length) openIssuesFromPopup(keys);
  }
});