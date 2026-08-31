---
name: building-web-apps
description: >-
  Build static web apps with Vue 3 Options API, Canvas 2D, ES modules, and CDN
  libraries — no build step. Covers factory wiring and testability, state
  managers, undo/redo snapshots, canvas rendering, keyboard/pointer/gesture
  interaction, accessibility, mobile UI, Web Audio scheduling, Web Workers,
  and testing patterns (Mocha/Chai unit + Playwright E2E, including
  timing-sensitive audio-clock assertions). Use for CollageMaker or
  Metronomad features, rendering, state, and testing.
---

# Building Web Apps

## Project Pattern

**Single HTML entry point, ES modules, no build step.** All code loads via `<script type="module">` from CDN or local files. No bundler, no transpilation, no build step.

## Key References

Consult these files for verified patterns and gotchas:

- `references/factory-patterns.md` — Factory wiring & testability: callback injection, handler binding convention, DOM ID injection, internal vs. module extraction, provider functions vs. direct callbacks, closure reference safety for undo commands, service locator access safety, return object exposure, internal closure pattern
- `references/vue-options-api.md` — Vue 3 Options API factory decomposition, duplicate method keys silently shadowing new methods, provide() timing, @mousedown.prevent, $refs on native form inputs, array mutation patterns for reactivity, v-model timing for undo snapshots, async handlers with await-free deterministic paths, async UI state cleanup (try/finally + concurrency guard)
- `references/canvas-2d.md` — Canvas 2D rendering, DPR scaling, semi-transparent compositing, config-based rendering helpers, shared offscreen canvas for measurement, offscreen export, dual-canvas visibility guard
- `references/es-modules.md` — ES module conventions, barrel exports, pure function numeric guards (Number.isFinite)
- `references/rich-text-runs.md` — Run-based text formatting, merge/split algorithm
- `references/testing-unit.md` — Mocha/Chai unit tests, mocking patterns, in-browser runner completion signal (mocha 10: wrap `mocha.run()` in an init script and await the runner's `end` event — `mocha._runner` doesn't exist and the `stats.tests` equality is vacuously true), keystroke-sequence input-handler tests, Float32Array expectation round-tripping, transcribing plan-pinned numeric examples (unit recompute, bounds checks, cross-row consistency), asserting synchronous side effects of async APIs, driving pinned `setTimeout(0)` yields in unit tests (FIFO queue + manual flushes), integration testing, characterization tests before refactor
- `references/testing-e2e.md` — Playwright E2E, page load strategy, pointer/Touch/Drag event testing, real DataTransfer drop-zone tests, `fill()` is a draft setter — it does not commit Enter/blur fields, sub-second timing assertions (in-page transition logger for continuous signals; drain only after the terminal tick — the DOM leads; endpoints exact / intermediates range; gap-computation rule + in-page MutationObserver for one-shot transition ordering), synthetic PointerEvent driving of pointercancel/blur cleanup branches with a trusted-input canary, plan-pinned UI details vs. platform invariants (template scope, tab order, canvas lock, focus/draft survival across triggers — an unreleased pointer-scrub mouse.down() is the only dirty draft state a load trigger leaves live), negative, repeat-action, and trigger-state assertions (transition-pick for repeated actions, bounded in-page absence watchers that drain on the trigger, live-region residue naming, trigger handlers read pre-render state — establish it with a field mutation first), `page.evaluate` serialization gotchas, test runner DOM query gotchas, Escape key unreliability with Vue `.window` modifier
- `references/testing-strategy.md` — Testing approach, gotchas, deferred features, assertion density
- `references/interaction.md` — Keyboard shortcut patterns: three-layer architecture, modifier matching, focus suppression, preventDefault ordering, pointer handler coordination, global pointerup drag cleanup, VISIBLE_MIN drag boundary clamping, multi-touch and trackpad gestures (TouchEvent/PointerEvent dual path, pointerType guards, pointerType-based dynamic thresholds, wheel event pan/zoom, dual gesture direction conventions, setPointerCapture gotchas, releasePointerCapture hygiene, pointer capture early-exit cleanup, 3+ finger OS gesture guard, blur safety net, touch-action: pan-y vs none trade-off), multi-canvas pointer events (e.currentTarget)
- `references/midiestro-pattern.md` — Entry point pattern, shared infrastructure, directory structure
- `references/css-layout.md` — Flex column chain, `min-height: 0` requirement, responsive sidebar config, CSS computed value naming, mobile safe areas
- `references/memory-management.md` — Disposing HTMLImageElement references, URL.createObjectURL cleanup, lifecycle cleanup ordering, canvas GPU memory release, visual state cleanup, image disposal when replacing references
- `references/manager-patterns.md` — Action-based vs. direct mutation state managers, when to use each pattern, undo/redo integration, return value pattern for side-effect notification
- `references/undo-snapshots.md` — Undo/redo snapshot patterns: shallow copy reference preservation, onUndoCommand callback injection, crops deep copy with null guard, File object redo limitations, testing disposed-image toast
- `references/web-workers.md` — Web Worker lifecycle, timeout guard pattern, clearing timeouts on every exit path, mock Worker pattern for testing
- `references/audio-scheduling.md` — Web Audio: "A Tale of Two Clocks" scheduling (immediate precision start + lookahead loop with monotonic scheduled flags), terminal-event vs. poll-driven state transition race, generation/epoch guards (capture-after-bump rule), single terminal event convention, fake context/clock/RAF/timer test harness (shared ordered `calls` log), zero-crossing frequency + tail-silence assertions for synthesized audio
- `references/accessibility.md` — ARIA patterns for segmented controls (radiogroup), color picker accessibility, custom button keyboard activation (Enter + Space), aria-busy loading states, prefers-reduced-motion, ARIA live regions (toast notifications), interactive canvas role selection, touch target sizing (WCAG 2.5.8, 44x44px minimum, sizing property selection), ARIA tab pattern (id + aria-controls + aria-labelledby wiring), focus return on dialog close (WCAG 2.4.3)
- `references/mobile-ui-patterns.md` — Dual-state toggle pattern (desktop vs mobile sidebar), CSS `!important` cascade in media queries, Vue `.window` modifier for global Escape, `display: none` overlay backdrops, `aria-expanded` on mobile toggles, bottom sheet patterns (ID prefixing for content duplication, visual drag handle, auto-switch tab on content change), fixed element z-index occlusion (prevention checklist), Playwright "visible but unclickable" diagnosis
- `references/toast.md` — Toast notification implementation (reactive state, showToast method, template, timer cleanup, coalescing, ARIA live region roles)

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
- **Duplicate method keys silently shadow** — object-literal factories resolve duplicate keys by last occurrence, so a leftover stub below a new implementation silently wins (tests fail as if the handler is still a stub). After adding/replacing a method, grep the name — expect exactly 1 hit — and replace stubs in place, never insert above them. See `references/vue-options-api.md`

