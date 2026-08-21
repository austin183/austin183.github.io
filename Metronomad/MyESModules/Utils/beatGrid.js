/**
 * beatGrid — pure timing math for the Metronomad count-in/beat grid.
 *
 * Plan §3.3 T-01…T-11. No browser APIs; every entry function leads with
 * `Number.isFinite` guards.
 *
 * Grid law (spec §5): press at t_p → click k (1-based) at
 * t_p + k·beatInterval; song starts at t_p + (countInBeats+1)·beatInterval
 * (no lead-time floor — D1/KB-1).
 */

/**
 * Seconds per beat for a BPM value.
 * @param {number} bpm
 * @returns {number} interval in seconds, or NaN for invalid input
 */
export function beatInterval(bpm) {
    if (!Number.isFinite(bpm) || bpm <= 0) return NaN;
    return 60 / bpm;
}

/**
 * Build the full click schedule + song start for a sequence.
 *
 * @param {{ tP: number, bpm: number, countInBeats: number, offset?: number }} params
 * @returns {{ clicks: Array<{ time: number, isAccent: boolean }>,
 *             songStart: { time: number, offset: number } }}
 * @throws {RangeError} if countInBeats is not an integer ≥ 1
 */
export function buildSchedule({ tP, bpm, countInBeats, offset = 0 }) {
    if (!Number.isInteger(countInBeats) || countInBeats < 1) {
        throw new RangeError(`countInBeats must be an integer >= 1 (got ${countInBeats})`);
    }

    const interval = beatInterval(bpm);

    const clicks = [];
    for (let k = 1; k <= countInBeats; k++) {
        clicks.push({
            time: tP + k * interval,
            // 4/4 fixed: accent on every 4th beat (beat 1 of each bar).
            isAccent: k % 4 === 1
        });
    }

    return {
        clicks,
        songStart: { time: tP + (countInBeats + 1) * interval, offset }
    };
}

/**
 * Beat phase at an audio-clock instant — pure function of the clock (D9):
 * hidden-tab RAF pausing can never drift the dots because the phase is
 * recomputed, never accumulated.
 *
 * @param {number} now            audio-clock time
 * @param {number} firstBeatTime  time of beat 0 (first count-in click)
 * @param {number} interval       seconds per beat
 * @returns {{ beatIndex: number, inBeat: number }}
 *   beatIndex -1 (inBeat 0) before the first beat or on invalid input;
 *   otherwise the 0-based absolute beat index (floor — no early wrap)
 *   and the fractional position within that beat.
 */
export function beatPhaseFromGrid(now, firstBeatTime, interval) {
    if (!Number.isFinite(now) || !Number.isFinite(firstBeatTime) ||
        !Number.isFinite(interval) || interval <= 0) {
        return { beatIndex: -1, inBeat: 0 };
    }

    const position = (now - firstBeatTime) / interval;
    if (position < 0) return { beatIndex: -1, inBeat: 0 };

    const beatIndex = Math.floor(position);
    return { beatIndex, inBeat: position - beatIndex };
}
