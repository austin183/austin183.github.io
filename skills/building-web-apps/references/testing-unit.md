# Unit Testing Patterns

## Contents
- Unit Tests — Mocha + Chai
- In-Browser Runner: Reliable Completion Signal (Mocha 10)
- Real Objects Over Mocks
- Mocking Browser APIs
- RAF Mocking
- Canvas Dimension Interception
- Canvas 2D Context Mocking
- Canvas Render Order Testing via Context Method Wrapping
- Test State, Not Just Actions
- Tolerance Precision in Positioning Tests
- Testing Default Behavior Explicitly
- Testing Input Handlers: Replay the Keystroke Sequence
- Comparing Float32Array Outputs: Expectations Must Round-Trip
- Transcribing Plan-Pinned Numeric Examples
- Asserting Synchronous Side Effects of Async APIs
- Driving Pinned `setTimeout(0)` Yields in Unit Tests
- Testing Combined Edge Cases
- Writing Robust Positioning Tests
- Self-Calibrating Hit Test Coordinates
- Chai CDN Limitations
- Integration Testing After Modularization
- Integration Testing for Registry Dispatchers
- Manager-Specific Testing
- Worker Testing
- Characterization Tests Before Refactor
- Mock VM Construction for Factory Testing
- Return Object Exposure for Internal Functions
- DOM Mounting for offsetParent-Dependent Tests
- getElementById Mock Safety
- DOMParser Vue Directive Attributes

## Unit Tests — Mocha + Chai

Loaded via CDN, run in-browser via test HTML pages.

### Structure

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://unpkg.com/mocha@10.2.0/mocha.js"></script>
    <script src="https://unpkg.com/chai@4.3.10/chai.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/mocha@10.2.0/mocha.css">
    <script>mocha.setup('bdd');</script>
</head>
<body>
    <div id="mocha"></div>
    <script type="module">
        import { FitMath } from '../../MyESModules/Layout/FitMath.js';
        const { expect } = chai;

        describe('FitMath', () => {
            it('landscape image in portrait container', () => {
                const result = FitMath.fit(
                    { width: 1920, height: 1080 },
                    { width: 400, height: 600 }
                );
                expect(result.height).to.equal(600);
            });
        });

        mocha.run();
    </script>
</body>
</html>
```

### Key Points

1. `type="module"` required for ES module imports
2. `mocha.setup('bdd')` must be called before `describe`/`it` blocks
3. `mocha.run()` must be called after all test definitions
4. Test files live in `MyComponents/`

### In-Browser Runner: Reliable Completion Signal (Mocha 10)

The in-browser test runner (`scripts/run-tests.cjs`) must wait for the run to **settle** before extracting results. Extracting after the first rendered result (`#mocha .test`) snapshots mid-run state for any suite with real async work: in-flight tests are invisible, and a *failing* async test that hasn't finished yet vanishes — "N passing / 0 failing" with N < registered count looks like a clean pass.

**Two completion conditions that look right but are broken in the mocha 10 browser build (verified 10.2.0):**

1. `mocha._runner` **does not exist** — v10's `run()` creates the runner locally and returns it; it is never assigned on the instance, so the check is always falsy.
2. `runner.stats.tests === passes + failures + pending` is **vacuously true** — `stats.tests` counts *completed* tests (incremented in the same `test end` handler as the outcome buckets), so the equality holds at *every* instant, not only at completion.

A broken gate is invisible when a generous timeout silently does the real work: with both conditions dead, `waitForFunction` rode the full 30 s per file and fell through to a DOM parse — correct numbers, but ~30 s × file count of pure stall.

**Correct signal: the Runner's `end` event**, reachable only via the return value of `mocha.run()`. Inject an init script that wraps `mocha.run` *before* the test page's own `load` listener (init scripts run first, so their listener dispatches first on `load`):

```js
await context.addInitScript(() => {
    window.__mochaRun = null; // { unavailable } | { settled, runner }
    window.addEventListener('load', () => {
        if (typeof mocha === 'undefined' || typeof mocha.run !== 'function') {
            window.__mochaRun = { unavailable: true };   // CDN blocked
            return;
        }
        const originalRun = mocha.run;
        mocha.run = function (...args) {
            const runner = originalRun.apply(mocha, args);
            window.__mochaRun = { settled: false, runner };
            runner.on('end', () => { window.__mochaRun.settled = true; });
            return runner;
        };
    }, { once: true });
});
// ...navigate, then:
await page.waitForFunction(() => {
    const run = window.__mochaRun;
    return !!run && (run.unavailable || run.settled);
}, null, { timeout: 30000 });
```

Then read `window.__mochaRun.runner.stats` (final at `end`) for `passes`/`failures`/`pending`, and parse the `.fail` DOM for failure detail. A blocked CDN, a run that never starts, or a hung suite now resolves to a fast, named per-file error instead of a 30 s stall.

- Keep the timeout fall-through but make it **diagnostic** — name the failure ("mocha.run() never reached", "Mocha unavailable (no runner)", "did not settle (N tests complete)") rather than a silent stall that happens to land on the right answer.
- **"mocha.run() never reached" is a disjunction, not a verdict** — the broken-page signal fires for *any* page-level failure before `mocha.run()` settles, including a new test page that simply forgot its trailing `load → mocha.run()` listener. Telling symptom: after fixing the suspected cause (e.g., a missing barrel export), the signal **persists identically**. Disambiguate with one probe before touching production code: load the page with Playwright and check (a) `pageerror` (module link failures report there; a missing run listener does not) and (b) whether a manual `window.mocha.run()` executes the registered tests. Silent page + registered tests + manual run works = page scaffolding is incomplete, not the implementation.
- **Exit non-zero on any per-file failure.** A v1 runner exited 0 even when individual tests failed (it only threw when *every* file failed) — "green" CI output did not mean "no failing tests." Collect per-file errors, including `N failing test(s)` with each failing title + first error line, and fail the process on any of them.

### Mocking Browser APIs

Since tests run in a real browser (not Node.js), mock by intercepting native APIs. Always `bind()` the original to preserve `this`, and always restore after the test.

