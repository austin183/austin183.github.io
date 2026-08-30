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
 *   D9  Beat grid + position exposed for the app-level RAF dot loop
 *       (createBeatDots owns the visual clock — the engine never schedules
 *       animation frames; I-5/RD-6).
 *   D10 Context-state watch (250 ms): suspended/interrupted → self-stop +
 *       onInterrupted() once.
 *
 * State: stopped / countingIn / playing / preview.
 */

import { beatInterval, buildSchedule } from '../Utils/beatGrid.js';
import { BPM_MIN, BPM_MAX, COUNT_IN_MIN, COUNT_IN_MAX } from '../Utils/paramClamps.js';

export const ENGINE_STATES = {
    STOPPED: 'stopped',
    COUNTING_IN: 'countingIn',
    PLAYING: 'playing',
    PREVIEW: 'preview'
};

// Terminal EVENTS (not states — the engine emits exactly one per finished
// run) carried through the same onStateChange channel. N-7: exported so
// consumers switch on constants, not magic strings (R-N7.1).
export const ENGINE_EVENTS = {
    ENDED: 'ended',
    PREVIEW_ENDED: 'previewEnded'
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
 *   clock          { currentTime }  — defaults to context
 *   schedulerMs    lookahead tick ms — defaults SCHEDULER.TICK_MS
 *   lookaheadSec   scheduling horizon — defaults SCHEDULER.LOOKAHEAD_SEC
 *   setInterval/clearInterval — timer fns (DIP) — defaults window.*
 */
export function createPlaybackEngine({
    context,
    masterGain,
    clickBuffers,
    onStateChange,
    onInterrupted,
    clock,
    schedulerMs = SCHEDULER.TICK_MS,
    lookaheadSec = SCHEDULER.LOOKAHEAD_SEC,
    setInterval: setIntervalFn,
    clearInterval: clearIntervalFn
}) {
    const _clock = clock || context;
    const _setInterval = setIntervalFn || ((fn, ms) => window.setInterval(fn, ms));
    const _clearInterval = clearIntervalFn || ((id) => window.clearInterval(id));

    let _state = ENGINE_STATES.STOPPED;
    let _generation = 0;

    // Active sequence description (null when stopped).
    let _seq = null; // { tP, interval, clicks: [{time,isAccent,scheduled}], songStart:{time,offset}, buffer, offset, length }
    let _songSource = null;
    let _clickSources = [];
    let _gains = [];

    // Preview (distinct from a full sequence — no clicks).
    let _preview = null; // { start, offset, duration, buffer }
    let _previewSource = null;

    let _schedulerId = null;
    let _watchId = null;

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

    // N-6: the shared terminal transition (song end / preview end).
    // Silent `_state` reset — deliberately bypassing `_setState`, which
    // would emit 'stopped' as a SECOND event; `event` is the single
    // terminal emit (exactly one of ENGINE_EVENTS.* per finished run).
    // Gen/state guards live in the callers' onended handlers.
    function _finish(event) {
        _teardown();
        _state = ENGINE_STATES.STOPPED;
        _emit(event);
    }

    // D4: bump the generation and tear down any live sources/timers.
    // Does NOT change _state — callers set the resulting state explicitly.
    function _teardown() {
        _generation++;
        if (_schedulerId !== null) { _clearInterval(_schedulerId); _schedulerId = null; }
        if (_watchId !== null) { _clearInterval(_watchId); _watchId = null; }
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
            // N-1: every click is strictly before songStart — nothing is
            // left to schedule. Clear the interval here (a 30-min song
            // must not run ~72,000 no-op ticks); the D10 watch keeps
            // running through playback (R-N1.1).
            if (_schedulerId !== null) { _clearInterval(_schedulerId); _schedulerId = null; }
            _setState(ENGINE_STATES.PLAYING);
        }
    }

    function _startScheduler() {
        if (_schedulerId !== null) return;
        _schedulerId = _setInterval(_schedulerTick, schedulerMs);
    }

    // ---- public API -----------------------------------------------------
    function startSequence({ buffer, bpm, countInBeats, offset, length }) {
        // P-13 defense-in-depth: validate before touching anything.
        // offset >= duration (I-3/RD-4): a past-the-end offset starts a
        // zero-sample source — count-in into silence. One rule, both entry
        // points (preview's D2 guard already rejects the same condition).
        // length (CR 003, EN-D4): a bound must be a positive finite length
        // that ends within the buffer. ε = 1e-6 absorbs the tenths
        // quantization's float error (same rationale as clampOffset's 1e-9 —
        // R-8).
        if (!buffer ||
            !Number.isFinite(bpm) || bpm < BPM_MIN || bpm > BPM_MAX ||
            !Number.isInteger(countInBeats) || countInBeats < COUNT_IN_MIN || countInBeats > COUNT_IN_MAX ||
            !Number.isFinite(offset) || offset < 0 || offset >= buffer.duration ||
            (length != null && (!Number.isFinite(length) || length <= 0 ||
                offset + length > buffer.duration + 1e-6))) {
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
            offset,
            length: length ?? null // EN-D4 (CR §6 W-3): songPosition reads it
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
            _finish(ENGINE_EVENTS.ENDED);
        };
        if (_seq.length != null) {
            _songSource.start(_seq.songStart.time, _seq.songStart.offset, _seq.length); // bounded (3-arg — the preview() precedent)
        } else {
            _songSource.start(_seq.songStart.time, _seq.songStart.offset); // byte-for-byte v1
        }

        _startScheduler();
        _startWatch();
        _setState(ENGINE_STATES.COUNTING_IN);

        // N-4: return a FROZEN SNAPSHOT, not the live _seq — the internal
        // sequence owns the `scheduled` flags the scheduler trusts, and
        // exposing it live let readers mutate scheduler state. Same shape
        // (tests read schedule.songStart / .clicks); writes are no-ops.
        return { ok: true, schedule: Object.freeze({
            tP,
            interval,
            offset,
            length: _seq.length, // CR 003: tests read it; writes stay no-ops (N-4)
            clicks: Object.freeze(_seq.clicks.map((c) => Object.freeze({ time: c.time, isAccent: c.isAccent, scheduled: c.scheduled }))),
            songStart: Object.freeze({ time: built.songStart.time, offset: built.songStart.offset })
        })};
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

    function preview({ buffer, offset, length }) {
        if (!buffer || !Number.isFinite(offset) || offset < 0) return { ok: false };
        if (length != null && (!Number.isFinite(length) || length <= 0)) return { ok: false };

        const start = _clock.currentTime;
        // D2 generalized (EN-D5): 3 s preview clamped to the section
        // remainder when bounded, else to the song remainder; never 0 or
        // negative. A preview must hear exactly what Play will play.
        const remaining = length != null
            ? Math.min(length, buffer.duration - offset)
            : buffer.duration - offset;
        const duration = Math.min(PREVIEW_SECONDS, remaining);
        if (!(duration > 0)) return { ok: false };

        _teardown();
        _preview = { start, offset, duration, buffer };

        _previewSource = _connectSource(createSource(context, buffer));
        const gen = _generation;
        _previewSource.onended = () => {
            if (gen !== _generation) return;
            if (_state !== ENGINE_STATES.PREVIEW) return;
            _finish(ENGINE_EVENTS.PREVIEW_ENDED);
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

    // offset + (now − songStartTime), clamped to [offset, offset + length]
    // while a section is active, else [offset, duration]; null before the
    // song has started (stopped / countingIn / preview-not-started).
    function songPosition(now) {
        const t = (now === undefined) ? _clock.currentTime : now;
        if (!Number.isFinite(t)) return null;

        if (_state === ENGINE_STATES.PLAYING && _seq) {
            const pos = _seq.offset + (t - _seq.songStart.time);
            const hi = _seq.length != null ? _seq.offset + _seq.length : _seq.buffer.duration;
            return clamp(pos, _seq.offset, hi);
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

    function dispose() {
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
        dispose
    };
}
