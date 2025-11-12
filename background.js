async function readClipboardFromActiveTab() {
  // Obtiene la pestaña activa
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        try {
          // Esto se ejecuta en el contexto de la página
          const text = await navigator.clipboard.readText();
          return text || null;
        } catch (e) {
          return null;
        }
      }
    });
    const val = results?.[0]?.result || null;
    return val;
  } catch (e) {
    // No se puede inyectar (p. ej. chrome://, Web Store, PDF viewer, etc.)
    return null;
  }
}

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd === "open_popup") {
    chrome.action.openPopup();
    return;
  }

  if (cmd === "open_from_clipboard") {
    const text = await readClipboardFromActiveTab();
    if (text) {
      // Envía el contenido al popup (que usará su lógica de parseo/apertura)
      chrome.runtime.sendMessage({ type: "OPEN_KEYS", payload: text });
    } else {
      // Fallback: abre el popup para que el usuario pegue manualmente
      chrome.action.openPopup();
    }
  }
});