```javascript
// Mock document.createElement to intercept canvas creation
const originalCreateElement = document.createElement.bind(document);
document.createElement = function(tag) {
    const el = originalCreateElement(tag);
    if (tag === 'canvas') {
        el.toBlob = function(callback, type, quality) {
            callback(new Blob(['fake'], { type: 'image/jpeg' }));
        };
    }
    return el;
};
// ... test ...
document.createElement = originalCreateElement; // Restore

// Mock localStorage.setItem to simulate quota exceeded
const originalSetItem = localStorage.setItem;
localStorage.setItem = function() {
    const e = new Error('Quota exceeded');
    e.name = 'QuotaExceededError';
    e.code = 22;
    throw e;
};
// ... test ...
localStorage.setItem = originalSetItem; // Restore
```

### Real Objects Over Mocks

When testing utilities that wrap browser APIs (FileReader, Image, Canvas), prefer **real browser objects** over mocks when the objects are easy to construct. Real objects test actual behavior and eliminate mock maintenance.

**Create test image files with a base64 PNG helper:**

```javascript
function createTestImageFile() {
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binary = atob(pngBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], 'test.png', { type: 'image/png' });
}
```

**Advantages over mocking:**
1. **Tests actual behavior** — `FileReader.readAsDataURL()` and `Image.onload` fire correctly
2. **No mock maintenance** — no need to intercept FileReader constructor, bind callbacks, or restore
3. **Catches real edge cases** — invalid MIME types, corrupted data, actual decode failures

**When to mock instead:**
- When the API has side effects you can't control (network fetches, localStorage quota)
- When you need to test error paths that are hard to trigger with real objects (`FileReader.onerror`)

See `MyESModules/Utils/loadImageFromFile.js` for the production utility and `MyComponents/Phase4CodeQualityTest.html` for real-object tests.

### RAF Mocking

When testing code that uses `requestAnimationFrame` (RAF) — such as debounced render scheduling — replace the browser APIs with a callback collector for deterministic control.

```javascript
let rafCallbacks = [];
let canceledIds = new Set();
const originalRAF = window.requestAnimationFrame.bind(window);
const originalCancelRAF = window.cancelAnimationFrame.bind(window);

function mockRAF() {
    rafCallbacks = [];
    canceledIds = new Set();
    window.requestAnimationFrame = (cb) => {
        const id = rafCallbacks.length + 1;
        rafCallbacks.push(cb);
        return id;
    };
    window.cancelAnimationFrame = (id) => {
        canceledIds.add(id);
    };
}

function restoreRAF() {
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCancelRAF;
}

function flushRAF() {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    for (const cb of cbs) {
        cb();
    }
}
```

**Key rules:**

1. **Always `bind()` the original** — `window.requestAnimationFrame.bind(window)` preserves `this` context. Without bind, the original may fail in strict mode.
2. **Always restore after tests** — Use `afterEach` to call `restoreRAF()`. A leaking mock breaks all subsequent tests.
3. **Flush synchronously** — `flushRAF()` executes all pending callbacks immediately, simulating the browser firing the next frame.
4. **Return numeric IDs** — The mock returns incrementing IDs starting from 1, matching browser behavior. Enables `cancelAnimationFrame` tests.

**Testing debounce coalescing:**

```javascript
// Call 5 times rapidly (before RAF fires)
fn(); fn(); fn(); fn(); fn();

// Only one RAF callback should have been queued
expect(rafCallbacks).to.have.lengthOf(1);

// Flush — the single callback executes
flushRAF();

// Verify render happened once
expect(drawCount).to.equal(1);
```

**Latest-wins pattern** — When using RAF for debouncing, read state **inside** the RAF callback, not at call time:

```javascript
// GOOD — reads current state at frame time
_scheduleRender() {
    if (this._pending) return;
    this._pending = true;
    requestAnimationFrame(() => {
        this._pending = false;
        const data = this.getData(); // Reads current state
        // ... render with data
    });
}

// BAD — captures stale state at call time
_scheduleRender() {
    const data = this.getData(); // Captures state at call time
    requestAnimationFrame(() => {
        // ... renders with stale data
    });
}
```

See `MyComponents/CropPreviewTest.html` for full working examples and `MyESModules/Rendering/CanvasRenderer.js` for the production debounce pattern.

### Canvas Dimension Interception

When testing canvas-based exporters, verify canvas dimensions without needing a full rendering pipeline by intercepting `document.createElement` and capturing width/height via `Object.defineProperty` on individual canvas elements:

```javascript
let originalCreateElement = document.createElement.bind(document);
let createdWidth, createdHeight;

document.createElement = function(tag) {
    const el = originalCreateElement(tag);
    if (tag === 'canvas') {
        Object.defineProperty(el, 'width', {
            get: () => createdWidth,
            set: (v) => { createdWidth = v; },
            configurable: true
        });
        Object.defineProperty(el, 'height', {
            get: () => createdHeight,
            set: (v) => { createdHeight = v; },
            configurable: true
        });
        el.getContext = () => null; // Fail early — we only need dimensions
    }
    return el;
};

try { await exportToPng(null, state, 0.92); } catch (e) { /* expected */ }
expect(createdWidth).to.equal(1920);
expect(createdHeight).to.equal(1080);

// Always restore
document.createElement = originalCreateElement;
```

**Key points:**
- **Scope to `'canvas'` tag only** — other elements pass through to the original
- **Restore in `afterEach`** — leaking the mock breaks subsequent tests
- **Bind the original** — `document.createElement.bind(document)` preserves `this` context
- **Fail fast with `getContext = () => null`** — the test only needs dimensions, not rendering

### Canvas 2D Context Mocking

For testing rendering modules, use a Proxy-based wrapper around a real canvas context. This is more robust than `Object.defineProperty` because canvas context properties are host objects that may be non-configurable or read-only.

**Two traps that each cost a full debugging round:**

1. **An unwrapped host method called through the proxy throws a bare `TypeError: Illegal invocation`.** Canvas context methods type-check their `this`, so any method the `get` trap serves raw (`return target[prop]`) throws when production calls it — with no hint about which call site, and inside the production module's RAF callback, so the stack points at the module, not the mock. It reads as "implementation broken", not "mock missing a method".
2. **The proxy's `get` trap returns the *wrapper function* for tracked methods.** Asserting through the proxy or fake canvas (`expect(ctx.moveTo).to.have.lengthOf(300)`) reads a function, not the recorded calls — the error (`expected [Function] to deeply equal …`) looks like an implementation bug. The record must be a **plain object exposed separately** from the proxy.

