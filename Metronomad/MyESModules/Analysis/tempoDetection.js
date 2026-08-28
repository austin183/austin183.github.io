/**
 * tempoDetection — pure-DSP tempo estimation (CR 001 D-D).
 *
 * detectTempo(channels, sampleRate, maxWindowSec?) →
 *   { bpm: integer, confidence: number } | null
 *
 * Pipeline (every step an internal function; every input guarded —
 * null, never throws):
 *   1. mono mixdown            — mixDown from channelData.js (D-B: the one mean)
 *   2. leading-silence trim    — skip until frame energy > peak × NOISE_FLOOR_SCALE (W-12)
 *   3. onset envelope          — frame energy (hop HOP, window FRAME),
 *                                o[i] = max(0, e[i] − e[i−1])
 *   4. autocorrelation         — C(p) over candidate periods spanning
 *                                BPM_MIN…BPM_MAX (imported from paramClamps —
 *                                the app's existing clamp range, never re-declared)
 *   5. score + half/double     — C(p) × prior scale (70–180 musical prior),
 *                                parabolic period refinement, out-of-band
 *                                winners require a non-weak in-band alias
 *   6. confidence              — bestScore / best non-aliased runner
 *                                (runners exclude lags within 10 % of
 *                                best/2 and best·2 — same perceived pulse);
 *                                null below CONFIDENCE_THRESHOLD (W-13:
 *                                a wrong-but-confident suggestion is worse
 *                                than silence)
 *
 * All math is per-`sampleRate` (W-8) — candidate periods are
 * 60·sampleRate/(BPM·HOP) frames, so a 120 BPM train resolves to the
 * same bpm at any decoded rate. Zero AudioContext; zero dependencies
 * beyond the two imports.
 *
 * Known behaviors (KB-15): the estimate is the window average, never
 * the current tempo; half-time pairs inside the prior band are
 * ambiguous by construction; short files → null (correct UX).
 */

import { BPM_MIN, BPM_MAX } from '../Utils/paramClamps.js';
import { mixDown } from './channelData.js';

export const TEMPO = {
    HOP: 512,
    FRAME: 2048,
    WINDOW_SEC: 60,
    PRIOR_MIN: 70,
    PRIOR_MAX: 180,
    PRIOR_OUT_BAND_SCALE: 0.75,
    NOISE_FLOOR_SCALE: 0.01,
    // Tuned 8 → 12 under the D-D tuning contract (all pinned TD-1.*
    // outcomes preserved): with FRAME = 2048 over HOP = 512 (75 %
    // overlap) each click's frame energy rises over TWO frames, and both
    // increments clear the 1 % floor — one click ≈ 2 onsets-above-floor.
    // 12 therefore means "≈ a 3 s file at 120 BPM or longer" (6 clicks
    // → 11 onsets → null, TD-1.11; the smallest pinned positive train,
    // 20 clicks, yields ≈39), keeping the CR §2.4 short-file rule.
    MIN_ONSET_FRAMES: 12,
    CONFIDENCE_THRESHOLD: 0.6,
    // An out-of-band winner's in-band half/double alias must correlate at
    // least this fraction of the winner's own correlation to be reported
    // (the "non-weak" threshold of the pinned half-time mechanism —
    // without it, "weak" is undefined and the metric can report a
    // confidently-wrong out-of-band tempo, TD-1.7).
    ALIAS_MIN_CORRELATION: 0.5,
    // Runners within this fraction of best/2 or best·2 are aliases of the
    // same perceived pulse, not independent competitors (D-D confidence).
    ALIAS_BAND: 0.1
};

/**
 * Estimate the tempo of a decoded signal.
 *
 * @param {Float32Array[]} channels — channel data (from channelArrays); never mutated
 * @param {number} sampleRate — explicit (W-8); must be finite and > 0
 * @param {number} [maxWindowSec] — analysis window; clamps to duration; non-finite → WINDOW_SEC
 * @returns {{bpm: number, confidence: number} | null} — integer bpm in the
 *   app's clamp range; null when unsure (no/flat onsets, few onsets,
 *   out-of-band winner with a weak in-band alias, or low confidence)
 */
export function detectTempo(channels, sampleRate, maxWindowSec = TEMPO.WINDOW_SEC) {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) return null;
    if (!Array.isArray(channels) || channels.length === 0) return null;
    for (const ch of channels) {
        if (!ch || !Number.isFinite(ch.length) || ch.length < 0) return null;
    }

    const windowSec = Number.isFinite(maxWindowSec) && maxWindowSec > 0
        ? maxWindowSec : TEMPO.WINDOW_SEC;
    const mono = mixDown(channels);
    if (!mono || mono.length === 0) return null;
    const windowLen = Math.min(Math.round(windowSec * sampleRate), mono.length);

    const energies = frameEnergies(mono, windowLen);
    if (!energies || energies.length < 2) return null;

    const onsets = onsetEnvelope(energies);
    if (!onsets) return null;

    const result = estimateFromOnsets(onsets, sampleRate);
    return result;
}

