---
name: building-web-apps
description: Build static web apps with Vue 3 Options API, Canvas 2D, ES modules, CDN libraries. Covers factory testability (callback injection, provider functions, DOM ID injection, module extraction, service locator safety, return value notification, handler .call(this), closure safety, internal closure pattern, return-object exposure, mock VM construction, undo snapshots (segmented inline, atomic handler methods, lifecycle cleanup)), extensibility (strategy/registry), canvas clearing for exports, config rendering, shared offscreen canvas, render order, dual-canvas visibility guard, async UI cleanup (try/finally, concurrency guards), toast notifications, accessibility (ARIA live regions, custom button keyboard, aria-busy, reduced motion, canvas roles, ARIA tab pattern with aria-controls/aria-labelledby, focus return on dialog close, focus traps for aria-modal dialogs), drag cleanup, VISIBLE_MIN clamping, test-driven refactoring, Vue input patterns (@keydown.enter, v-model undo timing, segmented/checkbox inline snapshot/commit, atomic handler extraction, beforeUnmount cleanup, $nextTick race condition guards), multi-touch gestures (TouchEvent/PointerEvent/WheelEvent, pointerType guards, wheel pan/zoom, dual gesture direction conventions, pointer capture early-exit cleanup, 3+ finger OS gesture guard, touch-action: pan-y vs none trade-off, PointerEvent test migration), multi-canvas pointer events (e.currentTarget for per-canvas coordinate math), mobile sidebar overlays (dual-state toggles, CSS !important cascade, scoped CSS selectors for shared classes, global Escape, Playwright Escape key unreliability with .window modifier, overlay backdrops, aria-expanded), mobile bottom sheets (ID prefixing for content duplication, visual drag handle, auto-switch tab on content change, dvh height units), fixed element z-index occlusion (prevention checklist, Playwright "intercepts pointer events" diagnosis), iOS safe areas (viewport-fit=cover, 100dvh, fixed element treatment, CSS content validation testing), destination-out compositing, DPR/CORS, test runner DOM queries (querySelector over getElementById, offsetParent mounting for detached elements, getElementById mock null fallback, DOMParser Vue directive colon prefix), pure function numeric guards (Number.isFinite for NaN/Infinity). No build step. Use for CollageMaker features, rendering, state, testing.
---

# Building Web Apps

## Project Pattern

**Single HTML entry point, ES modules, no build step.** All code loads via `<script type="module">` from CDN or local files. No bundler, no transpilation, no build step.

## Key References

Consult these files for verified patterns and gotchas:

- `references/vue-options-api.md` — Vue 3 Options API factory decomposition, provide() timing, @mousedown.prevent, $refs on native form inputs, array mutation patterns for reactivity, v-model timing for undo snapshots
- `references/canvas-2d.md` — Canvas 2D rendering, DPR scaling, semi-transparent compositing, config-based rendering helpers, shared offscreen canvas for measurement, offscreen export, dual-canvas visibility guard
- `references/es-modules.md` — ES module conventions and barrel exports
- `references/rich-text-runs.md` — Run-based text formatting, merge/split algorithm
- `references/testing-unit.md` — Mocha/Chai unit tests, mocking patterns, integration testing, characterization tests before refactor
- `references/testing-e2e.md` — Playwright E2E, page load strategy, pointer/Touch/Drag event testing, test runner DOM query gotchas, Escape key unreliability with Vue `.window` modifier
- `references/testing-strategy.md` — Testing approach, gotchas, deferred features, assertion density
- `references/interaction.md` — Keyboard shortcut patterns: three-layer architecture, modifier matching, focus suppression, preventDefault ordering, pointer handler coordination, global pointerup drag cleanup, VISIBLE_MIN drag boundary clamping, multi-touch and trackpad gestures (TouchEvent/PointerEvent dual path, pointerType guards, pointerType-based dynamic thresholds, wheel event pan/zoom, dual gesture direction conventions, setPointerCapture gotchas, releasePointerCapture hygiene, pointer capture early-exit cleanup, 3+ finger OS gesture guard, blur safety net, touch-action: pan-y vs none trade-off), multi-canvas pointer events (e.currentTarget)
- `references/midiestro-pattern.md` — Entry point pattern, shared infrastructure, directory structure
- `references/css-layout.md` — Flex column chain, `min-height: 0` requirement, responsive sidebar config, CSS computed value naming, mobile safe areas
- `references/memory-management.md` — Disposing HTMLImageElement references, URL.createObjectURL cleanup, lifecycle cleanup ordering, canvas GPU memory release, visual state cleanup, image disposal when replacing references
- `references/manager-patterns.md` — Action-based vs. direct mutation state managers, when to use each pattern, undo/redo integration, return value pattern for side-effect notification
- `references/undo-snapshots.md` — Undo/redo snapshot patterns: shallow copy reference preservation, onUndoCommand callback injection, crops deep copy with null guard, File object redo limitations, testing disposed-image toast
- `references/web-workers.md` — Web Worker lifecycle, timeout guard pattern, clearing timeouts on every exit path, mock Worker pattern for testing
- `references/accessibility.md` — ARIA patterns for segmented controls (radiogroup), color picker accessibility, custom button keyboard activation (Enter + Space), aria-busy loading states, prefers-reduced-motion, ARIA live regions (toast notifications), interactive canvas role selection, touch target sizing (WCAG 2.5.8, 44x44px minimum, sizing property selection), ARIA tab pattern (id + aria-controls + aria-labelledby wiring), focus return on dialog close (WCAG 2.4.3)
- `references/mobile-ui-patterns.md` — Dual-state toggle pattern (desktop vs mobile sidebar), CSS `!important` cascade in media queries, Vue `.window` modifier for global Escape, `display: none` overlay backdrops, `aria-expanded` on mobile toggles, bottom sheet patterns (ID prefixing for content duplication, visual drag handle, auto-switch tab on content change), fixed element z-index occlusion (prevention checklist), Playwright "visible but unclickable" diagnosis

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
- **Handler binding convention** — All handlers from extracted modules use `.call(this, ...)` in `createCollageMethods.js` to bind the Vue instance as `this`. This gives handlers access to `this.titleText`, `this.showToast`, etc. Always follow this convention for new handlers — verify by checking existing handler bindings before adding new ones.

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

**Return Value for Side-Effect Notification** — When a manager method performs a mutation that may trigger a side effect (e.g., truncation, clipping), return a result object describing what happened. The caller decides what to do with it. This cleanly separates state mutation from notification:
```javascript
// Manager: mutates state, returns metadata — knows nothing about toasts
setText(text) {
    const wasTruncated = lines.length > 3;
    // ... clamp state ...
    return { truncated: wasTruncated };
}

// Handler: uses return value to decide on user feedback
onTitleTextChange() {
    const result = titleManager.setText(this.titleText);
    if (result && result.truncated && this.showToast) {
        this.showToast('Title limited to 3 lines', 'info', 3000);
    }
}
```
- Manager stays focused on state — no knowledge of UI feedback mechanisms
- Handler owns notification decisions — can adapt feedback per context
- See `references/manager-patterns.md` for the full pattern

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

**Closure Reference Safety for Undo Commands** — When building undo/redo closures that reference a mutable outer variable (e.g., a snapshot variable later set to `null`), copy the values into a local `const` before building the closure. JavaScript closures capture variables by reference, not by value:

```javascript
// WRONG — titleUndoSnapshot is captured by reference, later nullified
this.undoManager.push({
    undo: () => {
        this.titleStyle.titleBoxX = titleUndoSnapshot.titleBoxX; // → TypeError: null
    }
});
titleUndoSnapshot = null; // Breaks the closure

// CORRECT — local const captures values at closure creation time
const preState = { ...titleUndoSnapshot };
this.undoManager.push({
    undo: () => {
        this.titleStyle.titleBoxX = preState.titleBoxX; // Safe — preState is const
    }
});
titleUndoSnapshot = null; // Does not affect the closure
```