```javascript
function makeRecordingCtx(width = 1920, height = 1080) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const real = canvas.getContext('2d');

    // Audit the production render function's FULL call surface
    // (setTransform, clearRect, beginPath, moveTo, lineTo, stroke, …)
    // BEFORE the first GREEN run — not after the first red stack.
    const METHODS = ['clearRect', 'beginPath', 'moveTo', 'lineTo', 'closePath',
                     'stroke', 'fill', 'fillRect', 'fillText', 'setTransform'];
    const rec = { strokeStyle: '#000000' };
    for (const name of METHODS) rec[name] = [];

    return {
        rec,
        proxy: new Proxy(real, {
            set(target, prop, value) {
                if (prop === 'strokeStyle') rec.strokeStyle = value;
                target[prop] = value;   // properties are safe to set through
                return true;
            },
            get(target, prop) {
                if (Array.isArray(rec[prop])) {  // tracked method: record + re-apply with real ctx as this
                    return (...args) => { rec[prop].push(args); return target[prop].apply(target, args); };
                }
                if (prop === 'strokeStyle') return rec.strokeStyle;
                const value = target[prop];
                // bind the real ctx as this — un-audited methods execute instead of throwing
                return typeof value === 'function' ? value.bind(target) : value;
            }
        })
    };
}

const rctx = makeRecordingCtx();
fakeCanvas.getContext = () => rctx.proxy;      // production gets the proxy
expect(rctx.rec.moveTo).to.have.lengthOf(300); // assertions read rec — NEVER the proxy
```

**Key patterns:**
- **Use Proxy instead of `Object.defineProperty`** — works reliably across all browsers with host objects
- Real canvas context preserves accurate metrics (`measureText`, `strokeText`) and rendering behavior
- **Wrap every method the render path can call**, each re-applied with the real ctx as `this`; properties (`strokeStyle`, `lineWidth`) go through the `set` trap and are safe unwrapped
- **Return `{ proxy, rec }` from the factory.** Production receives the proxy; assertions read `rec`. If a test is tempted to assert through the fake canvas (`canvas.ctx.moveTo`), that is the bug — the proxy serves functions there.
- The `bind(target)` passthrough keeps un-audited methods from crashing, but unrecorded calls silently skip assertions — the audit is still on you
- **Intercept methods on returned objects too** — e.g., `addColorStop` is on `CanvasGradient`; wrap it on the gradient the method returns
- **Cumulative call logs must account for full repaints** — a renderer that clears-and-redraws every frame appends the *entire* scene per render (300 + 301 + 300 = 901, not 900); compute the running total render-by-render
- **A fake canvas's backing store must model clear-on-assign.** Per the HTML spec, assigning `canvas.width/height` clears the bitmap even at the same value — but plain numeric `width`/`height` properties on a fake canvas have no such semantics, so resize behavior (no assignment on same-size resize; assignment + forced repaint on a DPR-only change) is *unexpressible*: the suite goes green on exactly the code that ships a blank-canvas bug (see `canvas-2d.md`, "Backing Store Assignment Clears the Bitmap"). Use getter/setter pairs over hidden fields that record every assignment:

```javascript
const canvas = {
    _width: 0, _height: 0,
    assignments: [],
    get width() { return this._width; },
    set width(v) { this._width = v; this.assignments.push(['width', v]); },
    get height() { return this._height; },
    set height(v) { this._height = v; this.assignments.push(['height', v]); },
};
```

Then pin: same-size `resize()` after a settled render → no new assignment, no new RAF; DPR-only change → assignment recorded AND a render queued despite the unchanged CSS snapshot.
- Use offscreen `<canvas>` elements as image sources instead of `new Image()` (since `Image.complete` is read-only)

### Canvas Render Order Testing via Context Method Wrapping

When you need to verify the **order** in which a rendering pipeline draws different visual elements, and you can't inject a spy (e.g., the assembler creates its renderer internally), wrap canvas context methods to capture state at call time:

```javascript
let callLog = [];
const origStroke = ctx.stroke.bind(ctx);
const origStrokeRect = ctx.strokeRect.bind(ctx);

ctx.stroke = function () {
    callLog.push({
        method: 'stroke',
        lineDash: ctx.getLineDash().join(','),
        strokeStyle: ctx.strokeStyle,
        shadowColor: ctx.shadowColor,
        globalAlpha: ctx.globalAlpha
    });
    return origStroke();
};

ctx.strokeRect = function () {
    callLog.push({
        method: 'strokeRect',
        lineDash: ctx.getLineDash().join(','),
        strokeStyle: ctx.strokeStyle,
        shadowColor: ctx.shadowColor,
        globalAlpha: ctx.globalAlpha
    });
    return origStrokeRect.apply(ctx, arguments);
};
```

After rendering, filter by distinguishing properties and verify ordering by index:

```javascript
const hexDragCalls = callLog.filter(c => c.strokeStyle === '#4285f4');
const selectionCalls = callLog.filter(c => c.strokeStyle === '#ffffff');
const firstHexIndex = callLog.indexOf(hexDragCalls[0]);
const firstSelectionIndex = callLog.indexOf(selectionCalls[0]);
expect(firstHexIndex).to.be.lessThan(firstSelectionIndex);
```

**Always restore original methods in `afterEach`** to prevent test pollution.

**Pick stable distinguishing properties** — each rendering method sets unique canvas properties. Use these as identifiers:

| Overlay | strokeStyle | lineDash | globalAlpha | shadowColor |
|---------|------------|----------|-------------|-------------|
| Hex drag target | `#4285f4` | `6,4` | `0.8` | — |
| Selection border | `#ffffff` | — | — | `rgba(0, 0, 0, 0.4)` |
| Hover border | `rgba(100, 160, 255, 0.7)` | — | — | — |

**Canvas properties persist between calls** — `strokeStyle`, `lineDash`, `shadowColor` etc. remain set until explicitly changed. The captured state at `stroke()` time reflects what the rendering method set, not what was active when the wrapper was installed.

