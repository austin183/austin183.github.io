import { initHowler } from '../Audio/howlerSetup.js';
import { isSupportedCodec } from '../Audio/codecSupport.js';
import { renderClickBuffers } from '../Audio/clickBuffers.js';
import { createPlaybackEngine } from '../Playback/playbackEngine.js';
import { createFileLoader } from '../File/fileLoader.js';
import { createBeatDots } from './createBeatDots.js';
import { createWaveformView } from './createWaveformView.js';

/**
 * createMetronomadLifecycle — Vue lifecycle hooks for Metronomad.
 *
 * mounted() — wires the audio stack (plan §File Layout "Vue wiring"):
 *   initHowler() in try (failure → non-blocking Error, "Audio is not
 *   supported in this browser") → renderClickBuffers(ctx) →
 *   createPlaybackEngine (callbacks mutate reactive state via the V-07
 *   mapping methods) → createFileLoader (codecs + context + onStateChange
 *   → decoding flag). The engine/clock are held NON-reactive on the
 *   instance as _engine/_clock (never bound in the template).
 *
 * beforeUnmount() — cleanup order (memory-management.md): remove the
 * visibilitychange listener FIRST (no events mid-teardown), then
 * beatDots.stopAll() (visualizer resources only — cancels the pending RAF,
 * removes the matchMedia listener, clears the dot state; I-6/RD-6: it
 * never touches the engine), then engine.dispose() (scheduler/watch
 * intervals + sources — owned by this lifecycle, R-I6.2/B-06), then
 * fileLoader.release() (revokes the live object URL, drops the buffer ref).
 * The engine-dispose branch doubles as the defense for a mount that built
 * the engine but no visualizer.
 */

export function createMetronomadLifecycle() {
    return {
        mounted() {
            let audio;
            try {
                audio = initHowler();
            } catch (err) {
                console.error('Metronomad audio init failed:', err);
                this.errorMessage = 'Audio is not supported in this browser';
                return;
            }

            // Non-reactive handles (never bound in the template).
            this._clock = audio.ctx;

            let clickBuffers;
            try {
                clickBuffers = renderClickBuffers(audio.ctx);
            } catch (err) {
                console.error('Metronomad click buffer render failed:', err);
                this.errorMessage = 'Audio is not supported in this browser';
                return;
            }

            this._engine = createPlaybackEngine({
                context: audio.ctx,
                masterGain: audio.masterGain,
                clickBuffers,
                // Engine events → appState + live region (V-07);
                // D10 self-stop notice → interruption announcement.
                onStateChange: (state) => this.onEngineStateChange(state),
                onInterrupted: () => this.onAudioInterrupted()
            });

            this._fileLoader = createFileLoader({
                codecs: { check: isSupportedCodec },
                context: audio.ctx,
                onStateChange: (state, detail) => {
                    // U-01: "Decoding <name>…" shows the moment the drop lands.
                    this.decoding = state === 'decoding'
                        ? { active: true, fileName: (detail && detail.fileName) || '' }
                        : { active: false, fileName: '' };
                }
            });

            // Phase 6: beat dots + progress visualizer (D9). The engine and
            // clock are looked up lazily so this factory never captures a
            // stale handle.
            this._beatDots = createBeatDots(this, {
                getEngine: () => this._engine,
                getClock: () => this._clock,
                getDom: (id) => document.getElementById(id)
            });

            // CR 001 Phase 5 (D-G wiring): the three scrub callbacks turn
            // the canvas into the offset slider. Arrow wrappers look the
            // methods up at CALL time (never captured at factory time) —
            // Vue binds `this` to the instance for every method. init does
            // the container-measured DPR sizing (D-F delta 3) — the canvas
            // is static DOM.
            this._waveformView = createWaveformView(this, {}, {
                onScrubStart: (t) => this.onWaveformScrubStart(t),
                onScrubMove: (t) => this.onWaveformScrubMove(t),
                onScrubEnd: (c) => this.onWaveformScrubEnd(c)
            });
            this._waveformView.init(document.getElementById('waveformCanvas'));

            document.addEventListener('visibilitychange', this.onVisibilityChange);
        },

        beforeUnmount() {
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
            // Visualizer first — its own resources only (B-05 rev): the
            // engine is disposed by THIS lifecycle, never the visualizer.
            if (this._beatDots) {
                this._beatDots.stopAll();
                this._beatDots = null;
            }
            // D-E guard half (unmount): _disposed is set FIRST so any
            // in-flight analysis task dies on its next guard check —
            // nothing touches an unmounted VM (W-15). The waveform view
            // disposes between stopAll() and engine.dispose() (listener
            // removal before renderer disposal; RD-6 — it touches only its
            // own resources, never the engine).
            this._disposed = true;
            this._peaks = null;
            this._buffer = null;
            if (this._waveformView) {
                this._waveformView.dispose();
                this._waveformView = null;
            }
            // The else-if fallback of the v1 code is now a plain defense:
            // stopAll no longer disposes, so the lifecycle always owns the
            // engine teardown (R-I6.2/B-06).
            if (this._engine) {
                this._engine.dispose();
                this._engine = null;
            }
            if (this._fileLoader) {
                this._fileLoader.release();
                this._fileLoader = null;
            }
        }
    };
}