- This pattern is common in interaction handlers that capture a pre-state snapshot, build an undo command at interaction end, then null the snapshot variable
- The crop drag undo in `createCollageLifecycle.js` already demonstrates the correct pattern: `const preState = { ...cropUndoSnapshot };`
- Any closure referencing an outer variable that is later reassigned is vulnerable — look for this during code review

**Undo Snapshot Patterns** — When building undo/redo commands for image operations, snapshot state *before* disposal:

```javascript
// Snapshot BEFORE disposal — shallow copy preserves DOM element references
const removedItem = { ...this.images[index] };
imageLibrary.disposeImage(index);
// removedItem.image is still valid — spread copies the reference value, not a shared property
```

- **Shallow copy preserves references** — `{ ...item }` copies property *values* (which are references to `HTMLImageElement`). After `disposeImage` nulls the original, the snapshot's reference remains valid. Undo can restore the image.
- **onUndoCommand callback** — Handler factories accept optional `onUndoCommand(vm, cmd)` to push undo commands without knowing about UndoManager. The `cmd.undoFn(vm)` / `cmd.redoFn(vm)` signatures receive the Vue instance as a parameter (not `this`). Optional for backward compatibility.
- **Crops deep copy** — Use `JSON.parse(JSON.stringify(this.crops || []))`. Guard against null: `JSON.stringify(null)` returns `"null"`, and `JSON.parse("null")` returns `null`, breaking array operations.
- **Add Images redo limitation** — `File` objects are not serializable and are lost after file input resets. Redo restores crop state but cannot re-add images. Acceptable UX trade-off.
- **Testing disposed-image toast** — Normal disposal preserves the image reference in the snapshot, so you can't test the "Cannot undo" toast that way. Create a test item with `image: null` from the start.
- See `references/undo-snapshots.md` for the full patterns

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

**Return Object Exposure for Internal Functions** — When an internal factory function has meaningful behavior worth testing (error handling, validation, etc.) but is genuinely internal (not needed by other modules), expose it as a method on the factory's return object instead of exporting it as a module-level named export:
```javascript
// Internal function — scoped to factory, not exported
function pushUndoCommand(vm, cmd) {
    if (vm.undoManager) {
        vm.undoManager.push({
            label: cmd.label,
            undo: () => {
                try { cmd.undoFn(vm); } catch (e) {
                    console.error(`Undo error (${cmd.label}):`, e);
                    if (vm.showToast) {
                        vm.showToast('Undo failed. Please try again.', 'error', 5000);
                    }
                }
            },
            // ... redo wrapper
        });
        vm._updateUndoState();
    }
}

// Expose on return object for testability
return {
    // ... other methods
    pushUndoCommand(vm, cmd) {
        pushUndoCommand(vm, cmd);
    },
};
```

- Keeps the function scoped to the factory — no new import dependency for tests
- Preserves closure benefits — function still captures factory-scoped dependencies
- Use when the function relies on factory-scoped closures and you don't want to extract it to a separate module
- Avoid when the function is already testable through the public API, or is simple enough that integration testing suffices

**Internal Closure Pattern for Factory Testability** — When a Vue factory method calls other methods on `this`, tests that mock partial VMs (spreading only state, not all methods) break. Use factory-scoped closures to avoid `this` dependencies in internal lifecycle methods:
```javascript
// Factory-scoped internal functions — no this dependency
let _focusTrapHandler = null;

function _trapFocus(vm) { /* ... */ }
function _releaseFocus(vm) { /* ... */ }

return {
    // Internal lifecycle methods use closures directly
    toggleBottomSheet() {
        if (this.isOpen) {
            _trapFocus(this);
        } else {
            _releaseFocus(this);
        }
    },

    // Public API delegates to closures (for external callers / tests)
    trapFocusInBottomSheet() { _trapFocus(this); },
    releaseFocusTrap() { _releaseFocus(this); }
};
```
- Internal functions capture factory dependencies (like constants, shared state) without creating new import dependencies
- Public methods delegate to closures, enabling both internal lifecycle use and external testability
- Prefer over module-level exports when the function relies on factory-scoped closures

