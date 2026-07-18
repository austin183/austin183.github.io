---
name: building-web-apps
description: Build static web apps with Vue 3 Options API, Canvas 2D rendering, ES modules, and CDN-loaded libraries. Covers factory testability patterns (callback injection, provider functions, DOM ID injection, module extraction, service locator safety), extensibility patterns (strategy/registry), canvas clearing for exports, config-based rendering helpers, render order testing via context method wrapping, toast notifications, accessibility (ARIA live regions, custom button keyboard activation, aria-busy loading states, reduced motion, interactive canvas roles), drag-and-drop cleanup, drag boundary clamping (VISIBLE_MIN pattern), test-driven refactoring (characterization tests), multi-touch and trackpad gestures (TouchEvent, PointerEvent, WheelEvent paths, pointerType guards, wheel event pan/zoom), destination-out compositing for shape cutouts, and web edge cases (DPR, CORS). No build step, no bundler. Use when working on CollageMaker web app features, rendering, state management, testing, or architectural refactoring.
---

# Building Web Apps

## Project Pattern

**Single HTML entry point, ES modules, no build step.** All code loads via `<script type="module">` from CDN or local files. No bundler, no transpilation, no build step.

## Key References

Consult these files for verified patterns and gotchas:

- `references/vue-options-api.md` — Vue 3 Options API factory decomposition, provide() timing, @mousedown.prevent, $refs on native form inputs, array mutation patterns for reactivity
- `references/canvas-2d.md` — Canvas 2D rendering, DPR scaling, semi-transparent compositing, config-based rendering helpers, offscreen export
- `references/es-modules.md` — ES module conventions and barrel exports
- `references/rich-text-runs.md` — Run-based text formatting, merge/split algorithm
- `references/testing-unit.md` — Mocha/Chai unit tests, mocking patterns, integration testing, characterization tests before refactor
- `references/testing-e2e.md` — Playwright E2E, page load strategy, pointer/Touch/Drag event testing
- `references/testing-strategy.md` — Testing approach, gotchas, deferred features, assertion density
- `references/interaction.md` — Keyboard shortcut patterns: three-layer architecture, modifier matching, focus suppression, preventDefault ordering, pointer handler coordination, global pointerup drag cleanup, VISIBLE_MIN drag boundary clamping, multi-touch and trackpad gestures (TouchEvent/PointerEvent dual path, pointerType guards, wheel event pan/zoom, setPointerCapture gotchas, releasePointerCapture hygiene, blur safety net, touch-action CSS)
- `references/midiestro-pattern.md` — Entry point pattern, shared infrastructure, directory structure
- `references/css-layout.md` — Flex column chain, `min-height: 0` requirement, responsive sidebar config, CSS computed value naming, mobile safe areas
- `references/memory-management.md` — Disposing HTMLImageElement references, URL.createObjectURL cleanup, lifecycle cleanup ordering, canvas GPU memory release, visual state cleanup, image disposal when replacing references
- `references/manager-patterns.md` — Action-based vs. direct mutation state managers, when to use each pattern, undo/redo integration
- `references/web-workers.md` — Web Worker lifecycle, timeout guard pattern, clearing timeouts on every exit path, mock Worker pattern for testing
- `references/accessibility.md` — ARIA patterns for segmented controls (radiogroup), color picker accessibility, custom button keyboard activation (Enter + Space), aria-busy loading states, prefers-reduced-motion, ARIA live regions (toast notifications), interactive canvas role selection

## Core Conventions

### ES Modules
- Named exports only, no default exports
- Barrel exports in `MyESModules/index.js`
- Relative imports with `.js` extension
- **Destructured parameter scoping** — When a function destructures its parameter, the original variable name is not accessible inside the function body. Destructure all needed properties explicitly. See `references/es-modules.md`

### Factory Functions
- Create instances via factory functions, not classes
- Plain objects for data models
- Pure functions for layout math

### Factory Testability Patterns

