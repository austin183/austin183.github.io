/**
 * createWaveformView — canvas waveform renderer + offset-scrub interaction
 * (CR 001 Phase 3, D-F).
 *
 * The only new module that touches the DOM. Renders pooled min/max columns
 * once per (peaks, size, draft) change — RAF-coalesced (W-5), DPR-scaled,
 * one vertical line per CSS column, mirrored about the horizontal center
 * (O-3). Draw count is width-bounded (≤640 from `#app` max-width, R-8),
 * never DPR-bounded.
 *
 * No internal clock (KB-14/D9): the only RAF ever queued is the coalesced
 * render. The playhead is a DOM overlay driven by Vue — this view never
 * animates on its own.
 *
 * DI-pure per the createBeatDots convention (N-17/I-7/RD-6): the vm is
 * captured ONCE (only `vm.duration` is read — at pointer-event time, for
 * the x→tenths conversion); browser globals are injected with defaults.
 * Scrub callbacks are OPTIONAL and looked up inside handlers — Phase 4
 * wires none (display-only), Phase 5 wires the three.
 *
 * Teardown: dispose() is idempotent and owns only this module's resources
 * (pending RAF, canvas + window listeners, GPU backing store via
 * width/height = 0). The lifecycle owns the call site — between
 * beatDots.stopAll() and engine.dispose().
 */

import { poolPeaks } from '../Analysis/waveformPeaks.js';

// Canvas 2D cannot resolve CSS custom properties — literals mirroring the
// app palette (variables.css --color-primary, light/dark).
const WAVEFORM_STROKE = 'rgba(4, 120, 87, 0.55)';
const DRAFT_STROKE = 'rgb(4, 120, 87)';
const DRAFT_LINE_WIDTH = 2;

