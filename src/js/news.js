document.addEventListener('DOMContentLoaded', () => {
  const v = chrome.runtime.getManifest().version;
  document.getElementById('versionFooter').textContent = `Beta v${v}`;
  document.getElementById('btnOpenOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('btnCloseNews').addEventListener('click', () => window.close());
});