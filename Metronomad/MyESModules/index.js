/**
 * Metronomad barrel exports.
 *
 * Convention: named exports only; verify each re-exported name exists in
 * its source module (a re-export of a missing name silently yields
 * `undefined` in browsers).
 *
 * Phase 2: Utils (timing math, time formatting, param clamps).
 * Phase 3: Audio (howlerSetup, codecSupport), File (fileLoader).
 * Phase 4: Audio (clickBuffers), Playback (playbackEngine).
 * Phase 6: App (createBeatDots).
 * CR 001 Phase 1: Analysis (channelData, waveformPeaks).
 * CR 001 Phase 2: Analysis (tempoDetection).
 * CR 001 Phase 3: App (createWaveformView).
 * CR 004 Phase 1: Storage (savedLoops, localStorageAdapter).
 */

export { initHowler } from './Audio/howlerSetup.js';
export { isSupportedCodec } from './Audio/codecSupport.js';
export { CLICK, renderClickBuffer, renderClickBuffers } from './Audio/clickBuffers.js';
export {
    ENGINE_STATES, ENGINE_EVENTS, SCHEDULER, PREVIEW_SECONDS, createPlaybackEngine
} from './Playback/playbackEngine.js';
export { createFileLoader } from './File/fileLoader.js';
export { beatInterval, buildSchedule, beatPhaseFromGrid, BEATS_PER_BAR } from './Utils/beatGrid.js';
export { formatTime, parseOffsetInput } from './Utils/timeFormat.js';
export {
    clampBpm, clampCountIn, clampOffset, clampEnd,
    BPM_MIN, BPM_MAX, BPM_DEFAULT,
    COUNT_IN_MIN, COUNT_IN_MAX, COUNT_IN_DEFAULT,
    MIN_SECTION_SEC
} from './Utils/paramClamps.js';
export { APP_STATES, createMetronomadData } from './App/createMetronomadData.js';
export { createBeatDots } from './App/createBeatDots.js';
export { createWaveformView } from './App/createWaveformView.js';
export { channelArrays, mixDown, monoMixdown } from './Analysis/channelData.js';
export {
    extractPeaks, poolPeaks,
    PEAK_BUCKETS_DEFAULT, PEAK_STRIDE_MAX_SAMPLES
} from './Analysis/waveformPeaks.js';
export { detectTempo, TEMPO } from './Analysis/tempoDetection.js';
export { createMetronomadMethods } from './App/createMetronomadMethods.js';
export { createMetronomadLifecycle } from './App/createMetronomadLifecycle.js';
export { createMetronomadApp } from './App/createMetronomadApp.js';
export {
    STORAGE_KEY, SCHEMA_VERSION, MAX_ENTRIES, DURATION_TOLERANCE_SEC,
    createEmptyState, encode, parse, entryMatches, addEntry, removeEntry,
    fileIdentityOf, newId
} from './Storage/savedLoops.js';
export { createLocalStorageAdapter } from './Storage/localStorageAdapter.js';
