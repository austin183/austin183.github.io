/**
 * timeFormat — pure display/parse helpers for song times.
 *
 * Plan §3.3 T-12…T-25. No browser APIs; every entry function leads with
 * `Number.isFinite` guards.
 */

/**
 * Format seconds as "m:ss.t" (minutes unbounded, half-up to the tenth,
 * negative/invalid clamped to 0:00.0).
 *
 * @param {number} value seconds
 * @returns {string} e.g. "1:15.3"
 */
export function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) value = 0;
    const totalTenths = Math.round(value * 10);
    const minutes = Math.floor(totalTenths / 600);
    const seconds = Math.floor((totalTenths % 600) / 10);
    const tenths = totalTenths % 10;
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

// "m:ss.t" — seconds 00–59, tenths optional; also bare "s[.t]" seconds.
const MM_SS_RE = /^\s*(\d{1,2}):([0-5]?\d)(?:\.(\d))?\s*$/;
const BARE_SECONDS_RE = /^\s*(\d+(?:\.\d+)?)\s*$/;

/**
 * Parse user-entered offset input.
 *
 * Accepts "m:ss.t", "m:ss", or bare seconds ("90", "90.5"); numbers pass
 * through (coerced). Returns the value in seconds, or null when the
 * input is not a valid non-negative time.
 *
 * @param {string|number} input
 * @returns {number|null}
 */
export function parseOffsetInput(input) {
    if (typeof input === 'number') {
        return Number.isFinite(input) && input >= 0 ? input : null;
    }
    if (typeof input !== 'string') return null;

    const mmss = input.match(MM_SS_RE);
    if (mmss) {
        return Number(mmss[1]) * 60 + Number(mmss[2]) + Number(mmss[3] || 0) / 10;
    }

    const bare = input.match(BARE_SECONDS_RE);
    if (bare) {
        const seconds = Number(bare[1]);
        return Number.isFinite(seconds) ? seconds : null;
    }

    return null;
}