**When to use this pattern:**
- You need to verify render order in a rendering pipeline
- The renderer creates internal dependencies that can't be easily mocked
- You need to verify that specific canvas state is set at draw time
- You want to test visual layering without screenshot comparison

### Test State, Not Just Actions

**Initial approach:** Verify that `fillText()` and `fillRect()` were called with correct arguments.

**Improved approach:** Also verify that canvas properties (`fillStyle`, `textBaseline`) were set correctly at the right times.

**Why it matters:** A test could pass even if the wrong color was used, as long as `fillText` was called. State assertions catch rendering bugs that action-only tests miss.

**Example:**
```javascript
// Before (action only)
expect(calls.fillText.length).to.equal(1);

// After (action + state)
expect(calls.fillStyle).to.include('#FFFFFF'); // fontColor
```

### Testing Input Handlers: Replay the Keystroke Sequence

For a handler that **parses / clamps / commits** a text input, one-shot endpoint tests are blind to the most common defect class: a per-`input` clamp that corrupts text the user is mid-typing. Each one-shot input (`'251'`, `'10'`, `'180'`) is a *complete* number, so clamping it is correct and the test passes — but real typing is a *sequence* (`1` → `12` → `120`). An intermediate draft (`1`, below a min of 30) gets clamped, and subsequent keystrokes append to the *clamped* text (`30`, `300`, `3002`…). The regression test must replay the keystroke sequence and assert the invariant at *every* step, not only the final value:

```js
// The draft (bpmText) absorbs every keystroke; the model moves only on commit.
for (const draft of ['9', '90', '190']) {
    vm.bpmText = draft;                 // simulate one keystroke — no commit
    expect(vm.bpm).to.equal(120);       // model unchanged at every intermediate step
    expect(vm.bpmClamped).to.equal(false);
}
vm.commitBpmEntry();
expect(vm.bpm).to.equal(190);           // model moves on commit (190 is in range)
```

**Generalization:** wherever a handler's correctness depends on the *sequence of intermediate states* — text inputs, incremental parsers, accumulators, undo stacks, streaming decoders — feed the intermediate states and assert the invariant throughout. One-shot tests pin the endpoints and are blind to the path between them; the defect lives in the **transitions**. When fixing an input-handling defect, write the per-keystroke test *first*.

### Tolerance Precision in Positioning Tests

When testing layout and alignment, prefer exact equality when expected values can be computed precisely from known constants:

```javascript
// Less precise (tolerance 10px)
expect(underline.y).to.be.closeTo(1042, 10);

// More precise (exact calculation)
expect(underline.y).to.equal(1080 - 40 + 2); // height - fontSize + margin
```

**Guidelines:**
- Use exact equality when the value derives from known constants (`height`, `width`, `MARGIN`, `fontSize`)
- **Pick binary-exact (dyadic) inputs for strict-equality position assertions** — `(90/300)·3 === 0.9` is `false` in float64 (it is `0.8999999999999999`). Choose coordinates whose fraction of the width is dyadic (75 of 300 → `0.75`) and reserve `closeTo` for values that are genuinely computed. That is the *authoring* rule — a dyadic pin (50 % → `1.5`) must stay exact `deep.equal`. *Transcription* rule when a pinned plan Given is non-dyadic (60 % → `1.8`): the Given is the contract — keep it and assert with tight `closeTo` plus a float-noise annotation; never silently re-pick a dyadic input, which quietly tests a different scenario than the pinned row
- Use tolerance only when legitimate variation exists (e.g., font metric differences across platforms)
- For positioning assertions where exact values are hard to compute, use relative relationships:
  ```javascript
  expect(bg.x).to.be.lessThanOrEqual(textX - 12);
  expect(bg.w).to.be.closeTo(textWidth + 24, 0.5);
  ```

### Comparing Float32Array Outputs: Expectations Must Round-Trip

Production DSP returns `Float32Array`. Reading an element back yields **float32 rounding widened to float64** — `new Float32Array([-0.8])[0] === -0.8` is `false` (it is `-0.800000011920929`). Chai's `equal`/`deep.equal` compare numbers strictly, so the obvious test

```js
expect(result.mins[0]).to.equal(-0.8); // FAILS — even though the module is correct
```

fails for every value not exactly representable in binary (0.1, 0.2, 0.7, 0.8, 0.9, 1.3, 1.7…). Only dyadic rationals (0.25, 0.5, 1.0, 0) survive a literal comparison. The failure looks like an implementation bug and sends you debugging a module whose math is right.

**Build expectations through the same conversion the production code uses:**

```js
const f32 = (...values) => Float32Array.from(values);
expect(result.mins).to.deep.equal(f32(-0.8, -0.8)); // exact, no tolerance
```

Array-level `deep.equal` between two `Float32Array`s compares element bits — both sides went through float32, so the comparison is *exact*.

**Rules:**
1. Expectations for float32-producing modules go through the `f32(...)` helper, never literals.
2. **Reserve `closeTo` for genuine float variation** — a sum/reduction whose accumulation order the test cannot trivially reproduce, or a spec-level bound (e.g. an envelope magnitude `> 0.99`). When rule 1 achieves exact equality, settling for tolerance is strictly weaker: it lets a real off-by-a-bit regression (corrupted pool boundary, wrong bucket) pass silently.
3. **`new Float32Array([x])[0]` is the oracle** for "what this module can represent." If unsure whether an expectation is float32-exact, assert against the oracle instead of the literal.
4. **Don't mix conventions in one suite** — a file where some assertions compare against literals (happening to use only dyadic values) and others against `f32(...)` misleads the next author into thinking literals are fine. Pick the convention per suite and state it in a comment where the helper is defined.

**Diagnostic:** when a DSP test "fails" with a difference of ~1e-7 on an otherwise-exact value, suspect the expectation's number type before the implementation. This is a test-authoring trap, not a runtime one — float32 storage is the spec, and the production code is unaffected.

See `MyComponents/WaveformPeaksTest.html` (WF-P1.3/1.5/1.8) for the `f32` convention in use.

### Transcribing Plan-Pinned Numeric Examples

