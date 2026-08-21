/**
 * playbackEngine — the core: lookahead scheduler, generation counter,
 * state machine, interrupt watch, preview. Deterministic under injected fakes
 * (Phase 4). No real AudioContext is required: every time read goes through
 * `clock.currentTime`, every source is created through one `createSource`
 * choke point (tests fake the context), and every timer is injectable.
 *
 * Design decisions (plan §Design Decisions):
 *   D4  Generation counter — every start/stop/restart/preview bumps `_generation`;
 *       onended callbacks + scheduler ticks capture theirs and no-op if stale.
 *       Makes Play/Stop mashing atomic with no lock (P-03/P-04).
 *   D5  The song source is `start(when, offset)`-ed IMMEDIATELY in startSequence
 *       (one deterministic precision call); the lookahead loop schedules only
 *       the N click sources.
 *   D6  Hand-rolled "A Tale of Two Clocks" scheduler — 25 ms tick, 100 ms
 *       horizon — no Tone.js.
 *   D9  Beat grid exposed for the RAF dot loop; phase is a pure function of
 *       the audio clock (never accumulated).
 *   D10 Context-state watch (250 ms): suspended/interrupted → self-stop +
 *       onInterrupted() once.
 *
 * State: stopped / countingIn / playing / preview.
 */

import { beatInterval, buildSchedule, beatPhaseFromGrid } from '../Utils/beatGrid.js';
import { BPM_MIN, BPM_MAX, COUNT_IN_MIN, COUNT_IN_MAX } from '../Utils/paramClamps.js';

export const ENGINE_STATES = {
    STOPPED: 'stopped',
    COUNTING_IN: 'countingIn',
    PLAYING: 'playing',
    PREVIEW: 'preview'
};

export const SCHEDULER = {
    TICK_MS: 25,
    LOOKAHEAD_SEC: 0.1,
    WATCH_MS: 250,
    RESUME_TIMEOUT_MS: 750
};

export const PREVIEW_SECONDS = 3;

// The single source-creation choke point. Tests replace `context` with a fake
// whose createBufferSource() returns a recording stub (P-14/P-05 ordering).
function createSource(context, buffer) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    return source;
}

/**
 * @param {object} deps
 *   context        AudioContext (real or fake) — createBufferSource/createGain
 *   masterGain     GainNode to wire sources into
 *   clickBuffers   { accent, regular } AudioBuffers
 *   onStateChange  (state) → void   — engine state + terminal events
 *   onInterrupted  () → void        — D10 self-stop notice
 *   onFrame        (phase) → void   — visual-clock callback (D9)
 *   clock          { currentTime }  — defaults to context
 *   schedulerMs    lookahead tick ms — defaults SCHEDULER.TICK_MS
 *   lookaheadSec   scheduling horizon — defaults SCHEDULER.LOOKAHEAD_SEC
 *   raf/cancelRaf  animation-frame fns — defaults window.*
 *   setInterval/clearInterval — timer fns (DIP) — defaults window.*
 */