### Guard Against Null Inputs
Browser API utilities that accept user input MUST guard against null/undefined. Return `Promise.resolve(null)` for null input rather than throwing:
```javascript
export function loadImageFromFile(file) {
    if (!file) return Promise.resolve(null);
    // ... rest of implementation
}
```

### Pure Function Numeric Guards
Pure math functions that accept numeric parameters from runtime sources (touch coordinates, computed ratios, user input) MUST use `Number.isFinite()` — not comparison operators — as the first guard. JavaScript comparisons with `NaN` always return `false`, and `Infinity` is a valid positive number, so guards like `if (ratio <= 0)` silently pass invalid values through:

```javascript
// WRONG — NaN and Infinity bypass the comparison
export function applyZoomExponent(ratio) {
    if (ratio <= 0) return 1.0;  // NaN <= 0 is false, Infinity <= 0 is false
    return Math.pow(ratio, 0.3); // NaN or Infinity propagates
}

// CORRECT — Number.isFinite catches NaN, Infinity, -Infinity, undefined
export function applyZoomExponent(ratio) {
    if (!Number.isFinite(ratio) || ratio <= 0) return 1.0;
    return Math.pow(ratio, 0.3);
}
```

**Why it matters:** NaN in Canvas 2D (`ctx.scale(NaN, NaN)`) silently corrupts the transform matrix. NaN in state (`width / NaN`) propagates through clamping (`Math.max(NaN, 1) === NaN`). Both produce silent rendering failures.

**When to apply:** Any pure math function that accepts numeric parameters from potentially noisy sources AND returns values consumed by Canvas 2D, CSS transforms, or reactive state.

**When NOT to apply:** Functions called only with compile-time constants, or where the caller guarantees finite inputs with a short, auditable call chain.

**Testing:** Always assert NaN/Infinity/undefined inputs return safe defaults:
```javascript
expect(applyZoomExponent(NaN)).to.equal(1.0);
expect(applyZoomExponent(Infinity)).to.equal(1.0);
expect(applyZoomExponent(undefined)).to.equal(1.0);
```

