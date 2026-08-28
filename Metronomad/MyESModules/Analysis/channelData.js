/**
 * channelData — shared channel walk + mono mixdown (CR 001 D-B).
 *
 * Pure helpers over an AudioBuffer-shaped object: { numberOfChannels,
 * length, sampleRate, getChannelData(c) }. Number.isFinite guards on
 * every entry (paramClamps.js style); sampleRate travels explicit in
 * the results (W-8) — never a constant.
 *
 * One mean implementation (mixDown) serves both consumers — the
 * monoMixdown facade and Phase 2's tempoDetection (which takes raw
 * channels) — per AGENTS.md "DO NOT Duplicate".
 */

/**
 * Walk the buffer's channels once.
 *
 * Degenerate buffer (non-finite or zero numberOfChannels/length) →
 * { channels: [], sampleRate: 0, duration: 0 } (WF-P1.6).
 *
 * The returned channel arrays are the buffer's own getChannelData(c)
 * references — no copies. Do not mutate them.
 *
 * @param {{numberOfChannels: number, length: number, sampleRate: number, getChannelData: (c: number) => Float32Array}} buffer
 * @returns {{channels: Float32Array[], sampleRate: number, duration: number}}
 */
export function channelArrays(buffer) {
    const channelsOk = Number.isFinite(buffer?.numberOfChannels) && buffer.numberOfChannels > 0;
    const lengthOk = Number.isFinite(buffer?.length) && buffer.length > 0;
    if (!channelsOk || !lengthOk) {
        return { channels: [], sampleRate: 0, duration: 0 };
    }
    const channels = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        channels.push(buffer.getChannelData(c));
    }
    return {
        channels,
        sampleRate: buffer.sampleRate,
        duration: buffer.length / buffer.sampleRate
    };
}

/**
 * Element-wise mean of channel arrays — THE one mean implementation
 * (D-B). A single channel is returned as-is (no copy); empty input →
 * zero-length array. The result may alias the input (single channel) or
 * the source AudioBuffer's channel data — do not mutate it.
 *
 * @param {Float32Array[]} channels
 * @returns {Float32Array}
 */
export function mixDown(channels) {
    if (!channels || channels.length === 0) return new Float32Array(0);
    if (channels.length === 1) return channels[0];
    const length = channels[0].length;
    const out = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        let sum = 0;
        for (let c = 0; c < channels.length; c++) sum += channels[c][i];
        out[i] = sum / channels.length;
    }
    return out;
}

/**
 * Buffer-facing facade: monoMixdown(buffer) is
 * mixDown(channelArrays(buffer).channels).
 *
 * @param {{numberOfChannels: number, length: number, sampleRate: number, getChannelData: (c: number) => Float32Array}} buffer
 * @returns {Float32Array}
 */
export function monoMixdown(buffer) {
    return mixDown(channelArrays(buffer).channels);
}
