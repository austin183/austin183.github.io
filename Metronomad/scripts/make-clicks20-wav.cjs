#!/usr/bin/env node
/**
 * make-clicks20-wav — generates test/fixtures/clicks20.wav (CR 001, D-K).
 *
 * The fixture is the E2E ground truth for tempo detection (tempo.spec.cjs):
 * a 120 BPM click train — 40 clicks at t = 0.0, 0.5, …, 19.5 s, each a
 * 60 ms sine burst with the clickBuffers.js envelope (5 ms linear attack,
 * exponential decay to 1e-5), 1047 Hz (C6) regular with the 1568 Hz (G6)
 * accent every 4th click (the TD-1.15 shape — the metronome's downbeat
 * accent, so the first click at t = 0 is accented).
 *
 * Format: 20 s · 44 100 Hz · mono · 16-bit PCM WAV. Size is exact by
 * construction: 20 × 44 100 × 2 = 1 764 000 data bytes + 44-byte
 * RIFF/WAVE header = 1 764 044 bytes. PCM WAV decodes everywhere
 * (Howler.codecs('wav') — codecSupport.js) with no lossy artifacts and no
 * container tags (CR §2.2 metadata deferral).
 *
 * This script is the fixture's living provenance: re-run it and the
 * committed bytes are reproduced exactly (the envelope math is
 * deterministic — same constants, same order, same rounding).
 *
 * Usage: node scripts/make-clicks20-wav.cjs   (writes test/fixtures/clicks20.wav)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --- The recipe (same constants as MyESModules/Audio/clickBuffers.js) ---
const SAMPLE_RATE = 44100;
const DURATION_SEC = 20;
const SPACING_SEC = 0.5;            // 120 BPM
const CLICK_COUNT = DURATION_SEC / SPACING_SEC;   // 40
const CLICK_DURATION_SEC = 0.06;    // clickBuffers.js CLICK.DURATION_SEC
const ATTACK_SEC = 0.005;           // clickBuffers.js CLICK.ATTACK_SEC
const FLOOR = 1e-5;                 // clickBuffers.js decay floor
const REGULAR_FREQ = 1047;          // clickBuffers.js CLICK.REGULAR_FREQ (C6)
const ACCENT_FREQ = 1568;           // clickBuffers.js CLICK.ACCENT_FREQ (G6)
const ACCENT_EVERY = 4;             // TD-1.15: accent every 4th click

/**
 * Build the 20 s sample array: zeroed, then each click added at its onset.
 * (60 ms bursts are far shorter than the 500 ms spacing, so no overlaps.)
 */
function buildSamples() {
    const length = DURATION_SEC * SAMPLE_RATE;
    const samples = new Float64Array(length);

    const clickLength = Math.round(CLICK_DURATION_SEC * SAMPLE_RATE); // 2646
    const attackSamples = Math.max(1, Math.round(ATTACK_SEC * SAMPLE_RATE)); // 220
    const decaySamples = clickLength - attackSamples;
    const logFloor = Math.log(FLOOR);

    for (let c = 0; c < CLICK_COUNT; c++) {
        const start = Math.round(c * SPACING_SEC * SAMPLE_RATE);
        const freq = c % ACCENT_EVERY === 0 ? ACCENT_FREQ : REGULAR_FREQ;
        for (let i = 0; i < clickLength && start + i < length; i++) {
            // (i+1)/(n+1) keeps the endpoints strictly inside (0, 1) —
            // same convention as renderClickBuffer (clickBuffers.js:44-49).
            const amp = i < attackSamples
                ? (i + 1) / (attackSamples + 1)
                : Math.exp(logFloor * ((i - attackSamples) / decaySamples));
            samples[start + i] += Math.sin(2 * Math.PI * freq * (i / SAMPLE_RATE)) * amp;
        }
    }
    return samples;
}

/** Encode 16-bit little-endian PCM into a 44-byte-header RIFF/WAVE buffer. */
function encodeWav(samples) {
    const dataBytes = samples.length * 2;
    const wav = Buffer.alloc(44 + dataBytes);
    const byteRate = SAMPLE_RATE * 2; // mono 16-bit
    wav.write('RIFF', 0, 'ascii');
    wav.writeUInt32LE(36 + dataBytes, 4);
    wav.write('WAVE', 8, 'ascii');
    wav.write('fmt ', 12, 'ascii');
    wav.writeUInt32LE(16, 16);          // fmt chunk size
    wav.writeUInt16LE(1, 20);           // audioFormat: PCM
    wav.writeUInt16LE(1, 22);           // channels: mono
    wav.writeUInt32LE(SAMPLE_RATE, 24);
    wav.writeUInt32LE(byteRate, 28);
    wav.writeUInt16LE(2, 32);           // blockAlign
    wav.writeUInt16LE(16, 34);          // bitsPerSample
    wav.write('data', 36, 'ascii');
    wav.writeUInt32LE(dataBytes, 40);
    for (let i = 0; i < samples.length; i++) {
        const v = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
        wav.writeInt16LE(v, 44 + i * 2);
    }
    return wav;
}

/**
 * Sanity pass on the ENCODED bytes (not the in-memory array): decode the
 * int16 stream back and check the onset structure — every 0.5 s slot has
 * energy at its start and near-silence between clicks.
 */
function sanityCheck(wav) {
    if (wav.length !== 1764044) throw new Error(`unexpected size ${wav.length} (want 1764044)`);
    const read = (i) => wav.readInt16LE(44 + i * 2) / 32768;

    let maxGap = 0;
    for (let c = 0; c < CLICK_COUNT; c++) {
        const onset = Math.round(c * SPACING_SEC * SAMPLE_RATE);
        // Onset window: the first 30 ms of the slot (attack + part of decay).
        let peakOnset = 0;
        for (let i = 0; i < Math.round(0.03 * SAMPLE_RATE); i++) peakOnset = Math.max(peakOnset, Math.abs(read(onset + i)));
        // Gap window: 100–400 ms into the slot — must be silence.
        let peakGap = 0;
        for (let i = Math.round(0.1 * SAMPLE_RATE); i < Math.round(0.4 * SAMPLE_RATE); i++) peakGap = Math.max(peakGap, Math.abs(read(onset + i)));
        if (peakOnset < 0.5) throw new Error(`click ${c}: onset peak ${peakOnset} too low — onset missing at ${c * SPACING_SEC}s`);
        if (peakGap > 1e-3) throw new Error(`click ${c}: gap peak ${peakGap} too high — leakage into the next slot`);
        maxGap = Math.max(maxGap, peakGap);
    }
    console.log(`sanity OK: ${CLICK_COUNT} onsets at ${SPACING_SEC}s spacing, max inter-click peak ${maxGap.toExponential(2)}`);
}

const out = path.join(__dirname, '..', 'test', 'fixtures', 'clicks20.wav');
const wav = encodeWav(buildSamples());
sanityCheck(wav);
fs.writeFileSync(out, wav);
console.log(`wrote ${out} (${wav.length} bytes)`);
