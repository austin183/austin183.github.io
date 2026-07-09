---
name: building-web-apps
description: Build static web apps with Vue 3 Options API, Canvas 2D rendering, ES modules, and CDN-loaded libraries. Covers factory testability patterns (callback injection, DOM ID injection), extensibility patterns (strategy/registry), canvas clearing for exports, test-driven refactoring, multi-touch gestures, and web edge cases (DPR, CORS). No build step, no bundler. Use when working on CollageMaker web app features, rendering, state management, testing, or architectural refactoring.
---

# Building Web Apps

This skill covers patterns for the CollageMaker web app: Vue 3 Options API, Canvas 2D rendering, ES modules, the Midiestro3D project pattern, factory testability patterns (callback injection, DOM ID injection), extensibility patterns (strategy/registry), and web-specific edge cases.

## Project Pattern

**Single HTML entry point, ES modules, no build step.** All code loads via `<script type="module">` from CDN or local files. No bundler, no transpilation, no build step.

## Key References

Consult these files for verified patterns and gotchas:

- `references/vue-options-api.md` — Vue 3 Options API factory decomposition, provide() timing, @mousedown.prevent, array mutation patterns for reactivity
- `references/canvas-2d.md` — Canvas 2D rendering, DPR scaling, semi-transparent compositing, offscreen export
- `references/es-modules.md` — ES module conventions and barrel exports
- `references/rich-text-runs.md` — Run-based text formatting, merge/split algorithm
- `references/testing.md` — Mocha/Chai unit tests and Playwright E2E, integration testing after modularization
- `references/interaction.md` — Keyboard shortcut patterns: three-layer architecture, modifier matching, focus suppression, preventDefault ordering, pointer handler coordination, multi-touch gestures
- `references/midiestro-pattern.md` — Entry point pattern, shared infrastructure, directory structure
- `references/css-layout.md` — Flex column chain, `min-height: 0` requirement, responsive sidebar config, CSS computed value naming
- `references/memory-management.md` — Disposing HTMLImageElement references, URL.createObjectURL cleanup, lifecycle cleanup ordering, canvas GPU memory release, visual state cleanup, image disposal when replacing references
- `references/manager-patterns.md` — Action-based vs. direct mutation state managers, when to use each pattern, undo/redo integration
- `references/web-workers.md` — Web Worker lifecycle, timeout guard pattern, clearing timeouts on every exit path, mock Worker pattern for testing
- `references/accessibility.md` — ARIA patterns for segmented controls (radiogroup), decorative indicators (aria-hidden)

## Core Conventions

### ES Modules
- Named exports only, no default exports
- Barrel exports in `MyESModules/index.js`
- Relative imports with `.js` extension

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

**Internal vs. Module Extraction** — If internal functions within a factory already have clear boundaries and accept explicit parameters (not `this`), extracting to separate modules may be unnecessary. The callback injection pattern is the stronger DIP improvement. Separate modules add import complexity without meaningful testability gains when the functions are tightly coupled to Vue internals.

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
- See `references/vue-options-api.md` for provide() timing and array mutation patterns

### Canvas 2D
- Lifecycle pattern: `init()` → `resize()` → `scheduleRender()` → `dispose()`
- DPR scaling for sharp rendering on Retina displays
- `requestAnimationFrame` for debounced renders
- In `dispose()`, set `canvas.width = 0; canvas.height = 0` to force GPU memory release
- **Pre-fill background before `globalAlpha`** — Canvas blends against existing pixels, not isolated layers. Always `fillRect` with background color before drawing semi-transparent images. Isolate alpha with `save()`/`restore()`.
- See `references/canvas-2d.md` for offscreen export, clearing patterns, and compositing

### Interaction & Keyboard Shortcuts
- Three-layer architecture: pure parse functions → pattern matching → factory event handler with attach/detach lifecycle
- `"meta+"` matches both `metaKey` AND `ctrlKey` (cross-platform); alt always strict; shift lenient only on bare keys
- Use allow-list (`SHORTCUT_SAFE_INPUT_TYPES`) for focus-aware suppression — suppress text-like inputs, allow sliders/checkboxes/buttons
- Call `preventDefault()` AFTER callback succeeds, not before — protects against callback errors breaking the handler
- See `references/interaction.md` for full modifier rules and test conventions

