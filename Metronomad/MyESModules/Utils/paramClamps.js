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

export const MIN_SECTION_SEC = 0.1;   // one display tick (EN-D2, CR O-1: BPM-independent)

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
 * Clamp an offset to [0, bound] and quantize to tenths (display
 * precision). Invalid duration → 0.
 *
 * Quantize-THEN-reclamp (RD-4, T-35): the tenths quantization may not
 * exceed the bound — a 2.96 s song must never clamp to 3.0. The epsilon
 * absorbs float error (2.9 × 10 === 28.999…96) so exact tenths quantize
 * to themselves.
 *
 * `maxOffset` (CR 003) is the effective maximum: `end − MIN_SECTION_SEC`
 * while a section is active; omitted/non-finite/negative → `duration`
 * (every pre-existing call site and T-26…T-35 row is unchanged).
 *
 * @param {number} value
 * @param {number} duration
 * @param {number} [maxOffset]
 * @returns {number}
 */
export function clampOffset(value, duration, maxOffset) {
    if (!Number.isFinite(duration) || duration < 0) return 0;
    if (!Number.isFinite(value)) return 0;
    const bound = (Number.isFinite(maxOffset) && maxOffset >= 0)
        ? Math.min(maxOffset, duration) : duration;
    const clamped = Math.min(bound, Math.max(0, value));
    const quantized = Math.floor(clamped * 10 + 1e-9) / 10;
    return Math.min(bound, quantized);
}

/**
 * Clamp a section end point into [offset + MIN_SECTION_SEC, duration] and
 * quantize to tenths — the SAME quantize-then-reclamp law as clampOffset
 * (U-10: one law, mirrored bounds — never a second quantization rule).
 *
 * Numeric clamp only (EN-D6 / CR §6 W-5 two-layers split): the
 * invalid-VALUE fallback is `duration` ("play to the end" is the safe
 * fallback, mirroring clampOffset's valid-position fallback). "Empty field
 * → null" lives in the commit layer (commitEndEntry), never here.
 *
 * `lo = min(offset + MIN_SECTION_SEC, duration)` collapses the range to
 * {duration} when the offset is within the last 0.1 s — no inexpressible
 * range (EN-C1.10).
 *
 * Precondition (world-review 2026-08-29): `offset` must be a COMMITTED
 * offset — already quantized to tenths by clampOffset. An unquantized
 * offset (e.g. 1.23) pushes `lo` off-tenths and the final re-clamp up
 * to `lo` then returns an off-tenths value, breaking the tenths
 * contract below. Callers (commitEndEntry / the offset handlers) only
 * ever hold committed offsets.
 *
 * @param {number} value    candidate end, seconds
 * @param {number} offset   committed offset, seconds (quantized to tenths)
 * @param {number} duration song duration, seconds
 * @returns {number} end in [lo, duration] at tenths; invalid value →
 *   duration; invalid/zero duration → 0 (defensive, clampOffset shape —
 *   unreachable: the UI's zero-duration backstop precedes every call)
 */
export function clampEnd(value, offset, duration) {
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    if (!Number.isFinite(value)) return duration;
    const off = (Number.isFinite(offset) && offset > 0) ? offset : 0;
    const lo = Math.min(off + MIN_SECTION_SEC, duration);
    const clamped = Math.min(duration, Math.max(lo, value));
    const quantized = Math.floor(clamped * 10 + 1e-9) / 10;
    return Math.max(lo, Math.min(duration, quantized));
}