Plan documents pin numeric worked examples: bucket math, lag/offset ranges, scenario Given/Then rows. A planning-time "recompute" check verifies the arithmetic is internally consistent *as written* — it cannot catch (a) numbers with the **wrong units**, (b) Given values **out of range** for their containers, or (c) **two rows describing the same input with different expectations**. All three are invisible to per-row arithmetic and surface only when the test author materializes the Given into a real input.

**Rules:**

1. **Recompute dimensions.** Write the quantity's units out: samples ÷ rate = seconds; samples × rate ÷ hop = frames; samples ÷ buckets = samples/bucket. A plan formula can be arithmetically correct for the wrong quantity — e.g. `512 × 60 / 250 = 122.88` is a *sample* count, not a *frame* count, because the rate is missing where the units require it. When the plan's formula lacks (or includes) the rate where the units don't, that is a plan bug: implement the dimensionally-correct version and correct the plan in place with a note.
2. **Bounds-check Given values against their containers** — spike index vs buffer length, sample count vs stride, onset count vs analysis window. A Given that looks plausible in isolation but exceeds its container fails the moment it is materialized.
3. **Cross-check rows with identical Given.** When two scenario rows materialize to the same input, their Then must agree for any pure function. If they don't, the contradiction is a plan bug: pick the reading the higher-priority/more-specific pin supports, implement and assert that reading with a comment naming the contradiction, and correct both plan rows in place.
4. **Never "fix" the test to match the plan's number — fix the plan.** A dimensionally-wrong pin that slips through produces a wrong *implementation* that passes a wrong *test*: the suite is green and the feature is subtly broken (e.g. a lag floor of "123 frames" where the true floor is 43 makes a 120 BPM onset train unfindable).

The unit recompute costs seconds and is the only check that catches this class. It applies to E2E transcription as well — any test whose numbers come from a plan document rather than from the code.

### Testing Default Behavior Explicitly

Always test that fallback values are used when input objects are empty or partial:

```javascript
it('uses default style values for empty titleStyle object', () => {
    const style = {}; // not makeTitleStyle()
    render(ctx, 1920, 1080, style, runs);
    expect(calls.font[0]).to.equal('36px Arial');
    expect(calls.fillStyle[0]).to.equal('#FFFFFF');
});
```

**Why include this:** Even though the implementation has defaults, someone might refactor it to remove defaults or change them. This test documents and protects the contract.

### Asserting Synchronous Side Effects of Async APIs

An async function executes **synchronously up to its first `await`**. Call the function and assert on the side-effect log *before* awaiting the returned promise to prove a callback fired with zero I/O in flight — no fake timers, no microtask pumping:

```javascript
const events = [];
const onStateChange = (state, detail) =>
    events.push([state, detail ? detail.fileName : null]);

const promise = loader.loadFile(file);
// No await yet — everything up to the first `await` has already run.
expect(events).to.deep.equal([['decoding', 'ok.mp3']]);

await promise;
expect(events).to.deep.equal([['decoding', 'ok.mp3'], ['idle', null]]);
```

- **Proves ordering, not just occurrence** — if someone later "optimizes" by firing the callback inside a `.then()` or after the first I/O, the synchronous assertion fails immediately.
- **Pins the UX contract** — e.g., a "Decoding <name>…" status must appear the instant a file is dropped, before `arrayBuffer()` is even read.
- **Complements the RAF callback collector** — that pattern covers *frame* ordering; this covers *first-await* ordering.
- **When it does NOT work** — if the interesting work starts in a microtask (leading `await Promise.resolve()`, `queueMicrotask`), the pre-await window is empty and the assertion passes trivially with `[]`. Verify the test *fails* under a delayed implementation: move the callback after the first `await` by hand and watch it break.
- For callbacks that legitimately fire after I/O, use plain `await` + ordered-log assertions instead.

### Driving Pinned `setTimeout(0)` Yields in Unit Tests

When a contract pins an analysis/parsing yield as `await new Promise((r) => setTimeout(r, 0))` and you must assert *what happens at each continuation* (e.g., a superseded task writes nothing; the live task writes), drive that exact mechanism — do not replace it with a microtask. A FIFO `setTimeout` queue plus manual flushes advances the fire-and-forget task one continuation at a time, making interleavings explicitly assertable:

```js
function withPinnedYields(run) {
    const realSetTimeout = window.setTimeout;
    const queue = [];
    window.setTimeout = (cb) => { queue.push(cb); return queue.length; };
    const flushYield = async () => {
        const next = queue.shift();
        if (next) next();
        await Promise.resolve();  // let the resumed task run to completion
        await Promise.resolve();
    };
    return Promise.resolve(run(flushYield)).finally(() => { window.setTimeout = realSetTimeout; });
}

it('superseded task writes nothing, live task applies', async () => {
    await withPinnedYields(async (flush) => {
        onFileDropped(fileA);   // fire-and-forget — ran synchronously to its first await
        onFileDropped(fileB);   // B supersedes A before A's yield flushes
        await flush();          // A's continuation runs → must be a no-op
        await flush();          // B's continuation runs → applies
        expect(applied).to.deep.equal([fileB.name]);
    });
});
```

**Why it works:** an `async` function runs **synchronously to its first await**, so by the time the outer call returns, the fire-and-forget task's yield callback is already queued in the FIFO.

**Two gotchas, each of which will bite:**
1. **Restore the real `setTimeout` in `.finally` of the returned promise** — the `run` body is async; restoring synchronously would break its `await`s.
2. **Settle 1–2 extra microtasks after each flush** — the resumed task completes one hop after its yield promise resolves; flushing without the settle interleaves the next task before the previous one finished.

This is the yield-flush sibling of the RAF callback collector and the fake-timer-with-manual-ticks patterns above — same discipline (own the global the production code actually calls, restore it), different mechanism (it serves `setTimeout` yields, not `setInterval` schedulers).

### Testing Combined Edge Cases

Test multiple flags/inputs simultaneously to catch composition bugs:

```javascript
it('renders bold + italic + underline together', () => {
    const style = makeTitleStyle({ bold: true, italic: true, underline: true });
    render(ctx, 1920, 1080, style, runs);
    // Verify font string contains all three styles in correct order
    expect(calls.font[0]).to.equal('italic bold 36px Arial');
    // Verify underline position
    expect(calls.fillRect.length).to.equal(1);
});
```