**Callback Injection for Handler DIP** — Decouple Vue handler modules from render logic by injecting callbacks that receive the Vue instance:
```javascript
// Handler factory accepts callback that receives Vue instance
export function createLayoutHandlers(getLayoutManager, onRenderScheduled) {
    return {
        onLayoutStyleChange() {
            const lm = getLayoutManager();
            if (lm) lm.setLayoutStyle(this.layoutStyle);
            onRenderScheduled(this); // Pass Vue instance to callback
        }
    };
}

// Wiring: build internal functions first, then handlers
export function createCollageMethods(base) {
    function _scheduleRender(vm) {
        const renderer = base.getCanvasRenderer();
        // ... render logic using vm.state
    }
    const layoutHandlers = createLayoutHandlers(
        () => base.getLayoutManager(),
        (vm) => _scheduleRender(vm)
    );
    return {
        _scheduleRender() { _scheduleRender(this); },
        onLayoutStyleChange() { layoutHandlers.onLayoutStyleChange.call(this); }
    };
}
```
- Internal functions are pure closures over `base` (services) accepting explicit `vm` parameter — no `this` dependency
- Callbacks are created at factory time, capturing the internal function reference
- **Do NOT use `() => this._scheduleRender()` as callback** — at factory creation time, `this` is not the Vue instance

**DOM ID Injection** — Accept DOM element IDs as factory configuration instead of hardcoding `document.getElementById()`:
```javascript
const DEFAULT_DOM_IDS = { previewCanvas: 'previewCanvas', cropPreviewCanvas: 'cropPreviewCanvas' };
export function createCollageLifecycle(base, domIds = {}) {
    const ids = { ...DEFAULT_DOM_IDS, ...domIds };
    // Use ids.previewCanvas instead of hardcoded string
}
```
- Always provide sensible defaults so existing callers don't break
- Tests can supply mock IDs to verify `getElementById` is called with the correct ID

**Internal vs. Module Extraction** — Callback injection is the *primary* DIP improvement. Module extraction is the *secondary* SRP improvement. If internal functions have clear boundaries AND the file exceeds ~400 lines, extraction is worthwhile: it yields independent testability, clearer module boundaries, and reduced cognitive load (the composition layer becomes a wiring diagram rather than intertwined logic). If the file stays under ~400 lines and functions are tightly coupled to Vue internals, skip extraction to avoid unnecessary import complexity.

**Callback Wiring in Extracted Modules** — When extracted modules depend on each other, accept callback objects as factory parameters instead of importing sibling modules. This prevents circular dependencies and preserves one-way dependency flow: `Composition → Extracted Modules`.

**Provider Functions vs. Direct Callbacks** — Choose based on whether the referenced objects are stable:

- **Direct callbacks** — Use when the referenced objects are stable for the factory's lifetime (simpler, less indirection):
```javascript
// Safe: layoutManager is never replaced after factory creation
const layoutHandlers = createLayoutHandlers(
    () => base.getLayoutManager(),
    (vm) => renderMethods._scheduleRender(vm)  // Direct callback — renderMethods is stable
);
```

- **Provider functions** — Use when callbacks reference objects that may be replaced after factory creation. The provider returns the callback at *call time*, not factory time:
```javascript
// Provider functions return the callback at undo/redo time, preventing stale references
const undoMethods = createUndoMethods(base, {
    getOnRenderScheduled: () => (vm) => renderMethods._scheduleRender(vm),
    getOnCropPreviewRender: () => (vm) => cropPreviewMethods._scheduleCropPreviewRender(vm)
});
```

Inside the factory, invoke providers with a defensive guard:
```javascript
const getOnRenderScheduled = callbacks.getOnRenderScheduled || (() => () => {});
// ...
function _invokeProvider(provider, vm) {
    const callback = provider();
    if (typeof callback === 'function') { callback(vm); }
}
_invokeProvider(getOnRenderScheduled, vm);
```

**Always add the `typeof callback === 'function'` guard** — it costs virtually nothing and prevents cryptic `TypeError` from malformed providers (e.g., `() => null`).

**Service Locator Access Safety** — Two rules for accessing the `base` service locator:

1. **Use consistent optional chaining** — Always access optional services with `base?.getService?.() || null`. Using `base.getService()` without optional chaining throws if the service is not registered. Apply the same pattern across all modules.
2. **Look up services inside callbacks, not outside** — When a callback may execute long after factory creation, look up the service inside the callback. Capturing the service at factory time risks a stale or undefined reference if the service is later disposed or replaced:
```javascript
// WRONG — assembler captured at factory time, may be stale when callback runs
const asm = assembler();
renderer.scheduleRender(function (ctx, width, height) {
    asm.render(ctx, { ... }); // THROWS if asm is undefined
});

// CORRECT — assembler looked up at render time
renderer.scheduleRender(function (ctx, width, height) {
    const asm = assembler();
    if (!asm) return;
    asm.render(ctx, { ... });
});
```

### Guard Against Null Inputs
Browser API utilities that accept user input MUST guard against null/undefined. Return `Promise.resolve(null)` for null input rather than throwing:
```javascript
export function loadImageFromFile(file) {
    if (!file) return Promise.resolve(null);
    // ... rest of implementation
}
```

### Vue 3 Options API
- Factory decomposition: `createCollageApp()` assembles data/methods/lifecycle/services
- Reactive state in Vue `data()` return value
- State managers receive Vue instance reference
- **Range inputs with null default** — `v-model.number` on `<input type="range">` coerces `null` to the `min` attribute. Use `:value` with a fallback and `@input` handler instead. See `references/vue-options-api.md`
- See `references/vue-options-api.md` for provide() timing and array mutation patterns

### Canvas 2D
- Lifecycle pattern: `init()` → `resize()` → `scheduleRender()` → `dispose()`
- DPR scaling for sharp rendering on Retina displays
- `requestAnimationFrame` for debounced renders
- In `dispose()`, set `canvas.width = 0; canvas.height = 0` to force GPU memory release
- **Pre-fill background before `globalAlpha`** — Canvas blends against existing pixels, not isolated layers. Always `fillRect` with background color before drawing semi-transparent images. Isolate alpha with `save()`/`restore()`.
- **Config-based rendering helpers** — When multiple methods share the same save/restore + property-setting pattern, extract a shared helper accepting a style config object. Guard optional config properties with `!== undefined` (not truthy checks) because `0` and `''` are valid canvas values.
- See `references/canvas-2d.md` for offscreen export, clearing patterns, compositing, and config-based helpers

### Interaction & Keyboard Shortcuts
- Three-layer architecture: pure parse functions → pattern matching → factory event handler with attach/detach lifecycle
- `"meta+"` matches both `metaKey` AND `ctrlKey` (cross-platform); alt always strict; shift lenient only on bare keys
- Use allow-list (`SHORTCUT_SAFE_INPUT_TYPES`) for focus-aware suppression — suppress text-like inputs, allow sliders/checkboxes/buttons
- Call `preventDefault()` AFTER callback succeeds, not before — protects against callback errors breaking the handler
- See `references/interaction.md` for full modifier rules and test conventions

### Pointer Handler Coordination

When multiple pointer event handlers attach to the same canvas, use **gesture-active flag coordination** to prevent conflicting event processing:

```javascript
// PanelSwapHandler — always active, skips if multi-touch gesture active
_onPointerDown(e) {
    if (state._multiTouchGestureActive) return;
    // ... panel swap handling (works in all layouts)
}

// MultiTouchHandler — sets flag on gesture start/end
state._multiTouchGestureActive = true;  // on gesture start
state._multiTouchGestureActive = false; // on gesture end
```

- **GestureHandler no longer handles pointerdown** — swap handler's `_onPointerUp` handles click-to-select; GestureHandler provides hover-only
- **Both handlers always attached** — no attach/detach cycles on layout change; O(1) flag check at pointerdown time
- **Drag threshold distinguishes click from drag** — 10 CSS pixels of movement triggers drag mode; below threshold, treat as click
- **CSS pixel threshold** — device-independent, feels consistent on high-DPR displays
- **Global pointerup for drag cleanup** — Always add a `window.addEventListener('pointerup', ...)` listener alongside the element-level listener. If the user releases the pointer outside the element (off-screen drag, tab switch), the element-level `pointerup` never fires and drag state gets stuck. See `references/interaction.md` for the pattern.
- See `references/interaction.md` for the full pattern and gotchas