export function createPlaybackEngine({
    context,
    masterGain,
    clickBuffers,
    onStateChange,
    onInterrupted,
    onFrame,
    clock,
    schedulerMs = SCHEDULER.TICK_MS,
    lookaheadSec = SCHEDULER.LOOKAHEAD_SEC,
    raf,
    cancelRaf,
    setInterval: setIntervalFn,
    clearInterval: clearIntervalFn
}) {
    const _clock = clock || context;
    const _raf = raf || ((cb) => window.requestAnimationFrame(cb));
    const _cancelRaf = cancelRaf || ((id) => window.cancelAnimationFrame(id));
    const _setInterval = setIntervalFn || ((fn, ms) => window.setInterval(fn, ms));
    const _clearInterval = clearIntervalFn || ((id) => window.clearInterval(id));

    let _state = ENGINE_STATES.STOPPED;
    let _generation = 0;

    // Active sequence description (null when stopped).
    let _seq = null; // { tP, interval, clicks: [{time,isAccent,scheduled}], songStart:{time,offset}, buffer, offset }
    let _songSource = null;
    let _clickSources = [];
    let _gains = [];

    // Preview (distinct from a full sequence — no clicks).
    let _preview = null; // { start, offset, duration, buffer }
    let _previewSource = null;

    let _schedulerId = null;
    let _watchId = null;
    let _rafId = null;

    function _emit(state) {
        if (onStateChange) onStateChange(state);
    }

    function _setState(next) {
        if (_state === next) return;
        _state = next;
        _emit(next);
    }

    // Wire a fresh source → its own GainNode → masterGain (P-14). Returns the source.
    function _connectSource(source) {
        const gain = context.createGain();
        source.connect(gain);
        gain.connect(masterGain);
        _gains.push(gain);
        return source;
    }

    function _disconnectAll() {
        for (const s of [..._clickSources, _songSource, _previewSource]) {
            if (s) {
                try { s.stop(); } catch (_) { /* not started — ignore */ }
                try { s.disconnect(); } catch (_) { /* already disconnected */ }
            }
        }
        for (const g of _gains) {
            try { g.disconnect(); } catch (_) { /* already disconnected */ }
        }
        _clickSources = [];
        _songSource = null;
        _previewSource = null;
        _gains = [];
    }

    // D4: bump the generation and tear down any live sources/timers.
    // Does NOT change _state — callers set the resulting state explicitly.
    function _teardown() {
        _generation++;
        if (_schedulerId !== null) { _clearInterval(_schedulerId); _schedulerId = null; }
        if (_watchId !== null) { _clearInterval(_watchId); _watchId = null; }
        stopVisualClock();
        _disconnectAll();
        _seq = null;
        _preview = null;
    }

    // ---- D10 interrupt watch -------------------------------------------
    function _startWatch() {
        if (_watchId !== null) return;
        _watchId = _setInterval(_watchTick, SCHEDULER.WATCH_MS);
    }

    function _watchTick() {
        if (_state === ENGINE_STATES.STOPPED) return;
        const cs = context.state;
        if (cs === 'suspended' || cs === 'interrupted') {
            _teardown();
            _setState(ENGINE_STATES.STOPPED);
            // Fires at most once per interruption: _teardown clears the watch
            // interval, so no second tick can re-trigger it (P-11).
            if (onInterrupted) onInterrupted();
        }
    }

    // ---- D5/D6 lookahead scheduler (clicks only) -----------------------
    function _scheduleClick(click) {
        const buffer = click.isAccent ? clickBuffers.accent : clickBuffers.regular;
        const source = _connectSource(createSource(context, buffer));
        source.start(click.time);
        click.scheduled = true;
        _clickSources.push(source);
    }

    function _schedulerTick() {
        if (_state !== ENGINE_STATES.COUNTING_IN || !_seq) return;
        const now = _clock.currentTime;
        const horizon = now + lookaheadSec;

        // Schedule every not-yet-scheduled click that has entered the horizon.
        // The monotonic `scheduled` flag means each click is scheduled exactly
        // once — no duplicates, no gaps across tick boundaries (P-08).
        for (const click of _seq.clicks) {
            if (!click.scheduled && click.time <= horizon) {
                _scheduleClick(click);
            }
        }

        // State flip: song start is sample-accurate (D5); the visible state
        // follows the clock crossing the song-start time.
        if (now >= _seq.songStart.time) {
            _setState(ENGINE_STATES.PLAYING);
        }
    }

    function _startScheduler() {
        if (_schedulerId !== null) return;
        _schedulerId = _setInterval(_schedulerTick, schedulerMs);
    }

    // ---- visual clock (D9) ---------------------------------------------
    function _rafTick() {
        _rafId = null;
        const grid = getBeatGrid();
        if (!grid) return; // stopped → stop the loop
        const phase = beatPhaseFromGrid(_clock.currentTime, grid.firstBeatTime, grid.interval);
        if (onFrame) onFrame(phase);
        _rafId = _raf(_rafTick);
    }

    // ---- public API -----------------------------------------------------
    function startSequence({ buffer, bpm, countInBeats, offset }) {
        // P-13 defense-in-depth: validate before touching anything.
        if (!buffer ||
            !Number.isFinite(bpm) || bpm < BPM_MIN || bpm > BPM_MAX ||
            !Number.isInteger(countInBeats) || countInBeats < COUNT_IN_MIN || countInBeats > COUNT_IN_MAX ||
            !Number.isFinite(offset) || offset < 0) {
            return { ok: false };
        }

        const tP = _clock.currentTime;
        const interval = beatInterval(bpm);
        const built = buildSchedule({ tP, bpm, countInBeats, offset });

        _teardown(); // stop any prior sequence/preview (atomic replacement)

        _seq = {
            tP,
            interval,
            clicks: built.clicks.map(c => ({ time: c.time, isAccent: c.isAccent, scheduled: false })),
            songStart: built.songStart,
            buffer,
            offset
        };

        // D5: start the song source immediately, sample-accurately.
        _songSource = _connectSource(createSource(context, buffer));
        const gen = _generation;
        _songSource.onended = () => {
            if (gen !== _generation) return; // stale (D4)
            // countingIn is included: if the offset leaves less than one tick
            // of song, onended can arrive before the flip tick ran — the
            // sequence must still terminate (no frozen state).
            if (_state !== ENGINE_STATES.PLAYING && _state !== ENGINE_STATES.COUNTING_IN) return;
            _teardown();
            _state = ENGINE_STATES.STOPPED; // silent — 'ended' is the single terminal event
            _emit('ended');
        };
        _songSource.start(_seq.songStart.time, _seq.songStart.offset);

        _startScheduler();
        _startWatch();
        _setState(ENGINE_STATES.COUNTING_IN);

        return { ok: true, schedule: _seq };
    }

    function stop() {
        if (_state === ENGINE_STATES.STOPPED) return; // idempotent (P-02)
        _teardown();
        _setState(ENGINE_STATES.STOPPED);
    }

    function restart(params) {
        // P-05: synchronous stop + start. _teardown inside startSequence stops
        // the old sources before the new song source starts (ordering spied).
        return startSequence(params);
    }

    function preview({ buffer, offset }) {
        if (!buffer || !Number.isFinite(offset) || offset < 0) return { ok: false };

        const start = _clock.currentTime;
        // D2: 3 s preview clamped to the remainder; never 0 or negative.
        const remaining = buffer.duration - offset;
        const duration = Math.min(PREVIEW_SECONDS, remaining);
        if (!(duration > 0)) return { ok: false };

        _teardown();
        _preview = { start, offset, duration, buffer };

        _previewSource = _connectSource(createSource(context, buffer));
        const gen = _generation;
        _previewSource.onended = () => {
            if (gen !== _generation) return;
            if (_state !== ENGINE_STATES.PREVIEW) return;
            _teardown();
            _state = ENGINE_STATES.STOPPED; // silent — 'previewEnded' is the single terminal event
            _emit('previewEnded');
        };
        _previewSource.start(start, offset, duration);

        _startWatch();
        _setState(ENGINE_STATES.PREVIEW);
        return { ok: true };
    }

    function getBeatGrid() {
        if (!_seq || (_state !== ENGINE_STATES.COUNTING_IN && _state !== ENGINE_STATES.PLAYING)) {
            return null;
        }
        return {
            firstBeatTime: _seq.tP + _seq.interval,
            interval: _seq.interval,
            state: _state
        };
    }

    // offset + (now − songStartTime), clamped to [offset, duration]; null
    // before the song has started (stopped / countingIn / preview-not-started).
    function songPosition(now) {
        const t = (now === undefined) ? _clock.currentTime : now;
        if (!Number.isFinite(t)) return null;

        if (_state === ENGINE_STATES.PLAYING && _seq) {
            const pos = _seq.offset + (t - _seq.songStart.time);
            return clamp(pos, _seq.offset, _seq.buffer.duration);
        }
        if (_state === ENGINE_STATES.PREVIEW && _preview) {
            const pos = _preview.offset + (t - _preview.start);
            return clamp(pos, _preview.offset, _preview.buffer.duration);
        }
        return null;
    }

    function clamp(pos, lo, hi) {
        return Math.min(Math.max(pos, lo), hi);
    }

    function startVisualClock() {
        if (_rafId !== null) return;
        _rafId = _raf(_rafTick);
    }

    function stopVisualClock() {
        if (_rafId !== null) {
            _cancelRaf(_rafId);
            _rafId = null;
        }
    }

    function dispose() {
        stopVisualClock();
        if (_schedulerId !== null) { _clearInterval(_schedulerId); _schedulerId = null; }
        if (_watchId !== null) { _clearInterval(_watchId); _watchId = null; }
        _disconnectAll();
        _seq = null;
        _preview = null;
        _state = ENGINE_STATES.STOPPED;
    }

    return {
        get state() { return _state; },
        startSequence,
        stop,
        restart,
        preview,
        getBeatGrid,
        songPosition,
        startVisualClock,
        stopVisualClock,
        dispose
    };
}
