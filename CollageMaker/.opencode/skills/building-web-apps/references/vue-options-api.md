# Vue 3 Options API Patterns

## Contents

- [Factory decomposition](#factory-decomposition)
- [Duplicate method keys silently shadow new methods](#duplicate-method-keys-silently-shadow-new-methods)
- [Reactive state](#reactive-state)
- [Array mutation for Vue reactivity](#array-mutation-for-vue-reactivity)
- [provide() timing](#provide-timing)
- [@mousedown.prevent for text selection preservation](#mousedownprevent-for-text-selection-preservation)
- [$refs on native form inputs](#refs-on-native-form-inputs)
- [v-model timing for undo snapshots](#v-model-timing-for-undo-snapshots)
- [Range input with null default](#range-input-with-null-default)
- [$nextTick race condition guard](#nexttick-race-condition-guard)
- [Async handlers: keep the deterministic path await-free](#async-handlers-keep-the-deterministic-path-await-free)
- [Async UI state cleanup (try/finally + concurrency guard)](#async-ui-state-cleanup-tryfinally--concurrency-guard)
- [Files](#files)

## Factory Decomposition

The Vue app is assembled from separate factory functions. The assembly function must explicitly merge methods (never use `...spread` for lifecycle configs that may contain a `methods:` key):

```javascript
// createCollageApp.js — CORRECT pattern
export function createCollageApp({
    createApp,
    dataConfig,       // from createCollageData.js
    methodsConfig,    // from createCollageMethods.js
    lifecycleConfig,  // from createCollageLifecycle.js
    servicesConfig    // from createCollageServices.js
}) {
    const allMethods = {
        ...methodsConfig,
        ...(lifecycleConfig.methods || {})
    };

    return createApp({
        data: dataConfig,
        computed: { ... },
        methods: allMethods,
        mounted: lifecycleConfig.mounted,
        beforeUnmount: lifecycleConfig.beforeUnmount,
        ...servicesConfig
    });
}
```

**Why this matters**: If `lifecycleConfig` contains a `methods:` key (e.g., helper functions that need lifecycle context), spreading `...lifecycleConfig` after `methods: methodsConfig` silently overwrites all template-referenced methods. Only the lifecycle helpers survive, causing `TypeError: X is not a function` at render time.

### Gotchas

1. **`data` must be a function** — Vue requires `data` to be a factory function, not an object
2. **`this` context** — Methods and lifecycle hooks receive `this` as the Vue instance
3. **Methods must be inside `methods:` block** — Functions at root level of Options API config are NOT bound to `this`. Only functions inside `methods: { }` and lifecycle hooks get bound. Root-level helper functions will cause `TypeError: X is not a function` when called via `this.X()`
4. **Object spread order overwrites silently** — When merging configs, later properties overwrite earlier ones. Never use `...lifecycleConfig` after setting `methods:` if lifecycle may contain a `methods:` key
5. **State managers** — Receive Vue instance reference and mutate reactive properties directly

## Duplicate Method Keys Silently Shadow New Methods

A `*Methods` factory returns a **plain object literal**. JS object literals resolve duplicate keys by **last occurrence wins** — no error, no warning. A leftover stub below a new implementation silently overrides it, so the app and the tests both run the *old* (empty) method.

**Real incident:** a Phase 5 `createMetronomadMethods()` implemented the real `onRestart` in the middle of the factory while a Phase 1 stub `onRestart()` still sat at the bottom. All 4 tests failed with `expected [] to deeply equal [ ['restart', …] ]` — the handler looked implemented, yet the engine never saw a call.

This is the mirror image of the barrel trap documented in `references/es-modules.md` (re-exporting a missing name yields silent `undefined`). Same family — silent failure in the factory plumbing — but the opposite symptom:

| Trap | Symptom |
|------|---------|
| Barrel re-export of a missing name | `undefined` import, call throws |
| Duplicate method key in a factory | **Old behavior persists**, tests fail as if nothing was implemented |

### The Rule

After adding or replacing a method in a `*Methods` factory (or any object-literal factory), verify the name appears exactly once in the file:

```bash
grep -c "onRestart" MyESModules/App/createMetronomadMethods.js   # expect 1 (the definition)
```

Or when editing: replace the stub **in place** (include it in the same edit), never insert the real method above an existing stub of the same name.

**Failing signature to remember:** *tests fail as if the handler is still a stub, even though you can see the implementation in the file.*

## Reactive State

All reactive state lives in the Vue instance's `data()` return value. State managers (`LayoutManager`, `CropManager`, etc.) mutate these properties directly. No Pinia, no Vuex.

## Array Mutation for Vue Reactivity

Preserve array references to maintain predictable reactivity and avoid stale external observers:

```javascript
// WRONG — creates a new array reference
state.titleRuns = [];

// CORRECT — maintains the same array reference
state.titleRuns.length = 0;
// OR
state.titleRuns.splice(0);
```

**Why it matters:** While Vue 3 detects reassignments, they create a new array reference. External code holding a reference to the original array will become stale, and reactivity tracking may behave inconsistently for observers outside Vue's track/trigger system.

**When to use mutations over reassignment:**
- Clearing arrays in state managers
- Replacing all items in a reactive array
- Any operation where external code might hold references to the array

See `references/memory-management.md` for additional array mutation patterns.

## provide() Timing

`provide()` is called during Vue component initialization, **before** `mounted()`. Services initialized in `mounted()` (like managers that need the reactive Vue instance) will be `null` when accessed via `provide()`.

```javascript
// WRONG — managers are null at provide() time
provide() {
    return {
        backgroundManager: base.getBackgroundManager(), // null!
        titleManager: base.getTitleManager()             // null!
    };
}
```

**Fix:** Only provide services available at init time. Services initialized in `mounted()` should be accessed via `this.managerName` on the Vue instance, not via `inject()`.

**Alternative:** Provide getter functions for lazy access:

```javascript
provide() {
    return {
        getBackgroundManager: () => base.getBackgroundManager(),
    };
}
// Child calls inject('getBackgroundManager')() after mounted
```

## @mousedown.prevent for Text Selection Preservation

When toolbar buttons (bold, italic, etc.) operate on a text input's selection, clicking a button steals focus and clears the selection. Use `@mousedown.prevent` to keep focus on the input:

```html
<!-- Button click steals focus, clearing selection -->
<button @click="toggleBold">B</button>

<!-- @mousedown.prevent keeps focus on the input -->
<button @mousedown.prevent @click="toggleBold">B</button>
```

This pattern applies to any toolbar button that operates on a text input's current selection range.

## $refs on Native Form Inputs

Vue refs on certain native form inputs (notably `<input type="color">`) may not reliably expose `.click()` for programmatic activation. The ref can resolve to `undefined` or a Vue wrapper lacking the method, and some browsers restrict programmatic clicks on color pickers for security reasons.

**Solution:** Don't add duplicate interactive targets for `<input type="color">`. Use descriptive text labels instead. See `references/accessibility.md` — Color Picker Accessibility.

## v-model Timing for Undo Snapshots

**Critical gotcha:** `v-model` updates reactive data **before** `@change` (select) or `@input` (range/text) fires. By the time your handler runs, the data is already the NEW value.

### Pattern: Pre-Change Snapshot

Capture the pre-state on an event that fires BEFORE v-model updates:

**For `<select>`: Use `@focus`**
```html
<select v-model="layoutStyle" @focus="snapshotLayoutStyle" @change="onLayoutStyleChange">
```
```javascript
snapshotLayoutStyle() {
    layoutStyleSnapshot = this.layoutStyle;  // Old value, captured before dropdown opens
}
onLayoutStyleChange() {
    if (layoutStyleSnapshot !== null && this.layoutStyle !== layoutStyleSnapshot) {
        // Push undo command with layoutStyleSnapshot as pre-state
        layoutStyleSnapshot = null;
    }
}
```

**For `<input type="range">`: Use `@focus` + `@pointerdown`**
```html
<input type="range" v-model.number="gutter"
       @focus="snapshotLayoutOptions"
       @pointerdown="snapshotLayoutOptions"
       @input="onGutterChange"
       @blur="commitLayoutOptions">
```

- `@focus` — captures snapshot when user tabs to the slider (keyboard navigation)
- `@pointerdown` — captures snapshot when user clicks/touches the slider (mouse/touch)
- **Why `@pointerdown` and NOT `@mousedown`?** `@mousedown` does NOT fire on touch devices (iOS/Android) for form elements. The browser fires `touchstart` instead. `@pointerdown` is the modern, cross-platform standard that unifies mouse, touch, and pen input.

**Batching pattern for sliders:** Range inputs fire `@input` continuously during drag. To batch multiple slider changes into a single undo command:
1. Snapshot on interaction start: `@focus` or `@pointerdown`
2. Update on every input: `@input` updates layout and renders
3. Commit on interaction end: `@blur` pushes the batched undo command

**Testing:** Simulate the Vue event order:
```javascript
handlers.snapshotLayoutStyle.call(vm);
vm.layoutStyle = 'hex';  // v-model updates
handlers.onLayoutStyleChange.call(vm);  // @change fires
```

## Range Input with Null Default

`v-model.number` on `<input type="range">` coerces `null` to the `min` attribute value, which is unexpected when `null` represents "auto/unset":

```html
<!-- WRONG: null coerces to min (100), slider shows 100 when value is "Auto" -->
<input type="range" v-model.number="titleStyle.titleBoxWidth" min="100" max="1920">

<!-- CORRECT: :value with fallback, @input with explicit handler -->
<input type="range"
    :value="titleStyle.titleBoxWidth || 1920"
    min="100" max="1920"
    @input="onTitleWidthChange($event.target.value)">
```

**Why this matters:** The range input DOM element requires a numeric value within `[min, max]`. When Vue binds `null` via `v-model.number`, it coerces to the minimum, making the UI show an incorrect value. Using `:value` with a fallback gives full control over the displayed value, and `@input` with `$event.target.value` passes the raw slider value to the handler.

## $nextTick Race Condition Guard

When using `$nextTick` to defer DOM-dependent work (focus management, element queries, measurements), rapid user interactions can cause stale callbacks to fire after state has changed.

### The Problem

```javascript
// User rapidly opens and closes bottom sheet
toggleBottomSheet() {
    this.bottomSheetOpen = true;
    this.$nextTick(() => {
        // This fires AFTER user already closed the sheet
        this.trapFocusInBottomSheet(); // Sets up trap on hidden sheet!
    });
}
// User immediately closes
toggleBottomSheet() {
    this.bottomSheetOpen = false;
    this.releaseFocusTrap(); // Releases trap
    // But the $nextTick callback from the open is still queued...
}
```

### The Fix

Guard the `$nextTick` callback with a state check:

```javascript
this.$nextTick(() => {
    if (!this.bottomSheetOpen) return; // Guard against rapid close
    this.trapFocusInBottomSheet();
    const firstTab = document.getElementById('bs-tab-images');
    if (firstTab) firstTab.focus();
});
```

### When to Apply

Any `$nextTick` callback that performs DOM-dependent side effects (focus management, element queries, measurements) should include a guard that checks the triggering state is still current.

## Async Handlers: Keep the Deterministic Path Await-Free

An `async` function runs its body **synchronously up to the first `await` it actually reaches**. So if the common path never reaches an `await`, the handler behaves exactly like a sync function — and mock-VM tests can assert on it synchronously:

```javascript
async onPlayToggle() {
    if (this.isParamLocked) {          // stop path — no await, returns sync
        this._engine.stop();
        return;
    }
    if (!this.isReady) return;         // no await
    const ctx = this._clock;
    if (ctx && ctx.state !== 'running') {
        const resumed = await this._resumeWithTimeout(ctx);  // the ONLY await
        if (!resumed) { this.errorMessage = '…'; return; }
    }
    this._engine.startSequence(this._sequenceParams());      // reached sync when ctx is running
}
```

The deterministic tests call `vm.onPlayToggle()` with **no `await`** and assert `engine.calls` immediately — valid because with `_clock` undefined or `state === 'running'`, no `await` is reached.

### Why It Matters

- **Testability:** the deterministic scenarios (the bulk of the contract) stay synchronous — fast, and free of async-suite timing hazards (see the async-suite completion-wait pattern in `references/testing-unit.md`). Only the genuinely async branch (never-settling resume → real timer) is tested with `await`.
- **Behavior:** Vue click handlers don't care about the returned promise; keeping the fast path sync means no microtask delay between the click and the engine call — relevant for the "Stop within 50 ms" class of guarantees.

### The Anti-Pattern

Placing an `await` *before* the guard checks (e.g., `const ctx = await maybeResume()` unconditionally) makes the whole handler async-in-practice: every mock-VM test must `await`, and the stop path gets an unnecessary microtask hop. Structure the `await` inside the branch that needs it.

### Generalization

Applies to any async handler/factory method whose async-ness is branch-local: push the `await` as deep into the branch as possible and keep the happy path await-free, so the synchronous contract surface stays synchronously testable.

## Async UI State Cleanup (try/finally + Concurrency Guard)

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

**Distinction from timeout cleanup** — The Web Workers "clear timeouts on every exit path" pattern handles **scheduled callbacks** (explicit `clearTimeout()` on each path). The try/finally pattern here handles **paired state changes** (guaranteeing the "end" always follows the "begin" across async boundaries). See `references/web-workers.md` for the timeout pattern.

**When to use:** Any async operation that shows/hides a UI element, or any paired begin/end state changes around async work.

## Files

| File | Responsibility |
|------|---------------|
| `CollageBase.js` | Base services (assembler, dropHandler, componentRegistry) |
| `createCollageData.js` | Reactive data factory (returns function for Vue `data`) |
| `createCollageMethods.js` | Instance methods (all `this`-aware operations) |
| `createCollageLifecycle.js` | `mounted()` and `beforeUnmount()` hooks, plus any helper methods in `methods:` block |
| `createCollageServices.js` | `provide()` / `inject()` for dependency injection |
| `createCollageApp.js` | Assembles everything into Vue app config (explicit merge) |
