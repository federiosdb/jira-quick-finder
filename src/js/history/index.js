const KEY_HISTORY = 'searchHistory'; // { count:number, items:[{key,url,title,lastAccessTs, pinned:boolean, note:string}] }

// Ask to background counter lifetime
async function getLifetimeCount() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_LIFETIME_COUNT" }, (response) => {
      resolve(Number(response?.lifetime || 0));
    });
  });
}

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
  return `"${t}"`;
}

// Clean key from title: "[JAG-6660] Foo" -> "Foo"
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
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.lastAccessTs || 0) - (a.lastAccessTs || 0);
    })
    .slice(0, 20);

  const header = [
    "Issue Key",
    "Title",
    "URL",
    "Last Accessed (ISO)",
    "Last Accessed (Local)",
    "Pinned",
    "Note"
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
      csvEscape(local),
      csvEscape(it.pinned ? "Yes" : "No"),
      csvEscape(it.note || "")
    ].join(",");
  });

  // BOM para que Excel abra UTF-8 correctamente
  const csv = "\uFEFF" + header.join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
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

    // Pin Logic
    const btnPin = node.querySelector('.btn-pin');
    if (it.pinned) btnPin.classList.add('active');

    btnPin.addEventListener('click', async () => {
      const hist = await loadHistory();
      const target = (hist.items || []).find(x => x.key === it.key);
      if (target) {
        target.pinned = !target.pinned;
        await saveHistory(hist);
        refreshList();
      }
    });

    // Key (link)
    const a = node.querySelector('.hist-key');
    a.href = it.url;
    a.textContent = it.key;
    a.title = it.url;

    // Title (span sin borde, texto entero)
    // Clear the beginning of the Title (p. ej. "[JAG-6660] Something" -> "Something")
    let cleanTitle = it.title || '';
    if (it.key && cleanTitle.startsWith('[' + it.key + ']')) {
      cleanTitle = cleanTitle.replace('[' + it.key + ']', '').trim();
    }
    node.querySelector('.hist-title').textContent = cleanTitle;

    // Date (with hour/min/sec)
    node.querySelector('.hist-date').textContent = timeFmt(it.lastAccessTs);

    // Note Logic
    const btnNote = node.querySelector('.btn-note');
    const noteContainer = node.querySelector('.note-container');
    const noteInput = node.querySelector('.note-input');

    if (it.note) {
      btnNote.classList.add('active');
      noteInput.value = it.note;
    }

    btnNote.addEventListener('click', () => {
      const isHidden = noteContainer.classList.contains('hidden');
      if (isHidden) {
        noteContainer.classList.remove('hidden');
        noteInput.focus();
      } else {
        noteContainer.classList.add('hidden');
      }
    });

    // Save note on blur
    noteInput.addEventListener('blur', async () => {
      const val = noteInput.value.trim();
      const hist = await loadHistory();
      const target = (hist.items || []).find(x => x.key === it.key);
      if (target) {
        target.note = val;
        await saveHistory(hist);
        if (val) {
          btnNote.classList.add('active');
        } else {
          btnNote.classList.remove('active');
        }
        toast('Note saved ✅');
      }
    });

    // Delete row
    node.querySelector('.btn-delete').addEventListener('click', async () => {
      const hist = await loadHistory();
      hist.items = (hist.items || []).filter(x => x.key !== it.key);
      await saveHistory(hist);
      refreshList();
      toast('Deleted ✅');
    });

    list.appendChild(node);
  });
}

async function refreshList() {
  const hist = await loadHistory();
  const items = (hist.items || [])
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.lastAccessTs || 0) - (a.lastAccessTs || 0);
    })
    .slice(0, 20);
  render(items);
}

document.addEventListener('DOMContentLoaded', async () => {
  const v = chrome.runtime.getManifest().version;
  const vf = document.getElementById('versionFooter');

  if (vf) vf.textContent = `v${v}`;

  const lifetime = await getLifetimeCount();
  const el = document.getElementById('lifetimeInfo');
  if (el) el.textContent = `Lifetime searches on this device: ${lifetime.toLocaleString()}`;

  document.getElementById('btnExport').addEventListener('click', exportHistoryCsv);
  document.getElementById('btnCloseTab').addEventListener('click', () => window.close());

  // Clear All (keeps pinned items)
  document.getElementById('btnClearAll').addEventListener('click', async () => {
    const hist = await loadHistory(); // {count, items}
    // Filter to keep only pinned items
    const pinnedItems = (hist.items || []).filter(item => item.pinned);

    const newHist = { ...hist, items: pinnedItems };
    await saveHistory(newHist);
    refreshList();
    toast('History cleared (pinned items kept) 🧹');
  });

  refreshList();
});