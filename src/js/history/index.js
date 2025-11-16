const KEY_HISTORY = 'searchHistory'; // { count: number, items: Array<{key,url,title,lastAccessTs}> }

function timeFmt(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

async function loadHistory() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [KEY_HISTORY]: { count: 0, items: [] } }, (res) => {
      resolve(res[KEY_HISTORY] || { count: 0, items: [] });
    });
  });
}

async function saveHistory(data) {
  await chrome.storage.sync.set({ [KEY_HISTORY]: data });
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

    // Issue link (uses the key as text)
    const a = node.querySelector('a.input');
    a.href = it.url;
    a.textContent = it.key;
    a.title = it.url;

    // Title
    node.querySelector('.title').value = it.title || '';

    // Date
    node.querySelector('.date').value = timeFmt(it.lastAccessTs);

    // Delete
    node.querySelector('.btn-delete').addEventListener('click', async () => {
      const hist = await loadHistory();
      hist.items = (hist.items || []).filter(x => x.key !== it.key);
      await saveHistory(hist);
      render(hist.items);
      toast('Deleted ✅');
    });

    document.getElementById('historyList').appendChild(node);
  });
}

function toast(msg) {
  const el = document.getElementById('saveMessage');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 1500);
}

document.addEventListener('DOMContentLoaded', async () => {
  const v = chrome.runtime.getManifest().version;
  const vf = document.getElementById('versionFooter');
  if (vf) vf.textContent = `v${v}`;

  document.getElementById('btnCloseTab').addEventListener('click', () => window.close());
  document.getElementById('btnClearAll').addEventListener('click', async () => {
    await saveHistory({ count: 0, items: [] });
    render([]);
    toast('History cleared 🧹');
  });

  const hist = await loadHistory();
  // Keep only the last 20 (already guaranteed when we write, but just in case)
  const items = (hist.items || [])
    .sort((a, b) => (b.lastAccessTs || 0) - (a.lastAccessTs || 0))
    .slice(0, 20);
  render(items);
});