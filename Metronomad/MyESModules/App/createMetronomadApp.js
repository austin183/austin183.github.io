/**
 * createMetronomadApp — Vue app factory for Metronomad.
 *
 * Follows the repo factory-decomposition pattern (CollageMaker's
 * createCollageApp): data/methods/lifecycle are injected as configs,
 * `createApp` is injected from the CDN global (DIP).
 */

import { APP_STATES } from './createMetronomadData.js';
import { formatTime } from '../Utils/timeFormat.js';

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

            progressPercent() {
                if (!Number.isFinite(this.duration) || this.duration <= 0) return 0;
                const clamped = Math.min(Math.max(this.songPosition, 0), this.duration);
                return (clamped / this.duration) * 100;
            },

            offsetMarkerPercent() {
                if (!Number.isFinite(this.duration) || this.duration <= 0) return 0;
                const clamped = Math.min(Math.max(this.offset, 0), this.duration);
                return (clamped / this.duration) * 100;
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
