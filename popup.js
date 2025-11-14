async function getMappings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ mappings: [] }, ({ mappings }) => resolve(mappings || []));
  });
}

// Parser: accept MAG-123 (, ; \n \t)
function parseKeys(raw) {
  const matches = (raw || "")
    .toUpperCase()
    .match(/[A-Z][A-Z0-9]+-\d+/g);
  return matches ? matches.slice(0, 50) : [];
}

function extractPrefix(key) {
  const idx = key.indexOf('-');
  return idx > 0 ? key.slice(0, idx) : null;
}

async function openIssues(keys) {
  if (!keys || !keys.length) return;

  const mappings = await getMappings();
  const map = new Map();
  for (const m of mappings) {
    if (!m?.prefix || !m?.baseUrl) continue;
    map.set(m.prefix.toUpperCase(), m.baseUrl.endsWith('/') ? m.baseUrl : m.baseUrl + '/');
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
    alert(
      "Missing configuration for:\n" +
      notFound.join(", ") +
      "\n\nAdd the prefix in Options."
    );
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "OPEN_KEYS") {
    const keys = parseKeys(msg.payload);
    if (keys.length) openIssues(keys);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('issueInput');

    // Versión dinámica en la esquina inferior derecha
  const versionEl = document.getElementById('versionBadge');
  try {
    const { version } = chrome.runtime.getManifest() || {};
    if (versionEl && version) versionEl.textContent = `Beta v${version}`;
  } catch (_) {
    if (versionEl) versionEl.textContent = '';
  }

  document.getElementById('btnOpen').addEventListener('click', async () => {
    await openIssues(parseKeys(input.value));
  });

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await openIssues(parseKeys(input.value));
    }
  });

  document.getElementById('btnOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('btnClose').addEventListener('click', () => window.close());
});