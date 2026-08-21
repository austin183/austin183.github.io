/**
 * createBeatDots — RAF beat/progress visualizer (Phase 6, D9).
 *
 * Owns the visual RAF loop for the four beat dots and the progress readout.
 * The beat phase is a PURE FUNCTION of the audio clock (D9): every frame
 * recomputes `beatPhaseFromGrid(clock.currentTime, grid)` — never
 * accumulated — so hidden-tab RAF pausing can never drift or stutter the
 * dots.
 *
 * Dependencies are injected per the skill factory convention (DIP):
 *   base       = { getEngine, getClock, getDom(id) }
 *   callbacks  = {} reserved for future per-frame hooks
 *
 * The returned methods take the Vue instance (`vm`) whose reactive state
 * they sync: `activeBeatIndex` (data-beat hook, KB-6) and `songPosition`
 * (progress readout — only rewritten when the tenth-second changes, per
 * the per-frame performance note).
 *
 * Dot classes (`beat-dot--active`, pulse/static variants) are managed
 * imperatively here — the template renders only the static downbeat
 * modifier, so Vue re-renders never clobber the per-frame classes.
 */

import { beatPhaseFromGrid } from '../Utils/beatGrid.js';
import { formatTime } from '../Utils/timeFormat.js';

const DOT_COUNT = 4;
const DOT_ID = 'beatDot-';
const DOTS_ROW_ID = 'beatDots';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function createBeatDots(base, callbacks = {}) {
    let _rafId = null;
    let _vm = null;
    let _lastPositionText = null;
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
        _mql = window.matchMedia(REDUCED_MOTION_QUERY);
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
            window.cancelAnimationFrame(_rafId);
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
        if (grid) {
            const rowEl = base.getDom(DOTS_ROW_ID);
            if (rowEl) rowEl.style.setProperty('--beat-interval', grid.interval + 's');
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
        if (_render(engine)) _rafId = window.requestAnimationFrame(_tick);
    }

    // Render one frame NOW without consuming a queued RAF — the U-17 snap
    // on tab-visibility. Returns true when the sequence is still running.
    function _renderNow() {
        const engine = base.getEngine();
        if (!engine) return false;
        return Boolean(_render(engine));
    }

    function startVisualClock(vm) {
        if (_rafId !== null) return;
        _vm = vm;
        _initMotionPreference();
        _rafId = window.requestAnimationFrame(_tick);
    }

    // Clear every dot class this module owns and reset the vm sync state.
    function _clearDots() {
        _activeDot = -1;
        _dotEls().forEach((el) => {
            el.classList.remove('beat-dot--active', 'beat-dot--pulse', 'beat-dot--static');
        });
        _lastPositionText = null;
        if (_vm) _vm.activeBeatIndex = -1;
    }

    function stopVisualClock(vm) {
        if (vm) _vm = vm;
        _hiddenPaused = false;
        _cancelLoop();
        _clearDots();
    }

    // B-02/U-17: hidden → pause the loop (the phase is a pure function of
    // the audio clock, D9, so pausing can never drift it); visible → one
    // immediate re-render (snap) + resume, but only if the sequence is
    // still running.
    function onVisibilityChange(vm) {
        if (vm) _vm = vm;
        if (document.hidden) {
            // Remember that the loop was running so the visible branch can
            // resume it — a hidden tab while idle must start nothing.
            if (_rafId !== null) _hiddenPaused = true;
            _cancelLoop();
        } else if (_hiddenPaused) {
            _hiddenPaused = false;
            // Snap to the current beat first, then resume only while the
            // sequence is still running.
            if (_renderNow()) _rafId = window.requestAnimationFrame(_tick);
        }
    }

    // B-05: final teardown (called from beforeUnmount). Cancels the
    // pending RAF, removes the matchMedia listener, clears the dots, and
    // disposes the engine (its D10 watch interval, scheduler, and sources).
    // Idempotent — a double unmount must not dispose twice.
    function stopAll(vm) {
        if (_stopped) return;
        _stopped = true;
        if (vm) _vm = vm;
        _hiddenPaused = false;
        _cancelLoop();
        _teardownMotionPreference();
        _clearDots();
        const engine = base.getEngine();
        if (engine && engine.dispose) engine.dispose();
    }

    return { startVisualClock, stopVisualClock, onVisibilityChange, stopAll };
}