### Vue 3 Options API
- Factory decomposition: `createCollageApp()` assembles data/methods/lifecycle/services
- Reactive state in Vue `data()` return value
- State managers receive Vue instance reference
- **Range inputs with null default** — `v-model.number` on `<input type="range">` coerces `null` to the `min` attribute. Use `:value` with a fallback and `@input` handler instead. See `references/vue-options-api.md`
- **`@keydown.enter` for textarea newline prevention** — Use `@keydown.enter` (not `@input`) to intercept Enter before Vue's `v-model` processes it. The `@input` event fires after the model update, which is too late for prevention. Useful for enforcing line limits:
```html
<textarea @keydown.enter="onTitleEnterKey" v-model="titleText" rows="3">
```
```javascript
onTitleEnterKey(event) {
    const lineCount = (this.titleText || '').split('\n').length;
    if (lineCount >= 3) {
        event.preventDefault(); // Block 4th line
        this.showToast('Maximum 3 lines reached', 'info', 2000);
    }
}
```
- **Always pair Enter prevention with user feedback** — Blocking Enter without explanation feels like a bug. Show a brief toast so the user understands why the key was suppressed.
- **v-model timing for undo snapshots** — `v-model` updates reactive data **before** `@change` (select) or `@input` (range/text) fires. By the time your handler runs, `this.someValue` is already the NEW value — you cannot capture the pre-change state inside the handler. Use pre-change events to snapshot:

  - **`<select>`**: `@focus` to snapshot, `@change` to compare and push undo:
    ```html
    <select v-model="layoutStyle" @focus="snapshotLayoutStyle" @change="onLayoutStyleChange">
    ```
    ```javascript
    snapshotLayoutStyle() { layoutStyleSnapshot = this.layoutStyle; }
    onLayoutStyleChange() {
        if (layoutStyleSnapshot !== null && this.layoutStyle !== layoutStyleSnapshot) {
            // Push undo command with layoutStyleSnapshot as pre-state
        }
    }
    ```

  - **`<input type="range">`**: `@focus` + `@pointerdown` to snapshot, `@input` to update, `@blur` to commit:
    ```html
    <input type="range" v-model.number="gutter"
           @focus="snapshotLayoutOptions" @pointerdown="snapshotLayoutOptions"
           @input="onGutterChange" @blur="commitLayoutOptions">
    ```
    - `@focus` captures on keyboard navigation (tab to slider)
    - `@pointerdown` captures on mouse/touch — **use `@pointerdown`, NOT `@mousedown`**, because `@mousedown` does NOT fire on touch devices for form elements. `@pointerdown` unifies mouse, touch, and pen.
    - **Batching**: Range `@input` fires continuously during drag. Snapshot on interaction start (`@focus`/`@pointerdown`), update layout on every `@input`, commit batched undo command on `@blur`.

  - **`<input type="color">`**: `@focus` to snapshot, `@input` to update, `@blur` to commit. Same pattern as range inputs.

  - **`<textarea>`**: `@focus` to snapshot, `@input` to update, `@blur` to commit. Same pattern as range inputs.

  - **`<button>` (segmented controls) and `<input type="checkbox">`**: These elements lack natural blur events. Use **inline snapshot/commit** in the `@click`/`@change` handler — each click is a discrete, atomic action:
    ```html
    <button @click="snapshotTitleStyle(); titleStyle.alignment = 'left'; onTitleAlignmentChange(); commitTitleStyle()">
        Left
    </button>
    <input type="checkbox" v-model="titleStyle.showBackground"
           @change="snapshotTitleStyle(); onTitleShowBackgroundChange(); commitTitleStyle()">
    ```

  - **Atomic handler methods (refinement)** — When you have 3+ inline expressions performing the same snapshot/mutate/commit cycle, or when you need to test the undo lifecycle in isolation, extract each into a dedicated handler method. This decouples tests from template implementation details:
    ```html
    <button @click="setTitleAlignment('left')">Left</button>
    ```
    ```javascript
    setTitleAlignment(alignment) {
        const preState = this.titleStyle.alignment;
        this.titleStyle.alignment = alignment;
        const titleManager = getTitleManager();
        if (titleManager) titleManager.setAlignment(alignment);
        onRenderScheduled(this);
        if (onUndoCommand && preState !== alignment) {
            onUndoCommand(this, {
                label: 'Change Title Style',
                undoFn: (v) => { /* restore preState */ },
                redoFn: (v) => { /* re-apply alignment */ }
            });
        }
    }
    ```
    **Design rules for atomic methods:**
    - **Setters: guard against no-op** — skip undo when value is unchanged (`if (preState !== newValue)`). Clicking "Center" when already centered should not produce an undo command.
    - **Toggles: always push undo** — a toggle always changes the value (false→true or true→false), so no guard is needed.
    - **Removals: early return** — if there's nothing to remove, return early. The template may guard with `v-if`, but method-level guards provide defense-in-depth for programmatic calls.

  - **Lifecycle cleanup**: Commit all pending snapshots in `beforeUnmount` to prevent lost edits when the Vue app is destroyed. Guard with `if (this.method)` since commit methods may not exist:
    ```javascript
    beforeUnmount() {
        if (this.commitTitleText) this.commitTitleText();
        if (this.commitTitleStyle) this.commitTitleStyle();
        // ... other commit methods
    }
    ```

  - **Testing inline snapshot/commit**: Simulate Vue event order — call snapshot handler, change value, call change handler:
    ```javascript
    handlers.snapshotLayoutStyle.call(vm);
    vm.layoutStyle = 'hex';  // v-model updates
    handlers.onLayoutStyleChange.call(vm);  // @change fires
    ```

  - **Testing atomic handler methods**: Call the method directly — no Vue event simulation needed:
    ```javascript
    handlers.setTitleAlignment.call(vm, 'left');
    expect(undoCommands.length).to.equal(1);
    expect(vm.titleStyle.alignment).to.equal('left');
    ```
- See `references/vue-options-api.md` for provide() timing and array mutation patterns