### Factory Testability Patterns

Full patterns with code: see `references/factory-patterns.md`. Guardrails:

- **Callback injection is the primary DIP improvement** — internal functions are pure closures over `base` (services) accepting an explicit `vm` parameter, no `this` dependency. **Never use `() => this.x()` as a factory-time callback** — at factory creation, `this` is not the Vue instance.
- **Handler binding convention** — all handlers from extracted modules are bound via `.call(this, ...)` in `createCollageMethods.js` so they see `this.titleText`, `this.showToast`, etc. Follow this for all new handlers.
- **DOM ID injection** — accept DOM element IDs as factory config (with defaults) instead of hardcoding `document.getElementById()`, so tests can verify the correct ID is used.
- **Internal vs. module extraction** — extraction is a secondary SRP improvement. Extract only when functions have clear boundaries AND the file exceeds ~400 lines; otherwise keep them internal to avoid import complexity. After any extraction/move, update the barrel's `from` clause for the moved names (see `references/es-modules.md`).
- **Callback wiring between extracted modules** — accept callback objects as factory parameters instead of importing sibling modules; preserves one-way dependency flow and prevents circular imports.
- **Provider functions vs. direct callbacks** — use direct callbacks when the referenced objects are stable for the factory's lifetime; use provider functions (return the callback at call time) when the object may be replaced after factory creation (e.g., undo/redo paths).
- **Closure reference safety** — closures capture variables by reference. When an undo/redo closure references a mutable outer variable that is later nulled, copy the values into a local `const` first (`const preState = { ...snapshot };` before building the closure).
- **Service locator access safety** — (1) always use `base?.getService?.() || null` for optional services, consistently across modules; (2) look up services *inside* callbacks, not at factory time — a service captured early may be stale or undefined when the callback runs.
- **Return object exposure** — internal functions worth testing (error handling, validation) that rely on factory-scoped closures: expose as a method on the factory return object instead of a module-level export.
- **Internal closure pattern** — when factory methods call other methods on `this`, partial mock-VM tests break; use factory-scoped closures for internal lifecycle methods with public methods delegating to them.
- **Return value for side-effect notification** — managers return result metadata (e.g., `{ truncated: true }`); handlers decide on user feedback. See `references/manager-patterns.md`.
- **Undo snapshot patterns** — snapshot before disposal; shallow copy preserves DOM element references; use `onUndoCommand(vm, cmd)` callback injection. See `references/undo-snapshots.md`.

