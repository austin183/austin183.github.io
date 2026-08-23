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
    clampBpm, clampCountIn, clampOffset,
    BPM_MIN, BPM_MAX, BPM_DEFAULT,
    COUNT_IN_MIN, COUNT_IN_MAX, COUNT_IN_DEFAULT
} from './Utils/paramClamps.js';
export { APP_STATES, createMetronomadData } from './App/createMetronomadData.js';
export { createBeatDots } from './App/createBeatDots.js';
export { createMetronomadMethods } from './App/createMetronomadMethods.js';
export { createMetronomadLifecycle } from './App/createMetronomadLifecycle.js';
export { createMetronomadApp } from './App/createMetronomadApp.js';