### Canvas 2D
- Lifecycle pattern: `init()` → `resize()` → `scheduleRender()` → `dispose()`
- DPR scaling for sharp rendering on Retina displays
- `requestAnimationFrame` for debounced renders
- In `dispose()`, set `canvas.width = 0; canvas.height = 0` to force GPU memory release
- **Pre-fill background before `globalAlpha`** — Canvas blends against existing pixels, not isolated layers. Always `fillRect` with background color before drawing semi-transparent images. Isolate alpha with `save()`/`restore()`.
- **Config-based rendering helpers** — When multiple methods share the same save/restore + property-setting pattern, extract a shared helper accepting a style config object. Guard optional config properties with `!== undefined` (not truthy checks) because `0` and `''` are valid canvas values.
- **Shared offscreen canvas for measurement** — Create a single 1x1 offscreen canvas at factory init for `measureText()` in hot paths. See `references/canvas-2d.md`
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

**Dual gesture direction conventions:** TouchEvent/PointerEvent and WheelEvent use **opposite** sign conventions for pan:

| Input Path | Convention | Delta Sign | User Action → Content Movement |
|------------|-----------|------------|--------------------------------|
| **TouchEvent** (touchscreen) | Direct manipulation | **Negate** | Drag right → content moves right |
| **PointerEvent** (hybrid) | Direct manipulation | **Negate** | Drag right → content moves right |
| **WheelEvent** (trackpad) | Scrolling | **No negation** | Scroll down → view moves down |

```javascript
// TouchEvent / PointerEvent — negate for "drag follows finger"
const dx = currentMidpoint.x - initialMidpoint.x;
cropManager.adjustCrop(panelId, { x: -dx * imageScale, y: -dy * imageScale });

// WheelEvent — no negation (scrolling convention)
cropManager.adjustCrop(panelId, { x: e.deltaX * sensitivity * imageScale, y: e.deltaY * sensitivity * imageScale });
```

The WheelEvent path (`_onWheel`) never calls `processGesture()` — it computes its own delta inline, making it easy to apply different conventions.

**Key patterns:**
- **PointerType guard** — On hybrid devices (touchscreen + trackpad), guard PointerEvent handlers with `if (e.pointerType === 'touch') return;` to avoid double-firing with the TouchEvent path.
- **Unified gesture functions** — Extract `startGesture()`, `processGesture()`, `endGesture()` so both TouchEvent and PointerEvent paths share identical logic.
- **Wheel event handler** — Handle `deltaX`/`deltaY` for pan and `deltaZ` for zoom. Also check `ctrlKey + deltaY` as a cross-platform zoom fallback (Windows mice). Attach with `{ passive: false }`.
- **Exactly 2 fingers** — For TouchEvent, check `e.touches.length !== 2`. Mobile OSes reserve 3+ finger gestures.
- **3+ finger OS gesture guard (PointerEvent)** — The TouchEvent path implicitly blocks 3+ fingers via `e.touches.length !== 2`. The PointerEvent path needs an explicit guard because each pointer arrives as a separate event. Without `preventDefault()` on the 3rd+ pointer, the OS may intercept the gesture mid-interaction:
  ```javascript
  if (activePointers.size === 2) { /* start gesture */ }
  else if (activePointers.size > 2) { e.preventDefault(); }
  ```
- **touch-action: pan-y vs none** — Default to `touch-action: pan-y` for selective gesture passthrough: one-finger vertical drag scrolls the page, two-finger gestures go to JavaScript. Requires `e.preventDefault()` on `touchmove` when two-finger gesture is active. Use `touch-action: none` only when: canvas fills the viewport (no content below to scroll to), custom two-finger pan/zoom is a core interaction, and alternative scroll targets exist (sidebars, bottom sheets). Document the trade-off in a CSS comment.
- **Window blur safety net** — Listen for `window.blur` and `document.visibilitychange` to cancel stuck gesture state if the user switches tabs/windows mid-gesture.
- **preventDefault after gesture check (TouchEvent/PointerEvent)** — Only call `preventDefault()` when the gesture actually activates (e.g., panel is selected), not unconditionally.
- **preventDefault two-level guard (WheelEvent)** — Wheel events need a stricter two-level guard: (1) is a panel selected? (2) are there actual pan or zoom deltas? If either check fails, do NOT call `preventDefault()`. Without Level 2, single-finger mouse scroll over canvas with a panel selected blocks page scrolling. Also guard `ctrlKey + deltaY`: if `ctrlKey` is true but all deltas are zero, skip `preventDefault()` to avoid blocking browser zoom.
- **PointerEvent for unit tests** — Prefer `new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 1, ... })` over TouchEvent mock construction. PointerEvent is a native browser constructor; TouchEvent requires `Object.defineProperty` + mock TouchList. Two `pointerdown` events replace one `touchstart` with two touches. See `references/testing-e2e.md` for patterns.
- See `references/interaction.md` for the full dual-input path patterns, wheel event handling, pointer capture gotchas, blur safety net, and gesture direction conventions.

