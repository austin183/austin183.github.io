import { initHowler } from '../Audio/howlerSetup.js';
import { isSupportedCodec } from '../Audio/codecSupport.js';
import { renderClickBuffers } from '../Audio/clickBuffers.js';
import { createPlaybackEngine } from '../Playback/playbackEngine.js';
import { createFileLoader } from '../File/fileLoader.js';
import { createBeatDots } from './createBeatDots.js';

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
 * beforeUnmount() — cleanup order (memory-management.md): stop
 * interactions FIRST, then release resources: beatDots.stopAll() (cancels
 * the visual RAF, removes the matchMedia listener, disposes the engine —
 * scheduler/watch/RAF + sources) → fileLoader.release() (revokes the
 * live object URL, drops the buffer ref) → remove the visibilitychange
 * listener.
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
            this._beatDots = createBeatDots({
                getEngine: () => this._engine,
                getClock: () => this._clock,
                getDom: (id) => document.getElementById(id)
            });
            document.addEventListener('visibilitychange', this.onVisibilityChange);
        },

        beforeUnmount() {
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
            // stopAll disposes the engine (B-05: RAF + watch interval);
            // the fallback covers the (unreachable) no-visualizer path.
            if (this._beatDots) {
                this._beatDots.stopAll(this);
                this._beatDots = null;
            } else if (this._engine) {
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