**Why include this:** Tests all three formatting flags together ensure that:
- Font string construction handles all combinations correctly
- Rendering works alongside other styles
- The order of style application doesn't cause visual artifacts

### Writing Robust Positioning Tests

When testing layout and alignment, prefer relative assertions over absolute values:

```javascript
// Instead of checking exact x position:
// expect(bg.x).to.be.lessThan(40);

// Check relationships between computed values:
expect(bg.x).to.be.lessThanOrEqual(textX - 12);
expect(bg.w).to.be.closeTo(textWidth + 24, 0.5);
```

**Why:**
- Tests pass regardless of canvas width or text length
- Focuses on core logic rather than exact pixel values
- Less brittle when implementation details change slightly
- Use tolerance of `0.5` for pixel-perfect positioning assertions

### Self-Calibrating Hit Test Coordinates

When testing pointer interactions on elements with **computed layout** (auto-fit widths, dynamic positioning), hardcoding hit test coordinates breaks across browser environments because text measurement (`ctx.measureText()`) varies by font renderer, DPR, and platform.

**Solution:** Import the same pure computation function the production code uses and call it with matching parameters to derive test coordinates:

```javascript
// BAD — hardcoded coordinates break across environments
canvas.dispatchEvent(new PointerEvent('pointerdown', {
    clientX: 533, clientY: 456, // Assumes "Hello World" measures exactly 200px
    button: 0, bubbles: true
}));

// GOOD — coordinates derived from actual measurement
const bounds = computeBounds(titleStyle, runs, 1920, 1080);
const cssBoxRight = 250 + bounds.boxWidth / 2;
const hitX = cssBoxRight - 3; // 3px inside right edge

canvas.dispatchEvent(new PointerEvent('pointerdown', {
    clientX: hitX, clientY: 441,
    button: 0, bubbles: true
}));
```

**Key insight:** The test imports `computeBounds` from the production module and calls it with the same parameters the interaction handler uses internally. This ensures coordinates match whatever the production code computes, regardless of font rendering differences.

**When to use:**
- Hit testing on elements with computed/auto-fit dimensions
- Pointer interactions where target position depends on text measurement
- Any interaction test where the bounding box is computed at runtime rather than fixed

**Distinguish from proportional coordinates** — Proportional coordinates (`rect.left + rect.width * 0.25`) work when the element's bounding rect is known at test time. Self-calibrating coordinates are needed when the element's position depends on internal computations (text measurement, auto-fit layout) that the test cannot observe via `getBoundingClientRect()`.

See `MyComponents/TitleInteractionTest.html` and `MyESModules/Rendering/TitleRenderer.js` (`computeBounds`).

### Chai CDN Limitations

Chai v4.3.10 loaded via CDN lacks plugins like `chai-as-promised`.

**No `eventually`** — Use try/catch for async rejection:
```javascript
let errorThrown = null;
try { await someAsyncFunction(); } catch (e) { errorThrown = e; }
expect(errorThrown).to.not.be.null;
```

**No `startWith`** — Use regex:
```javascript
expect(str).to.match(/^blob:/);
```

**`deep.equal` distinguishes trailing `undefined`** — `['idle']` and `['idle', undefined]` are *not* deep-equal (different array lengths). Event-recorder helpers that push `[state, detail && detail.fileName]` record a trailing `undefined` for detail-less events and silently break every "no detail" assertion. Normalize absent details to an explicit sentinel (`null`) in the recorder: `[state, detail ? detail.fileName : null]`.

**Pinning call shape via parameter absence** — the mirror image of the note above: when a regression row must pin "this call keeps its old arity/shape" (e.g., "byte-for-byte v1 2-arg start"), assert the *absence* of the new parameter on the existing shared recording fake (`expect(startedWith.duration).to.equal(undefined)`) rather than extending the fake API or editing pre-existing helpers — an N-arg call leaves the (N+1)th recorded parameter `undefined`, so no fake changes are needed. Scope the claim to what absence actually proves: `start(w, o, undefined)` also leaves the third parameter `undefined`, so the row pins "no value passed", and it is correct only when the pinned contract is value-absence (the v1 code path is exactly the 2-arg one). Keep the fake's shared ordered `calls` log as the arity/ordering evidence.

### Integration Testing After Modularization

When breaking a God Module into smaller components (handlers + managers), write integration tests that verify the composed API works correctly:

```javascript
// Example: Test that TitleHandler's actions properly mutate TitleManager state
import { createTitleHandlers } from '../../MyESModules/Interaction/createTitleHandlers.js';
import { TitleManager } from '../../MyESModules/State/TitleManager.js';

describe('TitleHandler + TitleManager Integration', () => {
    it('applies bold formatting and updates state correctly', () => {
        const mockVue = { /* ... */ };
        const titleManager = new TitleManager(mockVue);
        const handlers = createTitleHandlers(mockVue, titleManager);

        // Simulate calling handler method
        handlers.toggleBold(0, 10);

        // Verify the composed behavior: state changed as expected
        expect(titleManager.state.titleRuns).to.have.lengthOf(1);
        expect(titleManager.state.titleRuns[0].formats.bold).to.be.true;
    });
});
```

**Why this matters:** Unit tests of individual components can pass while integration issues remain hidden. The critical bug where TitleHandler called methods that didn't exist on TitleManager would have been caught by such tests.

**Test the composed API, not just individual units.** Ensure handlers and managers work together as an integrated system.

### Integration Testing for Registry Dispatchers

When using a registry pattern (e.g., `ExportManager`), test the **integration path** (dispatcher → strategy), not just the strategy in isolation. A signature mismatch between dispatcher and strategy can silently corrupt output:

```javascript
// Test that ExportManager.export() with 'png' produces correct canvas dimensions
// This catches signature misalignment where quality=0.92 is passed where exportSize is expected
await ExportManager.export(mockAssembler, mockState, 'png', 0.92);
// Verify canvas was created with 1920x1080, not 300x150
```