### Pointer Handler Coordination

When multiple pointer event handlers attach to the same canvas, use **layout-gated delegation** to prevent conflicting event processing:

```javascript
// GestureHandler — general-purpose, skips hexagonal layout
_onPointerDown(e) {
    if (state.layoutStyle === LayoutStyle.HEXAGONAL) return;
    // ... rest of handler
}

// HexDragHandler — hex-specific, skips non-hexagonal layouts
_onPointerDown(e) {
    if (state.layoutStyle !== LayoutStyle.HEXAGONAL) return;
    // ... hex-specific handling
}
```

- **Both handlers always attached** — no attach/detach cycles on layout change; O(1) layout check at pointerdown time
- **Drag threshold distinguishes click from drag** — 10 CSS pixels of movement triggers drag mode; below threshold, treat as click
- **CSS pixel threshold** — device-independent, feels consistent on high-DPR displays
- See `references/interaction.md` for the full pattern and gotchas

### Multi-Touch Gestures

Two-finger pan and pinch-to-zoom on mobile use `touchstart`/`touchmove`/`touchend` with `{ passive: false }`.

- **Exactly 2 fingers, not 2+** — Mobile OSes reserve 3-finger and 4-finger gestures for system navigation (iOS: back/forward; Android: split-screen). Check `e.touches.length !== 2` and cancel the gesture if the count deviates mid-gesture.
- **removeEventListener must match addEventListener options** — If attached with `{ passive: false }`, removal must include the same options. Mismatched options cause silent failure and memory leaks.
- **Consolidate render calls** — When a single `touchmove` can trigger both pan and zoom, use a `needsRender` flag to call the render callback at most once per event.
- **Incremental pinch scale** — Apply `Math.pow(distanceRatio, 0.15)` to convert raw pinch distance to a smooth incremental zoom factor. Reset the reference distance after each zoom to avoid accumulating scale.
- See `references/interaction.md` for the full multi-touch patterns.

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

### Testing
- Mocha + Chai via CDN for unit tests (browser-based)
- Playwright for E2E tests
- Test HTML files in `MyComponents/`
- **Prefer real browser objects over mocks** when objects are easy to construct (e.g., `File`, `Image`) — tests actual behavior with no mock maintenance. Use base64 PNG helper for test image files. Mock only for uncontrolled side effects (network, quota) or hard-to-trigger error paths (`FileReader.onerror`). See `references/testing.md`
- Mock browser APIs by intercepting `document.createElement` and `localStorage` (bind original, always restore)
- Mock `requestAnimationFrame`/`cancelAnimationFrame` with a callback collector + `flushRAF()` for deterministic debounce testing — see `references/testing.md`
- Use Proxy-based wrapper for Canvas 2D context mocking instead of `Object.defineProperty` — see `references/testing.md`
- `DragEvent.dataTransfer` cannot be mocked in constructor — test listener presence via `preventDefault()` tracking
- Mock `window.Worker` with `Object.defineProperty` + setter for `onmessage` to capture the handler, then fire synthetic messages. Override timeout config (e.g., `INFERENCE_TIMEOUT_MS = 50`) to test timeout paths without waiting. See `references/web-workers.md`
- Document-level listeners leak across tests — use describe-level `afterEach` cleanup, never `beforeEach` + per-test setup
- See `references/testing.md` for patterns on testing state, combined edge cases, and deferred features

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
6. **For architectural changes, run world-review after implementation** — use comprehensive checklist:
    - [ ] Check for missing methods in managers that are called by handlers (integration gap)
    - [ ] Verify image disposal when replacing image references (memory leak prevention)
    - [ ] Review array assignments for reference preservation (Vue reactivity)
    - [ ] Confirm all state mutation patterns are intentional and documented (action vs. direct)
7. **When refactoring to new patterns, update dependent code** — check all imports that may be affected by API changes; ensure backward compatibility where possible
8. Verify: run `node scripts/run-tests.js`, check dev server, confirm no regressions

## Quick Reference
- **Optional chaining guards** — Use `base?.method?.()` instead of ternary guards (`base.getMethod ? base.getMethod() : null`) for resilient existence checks on objects with optional interfaces.