/**
 * Frame energies (window FRAME, hop HOP) over the first `length` samples.
 * A non-finite frame sum (NaN/Inf sample) → null (TD-1.13 — the cheap
 * per-frame check; any bad sample poisons its frame sum).
 *
 * @returns {Float64Array | null}
 */
function frameEnergies(mono, length) {
    const frame = TEMPO.FRAME;
    const hop = TEMPO.HOP;
    if (length < frame) return null;
    const nFrames = Math.floor((length - frame) / hop) + 1;
    const energies = new Float64Array(nFrames);
    for (let f = 0; f < nFrames; f++) {
        const start = f * hop;
        let sum = 0;
        for (let i = 0; i < frame; i++) {
            const s = mono[start + i];
            sum += s * s;
        }
        if (!Number.isFinite(sum)) return null;
        energies[f] = sum;
    }
    return energies;
}

/**
 * Leading-silence trim (W-12) + half-wave-rectified onset envelope.
 * o[i] = max(0, e[i] − e[i−1]); o[0] = e[0] so content starting at the
 * trim point is not lost.
 *
 * Returns null when: nothing rises above the noise floor (silence),
 * fewer than MIN_ONSET_FRAMES onsets clear the floor (short file), or
 * the envelope is flat (total onset energy negligible vs total energy —
 * onset-free steady material).
 *
 * @returns {Float64Array | null}
 */
function onsetEnvelope(energies) {
    let peak = 0;
    for (let f = 0; f < energies.length; f++) peak = Math.max(peak, energies[f]);
    const floor = peak * TEMPO.NOISE_FLOOR_SCALE;

    let trim = 0;
    while (trim < energies.length && energies[trim] <= floor) trim++;
    if (trim >= energies.length) return null;

    const m = energies.length - trim;
    const onsets = new Float64Array(m);
    let onsetSum = 0;
    let energySum = 0;
    let aboveFloor = 0;
    for (let i = 0; i < m; i++) {
        const e = energies[trim + i];
        energySum += e;
        const o = i === 0 ? e : Math.max(0, e - energies[trim + i - 1]);
        onsets[i] = o;
        onsetSum += o;
        if (o > floor) aboveFloor++;
    }
    if (aboveFloor < TEMPO.MIN_ONSET_FRAMES) return null;
    // Flat envelope: total onset energy < NOISE_FLOOR_SCALE of total
    // energy (a steady tone's frame energy is constant to ~1e-6, so its
    // onset sum is ~0; a click train's rises carry ≈ all of the energy).
    if (onsetSum < TEMPO.NOISE_FLOOR_SCALE * energySum) return null;
    return onsets;
}

/**
 * Autocorrelation over the app's BPM range, scoring, half/double
 * resolution, and confidence (pipeline steps 4–6).
 *
 * @returns {{bpm: number, confidence: number} | null}
 */