**Why this matters:** Unit tests of individual exporters pass with the correct signature, but the dispatcher calls them with positional arguments. A misaligned strategy signature (e.g., missing the `quality` parameter) causes positional shift — `exportSize` receives `0.92` instead of `{ width: 1920, height: 1080 }`, resulting in `undefined` dimensions and tiny 300x150 exports.

## Manager-Specific Testing

**TitleManager** — `toggleBold(start, end)` passes `{ bold: undefined }` to `applyFormattingToRange`. The `'bold' in formatting` check ensures only the requested flag toggles; absent flags are preserved. Tests should verify independent toggling: `toggleBold` only affects bold, `toggleItalic` only affects italic, and `toggleUnderline` only affects underline. See `MyESModules/State/TitleManager.js` lines 91-96.

**ExportManager** — `exportToJpeg` creates an offscreen canvas never appended to the DOM. Use a mock assembler with a `render()` method that records calls. Verify: canvas is NOT in `document.body`, no `<a>` download links remain (cleanup runs in `finally`), and mock assembler received correct canvas size and context.

**SettingsPersistence** — `save()`/`load()` use `localStorage` directly. Testing strategy:
1. `beforeEach`: `localStorage.removeItem(STORAGE_KEY)` to start clean
2. **Corrupted JSON**: Write invalid JSON, verify `load()` returns defaults
3. **Quota exceeded**: Mock `localStorage.setItem` to throw `QuotaExceededError`
4. **Partial data**: Write incomplete settings, verify defaults fill missing fields
5. **Empty string**: `localStorage.setItem(key, '')` — falsy, so `load()` returns defaults

`load()` merges via `{ ...defaults, ...parsed }` — stored values override defaults, missing keys get defaults. This is the versioning strategy for evolving settings.

### Falsy vs. Missing Field Validation

When validating object fields, `!field` catches both `undefined` and `''` (empty string). To distinguish "missing" from "empty", use explicit checks:

```javascript
// WRONG — catches both undefined and empty string
if (!manifest.name) {
    errors.push('Missing required field: name');
}

// CORRECT — distinguishes missing from empty
if (manifest.name === undefined || manifest.name === null) {
    errors.push('Missing required field: name');
} else if (typeof manifest.name === 'string' && !manifest.name.trim()) {
    errors.push('name must be non-empty');
}
```

Same pattern for arrays: `!arr` catches `undefined`, `null`, `false` but NOT `[]` (empty arrays are truthy). Use `arr.length === 0` separately to catch empty arrays.

## Worker Testing

### Mock Worker Pattern

When testing code that uses `window.Worker`, mock the constructor to capture `onmessage` assignments and fire messages manually. This avoids spawning real workers and enables deterministic control over message timing.

```javascript
let capturedOnMessage = null;
let capturedWorker = null;

function mockWorker() {
    const originalWorker = window.Worker;
    Object.defineProperty(window, 'Worker', {
        configurable: true,
        value: class {
            constructor(url) {
                capturedWorker = this;
            }
            set onmessage(fn) { capturedOnMessage = fn; }
            postMessage(msg) { /* no-op */ }
            terminate() { /* no-op */ }
        }
    });
    return () => {
        Object.defineProperty(window, 'Worker', {
            configurable: true,
            value: originalWorker
        });
    };
}
```

**Key points:**
- Use `Object.defineProperty` with `configurable: true` to replace `window.Worker`
- Capture `onmessage` via a setter to retrieve the message handler
- Capture the worker instance to verify `terminate()` calls
- Always restore the original `Worker` constructor in `afterEach`

### Firing Mock Messages

To simulate the worker sending a message, invoke the captured handler with a synthetic event:

```javascript
capturedOnMessage({ data: { type: 'ready' } });
capturedOnMessage({ data: { type: 'result', saliencyMap: [1, 2, 3] } });
capturedOnMessage({ data: { type: 'failed', error: 'Model load failed' } });
```

### Testing Timeout Guards

To test timeout behavior without waiting the full production timeout (e.g., 15 seconds), override the timeout config:

```javascript
// Before creating the analyzer
SALIENCY_CONFIG.INFERENCE_TIMEOUT_MS = 50;

// Test happy path — worker responds before timeout
capturedOnMessage({ data: { type: 'result', saliencyMap: [1, 2, 3] } });
expect(analyzer.inferenceTimeoutId).to.be.null; // Timeout was cleared

// Test dispose path — dispose before timeout fires
analyzer.dispose();
await new Promise(r => setTimeout(r, 100));
expect(analyzer.error).to.be.null; // Stale callback was a no-op
```

See `references/web-workers.md` for the full timeout guard pattern and additional examples.

## Characterization Tests Before Refactor

Before refactoring shared code, add **characterization tests** that capture the current observable behavior. These tests assert the existing output, providing confidence that the refactor doesn't change behavior.

**When to use:**
- Extracting shared logic from multiple methods into a common helper
- Refactoring a rendering pipeline (e.g., merging two border-drawing methods)
- Changing internal data flow without changing observable output

**Pattern:**

```javascript
// Before refactoring _drawPanelBorder, add tests that lock in current behavior:
it('drawDragTarget sets lineWidth and globalAlpha', () => {
    const ctx = createMockCtx();
    renderer.drawDragTarget(ctx, panel);
    expect(calls.lineWidth).to.include(2);
    expect(calls.globalAlpha).to.include(0.5);
});

it('drawSelectionBorder sets strokeStyle and shadow properties', () => {
    const ctx = createMockCtx();
    renderer.drawSelectionBorder(ctx, panel);
    expect(calls.strokeStyle).to.include('#ffffff');
    expect(calls.shadowColor).to.include('rgba(0, 0, 0, 0.4)');
});
```

**After refactor:** Run the same tests. If they pass, the shared helper preserves all style properties. If they fail, the refactor introduced a regression (e.g., a missing `!== undefined` guard skipping a falsy config value).

