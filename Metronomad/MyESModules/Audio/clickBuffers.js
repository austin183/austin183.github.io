/**
 * clickBuffers — pre-rendered metronome click AudioBuffers (D7).
 *
 * Two 60 ms mono sine bursts rendered at the context's sample rate:
 *   accent  1568 Hz (G6) — beat 1 of each bar
 *   regular 1047 Hz (C6) — beats 2–4
 *
 * Envelope: 5 ms linear attack to full amplitude, then exponential decay
 * to 1e-5 over the remaining 55 ms. The near-zero tail prevents a
 * click-on when the buffer ends.
 *
 * Buffers are rendered once at startup (mounted) and reused for every
 * sequence — rendering per click would allocate on the hot path.
 */

export const CLICK = {
    ACCENT_FREQ: 1568,
    REGULAR_FREQ: 1047,
    DURATION_SEC: 0.06,
    ATTACK_SEC: 0.005
};

const FLOOR = 1e-5;

/**
 * Render one click buffer: sine at `freq` with linear attack +
 * exponential decay.
 *
 * @param {BaseAudioContext} ctx
 * @param {number} freq
 * @returns {AudioBuffer}
 */
export function renderClickBuffer(ctx, freq) {
    const sampleRate = ctx.sampleRate;
    const length = Math.round(CLICK.DURATION_SEC * sampleRate);
    const attackSamples = Math.max(1, Math.round(CLICK.ATTACK_SEC * sampleRate));
    const decaySamples = length - attackSamples;
    const logFloor = Math.log(FLOOR);

    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const sine = Math.sin(2 * Math.PI * freq * t);
        // (i+1)/(n+1) keeps the endpoints strictly inside (0, 1):
        // sample 0 is not exactly silent, last attack sample not exactly 1.
        const amp = i < attackSamples
            ? (i + 1) / (attackSamples + 1)
            : Math.exp(logFloor * ((i - attackSamples) / decaySamples));
        data[i] = sine * amp;
    }

    return buffer;
}

/**
 * Render both click buffers.
 *
 * @param {BaseAudioContext} ctx
 * @returns {{ accent: AudioBuffer, regular: AudioBuffer }}
 */
export function renderClickBuffers(ctx) {
    return {
        accent: renderClickBuffer(ctx, CLICK.ACCENT_FREQ),
        regular: renderClickBuffer(ctx, CLICK.REGULAR_FREQ)
    };
}