### Multi-Touch and Trackpad Gestures

Pan and zoom gestures must support **three input paths** for cross-platform coverage:

| Path | Platform | Events |
|------|----------|--------|
| **TouchEvent** | Mobile touchscreen | `touchstart`/`touchmove`/`touchend` |
| **PointerEvent** | Windows precision touchpad, some Linux | `pointerdown`/`pointermove`/`pointerup` (two pointers) |
| **WheelEvent** | macOS trackpad (universal) | `wheel` with `deltaX`/`deltaY` (pan) and `deltaZ` (zoom) |

**Critical: macOS trackpad gestures are wheel events, NOT pointer events.** The browser synthesizes two-finger trackpad input as a single `wheel` event. A PointerEvent-based two-pointer approach never activates on macOS.

**Key patterns:**
- **PointerType guard** — On hybrid devices (touchscreen + trackpad), guard PointerEvent handlers with `if (e.pointerType === 'touch') return;` to avoid double-firing with the TouchEvent path.
- **Unified gesture functions** — Extract `startGesture()`, `processGesture()`, `endGesture()` so both TouchEvent and PointerEvent paths share identical logic.
- **Wheel event handler** — Handle `deltaX`/`deltaY` for pan and `deltaZ` for zoom. Also check `ctrlKey + deltaY` as a cross-platform zoom fallback (Windows mice). Attach with `{ passive: false }`.
- **Exactly 2 fingers** — For TouchEvent, check `e.touches.length !== 2`. Mobile OSes reserve 3+ finger gestures.
- **touch-action: none** — Add this CSS to gesture canvases to prevent browser default scroll/zoom.
- **Window blur safety net** — Listen for `window.blur` and `document.visibilitychange` to cancel stuck gesture state if the user switches tabs/windows mid-gesture.
- **preventDefault after gesture check (TouchEvent/PointerEvent)** — Only call `preventDefault()` when the gesture actually activates (e.g., panel is selected), not unconditionally.
- **preventDefault two-level guard (WheelEvent)** — Wheel events need a stricter two-level guard: (1) is a panel selected? (2) are there actual pan or zoom deltas? If either check fails, do NOT call `preventDefault()`. Without Level 2, single-finger mouse scroll over canvas with a panel selected blocks page scrolling. Also guard `ctrlKey + deltaY`: if `ctrlKey` is true but all deltas are zero, skip `preventDefault()` to avoid blocking browser zoom.
- See `references/interaction.md` for the full dual-input path patterns, wheel event handling, pointer capture gotchas, and blur safety net.

### File Input Handlers

Read files from the DOM element by ID instead of from the event parameter:
```javascript
// After: reads from DOM by injected ID
handleFileInputChange() {
    const input = document.getElementById(fileInputId);
    const files = input ? input.files : null;
}
```
- Decouples the handler from the event object — Vue template `@change="handleFileInputChange"` still works (Vue passes event, handler ignores it)
- More testable — mock `document.getElementById` instead of constructing events

### Toast Notifications

Minimal toast system using reactive state + `setTimeout` for auto-dismiss. No dedicated component — just data, a method, and a template element.

```javascript
// Reactive state in createCollageData.js
toast: {
    message: '',
    type: '',       // 'info', 'success', 'error'
    visible: false,
    timer: null
},

// Method in createCollageMethods.js
showToast(message, type, duration) {
    type = type || 'info';
    duration = duration != null ? duration : 5000;
    if (this.toast.timer) clearTimeout(this.toast.timer);
    this.toast.message = message;
    this.toast.type = type;
    this.toast.visible = true;
    this.toast.timer = setTimeout(() => {
        this.toast.visible = false;
        this.toast.message = '';
        this.toast.timer = null;
    }, duration);
},
```

```html
<!-- Template in index.html -->
<div class="toast-notification"
     v-show="toast.visible"
     :class="'toast-' + toast.type"
     role="status"
     aria-live="polite">
    <span class="material-icons" aria-hidden="true">
        {{ toast.type === 'error' ? 'error' : 'info' }}
    </span>
    {{ toast.message }}
</div>
```

