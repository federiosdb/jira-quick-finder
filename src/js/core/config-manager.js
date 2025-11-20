import { getSync } from './storage.js';
import { STORAGE_KEYS } from './constants.js';
import { extractPrefix } from './jira-parser.js';

export class ConfigManager {
    /**
     * Retrieves all mappings
     * @returns {Promise<Array>}
     */
    static async getMappings() {
        const res = await getSync({ [STORAGE_KEYS.MAPPINGS]: [] });
        return res[STORAGE_KEYS.MAPPINGS] || [];
    }

    /**
     * Creates a Map of prefix -> baseUrl
     * @returns {Promise<Map<string, string>>}
     */
    static async getMappingsMap() {
        const mappings = await this.getMappings();
        const map = new Map();
        for (const m of mappings) {
            if (!m?.prefix || !m?.baseUrl) continue;
            map.set(m.prefix.toUpperCase(), m.baseUrl.endsWith('/') ? m.baseUrl : m.baseUrl + '/');
        }
        return map;
    }

    /**
     * Finds the base URL for a given Jira key
     * @param {string} key 
     * @returns {Promise<string|null>}
     */
    static async getBaseUrlForKey(key) {
        const prefix = extractPrefix(key);
        if (!prefix) return null;

        const map = await this.getMappingsMap();
        return map.get(prefix.toUpperCase()) || null;
    }
}
