/**
 * savedLoops — pure storage logic for the saved-loops list (CR 004).
 *
 * Plan SL-D1/SL-D15/SL-D2/SL-D3/SL-D14/SL-D19. No browser APIs, no I/O:
 * encode/parse/match/add/remove/identity/ids only — the raw-storage
 * browser boundary lives in the sibling adapter module. Every numeric
 * read leads
 * with `Number.isFinite` guards. State shape: `{ v: 1, entries: [] }`;
 * the `end` key is always present on entries (`number | null` —
 * "at-the-end ⇔ no section" from day one).
 */

/** Raw-storage key (versioned — wrong-v parses to null, no migration). */
export const STORAGE_KEY = 'metronomad.savedLoops.v1';

/** Schema version stamp written by encode / expected by parse. */
export const SCHEMA_VERSION = 1;

/** Write-path cap (O-4): list usability, not storage. */
export const MAX_ENTRIES = 100;

/** entryMatches duration sanity tolerance, seconds (inclusive + 1e-9). */
export const DURATION_TOLERANCE_SEC = 0.1;

/**
 * Create a fresh empty state. Factory — callers never share a state
 * object (SL-D17: the VM holds one; mount re-creates it).
 *
 * @returns {{v: number, entries: Array}} a fresh `{ v: 1, entries: [] }`
 */
export function createEmptyState() {
    return { v: SCHEMA_VERSION, entries: [] };
}

/**
 * Serialize a state to its JSON string (the storage transport).
 *
 * @param {{v: number, entries: Array}|*} state
 * @returns {string|null} JSON, or null for malformed state (not an
 *   object / wrong v / entries not an array).
 */
export function encode(state) {
    if (state === null || typeof state !== 'object' || Array.isArray(state)) return null;
    if (state.v !== SCHEMA_VERSION || !Array.isArray(state.entries)) return null;
    return JSON.stringify(state);
}

/**
 * Per-entry field-strict validation (SL-D15): one bad field drops that
 * entry, never the list. `end`: missing key → null (the single W-6
 * leniency), else null or finite ≥ 0.
 *
 * @param {*} entry
 * @returns {boolean}
 */
function isValidEntry(entry) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return false;
    if (typeof entry.id !== 'string' || entry.id === '') return false;
    if (typeof entry.fileName !== 'string' || entry.fileName === '') return false;
    if (!Number.isFinite(entry.fileSize) || entry.fileSize < 0) return false;
    if (!Number.isFinite(entry.fileLastModified) || entry.fileLastModified < 0) return false;
    if (!Number.isFinite(entry.duration) || entry.duration <= 0) return false;
    if (!Number.isFinite(entry.bpm)) return false;
    if (!Number.isFinite(entry.offset) || entry.offset < 0) return false;
    if (!Number.isFinite(entry.countInBeats)) return false;
    if (!Number.isFinite(entry.savedAt)) return false;
    if (!('end' in entry)) return true;   // W-6: missing key → null (normalized below)
    const end = entry.end;
    return end === null || (Number.isFinite(end) && end >= 0);
}

/**
 * Normalize one validated entry to a fresh plain object with the `end`
 * key always present (input never reused, W-6 applied).
 *
 * @param {object} entry  a validated entry (isValidEntry passed)
 * @returns {object}
 */
function normalizeEntry(entry) {
    return {
        id: entry.id,
        fileName: entry.fileName,
        fileSize: entry.fileSize,
        fileLastModified: entry.fileLastModified,
        duration: entry.duration,
        bpm: entry.bpm,
        offset: entry.offset,
        countInBeats: entry.countInBeats,
        end: ('end' in entry) ? entry.end : null,
        savedAt: entry.savedAt
    };
}

/**
 * Parse a raw storage string into a state (SL-D15).
 *
 * String raw → JSON.parse in try/catch. Shape: object (not
 * array/number/null/string), `v === 1` (wrong/missing → null, no
 * migration), `entries` an array. Bad entries are dropped (the valid
 * list is kept). Never clamps — storage is a transport; clamps run at
 * apply (SL-D7). Never throws.
 *
 * @param {*} raw  the raw string from the adapter (any type is accepted)
 * @returns {{v: number, entries: Array}|null} normalized state, or null
 *   for corrupt/foreign/wrong-v input
 */
export function parse(raw) {
    if (typeof raw !== 'string') return null;
    let obj;
    try {
        obj = JSON.parse(raw);
    } catch {
        return null;
    }
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return null;
    if (obj.v !== SCHEMA_VERSION) return null;
    if (!Array.isArray(obj.entries)) return null;
    const entries = obj.entries.filter(isValidEntry).map(normalizeEntry);
    return { v: SCHEMA_VERSION, entries };
}

/**
 * Strict file-identity triple (SL-D14): exact fileName string equality,
 * exact fileSize / fileLastModified numeric equality, plus a duration
 * sanity check — |Δ| ≤ DURATION_TOLERANCE_SEC + 1e-9 (inclusive
 * boundary; the epsilon is the app's existing float convention).
 *
 * All inputs Number.isFinite-guarded → false, never throws (es-modules
 * numeric-guard rule).
 *
 * @param {object} entry  a saved entry
 * @param {{fileName: string, fileSize: number, fileLastModified: number}} identity
 * @param {number} decodedDuration  the freshly decoded buffer duration, s
 * @returns {boolean}
 */
