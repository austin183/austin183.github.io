/**
 * paramClamps — pure clamping for user parameters (spec §4).
 *
 * Plan §3.3 T-26…T-34. No browser APIs; every entry function leads with
 * `Number.isFinite` guards. Invalid input falls back to the spec default
 * (BPM 120, count-in 4, offset 0) or the range bound.
 */

export const BPM_MIN = 30;
export const BPM_MAX = 250;
export const BPM_DEFAULT = 120;

export const COUNT_IN_MIN = 1;
export const COUNT_IN_MAX = 16;
export const COUNT_IN_DEFAULT = 4;

/**
 * Clamp a BPM entry to a whole number in [30, 250]; invalid → 120.
 *
 * @param {number} value
 * @returns {number}
 */
export function clampBpm(value) {
    if (!Number.isFinite(value)) return BPM_DEFAULT;
    const rounded = Math.round(value);
    return Math.min(BPM_MAX, Math.max(BPM_MIN, rounded));
}

/**
 * Clamp a count-in entry to a whole number in [1, 16]; invalid → 4.
 *
 * @param {number} value
 * @returns {number}
 */
export function clampCountIn(value) {
    if (!Number.isFinite(value)) return COUNT_IN_DEFAULT;
    const floored = Math.floor(value);
    return Math.min(COUNT_IN_MAX, Math.max(COUNT_IN_MIN, floored));
}

/**
 * Clamp an offset to [0, duration] and quantize to tenths (display
 * precision). Invalid duration → 0.
 *
 * @param {number} value
 * @param {number} duration
 * @returns {number}
 */
export function clampOffset(value, duration) {
    if (!Number.isFinite(duration) || duration < 0) return 0;
    if (!Number.isFinite(value)) return 0;
    const clamped = Math.min(duration, Math.max(0, value));
    return Math.round(clamped * 10) / 10;
}