### Responsive Mobile UI

**Dual-State Toggle Pattern** — When a UI element has different visibility mechanisms on desktop vs mobile, use **two independent reactive state properties** toggled by a single method. CSS media queries determine which state has visual effect:

```javascript
// GOOD — CSS media queries determine which state matters
toggleRightSidebar() {
    this.rightSidebarOpen = !this.rightSidebarOpen;
    this.rightSidebarMobileOpen = !this.rightSidebarMobileOpen;
    if (this.rightSidebarMobileOpen) {
        this.leftSidebarMobileOpen = false; // mutual exclusion
    }
}
```

**Anti-pattern:** Never use `window.innerWidth` checks in JavaScript to decide which state to toggle. This duplicates the CSS breakpoint value, breaks if the breakpoint changes, and doesn't handle rapid resize.

**CSS `!important` Cascade** — When desktop CSS uses `!important`, mobile media query overrides must use **equally specific selectors with `!important`** to win:

```css
@media (max-width: 699px) {
    .sidebar-right.sidebar-collapsed.mobile-open {
        width: 280px !important;
        overflow: visible !important;
    }
}
```

- Match specificity: include all conflicting classes in the selector
- Only override conflicting properties, not all properties
- Prefer avoiding `!important` when you control both desktop and mobile CSS

**Scoped CSS Selectors for Shared Classes** — When a CSS class with `!important` properties is shared across different element types via framework bindings (Vue `:class`), scope the selector to prevent collateral damage:

```css
/* BAD — matches ANY element with the class, including buttons */
.sidebar-collapsed {
    width: 0 !important;
}

/* GOOD — only matches sidebar divs, not toggle buttons */
div.sidebar.sidebar-collapsed {
    width: 0 !important;
}
```

- Separate the **state-signaling class** (bare, non-destructive) from the **style class** (scoped, with `!important`)
- A bare `.class-name` is safe only when: single element type, no `!important`, or purely state-signaling
- See `references/mobile-ui-patterns.md` for the full prevention checklist and debugging tips

**Global Escape Key** — Use `@keydown.escape.window.prevent` on the app root to catch Escape regardless of focus state. The `.window` modifier attaches the listener to `window`.

**E2E caveat:** `page.keyboard.press('Escape')` is unreliable for `.window` handlers in headless Chromium (especially mobile viewport + modal). Use backdrop click or unit test instead. See `references/testing-e2e.md`.

**Overlay Backdrops** — Use `display: none` (not `opacity: 0`) for overlay backdrops. `display: none` removes the element from the rendering and event flow entirely, preventing click interception when hidden. Trade-off: no CSS transitions.

**ARIA `aria-expanded`** — Bind `:aria-expanded` to the **mobile** state property in dual-state toggles, since that's what controls overlay visibility on mobile.

See `references/mobile-ui-patterns.md` for full patterns, anti-patterns, and file references.

**Bottom Sheets** — When duplicating sidebar content into a bottom sheet, prefix all IDs with `bs` to avoid DOM collisions. Use `dvh` units for height (not `vh`) to account for iOS Safari's dynamic address bar. Add a visual drag handle for dismiss discoverability. Auto-switch to the Images tab when new images are added. See `references/mobile-ui-patterns.md`.