### Guard Against Null Inputs
Browser API utilities that accept user input MUST guard against null/undefined. Return `Promise.resolve(null)` for null input rather than throwing:
```javascript
export function loadImageFromFile(file) {
    if (!file) return Promise.resolve(null);
    // ... rest of implementation
}
```

### Pure Function Numeric Guards
Pure math functions accepting numeric parameters from runtime sources (touch coordinates, computed ratios, user input) MUST use `Number.isFinite()` as the first guard — not comparison operators. `NaN <= 0` is `false` and `Infinity` is a valid positive number, so comparison guards silently pass invalid values through. NaN in Canvas 2D silently corrupts the transform matrix; NaN in state propagates through clamping (`Math.max(NaN, 1) === NaN`). Always test NaN/Infinity/undefined inputs. See `references/es-modules.md` for the full pattern, applicability limits, and test examples.

### Vue 3 Options API
- Factory decomposition: `createCollageApp()` assembles data/methods/lifecycle/services
- Reactive state in Vue `data()` return value
- State managers receive Vue instance reference
- **Range inputs with null default** — `v-model.number` on `<input type="range">` coerces `null` to the `min` attribute. Use `:value` with a fallback and `@input` handler instead. See `references/vue-options-api.md`
- **Numeric text inputs: draft + commit, never a per-keystroke clamp** — clamping on every `@input` event rewrites text the user is mid-typing (typing `120` into a 30–250 BPM field: `1` clamps to `30`, subsequent keystrokes append to the clamped text → `302`…). Hold the raw string in a draft property (`v-model`), clamp/validate only on commit (`@keyup.enter` / `@blur`), and surface an out-of-range condition (e.g. a `bpmClamped` flag) instead of mutating the draft. See `references/testing-unit.md` (per-keystroke tests) and `references/testing-e2e.md` (`fill()` + Enter).
- **`@keydown.enter` for textarea newline prevention** — Use `@keydown.enter` (not `@input`) to intercept Enter before `v-model` processes it — `@input` fires after the model update, too late to prevent. **Always pair Enter prevention with user feedback** (brief toast) so the suppressed key doesn't feel like a bug. See `references/accessibility.md`
- **Keep async handlers' deterministic path await-free** — an `async` handler runs synchronously up to the first `await` it actually reaches. Push `await` as deep into the branch that needs it as possible so the common path stays sync: fast, no microtask delay, and mock-VM tests can assert synchronously. See `references/vue-options-api.md`
- **v-model timing for undo snapshots** — `v-model` updates reactive data **before** `@change`/`@input` fires, so the handler sees the NEW value. Snapshot pre-state on pre-change events: `@focus` (keyboard) + `@pointerdown` (mouse/touch — NOT `@mousedown`, which doesn't fire on touch form elements) for range inputs; `@focus` for select/color/textarea; commit batched undo on `@blur`. Segmented control buttons and checkboxes have no blur event — use inline snapshot/commit in `@click`/`@change`, or extract atomic handler methods (setters guard against no-op; toggles always push undo; removals early-return). Commit pending snapshots in `beforeUnmount`. See `references/undo-snapshots.md` and `references/vue-options-api.md` for full patterns and test conventions

### Canvas 2D
- Lifecycle pattern: `init()` → `resize()` → `scheduleRender()` → `dispose()`
- DPR scaling for sharp rendering on Retina displays
- `requestAnimationFrame` for debounced renders
- In `dispose()`, set `canvas.width = 0; canvas.height = 0` to force GPU memory release
- **Backing-store assignment clears the bitmap even at the same size** — size-guard the `resize()` reassignment (mobile fires same-size `resize` constantly: omnibar, picker, IME) and invalidate render-skip caches on every real clear. See `references/canvas-2d.md`
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

When multiple pointer event handlers attach to the same canvas, use **gesture-active flag coordination** (`state._multiTouchGestureActive`): handlers always stay attached and do an O(1) flag check instead of attach/detach cycles on layout change. A 10 CSS pixel drag threshold distinguishes click from drag.

- **Guard BOTH `_onPointerDown` AND `_onPointerMove`** against the gesture-active flag. The down guard prevents *new* interactions during a gesture; the move guard prevents *pending* interactions (pointerdown fired, threshold not yet crossed) from activating — including hover feedback, which causes flicker and spurious renders during gestures. No guard needed on `_onPointerUp` — cleanup is idempotent.
- **Global pointerup for drag cleanup** — always add a `window` `pointerup` listener alongside the element-level one; if the pointer releases off-screen, element-level `pointerup` never fires and drag state gets stuck.
- See `references/interaction.md` for the full pattern, race walkthrough, and checklist for new handlers

### Multi-Touch and Trackpad Gestures

Pan and zoom must support **three input paths**: TouchEvent (mobile touchscreen), PointerEvent two-pointer (Windows precision touchpad, some Linux), and **WheelEvent (macOS trackpad — universal)**.

- **Critical: macOS trackpad gestures are wheel events, NOT pointer events.** A two-pointer PointerEvent approach never activates on macOS. Handle `deltaX`/`deltaY` for pan and `deltaZ` for zoom; also `ctrlKey + deltaY` as a Windows-mouse zoom fallback. Attach with `{ passive: false }`.
- **Dual gesture direction conventions** — TouchEvent/PointerEvent use direct manipulation (**negate** the delta so content follows the finger); WheelEvent uses the scrolling convention (**no negation**). The wheel path computes its delta inline and never calls `processGesture()`.
- **PointerType guard** — on hybrid devices, guard PointerEvent handlers with `if (e.pointerType === 'touch') return;` to avoid double-firing with the TouchEvent path.
- **Exactly 2 fingers** — TouchEvent: `e.touches.length !== 2` (mobile OSes reserve 3+ finger gestures). PointerEvent needs an explicit guard: `preventDefault()` on the 3rd+ pointer, or the OS may intercept mid-interaction.
- **preventDefault discipline** — TouchEvent/PointerEvent: only `preventDefault()` when the gesture actually activates. WheelEvent: two-level guard (panel selected? AND actual pan/zoom deltas?) — otherwise single-finger mouse scroll or browser zoom gets blocked.
- **touch-action** — default `touch-action: pan-y` (one-finger scrolls page, two-finger goes to JS; requires `preventDefault()` on two-finger `touchmove`). Use `none` only when the canvas fills the viewport and custom pan/zoom is a core interaction — document the trade-off in a CSS comment.
- **Window blur safety net** — `window.blur` + `document.visibilitychange` cancel stuck gesture state on tab switch.
- **Unified gesture functions** — `startGesture()`/`processGesture()`/`endGesture()` shared by TouchEvent and PointerEvent paths.
- **Unit tests** — prefer `new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 1, ... })` over TouchEvent mocks (native constructor, no `Object.defineProperty` TouchList). Two `pointerdown` events replace one `touchstart`.
- See `references/interaction.md` for the full dual-input path patterns, pointer capture lifecycle, dynamic thresholds, and direction testing.

### Responsive Mobile UI

Full patterns, anti-patterns, and file references: `references/mobile-ui-patterns.md`. Guardrails:

- **Dual-state toggle** — desktop vs mobile visibility use **two independent reactive state properties** toggled by one method; CSS media queries decide which state has visual effect. **Never check `window.innerWidth` in JS** to pick the state — it duplicates the breakpoint and breaks on resize.
- **CSS `!important` cascade** — mobile media query overrides must use equally specific selectors with `!important` to beat desktop `!important`; only override conflicting properties.
- **Scoped selectors for shared classes** — scope `!important` classes by element type (e.g., `div.sidebar.sidebar-collapsed`) when the class is shared via `:class`; separate the state-signaling class from the style class.
- **Global Escape** — `@keydown.escape.window.prevent` on the app root. E2E caveat: `page.keyboard.press('Escape')` is unreliable for `.window` handlers in headless Chromium — use backdrop click or unit test.
- **Overlay backdrops** — `display: none` (not `opacity: 0`) so hidden backdrops don't intercept clicks.
- **`aria-expanded`** — bind to the *mobile* state property in dual-state toggles.
- **Bottom sheets** — prefix duplicated sidebar IDs with `bs`; use `dvh` (not `vh`) for iOS dynamic address bar; visual drag handle; auto-switch to Images tab on new images.
- **Fixed element z-index occlusion** — `position: fixed` occludes flow content regardless of DOM order; place mobile toolbars on the opposite side from fixed overlays. Playwright "intercepts pointer events" names the occluding element.

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

Async operations that show/hide a UI element (loading overlay, progress, spinner) MUST wrap the await in **try/finally** so the "end" always follows the "begin" (the error path is the key benefit — without it, a thrown operation leaves the overlay visible forever). Pair with an early-return **concurrency guard** (`if (this.imageLoadingProgress.visible) return;`) to prevent rapid successive operations from corrupting state. Idempotent cleanup is safe. Distinction: this pattern handles *paired state changes* across async boundaries; the Web Workers pattern handles *scheduled callbacks* (explicit `clearTimeout()` on each path). See `references/vue-options-api.md` for the full pattern.

### Toast Notifications

Minimal toast system: reactive state (`toast: { message, type, visible, timer }`) + `showToast(message, type, duration)` + a `v-show` template element with `role="status" aria-live="polite"`. No dedicated component. Key gotchas: clear the timer in `beforeUnmount()`, rapid calls coalesce (only the last message shows), `v-show` can't be CSS-transitioned, bottom position needs `calc(16px + env(safe-area-inset-bottom, 0px))`, never combine `role="alert"` with `aria-live="polite"`. See `references/toast.md` for the full implementation and `references/accessibility.md` for live region rules.

### Testing
- Mocha + Chai via CDN for unit tests (browser-based)
- Playwright for E2E tests
- Test HTML files in `MyComponents/`
- **Prefer real browser objects over mocks** when objects are easy to construct (e.g., `File`, `Image`) — tests actual behavior with no mock maintenance. Use base64 PNG helper for test image files. Mock only for uncontrolled side effects (network, quota) or hard-to-trigger error paths (`FileReader.onerror`). See `references/testing-unit.md`
- **Characterization tests before refactor** — Before refactoring shared code, add tests that capture current observable behavior. This ensures the refactor doesn't change behavior, especially for subtle differences between callers (e.g., one method sets `shadowColor`, another doesn't). See `references/testing-unit.md`
- Mock browser APIs by intercepting `document.createElement` and `localStorage` (bind original, always restore)
- Mock `requestAnimationFrame`/`cancelAnimationFrame` with a callback collector + `flushRAF()` for deterministic debounce testing — see `references/testing-unit.md`
- **In-browser Mocha runner: await the Runner's `end` event** — in the mocha 10 browser build, `mocha._runner` doesn't exist and `runner.stats.tests === passes + failures + pending` is vacuously true (tests increments in lockstep with the outcome buckets on every `test end`), so neither is a usable completion gate. Capture the runner *returned by* `mocha.run()` (wrap it in an init script) and await its `end` event; keep the timeout fall-through but make it diagnostic (named errors), and exit non-zero on any per-file failure. See `references/testing-unit.md`
- **Per-keystroke tests for input handlers** — for a handler that parses/clamps/commits a text input, replay the keystroke sequence (every intermediate draft) and assert the invariant at *every* step; one-shot endpoint tests pin complete values and are blind to the transitions where per-keystroke clamp corruption lives. Same shape for any handler whose correctness depends on intermediate states (parsers, accumulators, undo stacks). See `references/testing-unit.md`
- **`fill()` is a draft setter, not a commit** — for fields that commit on Enter/blur, an E2E that sets the field via `fill()` must follow with `page.keyboard.press('Enter')`, or the model silently keeps the stale value and the failure surfaces later at a confusing assertion. When changing a field's input contract, grep E2E specs for `fill('<that-id>')` and add/remove the commit at each site. See `references/testing-e2e.md`
- **Trigger handlers read pre-render state** — a trigger's handler runs synchronously inside the event, *before* Vue re-renders, so it branches on the state live at trigger time. To exercise a state-dependent branch (e.g., a re-drop commits only when `state === 'ready'`), establish that state first with a field mutation (fill + Enter), *then* trigger — a bare re-trigger silently takes the other branch and the row passes against the wrong code path. See `references/testing-e2e.md`
- **Float32Array expectations must round-trip** — `new Float32Array([-0.8])[0] !== -0.8` (float64-widened float32 rounding), and Chai compares numbers strictly, so `expect(x).to.equal(-0.8)` fails for any non-dyadic value even when the module is correct. Build expectations through the same conversion (`Float32Array.from(values)`); `deep.equal` between two Float32Arrays is then exact and no tolerance is needed. Reserve `closeTo` for genuine float variation; a ~1e-7 diff on an otherwise-exact value means suspect the expectation's number type before the implementation. See `references/testing-unit.md`
- **Transcribing plan-pinned numbers: recompute, don't trust** — when a test's numbers come from a plan document, recompute the quantity's units (a formula can be correct arithmetic for the wrong quantity), bounds-check Given values against their containers, and cross-check scenario rows with identical Givens for agreeing Thens. These errors are invisible to per-row arithmetic and surface only when the input is materialized. Never "fix" the test to match a wrong plan number — fix the plan. See `references/testing-unit.md`
- **Plan-pinned UI details can violate platform invariants** — anchor spot-verification checks `file:line` locations, not semantics; impossible pins surface at test-construction time. Run each pinned UI detail through its surface's checklist: can a Vue template expression see every identifier it names (imported utils are NOT visible — wire them at the config merge point, not inside a pure factory)? Does the pinned tab-order sequence match DOM order (tab order *is* DOM order)? Can a canvas be `:disabled` (no — `aria-disabled` + `pointer-events` + `tabindex`)? When a pin is impossible, implement the closest form of the pinned intent and re-pin in place with a comment citing the invariant — never silently ship a deviation. See `references/testing-e2e.md`
- **Cleanup paths are E2E-drivable via synthetic pointer events** — when production wraps `setPointerCapture` in a non-fatal try/catch, dispatch a synthetic `pointerdown` (any `pointerId`; the capture throw is absorbed), then `pointercancel` or window `blur` to exercise the discard branch, then assert a follow-up *trusted* `page.mouse.click` still works — the canary proving no drag state was stranded. If production does NOT wrap capture, the missing try/catch is itself a finding (Safari stale pointerIds). See `references/testing-e2e.md`
- **Assert synchronous side effects of async APIs** — an async function runs synchronously up to its first `await`, so call it, assert the side-effect log *before* awaiting (proves the callback fired with zero I/O in flight, no fake timers), then `await` for the terminal state. Verify the test fails if the callback is moved after the first `await`. See `references/testing-unit.md`
- Use Proxy-based wrapper for Canvas 2D context mocking instead of `Object.defineProperty` — see `references/testing-unit.md`
- For render order verification, wrap `ctx.stroke()`/`ctx.strokeRect()` to capture canvas state at call time (context method wrapping) — see `references/testing-unit.md`
- For hit testing on computed/auto-fit elements, import the production computation function (e.g., `computeBounds`) to derive coordinates — see `references/testing-unit.md` self-calibrating hit test coordinates
- `DragEvent.dataTransfer` rejects plain-object mocks — unit tests verify listener presence via `preventDefault()` tracking; E2E drop-zone tests use a **genuine `new DataTransfer()`** in the constructor dict (Chromium). See `references/testing-e2e.md`
- **Sub-second timing assertions must be measured in-page** — node-side polls are starved under load (variable 0.3–0.9 s error). Install a 5 ms in-page transition logger and anchor `t0` in the same `evaluate` as the trigger action; assert on the read-back log. Drain only after the logger recorded the *terminal* tick — the DOM leads by up to one tick, so an early drain's last sample is the previous value and looks like an app bug. For continuous signals, assert endpoints exactly and intermediates as a monotonic range (5 ms sampling is lossy under load; discrete CDP actions are not a sampling guarantee). Reserve node-side expects for existence checks. See `references/testing-e2e.md`
- **`page.evaluate` bodies are standalone programs** — spec-scope helpers are undefined in-page, and the `ReferenceError` is *silent* inside `setInterval` callbacks (empty-data assertion instead of the real error). Define every helper locally; pass data via `page.evaluate(fn, arg)`. See `references/testing-e2e.md`
- Mock `window.Worker` with `Object.defineProperty` + setter for `onmessage` to capture the handler, then fire synthetic messages. Override timeout config (e.g., `INFERENCE_TIMEOUT_MS = 50`) to test timeout paths without waiting. See `references/web-workers.md`
- Document-level listeners leak across tests — use describe-level `afterEach` cleanup, never `beforeEach` + per-test setup
- **Mock VM Construction** — when testing a factory that returns many methods, spread the factory methods first (`const vm = { ...methods }`), THEN override specific methods with spies — `Object.assign`/spread overwrites properties set before it. See `references/testing-unit.md`
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

