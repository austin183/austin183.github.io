/**
 * createMetronomadApp — Vue app factory for Metronomad.
 *
 * Follows the repo factory-decomposition pattern (CollageMaker's
 * createCollageApp): data/methods/lifecycle are injected as configs,
 * `createApp` is injected from the CDN global (DIP).
 */

import { APP_STATES } from './createMetronomadData.js';
import { formatTime } from '../Utils/timeFormat.js';

// Shared percent-of-duration law (review F-4): guard → clamp to
// [0, duration] → percent. 0 for non-positive/non-finite duration — the
// pre-existing contract of progressPercent/offsetMarkerPercent.
function percentOfDuration(duration, value) {
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    const clamped = Math.min(Math.max(value, 0), duration);
    return (clamped / duration) * 100;
}

export function createMetronomadApp({ createApp, dataConfig, methodsConfig, lifecycleConfig }) {
    // Explicit merge — never spread lifecycleConfig after `methods:`
    // (a `methods:` key there would silently clobber the template methods).
    const allMethods = {
        ...methodsConfig,
        ...(lifecycleConfig.methods || {})
    };

    return createApp({
        data: dataConfig,

        computed: {
            // A decoded song is loaded and no decode is in flight.
            // Drives every :disabled binding (no-file and decoding states).
            isReady() {
                return this.appState === APP_STATES.READY && !this.decoding.active;
            },

            // Restart is only for the count-in/song sequence (spec §6) —
            // stays disabled during preview (KB-5).
            isSequenceRunning() {
                return this.appState === APP_STATES.COUNTING_IN ||
                    this.appState === APP_STATES.PLAYING;
            },

            // Any running audio locks the parameter controls (V-06) and
            // flips the Play button to Stop (V-01).
            isParamLocked() {
                return this.isSequenceRunning || this.isPreviewing;
            },

            formattedDuration() {
                return formatTime(this.duration);
            },

            formattedPosition() {
                return formatTime(this.songPosition);
            },

            // Canvas slider aria-valuetext (Phase 5): the committed offset
            // in the canonical "Offset m:ss.t" shape. A computed keeps the
            // pure util off the instance-method surface (review F-3) and
            // still satisfies the template-scope rule — computeds are
            // instance properties, module imports are not.
            offsetAriaText() {
                return 'Offset ' + formatTime(this.offset);
            },

            progressPercent() {
                return percentOfDuration(this.duration, this.songPosition);
            },

            offsetMarkerPercent() {
                return percentOfDuration(this.duration, this.offset);
            },

            // --- Waveform progress computeds (CR 001 Phase 4, D-H). All
            // four percent computeds delegate to percentOfDuration (review
            // F-4): the guard→clamp→percent law exists once. Phase 4
            // originally left the pre-existing pair untouched (risk R-4);
            // F-4 extracted the shared law without changing any math. ---
            // The position the readout + playhead display: the scrub draft
            // while one is active, the song position otherwise.
            displayPosition() {
                return this.offsetDraft !== null ? this.offsetDraft : this.songPosition;
            },

            formattedDisplayPosition() {
                return formatTime(this.displayPosition);
            },

            // progressPercent's math on displayPosition (guarded → 0).
            playheadPercent() {
                return percentOfDuration(this.duration, this.displayPosition);
            },

            // Draft percent while dragging (Phase 5), else the committed
            // offset marker — the DOM overlays track one value or the other.
            markerPercent() {
                if (this.offsetDraft !== null) {
                    return percentOfDuration(this.duration, this.offsetDraft);
                }
                return this.offsetMarkerPercent;
            }
            // N-10: the per-position progressAriaLabel computed is deleted —
            // the template carries a STATIC aria-label, and aria-valuetext
            // reads the already-quantized formattedPosition (B-04 rev).
        },

        watch: {
            // KB-6 testability hook: expose appState on document.body for E2E.
            appState: {
                immediate: true,
                handler(nextState) {
                    document.body.dataset.state = nextState;
                }
            },
            // Ready-state invariant: with nothing playing, the progress
            // readout IS the entry point — an offset change (scrub or
            // direct commit) must move it, or the readout/aria-label
            // desyncs from the offset marker (Phase 8 keyboard pass).
            offset(nextOffset) {
                if (this.appState === APP_STATES.READY) this.songPosition = nextOffset;
            }
        },

        methods: allMethods,

        mounted: lifecycleConfig.mounted,
        beforeUnmount: lifecycleConfig.beforeUnmount
    });
}
