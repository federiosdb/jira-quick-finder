const list = document.getElementById('list');
const tpl = document.getElementById('tplRow');

// Create a row with Project, Key (prefix), Base URI
function createRow(project = '', prefix = '', baseUrl = '') {
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector('.project').value = project;
  node.querySelector('.pref').value = prefix;
  node.querySelector('.url').value = baseUrl;

  // Delete row
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
  chrome.storage.sync.get({ mappings: [], smartLinksEnabled: false, themePreference: 'light' }, (res) => {
    // Load Smart Links toggle
    const toggle = document.getElementById('toggleSmartLinks');
    if (toggle) toggle.checked = res.smartLinksEnabled;

    // Load Dark Mode toggle
    const toggleDark = document.getElementById('toggleDarkMode');
    if (toggleDark) {
      toggleDark.checked = res.themePreference === 'dark';
      // Listen for changes immediately for preview
      toggleDark.addEventListener('change', (e) => {
        if (window.themeUtils) {
          window.themeUtils.toggleTheme(e.target.checked);
        }
      });
    }

    list.innerHTML = '';
    const mappings = res.mappings;
    if (Array.isArray(mappings) && mappings.length) {
      // Compatibility: if no exists 'project', keep empty
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

    // Allow empty rows (will be ignored)
    if (!project && !prefix && !baseUrl) continue;

    // Minimum validation
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

  const smartLinksEnabled = document.getElementById('toggleSmartLinks').checked;
  // Theme is saved immediately on toggle, but we can ensure it here too if needed, 
  // though toggleTheme handles it.

  await chrome.storage.sync.set({ mappings, smartLinksEnabled });

  // Show saved message
  const msg = document.getElementById('saveMessage');
  msg.textContent = 'Settings saved successfully ✅';
  msg.classList.add('visible');
  setTimeout(() => msg.classList.remove('visible'), 2000);
}

// Export Configuration
function exportConfig() {
  chrome.storage.sync.get(null, (items) => {
    const config = {
      mappings: items.mappings || [],
      smartLinksEnabled: items.smartLinksEnabled || false,
      themePreference: items.themePreference || 'light',
      exportedAt: new Date().toISOString(),
      version: chrome.runtime.getManifest().version
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jira-quick-finder-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Import Configuration
function importConfig(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target.result);

      // Basic validation
      if (!Array.isArray(config.mappings)) {
        throw new Error('Invalid configuration format');
      }

      // Confirm before overwriting
      if (!confirm(`Import configuration with ${config.mappings.length} projects? This will overwrite current settings.`)) {
        return;
      }

      chrome.storage.sync.set({
        mappings: config.mappings,
        smartLinksEnabled: config.smartLinksEnabled ?? false,
        themePreference: config.themePreference ?? 'light'
      }, () => {
        alert('Configuration imported successfully! Reloading...');
        location.reload();
      });

    } catch (err) {
      alert('Error importing configuration: ' + err.message);
    }
  };
  reader.readAsText(file);
  // Reset input so same file can be selected again if needed
  event.target.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const v = chrome.runtime.getManifest().version;
  const vf = document.getElementById('versionFooter');
  if (vf) vf.textContent = `Beta v${v}`;

  document.getElementById('btnAdd').addEventListener('click', () => createRow());
  document.getElementById('btnSave').addEventListener('click', save);
  document.getElementById('btnCloseTab').addEventListener('click', () => window.close());

  // Export/Import listeners
  document.getElementById('btnExport').addEventListener('click', exportConfig);
  const fileInput = document.getElementById('fileInput');
  document.getElementById('btnImport').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', importConfig);

  load();
});