### Web Audio Scheduling
- **"A Tale of Two Clocks"** — sources with a known start time are `start(when, offset)`-ed *immediately* at the call site (sample-accurate). A ~25 ms `setInterval` tick schedules only the rest, within a ~100 ms horizon, using a monotonic `scheduled` flag per event (no duplicates, no gaps). Precompute the full schedule as pure data; the tick only performs it.
- **Phase/position are pure functions of the audio clock** (`now` + a precomputed beat grid), never accumulated per frame — accumulation drifts and breaks after suspend/resume.
- **Terminal handlers must accept every in-sequence state** — when visible state flips on a poll tick but termination is event-driven (`onended`), the end event can arrive *before* the flip tick (offset leaves < one tick of audio). The handler must accept every state reachable after the sequence started; generation guards handle cross-sequence rejection, not state guards.
- **Generation guards: capture the epoch *after* any operation that may bump it**, or drop the guard — and be deliberate about which mechanism (epoch vs. resource cleanup) actually provides the one-shot guarantee.
- **Terminal events are single** — emit `'ended'`, not `'stopped'` + `'ended'`; pin the exact event sequence in tests.
- **Engine tests use ZERO real AudioContext** — fake context (recording stubs + shared ordered `calls` log for start/stop ordering assertions), fake clock (`currentTime` advanced by hand), fake RAF collector, fake timers with per-period ticking. Only the buffer-*render* block opens one real context in `before`/`after`.
- **Synthesized audio assertions** — zero-crossing count for dominant frequency with ±10–15% tolerance bands (pure tones only), plus a tail-silence check (`max(abs(last N samples)) < 0.001`) for missing decays. Assert the frequency constant AND the rendered buffer — the constant pins intent, the render pins reality.
- See `references/audio-scheduling.md` for full patterns, harness code, and applicability limits.

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
    - **When the review target is a phase of a pinned plan, the pinned-behavior invariants travel in the review task text** — a fresh reviewer (often on a different model) cannot see the plan's decision table. For every intentional contract asymmetry, ε-band, or deliberate redundancy in the diff, name the pin (decision ID), the upstream invariant that makes the flagged input unreachable (e.g., a UI clamp that bounds what the engine receives), and which sibling method intentionally differs and why — otherwise the reviewer flags the plan's own pins as defects and a false-positive warning on pinned code can seduce a "fix" that breaks the regression gate the pin exists for. See the world-review prompt (`.pi/prompts/world-review.md`).
    - **Run world-review after tests pass but before marking a feature complete** — Tests verify *specified* behavior; world-review catches UX gaps that unit tests miss (e.g., blocking a key without feedback feels like a bug, placeholder text not announced by screen readers). It is the last quality gate before shipping.
7. **When refactoring to new patterns, update dependent code** — check all imports that may be affected by API changes; when a function moves modules, update the barrel's `from` clause too and verify the barrel explicitly ("consumers work" doesn't prove the barrel is correct) — see `references/es-modules.md` (Moving a Function to a New Module); ensure backward compatibility where possible
8. Verify: run `node scripts/run-tests.js`, check dev server, confirm no regressions