**Key gotchas:**
- **Timer cleanup in `beforeUnmount()`** — Clear the toast timer to prevent updating reactive state on a destroyed instance: `if (this.toast && this.toast.timer) { clearTimeout(this.toast.timer); this.toast.timer = null; }`
- **Toast coalescing** — Rapid successive calls clear the previous timer and overwrite the message. Only the last message is shown. Prevents spam but loses quick successive errors.
- **`v-show` with CSS transitions** — `v-show` toggles `display: none`, which cannot be CSS-transitioned. For fade animations, use `v-if` with `<transition>` or bind `visibility` + `opacity` via inline styles. For simple toasts, `v-show` is acceptable (instant show/hide).
- **Mobile safe areas** — Use `calc(16px + env(safe-area-inset-bottom, 0px))` for bottom-positioned fixed elements to avoid iOS home indicator overlap. See `references/css-layout.md`.
- **ARIA live region role** — Use `role="status" aria-live="polite"` for info/success toasts. Consider `role="alert"` for critical errors. Never combine `role="alert"` with `aria-live="polite"` — they contradict each other. Always add `aria-hidden="true"` to decorative icons inside live regions. See `references/accessibility.md`.

### Testing
- Mocha + Chai via CDN for unit tests (browser-based)
- Playwright for E2E tests
- Test HTML files in `MyComponents/`
- **Prefer real browser objects over mocks** when objects are easy to construct (e.g., `File`, `Image`) — tests actual behavior with no mock maintenance. Use base64 PNG helper for test image files. Mock only for uncontrolled side effects (network, quota) or hard-to-trigger error paths (`FileReader.onerror`). See `references/testing-unit.md`
- **Characterization tests before refactor** — Before refactoring shared code, add tests that capture current observable behavior. This ensures the refactor doesn't change behavior, especially for subtle differences between callers (e.g., one method sets `shadowColor`, another doesn't). See `references/testing-unit.md`
- Mock browser APIs by intercepting `document.createElement` and `localStorage` (bind original, always restore)
- Mock `requestAnimationFrame`/`cancelAnimationFrame` with a callback collector + `flushRAF()` for deterministic debounce testing — see `references/testing-unit.md`
- Use Proxy-based wrapper for Canvas 2D context mocking instead of `Object.defineProperty` — see `references/testing-unit.md`
- For render order verification, wrap `ctx.stroke()`/`ctx.strokeRect()` to capture canvas state at call time (context method wrapping) — see `references/testing-unit.md`
- For hit testing on computed/auto-fit elements, import the production computation function (e.g., `computeBounds`) to derive coordinates — see `references/testing-unit.md` self-calibrating hit test coordinates
- `DragEvent.dataTransfer` cannot be mocked in constructor — test listener presence via `preventDefault()` tracking
- Mock `window.Worker` with `Object.defineProperty` + setter for `onmessage` to capture the handler, then fire synthetic messages. Override timeout config (e.g., `INFERENCE_TIMEOUT_MS = 50`) to test timeout paths without waiting. See `references/web-workers.md`
- Document-level listeners leak across tests — use describe-level `afterEach` cleanup, never `beforeEach` + per-test setup
- See `references/testing-unit.md` for patterns on testing state and combined edge cases, `references/testing-strategy.md` for deferred features

### Extensibility Patterns

**Strategy Pattern for Layout Generation**
- Refactor switch statements into a strategy pattern for OCP compliance
- Registry map (`LAYOUT_GENERATORS`) provides clean extension point without modifying core code
- Pass all optional parameters to the generator; let each extract what it needs (flexible and truly OCP-compliant)
- Example: `return generator({ ...base, mosaicSeed })` instead of hardcoded parameter injection