function estimateFromOnsets(onsets, sampleRate) {
    const hop = TEMPO.HOP;
    const m = onsets.length;

    let norm = 0;
    for (let i = 0; i < m; i++) norm += onsets[i] * onsets[i];
    if (!(norm > 0)) return null;

    // Candidate periods in FRAMES, per-sampleRate (W-8): p frames cover
    // p·HOP samples = p·HOP/sampleRate seconds → bpm = 60·SR/(p·HOP).
    const pMin = Math.max(1, Math.ceil((60 * sampleRate) / (BPM_MAX * hop)));
    const pMax = Math.min(Math.floor((60 * sampleRate) / (BPM_MIN * hop)), m - 2);
    if (pMax < pMin) return null;

    // Energy-normalized autocorrelation C(p), p in [pMin, pMax].
    const corr = new Float64Array(pMax + 1);
    for (let p = pMin; p <= pMax; p++) {
        let s = 0;
        const limit = m - p;
        for (let i = 0; i < limit; i++) s += onsets[i] * onsets[i + p];
        corr[p] = s / norm;
    }

    const bpmOf = (p) => (60 * sampleRate) / (p * hop);
    const inPrior = (bpm) => bpm >= TEMPO.PRIOR_MIN && bpm <= TEMPO.PRIOR_MAX;
    const score = (p) => corrAt(corr, p) * (inPrior(bpmOf(p)) ? 1 : TEMPO.PRIOR_OUT_BAND_SCALE);

    let best = pMin;
    for (let p = pMin + 1; p <= pMax; p++) {
        if (score(p) > score(best)) best = p;
    }

    // Parabolic refinement: the true period lands between integer lags
    // (a 180 BPM period is 28.71 frames at 44.1 kHz) — refining to the
    // peak vertex keeps the returned integer bpm exact for the pinned
    // battery without a finer (costlier) search.
    const bestP = refinePeriod(corr, best, pMax);
    const bestBpm = bpmOf(bestP);

    // Half/double resolution (pinned mechanism, TD-1.6/TD-1.7): an
    // out-of-band winner is reported only when its in-band half/double
    // alias is non-weak (correlates at ≥ ALIAS_MIN_CORRELATION of the
    // winner) — then the alias IS the perceived tempo (240→120). A weak
    // in-band alias means "unsure" → null, never a confidently-wrong
    // out-of-band tempo (60-with-weak-120 → null).
    if (!inPrior(bestBpm)) {
        const alias = inBandAlias(corr, bestP, bestBpm, pMin, pMax);
        if (!alias) return null;
        bestP = alias.p;
        bestBpm = alias.bpm;
    }

    // Confidence: best vs the strongest INDEPENDENT competitor — lags
    // within 10 % of best/2 or best·2 are aliases of the same perceived
    // pulse and are excluded (D-D). Ratio capped at 1 (a larger ratio
    // carries no extra information).
    const bestScore = corrAt(corr, bestP); // in-band after the alias step
    let runner = 0;
    for (let p = pMin; p <= pMax; p++) {
        if (Math.abs(p - bestP) < 0.5) continue; // the winner itself
        if (Math.abs(p - bestP / 2) <= TEMPO.ALIAS_BAND * (bestP / 2)) continue;
        if (Math.abs(p - 2 * bestP) <= TEMPO.ALIAS_BAND * (2 * bestP)) continue;
        const s = score(p);
        if (s > runner) runner = s;
    }
    const confidence = runner > 0
        ? Math.min(1, bestScore / runner)
        : 1;
    if (confidence < TEMPO.CONFIDENCE_THRESHOLD) return null;

    return { bpm: Math.round(bestBpm), confidence };
}

/**
 * Parabolic vertex fit around the best integer lag; clamped to ±1 lag
 * and to the range; falls back to the integer when the parabola is
 * degenerate or a neighbor is missing.
 */
function refinePeriod(corr, best, pMax) {
    // Need both real neighbors: index 0 is an unused placeholder (0),
    // and best + 1 must stay inside [0, pMax].
    if (best <= 1 || best >= pMax) return best;
    const y0 = corr[best - 1];
    const y1 = corr[best];
    const y2 = corr[best + 1];
    const denom = y0 - 2 * y1 + y2;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return best;
    const delta = 0.5 * (y0 - y2) / denom;
    if (!Number.isFinite(delta)) return best;
    return best + Math.max(-1, Math.min(1, delta));
}

/**
 * Linear interpolation of C at a fractional period (for the refined
 * best and its fractional aliases); out-of-range → 0.
 */
function corrAt(corr, p) {
    if (!Number.isFinite(p) || p < 1 || p >= corr.length) return 0;
    const lo = Math.floor(p);
    const hi = lo + 1;
    if (hi >= corr.length) return corr[lo];
    const t = p - lo;
    return corr[lo] * (1 - t) + corr[hi] * t;
}

/**
 * The in-band half/double alias of an out-of-band candidate, if it is
 * non-weak. At most one of p/2 (→ 2×bpm) and 2p (→ bpm/2) can fall in
 * the prior band. → { p, bpm } of the alias, or null.
 */
function inBandAlias(corr, p, bpm, pMin, pMax) {
    const strength = TEMPO.ALIAS_MIN_CORRELATION * corrAt(corr, p);
    // p/2 → double the tempo
    const doubleBpm = 2 * bpm;
    if (doubleBpm >= TEMPO.PRIOR_MIN && doubleBpm <= TEMPO.PRIOR_MAX) {
        const aliasP = p / 2;
        if (aliasP >= pMin && corrAt(corr, aliasP) >= strength) {
            return { p: aliasP, bpm: doubleBpm };
        }
    }
    // 2p → half the tempo
    const halfBpm = bpm / 2;
    if (halfBpm >= TEMPO.PRIOR_MIN && halfBpm <= TEMPO.PRIOR_MAX) {
        const aliasP = 2 * p;
        if (aliasP <= pMax && corrAt(corr, aliasP) >= strength) {
            return { p: aliasP, bpm: halfBpm };
        }
    }
    return null;
}