**Why this matters:** Refactoring shared rendering code is high-risk because subtle differences between callers (one sets `shadowColor`, another doesn't) can be lost in extraction. Characterization tests make those differences explicit before the code changes.

**File Reference:**
- `MyESModules/Rendering/PanelRenderer.js` — `_drawPanelBorder` extraction was preceded by characterization tests for `lineWidth` and `globalAlpha`

## Mock VM Construction for Factory Testing

When testing a factory that returns many methods, construct the mock VM by spreading the factory methods first, then overriding specific methods with spies.

**The gotcha:** `Object.assign(vm, methods)` or `{ ...methods }` overwrites any properties set before it. Always spread/assign the factory methods first, then override with spies.

```javascript
function buildVm(undoManager) {
    const base = makeMockBase(undoManager);
    const methods = createCollageMethods(base);

    // Spread factory methods FIRST — this establishes all base methods
    const vm = { ...methods };

    // Override specific methods with spies — MUST come after spread
    vm.showToast = (msg, type, duration) => {
        vm._toastCalls.push({ message: msg, type, duration });
    };
    vm._updateUndoState = () => {
        vm._undoStateCalls.push(true);
    };

    return vm;
}
```

**Why this order matters:** If you set `vm.showToast = spy` before spreading `methods`, and the factory return object also defines `showToast`, the spread overwrites your spy. The factory methods always win.

**When to use:**
- Testing factory methods that call other factory methods (e.g., `pushUndoCommand` calls `showToast`)
- Factories that return many interdependent methods
- When you need to spy on a subset of methods while keeping the rest functional

## Return Object Exposure for Internal Functions

When an internal factory function has meaningful behavior worth testing (error handling, validation, etc.) but is genuinely internal (not needed by other modules), expose it as a method on the factory's return object instead of exporting it as a module-level named export.

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

**Why not export as a module-level named export?** Exporting would:
1. Break the factory encapsulation pattern
2. Require the function to accept all dependencies as parameters (losing closure benefits)
3. Create a new import dependency for test files

**When to use this pattern:**
- The function is genuinely internal (not needed by other modules)
- The function has meaningful behavior worth testing (error handling, validation, etc.)
- The function relies on factory-scoped closures (dependencies, state)
- You don't want to extract the function to a separate module

**When NOT to use this pattern:**
- The function is already testable through the public API (prefer testing through public methods)
- The function is simple enough that testing through integration is sufficient
- The function should be extracted to its own module (consider SRP — if it's complex enough to need direct testing, it might belong in its own module)

## DOM Mounting for offsetParent-Dependent Tests

When testing code that uses `offsetParent` for visibility checks (e.g., focus trap algorithms, visible element queries), detached DOM elements have `offsetParent === null`. This causes visibility filters to exclude ALL elements.

### The Problem

```javascript
const mockSheet = document.createElement('div');
const input = document.createElement('input');
mockSheet.appendChild(input);
// input.offsetParent === null (detached from document)
// Focus trap filter excludes it → empty focusable list → test fails
```

### The Fix

Mount the mock element to `document.body` before testing:

```javascript
const mockSheet = document.createElement('div');
mockSheet.id = 'bottomSheet';
// ... build DOM tree ...
document.body.appendChild(mockSheet); // Now offsetParent works

// Run test...

document.body.removeChild(mockSheet); // Cleanup
```

### Alternative Approaches

- **Mock `offsetParent`** — `Object.defineProperty(input, 'offsetParent', { get: () => mockSheet })` — works but fragile across browsers
- **Skip visibility filter in tests** — Not recommended; tests should match production behavior

**When to apply:** Any test where production code uses `offsetParent !== null` to filter visible elements.

## getElementById Mock Safety

When mocking `document.getElementById` in tests, falling through to the original function can cause "Illegal invocation" errors because `document.getElementById` requires a specific `this` context.

### The Problem

```javascript
const origGetById = document.getElementById;
document.getElementById = (id) => {
    if (id === 'bottomSheet') return mockSheet;
    return origGetById(id); // Illegal invocation!
};
```

### The Fix

Return `null` for unknown IDs instead of calling the original:

```javascript
document.getElementById = (id) => {
    if (id === 'bottomSheet') return mockSheet;
    return null; // Production code guards against null
};
```

### Why This Works

Production code already guards against null:
```javascript
const btn = document.getElementById('bottomSheetToggleBtn');
if (btn) btn.focus(); // Safe — null check prevents error
```

**When to apply:** Any test that mocks `document.getElementById` and needs to handle IDs beyond the mocked set.

## DOMParser Vue Directive Attributes

When using `DOMParser` to test Vue template structure, Vue directive attributes (prefixed with `:`) are parsed as literal attribute names including the colon. The parser has no knowledge of Vue.js — it treats HTML statically.

### The Gotcha

```javascript
// index.html contains: <button :aria-pressed="isTitleFormatActive('bold')">Bold</button>

const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');
const btn = doc.querySelector('button[title="Bold"]');

btn.getAttribute('aria-pressed');       // → null (WRONG)
btn.getAttribute(':aria-pressed');      // → "isTitleFormatActive('bold')" (CORRECT)
btn.hasAttribute(':aria-pressed');     // → true (CORRECT)
```

### Testing Strategies

**Search inner HTML for binding strings** — simplest approach for verifying binding presence:
```javascript
const html = editPanel.innerHTML;
expect(html).to.include(':aria-pressed="isTitleFormatActive');
```

**Regex on inner HTML** — for specific binding values:
```javascript
const matches = html.match(/:aria-pressed="isTitleFormatActive\(['"]bold['"]\)"/g);
expect(matches).to.not.be.null;
```

**Query with colon-prefixed attribute names** — for attribute presence on specific elements:
```javascript
expect(btn.hasAttribute(':aria-pressed')).to.equal(true);
expect(btn.getAttribute(':aria-pressed')).to.equal("isTitleFormatActive('bold')");
```

### What NOT to Do

```javascript
// These always return null on Vue templates parsed by DOMParser:
element.getAttribute('aria-pressed');  // Vue uses :aria-pressed
element.getAttribute('class');         // Vue uses :class
element.getAttribute('disabled');      // Vue uses :disabled
element.getAttribute('value');         // Vue uses :value
```

**When this applies:** DOM structure tests, accessibility attribute checks, template parity tests — any test using `DOMParser` on Vue template HTML. Does NOT apply to Playwright (renders Vue in a real browser) or compiled output tests.

**File Reference:** `MyComponents/BottomSheetTitleControlsTest.html` — BSC-05 demonstrates the gotcha and fix.
