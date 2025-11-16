const list = document.getElementById('list');
const tpl = document.getElementById('tplRow');

// Crea una fila con Project, Key (prefix), Base URI
function createRow(project = '', prefix = '', baseUrl = '') {
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector('.project').value = project;
  node.querySelector('.pref').value = prefix;
  node.querySelector('.url').value = baseUrl;

  // Eliminar fila
  node.querySelector('.btn-delete').addEventListener('click', () => node.remove());

  list.appendChild(node);
}

function normalizePrefix(p) {
  return (p || '').trim().toUpperCase();
}
function normalizeBase(url) {
  url = (url || '').trim();
  if (!url) return '';
  return url.endsWith('/') ? url : (url + '/');
}

async function load() {
  chrome.storage.sync.get({ mappings: [] }, ({ mappings }) => {
    list.innerHTML = '';
    if (Array.isArray(mappings) && mappings.length) {
      // Compatibilidad: si no existe 'project', lo dejamos vacío
      for (const m of mappings) {
        createRow(m.project || '', m.prefix || '', m.baseUrl || '');
      }
    } else {
      createRow();
    }
  });
}

async function save() {
  const rows = Array.from(list.querySelectorAll('.row-config'));
  const mappings = [];
  const seen = new Set();

  for (const row of rows) {
    const project = (row.querySelector('.project').value || '').trim();
    const prefix = normalizePrefix(row.querySelector('.pref').value);
    const baseUrl = normalizeBase(row.querySelector('.url').value);

    // Permitir filas vacías completas
    if (!project && !prefix && !baseUrl) continue;

    // Reglas mínimas
    if (!prefix || !baseUrl) {
      alert('Please complete at least Key and Base URI for each used row.');
      return;
    }
    if (seen.has(prefix)) {
      alert(`Duplicate Key: ${prefix}. Each Key (prefix) must be unique.`);
      return;
    }
    seen.add(prefix);

    mappings.push({ project, prefix, baseUrl });
  }

  await chrome.storage.sync.set({ mappings });

  // Mostrar notificación visual
  const msg = document.getElementById('saveMessage');
  msg.textContent = 'Settings saved successfully ✅';
  msg.classList.add('visible');
  setTimeout(() => msg.classList.remove('visible'), 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  const v = chrome.runtime.getManifest().version;
  const vf = document.getElementById('versionFooter');
  if (vf) vf.textContent = `Beta v${v}`;
  document.getElementById('btnAdd').addEventListener('click', () => createRow());
  document.getElementById('btnSave').addEventListener('click', save);
  document.getElementById('btnCloseTab').addEventListener('click', () => window.close());
  load();
});