// =========================================
// ============== HISTORY BADGE ============
// =========================================
const KEY_HISTORY = 'searchHistory';

function suffixEmoji(count) {
  if (count === 100) return ' 💯';
  if (count > 100)  return ' 🚀';
  if (count > 50)   return ' 👍';
  if (count > 0)    return ' ✅';
  return '';
}

function loadHistory() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [KEY_HISTORY]: { count: 0, items: [] } }, (res) =>
      resolve(res[KEY_HISTORY] || { count: 0, items: [] })
    );
  });
}

async function updateHistoryBadge() {
  const wrapper = document.getElementById('searchHistory');
  const a = wrapper?.querySelector('.history-link');
  if (!wrapper || !a) return;

  const hist = await loadHistory();
  const count = hist.count || 0;
  a.textContent = `${count} Issue/s searched${suffixEmoji(count)}`;
  // Importante: ruta sin "/" inicial
  a.href = chrome.runtime.getURL('src/pages/history.html');
  a.target = '_blank';
  a.rel = 'noreferrer noopener';
}

// =========================================
// =============== PARSER KEYS =============
// =========================================
// AcceptJAG-123, splited by coma/space/new line
function parseKeys(raw) {
  const matches = (raw || "")
    .toUpperCase()
    .match(/[A-Z][A-Z0-9]+-\d+/g);
  return matches ? matches.slice(0, 50) : [];
}

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
    if (area === 'sync' && changes.searchHistory) updateHistoryBadge();
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