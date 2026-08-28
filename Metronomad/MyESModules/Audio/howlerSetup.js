/**
 * howlerSetup — one-time Howler initialization for Metronomad (Option B).
 *
 * Howler provides only: AudioContext setup (incl. webkit fallback),
 * `Howler.masterGain`, mobile auto-unlock, and `Howler.codecs()`. All
 * precision-critical playback is raw Web Audio (see playbackEngine, Phase 4).
 *
 * Pitfall 1 (research §5): `Howler.autoSuspend` (default true) suspends the
 * context 30 s after idle based only on Howler's OWN sounds — our raw
 * buffer sources are invisible to it and would be frozen. Disable it.
 *
 * Pitfall 2 (research §5): `Howler.ctx` is null until lazy setup runs on the
 * first `Howl`/`volume()`/`mute()`/`stop()`. Touch `volume(1)` to force
 * setup before reading `Howler.ctx`.
 *
 * `autoUnlock` is intentionally left at its default (true) — the first-touch
 * iOS/Android unlock is exactly what we want (pitfall 7).
 */

export function initHowler() {
    const Howler = typeof window !== 'undefined' ? window.Howler : undefined;
    if (!Howler || typeof Howler.volume !== 'function') {
        throw new Error('Howler is not loaded');
    }

    Howler.autoSuspend = false;   // Pitfall 1 — never let idle-suspend kill playback
    Howler.volume(1);             // Pitfall 2 — force lazy AudioContext setup

    if (!Howler.ctx) {
        throw new Error('Howler failed to create an AudioContext');
    }

    return { ctx: Howler.ctx, masterGain: Howler.masterGain };
}