export function entryMatches(entry, identity, decodedDuration) {
    if (entry === null || typeof entry !== 'object' || identity === null || typeof identity !== 'object') return false;
    if (typeof entry.fileName !== 'string' || typeof identity.fileName !== 'string') return false;
    if (entry.fileName !== identity.fileName) return false;
    if (!Number.isFinite(entry.fileSize) || !Number.isFinite(identity.fileSize)) return false;
    if (entry.fileSize !== identity.fileSize) return false;
    if (!Number.isFinite(entry.fileLastModified) || !Number.isFinite(identity.fileLastModified)) return false;
    if (entry.fileLastModified !== identity.fileLastModified) return false;
    if (!Number.isFinite(entry.duration) || !Number.isFinite(decodedDuration)) return false;
    return Math.abs(entry.duration - decodedDuration) <= DURATION_TOLERANCE_SEC + 1e-9;
}

/**
 * Dedupe key: same identity triple AND identical committed params
 * (SL-D2). `end` is part of the key — identical params except `end`
 * append (the multi-window case).
 *
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function sameSetup(a, b) {
    return a.fileName === b.fileName
        && a.fileSize === b.fileSize
        && a.fileLastModified === b.fileLastModified
        && a.bpm === b.bpm
        && a.offset === b.offset
        && a.countInBeats === b.countInBeats
        && a.end === b.end;
}

/**
 * Add an entry, returning a NEW state (input never mutated, SL-D2).
 *
 * Dedupe-refresh: an existing entry with the same identity + identical
 * params is refreshed in place (savedAt/duration updated, its id kept —
 * re-saving is idempotent). Otherwise append; when the append crosses
 * MAX_ENTRIES the oldest `savedAt` is evicted (tie → earliest array
 * index, deterministic).
 *
 * @param {{v: number, entries: Array}|*} state
 * @param {object} entry  a fresh entry (id, identity, params, savedAt)
 * @returns {{v: number, entries: Array}}
 */
export function addEntry(state, entry) {
    const entries = (state !== null && typeof state === 'object' && Array.isArray(state.entries))
        ? state.entries : [];
    const existingIdx = entries.findIndex((e) => e !== null && typeof e === 'object' && sameSetup(e, entry));
    if (existingIdx !== -1) {
        const next = entries.map((e, i) => (i === existingIdx)
            ? { ...e, savedAt: entry.savedAt, duration: entry.duration }
            : { ...e });
        return { v: SCHEMA_VERSION, entries: next };
    }
    const next = [...entries.map((e) => ({ ...e })), { ...entry }];
    if (next.length > MAX_ENTRIES) {
        let oldestIdx = 0;
        for (let i = 1; i < next.length; i++) {
            const a = next[oldestIdx].savedAt;
            const b = next[i].savedAt;
            if (Number.isFinite(b) && (!Number.isFinite(a) || b < a)) oldestIdx = i;
        }
        next.splice(oldestIdx, 1);
    }
    return { v: SCHEMA_VERSION, entries: next };
}

/**
 * Remove the entry with `id`, returning a NEW state (order-preserving).
 * Absent id → a new object deep-equal to the input (no-op).
 *
 * @param {{v: number, entries: Array}|*} state
 * @param {string} id
 * @returns {{v: number, entries: Array}}
 */
export function removeEntry(state, id) {
    const entries = (state !== null && typeof state === 'object' && Array.isArray(state.entries))
        ? state.entries : [];
    return { v: SCHEMA_VERSION, entries: entries.filter((e) => e !== null && typeof e === 'object' && e.id !== id).map((e) => ({ ...e })) };
}

/**
 * Extract the file identity triple from a File-like plain object
 * (SL-D19) — no `File` type needed, so it is unit-testable without a
 * real File. Null when the object is missing or any field is
 * missing/empty/non-finite-negative — callers treat null as zero
 * matches (SL-D8), never a throw.
 *
 * @param {{name?: string, size?: number, lastModified?: number}|*} fileLike
 * @returns {{fileName: string, fileSize: number, fileLastModified: number}|null}
 */
export function fileIdentityOf(fileLike) {
    if (fileLike === null || typeof fileLike !== 'object') return null;
    if (typeof fileLike.name !== 'string' || fileLike.name === '') return null;
    if (!Number.isFinite(fileLike.size) || fileLike.size < 0) return null;
    if (!Number.isFinite(fileLike.lastModified) || fileLike.lastModified < 0) return null;
    return { fileName: fileLike.name, fileSize: fileLike.size, fileLastModified: fileLike.lastModified };
}

/**
 * Opaque saved-entry id (SL-D3): `crypto.randomUUID()` in secure
 * contexts (HTTPS + localhost — where this app ever runs), with a
 * 2-line non-secure-context fallback for plain-http LAN previews.
 *
 * @returns {string} non-empty, unique in practice
 */
export function newId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'sl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
