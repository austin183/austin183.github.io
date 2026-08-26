/**
 * waveformPeaks — per-bucket min/max peak extraction + pooling
 * (CR 001 D-C).
 *
 * Pure over an AudioBuffer-shaped object — no DOM, no AudioContext.
 * sampleRate is read from the buffer and travels in the result (W-8),
 * never a constant. No sourceBuffer in the return: the caller (the VM)
 * captures buffer identity for the D-E staleness guard, keeping this
 * function pure over its argument.
 *
 * Stereo is min-of-mins / max-of-maxs across channels, so a
 * mono-side-only feature never reads quieter (WF-P1.3). NaN/±Infinity
 * channel samples are treated as 0 (documented contract, WF-P1.6).
 */

import { channelArrays } from './channelData.js';

/** CR §1.2 fixed high-resolution pool. */
export const PEAK_BUCKETS_DEFAULT = 4096;
/** Per-channel sample count above which extraction strides by 4 (W-6). */
export const PEAK_STRIDE_MAX_SAMPLES = 20_000_000;

/**
 * Extract per-bucket min/max peaks from a buffer.
 *
 * - effective bucketCount = min(bucketCount, sampleCount) (WF-P1.4)
 * - stride = sampleCount > PEAK_STRIDE_MAX_SAMPLES ? 4 : 1, applied
 *   deterministically before bucketing (WF-P1.7); a spike on a
 *   non-strided sample is dropped (accepted visual trade, CR §1.2)
 * - non-finite bucketCount → PEAK_BUCKETS_DEFAULT; degenerate buffer →
 *   zero-length arrays — never throws (WF-P1.6)
 * - bucket b covers the song-time fraction [b/B, (b+1)/B): bucket
 *   indices stay linear in original time even under stride 4, so a
 *   playhead at fraction f maps to bucket floor(f · B) (Phase 4)
 *
 * @param {{numberOfChannels: number, length: number, sampleRate: number, getChannelData: (c: number) => Float32Array}} buffer
 * @param {number} [bucketCount]
 * @returns {{mins: Float32Array, maxs: Float32Array, bucketCount: number, sampleRate: number}}
 */
export function extractPeaks(buffer, bucketCount = PEAK_BUCKETS_DEFAULT) {
    const { channels, sampleRate } = channelArrays(buffer);
    const sampleCount = channels.length > 0 ? channels[0].length : 0;
    if (sampleCount === 0) {
        return { mins: new Float32Array(0), maxs: new Float32Array(0), bucketCount: 0, sampleRate };
    }

    const requested = Number.isFinite(bucketCount) && bucketCount >= 1
        ? Math.floor(bucketCount)
        : PEAK_BUCKETS_DEFAULT;
    const B = Math.min(requested, sampleCount);
    const stride = sampleCount > PEAK_STRIDE_MAX_SAMPLES ? 4 : 1;

    const mins = new Float32Array(B).fill(Infinity);
    const maxs = new Float32Array(B).fill(-Infinity);

    for (const channel of channels) {
        for (let i = 0; i < sampleCount; i += stride) {
            const v = Number.isFinite(channel[i]) ? channel[i] : 0;
            const b = Math.floor((i * B) / sampleCount);
            if (v < mins[b]) mins[b] = v;
            if (v > maxs[b]) maxs[b] = v;
        }
    }
    // Empty buckets (only reachable when B exceeds the strided sample
    // count) read as 0, not ±Infinity.
    for (let b = 0; b < B; b++) {
        if (mins[b] === Infinity) {
            mins[b] = 0;
            maxs[b] = 0;
        }
    }

    return { mins, maxs, bucketCount: B, sampleRate };
}

/**
 * Pool a high-resolution peaks result down to targetBuckets
 * (min-of-mins / max-of-maxs per pool), O(bucketCount). The view pools
 * to CSS columns so resizes never re-walk the sample array (CR §1.2).
 * targetBuckets ≥ source bucketCount → fresh copy (no-op pool, WF-P1.8).
 *
 * @param {{mins: Float32Array, maxs: Float32Array, bucketCount: number}} peaks
 * @param {number} targetBuckets
 * @returns {{mins: Float32Array, maxs: Float32Array, bucketCount: number}}
 */
export function poolPeaks(peaks, targetBuckets) {
    const sourceCount = peaks.bucketCount;
    const target = Number.isFinite(targetBuckets)
        ? Math.floor(targetBuckets)
        : sourceCount;

    if (target >= sourceCount) {
        return {
            mins: new Float32Array(peaks.mins),
            maxs: new Float32Array(peaks.maxs),
            bucketCount: sourceCount
        };
    }

    const mins = new Float32Array(target);
    const maxs = new Float32Array(target);
    for (let b = 0; b < target; b++) {
        const start = Math.floor((b * sourceCount) / target);
        const end = Math.floor(((b + 1) * sourceCount) / target);
        let mn = Infinity;
        let mx = -Infinity;
        for (let i = start; i < end; i++) {
            if (peaks.mins[i] < mn) mn = peaks.mins[i];
            if (peaks.maxs[i] > mx) mx = peaks.maxs[i];
        }
        mins[b] = mn === Infinity ? 0 : mn;
        maxs[b] = mx === -Infinity ? 0 : mx;
    }
    return { mins, maxs, bucketCount: target };
}
