/**
 * createBeatDots — RAF beat/progress visualizer (Phase 6, D9).
 *
 * Owns the visual RAF loop for the four beat dots and the progress readout.
 * The beat phase is a PURE FUNCTION of the audio clock (D9): every frame
 * recomputes `beatPhaseFromGrid(clock.currentTime, grid)` — never
 * accumulated — so hidden-tab RAF pausing can never drift or stutter the
 * dots.
 *
 * The factory captures the Vue instance (`vm`) ONCE (N-17 — it is built in
 * mounted(), where the instance exists): the returned methods carry no vm
 * argument and sync `vm.activeBeatIndex` (data-beat hook, KB-6) and
 * `vm.songPosition` (progress readout — only rewritten when the
 * tenth-second changes, per the per-frame performance note).
 *
 * Dependencies are injected per the skill factory convention (DIP) — the
 * browser globals mirror the engine's parameter style, with the
 * window/document globals as defaults (I-7/RD-6):
 *   base       = { getEngine, getClock, getDom(id), raf, cancelRaf,
 *                  matchMedia, isPageHidden }
 *   callbacks  = {} reserved for future per-frame hooks
 *
 * Teardown ownership (I-6/RD-6): stopAll tears down ONLY this module's
 * resources (pending RAF, matchMedia listener, dot classes, _stopped flag).
 * It NEVER touches the engine — engine.dispose() is owned by the lifecycle
 * (createMetronomadLifecycle.beforeUnmount, R-I6.2/B-06).
 *
 * Dot classes (`beat-dot--active`, pulse/static variants) are managed
 * imperatively here — the template renders only the static downbeat
 * modifier, so Vue re-renders never clobber the per-frame classes.
 */

import { beatPhaseFromGrid, BEATS_PER_BAR } from '../Utils/beatGrid.js';
import { formatTime } from '../Utils/timeFormat.js';