- **Vue:** `provide()` runs before `mounted()` — lazy services are null. Use getter functions or `this.manager` access. Use `@mousedown.prevent` on toolbar buttons that operate on text selection.
- **Factory testability:** Use callback injection — handler factories accept callbacks that receive Vue instance as parameter. Internal functions are closures over services accepting explicit `vm`, not `this`. Inject DOM IDs via factory config with sensible defaults. Prefer internal functions over module extraction when functions are tightly coupled to Vue internals.
- **File inputs:** Read `files` from DOM element by injected ID, not from event parameter. Vue template `@change="handler"` still works — event is passed but ignored.
- **Data-driven UI:** Use `getLayoutOptions(style)` on layout generators to let UI dynamically show/hide options. Adding new layouts requires no template changes.
- **Keyboard shortcuts:** Pure parse/match functions exported for testing without DOM. Pattern parts order-insensitive, key comparison case-insensitive. See `references/interaction.md` for modifier rules.
- **Pointer handlers:** Use layout-gated delegation — each handler checks `state.layoutStyle` at pointerdown and returns early if not its domain. Both handlers stay attached (no attach/detach on layout change). Drag vs. click: 10 CSS pixel threshold. See `references/interaction.md`.
- **Multi-touch gestures:** Exactly 2 fingers (`!== 2`), cancel on count change. `removeEventListener` must match `addEventListener` options (e.g., `{ passive: false }`). Consolidate renders with `needsRender` flag. Pinch zoom: `Math.pow(distanceRatio, 0.15)`. See `references/interaction.md`.
- **Canvas export:** Wrap `URL.createObjectURL` + `a.click()` in `try/finally`. Always clear canvas and fill white before rendering (especially for JPEG).
- **Canvas compositing:** `globalAlpha` blends against existing pixels — pre-fill background color before drawing semi-transparent images. Isolate alpha with `save()`/`restore()`.
- **Run processing:** Never use `break` in run-processing loops — it drops subsequent runs. Use a flag. Always merge after mutations.
- **CSS flex:** Every `flex: 1` item inside a `flex-direction: column` container needs `min-height: 0`. Same for `min-width: 0` in row containers. See `references/css-layout.md`.
- **Memory management:** Dispose image references (`null`), replace old before new, use `try/finally` for blob URLs, prefer `splice()` over reassignment. In `beforeUnmount()`, remove interaction listeners BEFORE disposing renderers. Set `canvas.width = 0; canvas.height = 0` to force GPU memory release. Cleanup functions must also reverse visual state (DOM classes, etc.). See `references/memory-management.md`.
- **Timeout guards:** Clear `setTimeout` IDs on every exit path (ready, failed, error, dispose). Guard the callback with `if (this.isDisposed || !this.worker) return;`. The timeout is a safety net, not the primary flow. See `references/web-workers.md`.
- **Extensibility:** Use strategy pattern for layout generators (registry + pass-all-options). Use registry pattern for export handlers. Every registry strategy must match the dispatcher's parameter order — use `_unused` prefix for positional alignment.
- **Testing:** Mock browser APIs with `bind()` and restore. Use Proxy-based Canvas 2D context mocking. For RAF debounce tests, use a callback collector + `flushRAF()` — always `bind()` the original, restore in `afterEach`, read state inside the RAF callback (latest-wins). Verify both calls AND property state. Test default behavior explicitly. Cover combined edge cases. For `DragEvent`, mock `preventDefault()` — `dataTransfer` cannot be set in constructor. For `document`-level listeners, use describe-level `afterEach` cleanup to avoid cross-test leakage. For `window.Worker`, use `Object.defineProperty` with `onmessage` setter. Override timeout configs for fast timeout tests. See `references/testing.md` and `references/web-workers.md` for details.
- **Accessibility:** Use `role="radiogroup"` + `role="radio"` + `:aria-checked` for segmented controls. Use `aria-hidden="true"` on decorative indicators that duplicate adjacent control info. See `references/accessibility.md`.

---

Base directory for this skill: `.opencode/skills/building-web-apps/`
Relative paths in this skill are relative to this base directory.
