/**
 * Parses text to find Jira keys (e.g. JAG-123)
 * @param {string} raw 
 * @returns {string[]}
 */
export function parseKeys(raw) {
    const m = (raw || "").toUpperCase().match(/[A-Z][A-Z0-9]+-\d+/g);
    return m ? m.slice(0, 50) : [];
}

/**
 * Extracts the project prefix from a Jira key
 * @param {string} key 
 * @returns {string|null}
 */
export function extractPrefix(key) {
    const i = key.indexOf("-");
    return i > 0 ? key.slice(0, i) : null;
}

/**
 * Normalizes a prefix (trim and uppercase)
 * @param {string} p 
 * @returns {string}
 */
export function normalizePrefix(p) {
    return (p || '').trim().toUpperCase();
}

/**
 * Normalizes a base URL (trim and ensure trailing slash)
 * @param {string} url 
 * @returns {string}
 */
export function normalizeBase(url) {
    url = (url || '').trim();
    if (!url) return '';
    return url.endsWith('/') ? url : (url + '/');
}