const DOT_COUNT = BEATS_PER_BAR; // I-8: one home for "4 beats per bar"
const DOT_ID = 'beatDot-';
const DOTS_ROW_ID = 'beatDots';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function createBeatDots(vm, base, callbacks = {}) {
    const _vm = vm;
    // I-7: browser globals injected with defaults — tests supply fakes and
    // touch no window state (R-I7.1).
    const _raf = base.raf || ((cb) => window.requestAnimationFrame(cb));
    const _cancelRaf = base.cancelRaf || ((id) => window.cancelAnimationFrame(id));
    const _matchMedia = base.matchMedia || ((query) => window.matchMedia(query));
    const _isPageHidden = base.isPageHidden || (() => document.hidden);
    let _rafId = null;
    let _lastPositionText = null;
    let _lastBeatInterval = null; // N-9: the --beat-interval value last applied (R-N9.1)
    let _hiddenPaused = false; // loop was running when the tab went hidden
    let _stopped = false;      // stopAll ran — everything is torn down
    let _activeDot = -1;       // lit dot index (post modulo), -1 = none
    let _mql = null;           // prefers-reduced-motion MediaQueryList (B-03)
    let _reducedMotion = false;
    let _onMediaChange = null;

    // The four dot elements, in beat order.
    function _dotEls() {
        const els = [];
        for (let i = 0; i < DOT_COUNT; i++) {
            const el = base.getDom(DOT_ID + i);
            if (el) els.push(el);
        }
        return els;
    }

    // B-03: the active dot pulses with the tempo by default; under
    // prefers-reduced-motion it is a static highlight (U-22). The media
    // change applies live — no new frame required.
    function _initMotionPreference() {
        if (_mql) return;
        _mql = _matchMedia(REDUCED_MOTION_QUERY);
        _reducedMotion = _mql.matches;
        _onMediaChange = () => {
            _reducedMotion = _mql.matches;
            _applyMotionClass(_dotEls());
        };
        _mql.addEventListener('change', _onMediaChange);
    }

    // Cancel the pending frame — the one place a live loop is torn down
    // mid-run (stop / hidden / unmount). Deliberately does NOT touch
    // `_hiddenPaused`: the hidden path sets it AFTER deciding to cancel.
    function _cancelLoop() {
        if (_rafId !== null) {
            _cancelRaf(_rafId);
            _rafId = null;
        }
    }

    function _teardownMotionPreference() {
        if (_mql && _onMediaChange) _mql.removeEventListener('change', _onMediaChange);
        _mql = null;
        _onMediaChange = null;
    }

    function _applyMotionClass(dots) {
        dots.forEach((el, i) => {
            const active = i === _activeDot;
            el.classList.toggle('beat-dot--pulse', active && !_reducedMotion);
            el.classList.toggle('beat-dot--static', active && _reducedMotion);
        });
    }

    // Render one frame from the audio clock (D9). `engine` may be a fake
    // in tests; only getBeatGrid()/songPosition() are used.
    // Returns the grid (null when the sequence is over) so callers decide
    // whether the loop continues without re-reading the engine.
    function _render(engine) {
        const grid = engine.getBeatGrid();
        const phase = beatPhaseFromGrid(
            base.getClock().currentTime,
            grid ? grid.firstBeatTime : NaN,
            grid ? grid.interval : NaN
        );
        _activeDot = phase.beatIndex >= 0 ? phase.beatIndex % DOT_COUNT : -1;

        const dots = _dotEls();
        dots.forEach((el, i) => {
            el.classList.toggle('beat-dot--active', i === _activeDot);
        });
        _applyMotionClass(dots);

        // Pulse duration follows the tempo (CSS --beat-interval).
        // N-9: set only when the interval value CHANGES — the old code
        // wrote the same value ~60×/s per frame, and getComputedStyle on
        // the dots reads this variable every frame (layout pressure).
        // Reset in _clearDots so a new sequence always re-applies, even
        // with the same value (BPM is editable between sequences).
        if (grid && grid.interval !== _lastBeatInterval) {
            const rowEl = base.getDom(DOTS_ROW_ID);
            if (rowEl) {
                rowEl.style.setProperty('--beat-interval', grid.interval + 's');
                _lastBeatInterval = grid.interval;
            }
        }

        if (_vm) {
            _vm.activeBeatIndex = _activeDot;
            const pos = engine.songPosition();
            if (pos !== null) {
                // Re-render the readout text only when the tenth-second
                // changes (per-frame performance note).
                const text = formatTime(pos);
                if (text !== _lastPositionText) {
                    _lastPositionText = text;
                    _vm.songPosition = pos;
                }
            }
        }

        if (callbacks.onFrame) callbacks.onFrame(phase);
        return grid;
    }

    function _tick() {
        _rafId = null;
        const engine = base.getEngine();
        if (!engine) return;
        // No grid = sequence over → the loop ends with the cleared frame.
        if (_render(engine)) _rafId = _raf(_tick);
    }

    // Render one frame NOW without consuming a queued RAF — the U-17 snap
    // on tab-visibility. Returns true when the sequence is still running.
    function _renderNow() {
        const engine = base.getEngine();
        if (!engine) return false;
        return Boolean(_render(engine));
    }

    function startVisualClock() {
        if (_rafId !== null) return;
        _initMotionPreference();
        _rafId = _raf(_tick);
    }

    // Clear every dot class this module owns and reset the vm sync state.
    function _clearDots() {
        _activeDot = -1;
        _dotEls().forEach((el) => {
            el.classList.remove('beat-dot--active', 'beat-dot--pulse', 'beat-dot--static');
        });
        _lastPositionText = null;
        _lastBeatInterval = null; // N-9: a new sequence re-applies the interval
        if (_vm) _vm.activeBeatIndex = -1;
    }

    function stopVisualClock() {
        _hiddenPaused = false;
        _cancelLoop();
        _clearDots();
    }

    // B-02/U-17: hidden → pause the loop (the phase is a pure function of
    // the audio clock, D9, so pausing can never drift it); visible → one
    // immediate re-render (snap) + resume, but only if the sequence is
    // still running.
    function onVisibilityChange() {
        if (_isPageHidden()) {
            // Remember that the loop was running so the visible branch can
            // resume it — a hidden tab while idle must start nothing.
            if (_rafId !== null) _hiddenPaused = true;
            _cancelLoop();
        } else if (_hiddenPaused) {
            _hiddenPaused = false;
            // Snap to the current beat first, then resume only while the
            // sequence is still running.
            if (_renderNow()) _rafId = _raf(_tick);
        }
    }

    // B-05 (rev) / R-I6.1: final teardown (called from beforeUnmount).
    // Cancels the pending RAF, removes the matchMedia listener, and clears
    // the dot state. Visualizer resources ONLY — no engine access of any
    // kind (engine dispose is the lifecycle's job). Idempotent — a double
    // unmount must not tear down twice.
    function stopAll() {
        if (_stopped) return;
        _stopped = true;
        _hiddenPaused = false;
        _cancelLoop();
        _teardownMotionPreference();
        _clearDots();
    }

    return { startVisualClock, stopVisualClock, onVisibilityChange, stopAll };
}
