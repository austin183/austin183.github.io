/**
 * createMetronomadData — reactive data factory for the Metronomad Vue app.
 *
 * Returns a factory function (Vue requires `data` to be a function).
 *
 * Phase 1 scaffold: audio behavior lands in Phases 3–6; every field the
 * template binds is present here so the shell renders all regions in
 * every state (D8: states are noFile/ready/countingIn/playing; decoding
 * is a flag, preview is an engine state surfaced via `isPreviewing`).
 */

// App states (D8).
export const APP_STATES = {
    NO_FILE: 'noFile',
    READY: 'ready',
    COUNTING_IN: 'countingIn',
    PLAYING: 'playing'
};

export function createMetronomadData() {
    return function () {
        return {
            appState: APP_STATES.NO_FILE,

            // Song file (Phase 3)
            decoding: { active: false, fileName: '' },
            fileName: '',
            duration: 0,

            // Parameters — spec §4 defaults
            bpm: 120,
            countInBeats: 4,
            offset: 0,
            offsetText: '0:00.0',

            // Clamp hints (U-10/U-11)
            bpmClamped: false,
            offsetClamped: false,
            offsetHint: '',

            // Feedback (D8: errors are non-blocking overlays)
            errorMessage: '',
            announcement: '',

            // Engine-surfaced flag (Phase 5)
            isPreviewing: false,

            // Visual state (Phase 6)
            isDragOver: false,
            activeBeatIndex: -1, // 0–3 lit dot; -1 = none (data-beat hook, KB-6)
            songPosition: 0
        };
    };
}