**Fixed Element Z-Index Occlusion** — `position: fixed` elements with high z-index occlude flow content regardless of DOM order. Place mobile-only toolbar elements on the opposite side from fixed overlays. When Playwright reports "intercepts pointer events", the error message names the occluding element. See `references/mobile-ui-patterns.md`.

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

### Async UI State Cleanup

When an async operation shows a UI element (loading overlay, progress bar, spinner) at the start and hides it at the end, use **try/finally** to guarantee cleanup even if the operation throws:

```javascript
// CORRECT — endImageLoading() always runs
this.beginImageLoading(total);
try {
    await imageLibrary.addImages(files, onProgress);
} finally {
    this.endImageLoading();
}
```

- **`finally` always runs** — whether the `await` resolves, rejects, or the function returns early. It is the only JavaScript construct that guarantees cleanup across all exit paths.
- **Idempotent cleanup is safe** — if the normal path already called `endImageLoading()` via a progress callback, the `finally` call is harmless (no-op when already hidden).
- **Error path is the key benefit** — if `addImages()` throws (e.g., corrupt images), the progress callback never reaches completion. Without `finally`, the overlay stays visible forever.

**Concurrency guard** — pair with an early-return guard to prevent state corruption from rapid successive operations:

```javascript
beginImageLoading(total) {
    if (this.imageLoadingProgress.visible) return; // Already loading — skip
    this.imageLoadingProgress.visible = true;
    this.imageLoadingProgress.current = 0;
    this.imageLoadingProgress.total = total;
},
```

**Distinction from timeout cleanup** — The Web Workers "clear timeouts on every exit path" pattern handles **scheduled callbacks** (explicit `clearTimeout()` on each path). The try/finally pattern handles **paired state changes** (guaranteeing the "end" always follows the "begin" across async boundaries). See "Web Workers" section for the timeout pattern.

**When to use:** Any async operation that shows/hides a UI element, or any paired begin/end state changes around async work.

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
- **Mobile safe areas** — Use `calc(16px + env(safe-area-inset-bottom, 0px))` for bottom-positioned fixed elements to avoid iOS home indicator overlap. Requires `viewport-fit=cover` in the viewport meta tag or `env()` returns 0. See `references/css-layout.md` for the complete safe area pattern.
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
- **Mock VM Construction** — When testing a factory that returns many methods, spread the factory methods first, then override specific methods with spies. `Object.assign(vm, methods)` or `{ ...methods }` overwrites properties set before it:
  ```javascript
  function buildVm(undoManager) {
      const base = makeMockBase(undoManager);
      const methods = createCollageMethods(base);

      // Spread factory methods FIRST
      const vm = { ...methods };

      // Override specific methods with spies (MUST come after spread)
      vm.showToast = (msg, type, duration) => {
          vm._toastCalls.push({ message: msg, type, duration });
      };

      return vm;
  }
  ```
- **DOMParser on Vue templates** — directive attributes (`:aria-pressed`, `:class`, etc.) are parsed literally with the colon prefix. Use `getAttribute(':aria-pressed')` not `getAttribute('aria-pressed')`. See `references/testing-unit.md`
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
- **Timeout cleanup vs. try/finally** — This pattern handles *scheduled callbacks* (explicit `clearTimeout()` on each path). For *paired UI state changes* across async boundaries (e.g., show/hide loading overlay), use try/finally instead. See "Async UI State Cleanup" section.
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
    - [ ] Verify undo/redo closures capture values via local `const`, not mutable outer variables later reassigned to `null`
    - **Run world-review after tests pass but before marking a feature complete** — Tests verify *specified* behavior; world-review catches UX gaps that unit tests miss (e.g., blocking a key without feedback feels like a bug, placeholder text not announced by screen readers). It is the last quality gate before shipping.
7. **When refactoring to new patterns, update dependent code** — check all imports that may be affected by API changes; ensure backward compatibility where possible
8. Verify: run `node scripts/run-tests.js`, check dev server, confirm no regressions

---

Base directory for this skill: `.opencode/skills/building-web-apps/`
Relative paths in this skill are relative to this base directory.