**Registry Pattern for Export Managers**
- Decouple handlers from direct format implementations via registry (`ExportManager.registerFormat()`)
- Ensures all exporters follow the same interface (assembler, state, optional params)
- Accepts optional `exportSize` parameter to avoid hardcoded dimensions and enable DPR scaling
- **Signature alignment rule:** Every registered strategy must accept the same parameter order as the dispatcher. `ExportManager.export()` calls `exporter(assembler, state, quality)`, so every exporter must have at least 3 parameters in that order. Use underscore-prefixed names (`_quality`) for parameters a strategy doesn't use but must accept for positional alignment. A misaligned signature silently corrupts output (e.g., `quality=0.92` passed where `exportSize` is expected yields `undefined` dimensions).

**Data-Driven UI Options** — Add `getLayoutOptions(style)` to layout generators to return a descriptor of which options each layout uses:
```javascript
getLayoutOptions(style) {
    return { gutter: true, sliceAngle: false, hexSpacing: false, hexSizeMultiplier: false };
}
```
- UI dynamically shows/hides options based on layout type without hardcoded `v-show` conditions
- Adding a new layout type only requires registering the generator AND its options — no template changes needed

### Canvas Clearing for Exporters
**Critical: Always clear canvas before rendering for export**
- JPEG **must** explicitly clear and fill with white background (no transparency support)
- Apply the same pattern to PNG and all exporters for consistency
```javascript
ctx.clearRect(0, 0, exportSize.width, exportSize.height);
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, exportSize.width, exportSize.height);
```

### Memory Management
See `references/memory-management.md` for patterns on disposing image references, URL cleanup, lifecycle ordering (remove listeners before disposing renderers), canvas GPU memory release (`width = 0; height = 0`), and visual state cleanup.

### Web Workers
- **Timeout guard pattern** — Use `setTimeout` as a safety net for long-running workers. The timeout is NOT the primary flow; the worker message is.
- **Clear timeouts on every exit path** — ready, failed, error, and dispose. A stale callback on a disposed object causes errors or memory leaks.
- **Guard the timeout callback** — `if (this.isDisposed || !this.worker) return;` prevents stale invocations.
- **Dispose must null the timeout ID** — `clearTimeout(this.inferenceTimeoutId); this.inferenceTimeoutId = null;`
- See `references/web-workers.md` for the full pattern and mock Worker testing strategy.

## Web-Specific Edge Cases

1. **DPR Scaling in Exports** — Export size should account for Device Pixel Ratio to ensure high-quality output on Retina displays
2. **Tainted Canvas / CORS** — Images from external sources must have `crossOrigin="anonymous"` set, or exports fail silently/throw errors
3. **Memory Management** — Offscreen canvases and blob URLs need proper cleanup; already handled with `URL.revokeObjectURL` in try/finally
4. **Vue Reactivity During Export** — Ensure export operates on plain data, not reactive state that might trigger re-renders

## Feature Development Workflow

1. Identify the domain (Vue, Canvas, Layout, State, Export) and read the relevant reference
2. Write new logic as a factory function in the appropriate `MyESModules/` subdirectory
3. Wire into the Vue app via the matching config module (`createCollageData`, `createCollageMethods`, etc.)
4. Add tests in `MyComponents/` (unit) or Playwright (E2E)
5. **Run world-review on P1 test files** — have a fresh reviewer identify gaps using checklist: "What if input is null/empty/partial? What edge cases exist?"
6. **For architectural changes, run world-review after implementation** — Tests verify *specified* behavior; world-review questions *assumed* behavior. It catches edge cases tests miss (e.g., services undefined at callback time, optional chaining inconsistencies). Use comprehensive checklist:
    - [ ] Check for missing methods in managers that are called by handlers (integration gap)
    - [ ] Verify image disposal when replacing image references (memory leak prevention)
    - [ ] Review array assignments for reference preservation (Vue reactivity)
    - [ ] Confirm all state mutation patterns are intentional and documented (action vs. direct)
    - [ ] Verify services are looked up inside callbacks, not captured outside (stale reference risk)
    - [ ] Check optional chaining consistency on all `base` service locator access across modules
7. **When refactoring to new patterns, update dependent code** — check all imports that may be affected by API changes; ensure backward compatibility where possible
8. Verify: run `node scripts/run-tests.js`, check dev server, confirm no regressions

---

Base directory for this skill: `.opencode/skills/building-web-apps/`
Relative paths in this skill are relative to this base directory.
