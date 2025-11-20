/**
 * Wrapper for chrome.storage.sync
 * @param {string|object} keys 
 * @returns {Promise<object>}
 */
export function getSync(keys) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, (res) => resolve(res));
    });
}

/**
 * Wrapper for chrome.storage.sync.set
 * @param {object} items 
 * @returns {Promise<void>}
 */
export function setSync(items) {
    return new Promise((resolve) => {
        chrome.storage.sync.set(items, () => resolve());
    });
}

/**
 * Wrapper for chrome.storage.local
 * @param {string|object} keys 
 * @returns {Promise<object>}
 */
export function getLocal(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (res) => resolve(res));
    });
}

/**
 * Wrapper for chrome.storage.local.set
 * @param {object} items 
 * @returns {Promise<void>}
 */
export function setLocal(items) {
    return new Promise((resolve) => {
        chrome.storage.local.set(items, () => resolve());
    });
}

/**
 * Wrapper for chrome.storage.local.remove
 * @param {string|string[]} keys 
 * @returns {Promise<void>}
 */
export function removeLocal(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.remove(keys, () => resolve());
    });
}