export function createWaveformView(vm, base = {}, callbacks = {}) {
    const _vm = vm;
    // I-7: browser globals injected with defaults — tests supply fakes and
    // touch no window state (the R-I7.1 discipline).
    const _canvasId = base.canvasId || 'waveformCanvas';
    const _raf = base.raf || ((cb) => window.requestAnimationFrame(cb));
    const _cancelRaf = base.cancelRaf || ((id) => window.cancelAnimationFrame(id));
    const _devicePixelRatio = base.devicePixelRatio || (() => window.devicePixelRatio);
    const _getDom = base.getDom || ((id) => document.getElementById(id));
    // W-4: the CSS height clamp (≤375 px → 48 px) is CSS-driven — the
    // default provider reads the container box (the `.waveform` div) so
    // the backing store always matches the drawn box (review F-2),
    // mirroring how _onWindowResize measures clientWidth.
    const _getHeightCss = base.getHeightCss || (() => {
        const c = _canvas && _canvas.parentElement;
        return c ? c.clientHeight : 64;
    });
    const _getWindow = base.getWindow || (() => window);

    let _canvas = null;
    let _ctx = null;
    let _peaks = null;        // high-res extractPeaks result (poolPeaks source)
    let _draft = null;        // transient scrub draft, tenths of a second
    let _widthCss = 0;
    let _heightCss = 0;
    let _rafId = null;        // pending coalesced render (W-5)
    let _rendered = { peaks: null, draft: null, width: 0, height: 0 };
    let _dragPointerId = null; // active scrub drag pointerId; null = none
    let _disposed = false;

    // x (CSS px) → tenths of a second via vm.duration (UX-5: CSS-space
    // math, independent of DPR and backing-store size).
    function _tenthsAt(clientX) {
        const rect = _canvas.getBoundingClientRect();
        if (!rect.width || !Number.isFinite(_vm.duration)) return null;
        return ((clientX - rect.left) / rect.width) * _vm.duration;
    }

    // ---- Pointer scrub (attached ONLY when callbacks.onScrubStart exists)

    function _onPointerDown(e) {
        if (_dragPointerId !== null) return; // one drag at a time
        const tenths = _tenthsAt(e.clientX);
        if (tenths === null) return;
        _dragPointerId = e.pointerId;
        try {
            _canvas.setPointerCapture(e.pointerId);
        } catch (_) {
            // W-1: Safari stale-pointerId throws — the drag continues
            // without capture; the global pointerup/blur safety nets still
            // clean up.
        }
        callbacks.onScrubStart(tenths);
    }

    function _onPointerMove(e) {
        // move-before-down (or a different pointer) is ignored
        if (_dragPointerId === null || e.pointerId !== _dragPointerId) return;
        const tenths = _tenthsAt(e.clientX);
        if (tenths !== null) callbacks.onScrubMove(tenths);
    }

    // Every drag-exit funnels here: commit=true → onScrubEnd(true) + focus
    // (CR §1.5); commit=false (pointercancel / window blur) → discard, no
    // focus. Capture is released on every path (non-fatal hygiene — it
    // throws on stale ids, always wrapped).
    function _endDrag(commit) {
        if (_dragPointerId === null) return;
        const pid = _dragPointerId;
        _dragPointerId = null;
        try {
            _canvas.releasePointerCapture(pid);
        } catch (_) { /* stale id — already released */ }
        if (commit) _canvas.focus();
        callbacks.onScrubEnd(commit);
    }

    function _onPointerUp(e) {
        if (e.pointerId !== _dragPointerId) return;
        _endDrag(true);
    }

    function _onPointerCancel() { _endDrag(false); }

    // Safety nets (skill interaction.md): the pointer can be released
    // off-canvas (global pointerup) or the window can lose focus mid-drag
    // (blur) — both would strand the drag state without them.
    function _onWindowPointerUp() { _endDrag(true); }
    function _onWindowBlur() { _endDrag(false); }

    function _onWindowResize() {
        if (!_canvas) return;
        const container = _canvas.parentElement;
        const widthCss = container ? container.clientWidth : _widthCss;
        resize(widthCss, _getHeightCss());
    }

    // ---- Rendering

    function _render() {
        _rafId = null;
        if (_disposed || !_canvas || !_ctx) return;
        const w = _widthCss;
        const h = _heightCss;
        const ctx = _ctx;
        ctx.clearRect(0, 0, w, h);

        if (_peaks && w > 0 && h > 0) {
            // Pool the high-res source to CSS columns — one vertical line
            // per column, mirrored about the center: y(v) = (1 − v)·h/2.
            const pooled = poolPeaks(_peaks, w);
            const { mins, maxs, bucketCount } = pooled;
            ctx.beginPath();
            for (let k = 0; k < bucketCount; k++) {
                ctx.moveTo(k, (1 - maxs[k]) * (h / 2));
                ctx.lineTo(k, (1 - mins[k]) * (h / 2));
            }
            ctx.strokeStyle = WAVEFORM_STROKE;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Transient draft marker — in-canvas, no VM round-trip. The DOM
        // overlay marker (VM-owned) tracks the COMMITTED offset only.
        if (_draft !== null && w > 0 && h > 0 && Number.isFinite(_vm.duration) && _vm.duration > 0) {
            const x = (_draft / _vm.duration) * w;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.strokeStyle = DRAFT_STROKE;
            ctx.lineWidth = DRAFT_LINE_WIDTH;
            ctx.stroke();
        }

        _rendered = { peaks: _peaks, draft: _draft, width: w, height: h };
    }

    function scheduleRender() {
        if (_rafId !== null || _disposed) return;
        // Coalesce + skip no-op renders: same (peaks, draft, size) already
        // painted → no RAF at all (WF-V1.1's "no further render" pin).
        if (
            _rendered.peaks === _peaks &&
            _rendered.draft === _draft &&
            _rendered.width === _widthCss &&
            _rendered.height === _heightCss
        ) return;
        _rafId = _raf(_render);
    }

    function setPeaks(peaks) {
        _peaks = peaks;
        scheduleRender();
    }

    function setDraft(tenths) {
        _draft = tenths;
        scheduleRender();
    }

    // heightCss defaults to the injected provider — the W-5 storm calls
    // arrive one-arg (resize(400)); the height is CSS-driven (W-4 clamp).
    function resize(widthCss, heightCss = _getHeightCss()) {
        if (_disposed || !_canvas) return;
        _widthCss = widthCss;
        _heightCss = heightCss;
        // DPR backing store; assigning width/height resets ctx state, so
        // the transform is (re)applied here — drawing stays in CSS space.
        const dpr = _devicePixelRatio();
        _canvas.width = Math.round(widthCss * dpr);
        _canvas.height = Math.round(heightCss * dpr);
        if (_ctx) _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        scheduleRender();
    }

    function init(canvas) {
        if (_disposed) return;
        _canvas = canvas || _getDom(_canvasId);
        if (!_canvas) return;
        _ctx = _canvas.getContext('2d');
        const win = _getWindow();
        win.addEventListener('resize', _onWindowResize);
        // Phase 4 wires no callbacks (display-only); Phase 5 wires all
        // three. Attach the pointer path only when scrubbing is enabled.
        if (typeof callbacks.onScrubStart === 'function') {
            _canvas.addEventListener('pointerdown', _onPointerDown);
            _canvas.addEventListener('pointermove', _onPointerMove);
            _canvas.addEventListener('pointerup', _onPointerUp);
            _canvas.addEventListener('pointercancel', _onPointerCancel);
            win.addEventListener('pointerup', _onWindowPointerUp);
            win.addEventListener('blur', _onWindowBlur);
        }
        // D-F: init does the DPR sizing — the canvas is static DOM and
        // no window-resize event fires at mount, so measure the container
        // (`.waveform`) once now or the backing store stays 0×0.
        const container = _canvas.parentElement;
        resize(container ? container.clientWidth : _widthCss, _getHeightCss());
    }

    // Idempotent — a double unmount must not tear down twice.
    function dispose() {
        if (_disposed) return;
        _disposed = true;
        if (_rafId !== null) {
            _cancelRaf(_rafId);
            _rafId = null;
        }
        if (_canvas) {
            _canvas.removeEventListener('pointerdown', _onPointerDown);
            _canvas.removeEventListener('pointermove', _onPointerMove);
            _canvas.removeEventListener('pointerup', _onPointerUp);
            _canvas.removeEventListener('pointercancel', _onPointerCancel);
            _canvas.width = 0;   // GPU backing-store release
            _canvas.height = 0;
        }
        const win = _getWindow();
        win.removeEventListener('pointerup', _onWindowPointerUp);
        win.removeEventListener('blur', _onWindowBlur);
        win.removeEventListener('resize', _onWindowResize);
        _canvas = null;
        _ctx = null;
        _peaks = null;
        _draft = null;
        _dragPointerId = null;
    }

    return { init, setPeaks, setDraft, resize, scheduleRender, dispose };
}
