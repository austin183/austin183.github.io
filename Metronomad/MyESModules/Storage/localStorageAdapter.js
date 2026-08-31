/**
 * localStorageAdapter — the thin try/catch'd `localStorage` boundary
 * (CR 004, SL-D16). The pure logic lives in `savedLoops.js`; this
 * module owns every storage throw.
 *
 * `storage` is DI-injectable (defaults to `window.localStorage`); a
 * probe `getItem` at construction sets `available`. `available` is a
 * LIVE property: `read()` flips it false on any throw, and a degraded
 * adapter degrades forever — `write()` on a degraded adapter returns
 * `{ ok: false, code: 'storageError' }` without touching storage.
 * Nothing here throws.
 */

import { STORAGE_KEY } from './savedLoops.js';

/**
 * Build a storage adapter (SL-D16).
 *
 * @param {{key?: string, storage?: object|null}} [opts] — `key`
 *   defaults to STORAGE_KEY; `storage` is an injectable
 *   `{ getItem, setItem, removeItem }` (defaults to
 *   `window.localStorage`); a null/absent storage degrades to
 *   unavailable without touching `window`.
 * @returns {{available: boolean,
 *            read: () => string|null,
 *            write: (json: string) => {ok: true} | {ok: false, code: 'quota'|'storageError'}}}
 */
export function createLocalStorageAdapter({ key = STORAGE_KEY, storage = null } = {}) {
    const store = (storage !== null && typeof storage === 'object')
        ? storage
        : (typeof window !== 'undefined' ? window.localStorage : null);

    const adapter = { available: store !== null, read, write };

    if (adapter.available) {
        try {
            store.getItem(key);   // probe: private mode / blocked storage throws
        } catch {
            adapter.available = false;
        }
    }

    /**
     * @returns {string|null} the raw stored string, or null (degraded /
     *   throw / never written). Any throw flips `available` false.
     */
    function read() {
        if (!adapter.available || !store) return null;
        try {
            return store.getItem(key);
        } catch {
            adapter.available = false;
            return null;
        }
    }

    /**
     * @param {string} json  the encoded state string
     * @returns {{ok: true} | {ok: false, code: 'quota'|'storageError'}}
     *   QuotaExceededError / NS_ERROR_DOM_QUOTA_REACHED → 'quota';
     *   any other throw (or an already-degraded adapter) → 'storageError'.
     *   Never throws.
     */
    function write(json) {
        if (!adapter.available || !store) return { ok: false, code: 'storageError' };
        try {
            store.setItem(key, json);
            return { ok: true };
        } catch (err) {
            const name = (err !== null && typeof err === 'object') ? err.name : undefined;
            const code = (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED')
                ? 'quota'
                : 'storageError';
            return { ok: false, code };
        }
    }

    return adapter;
}
