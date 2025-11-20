import { getSync, setSync, getLocal, setLocal } from './storage.js';
import { STORAGE_KEYS } from './constants.js';

export class HistoryManager {
    /**
     * Increments the lifetime search counter
     * @param {number} n 
     */
    static async incLifetime(n = 1) {
        const res = await getLocal({ [STORAGE_KEYS.LIFETIME]: 0 });
        const next = Number(res[STORAGE_KEYS.LIFETIME] || 0) + (Number(n) || 1);
        await setLocal({ [STORAGE_KEYS.LIFETIME]: next });
    }

    /**
     * Gets the lifetime search count
     * @returns {Promise<number>}
     */
    static async getLifetimeCount() {
        const res = await getLocal({ [STORAGE_KEYS.LIFETIME]: 0 });
        return Number(res[STORAGE_KEYS.LIFETIME] || 0);
    }

    /**
     * Loads search history
     * @returns {Promise<{count: number, items: Array}>}
     */
    static async loadHistory() {
        const res = await getSync({ [STORAGE_KEYS.HISTORY]: { count: 0, items: [] } });
        return res[STORAGE_KEYS.HISTORY] || { count: 0, items: [] };
    }

    /**
     * Saves search history
     * @param {object} data 
     */
    static async saveHistory(data) {
        await setSync({ [STORAGE_KEYS.HISTORY]: data });
    }

    /**
     * Records a search in history
     * @param {object} params
     * @param {string} params.key
     * @param {string} params.url
     * @param {string} [params.title]
     */
    static async recordSearch({ key, url, title }) {
        const now = Date.now();
        const hist = await this.loadHistory();
        hist.count = (hist.count || 0) + 1;

        const items = Array.isArray(hist.items) ? hist.items : [];
        const idx = items.findIndex(x => x.key === key);

        if (idx >= 0) {
            items[idx].lastAccessTs = now;
            if (!items[idx].title && title) items[idx].title = title;
            if (url) items[idx].url = url;
        } else {
            items.unshift({ key, url, title: title || '', lastAccessTs: now });
        }

        hist.items = items
            .sort((a, b) => (b.lastAccessTs || 0) - (a.lastAccessTs || 0))
            .slice(0, 20);

        await this.saveHistory(hist);
    }

    /**
     * Updates the title of a history item
     * @param {string} key 
     * @param {string} title 
     */
    static async updateTitle(key, title) {
        const hist = await this.loadHistory();
        const items = Array.isArray(hist.items) ? hist.items : [];
        const idx = items.findIndex(x => x.key === key);

        if (idx >= 0 && !items[idx].title) {
            items[idx].title = title;
            await this.saveHistory({ ...hist, items });
        }
    }
}
