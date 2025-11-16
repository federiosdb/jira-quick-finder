const KEY_HISTORY = 'searchHistory'; // { count:number, items:[{key,url,title,lastAccessTs}] }

function timeFmt(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ''; }
}

function loadHistory() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [KEY_HISTORY]: { count: 0, items: [] } }, (res) =>
      resolve(res[KEY_HISTORY] || { count: 0, items: [] })
    );
  });
}
async function saveHistory(data) {
  await chrome.storage.sync.set({ [KEY_HISTORY]: data });
}

function toast(msg) {
  const el = document.getElementById('saveMessage');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 1500);
}

// --- CSV helpers ---
function csvEscape(s = "") {
  const t = String(s).replace(/"/g, '""');
  return `"${t}"`; // siempre entrecomillado para seguridad
}

// Limpia la key al inicio del título: "[MAG-6660] Foo" -> "Foo"
function cleanTitle(item) {
  let title = item.title || "";
  if (item.key && title.startsWith(`[${item.key}]`)) {
    title = title.replace(`[${item.key}]`, "").trim();
  }
  return title;
}

async function exportHistoryCsv() {
  const { searchHistory } = await new Promise((resolve) => {
    chrome.storage.sync.get({ searchHistory: { count: 0, items: [] } }, resolve);
  });
  const items = (searchHistory.items || [])
    .sort((a,b) => (b.lastAccessTs || 0) - (a.lastAccessTs || 0))
    .slice(0, 20);

  const header = [
    "Issue Key",
    "Title",
    "URL",
    "Last Accessed (ISO)",
    "Last Accessed (Local)"
  ];

  const rows = items.map(it => {
    const title = cleanTitle(it);
    const iso = it.lastAccessTs ? new Date(it.lastAccessTs).toISOString() : "";
    const local = it.lastAccessTs ? new Date(it.lastAccessTs).toLocaleString() : "";
    return [
      csvEscape(it.key || ""),
      csvEscape(title),
      csvEscape(it.url || ""),
      csvEscape(iso),
      csvEscape(local)
    ].join(",");
  });

  // BOM para que Excel abra UTF-8 correctamente
  const csv = "\uFEFF" + header.join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0,10);
  a.download = `jira-quick-finder-history_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function render(items) {
  const list = document.getElementById('historyList');
  const tpl = document.getElementById('tplRow');
  list.innerHTML = '';

  if (!items.length) {
    const p = document.createElement('p');
    p.className = 'optional-text';
    p.textContent = 'No history yet.';
    list.appendChild(p);
    return;
  }

  items.forEach((it) => {
    const node = tpl.content.firstElementChild.cloneNode(true);

    // Key (link)
    const a = node.querySelector('.hist-key');
    a.href = it.url;
    a.textContent = it.key;
    a.title = it.url;

    // Title (span sin borde, texto entero)
    // Clear the beginning of the Title (p. ej. "[MAG-6660] Something" -> "Something")
    let cleanTitle = it.title || '';
    if (it.key && cleanTitle.startsWith('[' + it.key + ']')) {
      cleanTitle = cleanTitle.replace('[' + it.key + ']', '').trim();
    }
    node.querySelector('.hist-title').textContent = cleanTitle;

    // Date (with hour/min/sec)
    node.querySelector('.hist-date').textContent = timeFmt(it.lastAccessTs);

    // Delete row
    node.querySelector('.btn-delete').addEventListener('click', async () => {
      const hist = await loadHistory();
      hist.items = (hist.items || []).filter(x => x.key !== it.key);
      await saveHistory(hist);
      const items2 = (hist.items || [])
        .sort((a,b)=>(b.lastAccessTs||0)-(a.lastAccessTs||0))
        .slice(0,20);
      render(items2);
      toast('Deleted ✅');
    });

    list.appendChild(node);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const v = chrome.runtime.getManifest().version;
  const vf = document.getElementById('versionFooter');
  if (vf) vf.textContent = `v${v}`;

  document.getElementById('btnExport').addEventListener('click', exportHistoryCsv);
  document.getElementById('btnCloseTab').addEventListener('click', () => window.close());
  document.getElementById('btnClearAll').addEventListener('click', async () => {
    await saveHistory({ count: 0, items: [] });
    render([]);
    toast('History cleared 🧹');
  });

  const hist = await loadHistory();
  const items = (hist.items || [])
    .sort((a,b)=>(b.lastAccessTs||0)-(a.lastAccessTs||0))
    .slice(0, 20);
  render(items);
});