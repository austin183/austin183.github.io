# E2E and Event Testing Patterns

## Contents
- E2E Tests — Playwright
- Buffer-Based File Upload
- Playwright Page Load Strategy
- PointerEvent Testing
- TouchEvent Constructor
- DragEvent Testing (including real DataTransfer drop zones)
- Document-Level Event Listener Test Isolation
- Testing undo/redo buttons
- E2E Event Simulation Gotchas
- Sub-Second Timing Assertions (In-Page Measurement)
- `page.evaluate` Serialization Gotchas

## E2E Tests — Playwright

```javascript
const { test, expect } = require('@playwright/test');

test('upload images', async ({ page }) => {
    await page.goto('http://localhost:8080/CollageMaker/index.html');
    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(['test/images/img1.jpg']);
    await page.waitForSelector('.image-item', { state: 'visible' });
});
```

### Key Points

1. Use `waitForSelector()` instead of `waitForTimeout()`
2. Canvas content can't be queried via DOM — use screenshot comparison
3. File upload via `setInputFiles()` on file input element
4. Config: `workers: 1`, `fullyParallel: false`, `timeout: 30000`
5. Use `waitForSelector('#app')` before interacting — Vue mount timing matters
6. After `setViewportSize()`, wait for `#app` visibility — Vue re-renders on resize

### Buffer-Based File Upload

For tests that don't need disk fixtures, use base64-encoded PNG buffers with `filechooser`:

```javascript
const redPng = Buffer.from('iVBORw0KGgo...', 'base64');
const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('#uploadButton'), // triggers file chooser
]);
await fileChooser.setFiles([{
    name: 'test.png',
    mimeType: 'image/png',
    buffer: redPng,
}]);
```

### Playwright Page Load Strategy

The test runner (`scripts/run-tests.js`) uses `waitUntil: 'domcontentloaded'` plus `waitForSelector('#mocha', { state: 'attached' })` instead of `waitUntil: 'networkidle'`.

**Why:** `networkidle` times out when tests include `fetch()` calls for non-existent resources (e.g., deferred PWA features). `domcontentloaded` loads the DOM quickly without waiting for all network requests, and `waitForSelector('#mocha')` confirms Mocha is ready.

**Rule:** Use `domcontentloaded` + explicit selector waits. Only use `networkidle` if a test genuinely requires all network requests to settle before proceeding.

## PointerEvent Testing

### Proportional Coordinates for Hit Testing

When testing handlers using `getBoundingClientRect()` (e.g., `GestureHandler.hitTestPanel`), use proportional coordinates relative to the actual bounding rect. Canvas rendered dimensions may differ from inline styles in test environments.

```javascript
// BAD — assumes exact dimensions
const event = new PointerEvent('pointerdown', {
    clientX: 480,  // assumes canvas is 960px wide
    clientY: 270,
});

// GOOD — works regardless of actual rendered size
const rect = canvas.getBoundingClientRect();
const event = new PointerEvent('pointerdown', {
    clientX: rect.left + rect.width * 0.25,  // 25% into canvas
    clientY: rect.top + rect.height * 0.25,
});
```

**Boundary gotcha:** For a 2x2 uniform grid, the exact center (50%, 50%) lands on the boundary of all four panels. Use 25% or 75% offsets to clearly land inside a single panel.

Verify `hitTestPanel` directly with proportional coordinates before dispatching events, to isolate coordinate issues from handler issues.

### PointerEvent Constructor for Touch Testing

Modern browsers support `new PointerEvent()` with `pointerType: 'touch'` — no polyfills needed in Mocha/Chai browser tests. Since existing handlers already support both mouse and touch via pointer events, this is sufficient:

```javascript
const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    clientX: 100,
    clientY: 100,
    pointerType: 'touch',
    isPrimary: true,
    pointerId: 1,
});
```

No separate `touchstart`/`touchmove` handlers are needed in modern browsers.

### TouchEvent Constructor Requires Real Touch Objects

The browser's `TouchEvent` constructor requires real `Touch` objects for `touches`/`targetTouches`/`changedTouches` properties. `Touch` instances cannot be created from JavaScript (the `Touch` constructor is not exposed).

**Use `Object.defineProperty` on a plain `Event`:**

```javascript
function createMockTouchEvent(type, { touches, targetTouches, changedTouches } = {}) {
    const evt = new Event(type, { bubbles: true, cancelable: true });
    const props = {};
    if (touches) props.touches = touches;
    if (targetTouches) props.targetTouches = targetTouches;
    if (changedTouches) props.changedTouches = changedTouches;

    for (const [key, value] of Object.entries(props)) {
        Object.defineProperty(evt, key, {
            get: () => value,
            configurable: true
        });
    }
    return evt;
}
```

**Mock TouchList must support multiple access patterns:**
- `list.length` — length property
- `list[i]` — indexed access
- `list.item(i)` — item() method
- `for (const t of list)` — Symbol.iterator

```javascript
function makeTouchList(touches) {
    const list = { length: touches.length, item: (i) => touches[i] || null };
    for (let i = 0; i < touches.length; i++) list[i] = touches[i];
    list[Symbol.iterator] = function* () {
        for (let i = 0; i < this.length; i++) yield this[i];
    };
    return list;
}
```

See `MyComponents/MultiTouchHandlerTest.html` for full working examples.

## DragEvent Testing

### DragEvent.dataTransfer Cannot Be Mocked

You cannot pass a custom `dataTransfer` object to the `DragEvent` constructor in any browser:

```javascript
// FAILS — TypeError: Failed to convert value to 'DataTransfer'
const event = new DragEvent('drop', {
    dataTransfer: { files: [mockFile] }
});
```

**Workaround for unit tests:** Test listener presence by tracking `preventDefault()` calls rather than simulating file drops:

```javascript
const evt = new DragEvent('drop', { bubbles: true, cancelable: true });
let prevented = false;
evt.preventDefault = () => { prevented = true; };
document.dispatchEvent(evt);
expect(prevented).to.be.true; // Listener was active

cleanup();

const evt2 = new DragEvent('drop', { bubbles: true, cancelable: true });
prevented = false;
evt2.preventDefault = () => { prevented = true; };
document.dispatchEvent(evt2);
expect(prevented).to.be.false; // Listener was removed
```

### Real DataTransfer for E2E Drop-Zone Tests (Chromium)

The plain-object mock above throws in every browser — but Chromium accepts a **genuine `DataTransfer` instance** in the `DragEvent` constructor dict. Use this for end-to-end file-drop tests (the listener-presence workaround above remains the unit-test path). `page.setInputFiles` covers the `<input type="file">` path; this covers the drop-zone path.

```javascript
await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['bytes'], 'song.mp3', { type: 'audio/mpeg' }));
    document.querySelector('#dropZone').dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
});
```

Verified working in headless Chromium (Metronomad E2E-2.2).

### Document-Level Event Listener Test Isolation

Listeners attached to `document` persist across Mocha tests. Each test that adds listeners MUST clean them up to avoid cross-test contamination.

```javascript
describe('Drop handler cleanup', () => {
    let cleanup;

    afterEach(() => {
        if (cleanup) { cleanup(); cleanup = null; }
    });

    it('listener is removed after cleanup', () => {
        const { cleanup: c } = setupHandler();
        cleanup = c; // Register for afterEach

        // Verify active, then verify removed
        dispatchDragEvent();
        expect(prevented).to.be.true;
        c();
        dispatchDragEvent();
        expect(prevented).to.be.false;
    });
});
```

**Anti-pattern:** Using `beforeEach` to set up a handler AND having tests create their own. This causes listener accumulation — "after cleanup" assertions become false positives because old listeners remain active.

## Testing undo/redo buttons

E2E tests that interact with undo/redo buttons MUST create undo history via a crop operation first:

```javascript
// WRONG — removing an image does NOT enable the undo button
await removeBtns[0].click();
await page.click('#undoBtn'); // TIMEOUT — button is still disabled!

// CORRECT — reset crop creates undo history
await page.click('#previewCanvas');  // select a panel
await page.click('.reset-crop-btn'); // creates undo command
await page.click('#undoBtn');        // works — button is enabled
```

## E2E Event Simulation Gotchas

Several Playwright methods do NOT fire the DOM events that Vue handlers depend on:

### `page.keyboard.press('Escape')` Is Unreliable With Vue `.window` Modifier

`page.keyboard.press('Escape')` does not reliably trigger Vue's `@keydown.escape.window.prevent` handler in headless Chromium, especially in mobile viewport with modal/overlay contexts.

**Why it fails:** Vue's `.window` modifier attaches the listener directly to `window`. In headless Chromium, the keyboard event dispatched by Playwright may not propagate to the `window` listener when focus is inside a modal dialog or overlay.

```javascript
// Vue template — works in real browser, unreliable in headless E2E
<div id="app" @keydown.escape.window.prevent="closeSidebars">

// Playwright test — UNRELIABLE in headless mode
await page.keyboard.press('Escape');
// closeSidebars() may NOT be called
```

**Workarounds (ranked by preference):**

1. **Backdrop click (Recommended)** — Click the overlay backdrop to exercise the same dismiss code path:
   ```javascript
   // Click above the bottom sheet (z-index: backdrop=140, sheet=160)
   await page.mouse.click(100, 100);
   await page.waitForTimeout(400);
   ```
   Tests the actual user interaction path (tap outside to dismiss).

2. **Unit test the handler** — Test `closeSidebars()` directly in a Mocha/Chai unit test. Deterministic, no browser quirks.

3. **`page.evaluate()` dispatch** — May still not work reliably since Vue `.window` listeners may not receive programmatically dispatched events:
   ```javascript
   await page.evaluate(() => {
       const event = new KeyboardEvent('keydown', {
           key: 'Escape', bubbles: true, cancelable: true,
       });
       window.dispatchEvent(event);
   });
   ```

**Note:** `page.keyboard.press('Escape')` works fine for non-`.window` handlers (e.g., `@keydown.escape` on a specific element) and for `document`-level keyboard shortcut handlers like CollageMaker's KeyboardHandler.

### `el.focus()` Does NOT Fire `focus` Event

Calling `element.focus()` changes focus state but does NOT fire a `focus` event. Vue `@focus` handlers (e.g., for capturing pre-change snapshots) won't execute.

**Fix:** Explicitly dispatch the event after focusing:
```javascript
await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    el.focus();
    el.dispatchEvent(new Event('focus', { bubbles: true }));
}, '#mySelect');
```

### `page.selectText()` Does NOT Fire `select` Event

`locator.selectText()` selects text but does NOT fire the `select` event. Vue `@select` handlers (e.g., for tracking selection range) won't execute.

**Fix:** Use evaluate to set selection and dispatch event:
```javascript
await page.evaluate(() => {
    const el = document.getElementById('myTextarea');
    el.setSelectionRange(0, el.value.length);
    el.dispatchEvent(new Event('select', { bubbles: true }));
});
```

### `page.fill()` Does NOT Work on Range Inputs

`page.fill()` only works on text inputs, textareas, and selects. It fails silently on `<input type="range">`.

**Fix:** Use evaluate to set value and dispatch input event:
```javascript
await page.evaluate((args) => {
    const el = document.querySelector(args.selector);
    el.value = args.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
}, { selector: '#myRange', value: 10 });
```

### `page.fill()` Does NOT Commit Enter/blur Fields

`page.fill(selector, value)` focuses the element, sets the value, and fires a single `input` event. It does **not** fire `blur`, and it does **not** fire `keyup.enter`. For a field whose model updates only on commit (the commit-on-Enter/blur pattern: `v-model` draft + `@keyup.enter` / `@blur`), `fill()` updates the **draft** but never commits the **model**:

```js
await page.fill('#countInInput', '2');   // draft text = "2", but countInBeats is still 4
// ... the sequence runs with count-in 4, not 2 — silently wrong parameters
```

The failure is **silent**: no error, the field visibly shows the right text, but the underlying model — and therefore the behavior under test — uses the stale value. The wrongness shows up later as a timing/state assertion failing at a confusing spot, not at the `fill`.

**Rule:** treat `fill()` as a **draft** setter, not a **commit**. Whenever the app's contract is "the value is not applied until the user commits," the E2E must reproduce that commit:

```js
await page.fill('#countInInput', String(value));
await page.keyboard.press('Enter');      // fires @keyup.enter → commit
```

Press Enter explicitly rather than relying on incidental blur — a genuine blur (focusing another element) also commits, but it depends on focus order and what the test touches next.

**When you change an input's contract** (convert a field from `@input`-driven to commit-on-Enter/blur, or vice-versa), grep the E2E specs for `fill('<that-id>')` and add/remove the explicit commit at each site. Fields that already committed via Enter already press Enter in their tests — only the newly-converted fields need the change.

### Sidebar Sections Collapsed by Default

CollageMaker right sidebar sections (Title, Background, Overlay, etc.) are collapsed by default. Tests must expand sections before interacting with their contents.

```javascript
const header = page.locator('.sidebar-right .sidebar-section-header')
    .filter({ hasText: 'Title' });
if (await header.getAttribute('aria-expanded') !== 'true') {
    await header.click();
    await page.waitForTimeout(100);
}
```

See `_agent_docs/learnings/2026-07-22-playwright-event-simulation-gotchas.md` for full details.

## Sub-Second Timing Assertions (In-Page Measurement)

When asserting on sub-second timing (e.g., ±300–500 ms transitions driven by an audio clock), measure in-page — never from node-side polls.

**Problem:** under machine load, the node-side Playwright polling loop is starved. `expect.poll`'s 100 ms interval can arrive 1–2 s apart, and even single `page.evaluate` round-trips lag. Observed: a ready-state flip at **4531 ms** in-page first seen node-side at **5410–5447 ms** — a variable 0.3–0.9 s error that breaks tight assertions run after run, while the app itself is exactly on time.

**Diagnosis signature:** a timing assert fails by a *variable* margin (0.3–0.9 s) while an in-page logger (or manual probe) shows the app hitting its deadline within ~30 ms. If you see that, the harness is the problem, not the app.

**Fix:** install a 5 ms in-page transition logger and anchor `t0` in the *same* `page.evaluate` that dispatches the triggering action — `t0` and the transitions then share one `performance.now()` clock. Assert on the read-back log. Reserve node-side expects for state/text *existence* checks with no timing claims.

```javascript
// Install logger + dispatch the click in ONE evaluate: t0 and the transitions
// share the same performance.now() clock.
await page.evaluate((trigger) => {
    window.__t0 = performance.now();
    window.__timeline = [];
    const read = () => [
        document.body.dataset.state,
        document.querySelector('#beatDots').dataset.beat,
        document.querySelector('div[role="status"]').textContent
    ];
    let prev = read();
    const log = (v) => {
        if (v.some((x, i) => x !== prev[i])) {
            window.__timeline.push({ t: performance.now() - window.__t0, state: v[0], beat: v[1], ann: v[2] });
            prev = v;
        }
    };
    window.__tlIv = setInterval(() => log(read()), 5);
    document.querySelector(trigger).click();
}, '#playStopBtn');

// ... wait for completion (node-side, no timing claim), then read back:
await expect.poll(() => page.evaluate(() => document.body.dataset.state), { timeout: 10000 }).toBe('ready');
const timeline = await page.evaluate(() => { clearInterval(window.__tlIv); return window.__timeline; });
const playing = timeline.find((e) => e.state === 'playing');
expect(Math.abs(playing.t - 1500)).toBeLessThanOrEqual(300);
```

**Why in-page stays exact:** the browser's `setInterval` runs on the page's own event loop against `performance.now()`; node-side samples are throttled by IPC + the node process's starved timer queue. The two desynchronize under load.

**Narrow-window actions:** if a test must *act* inside a window shorter than a node poll can reliably hit (e.g., Stop during a 500 ms count-in), schedule the action in-page too: `setTimeout(() => btn.click(), 250)` inside an evaluate, recording `window.__actionT = performance.now() - window.__t0` at fire time.

**Timeline usage gotcha:** the logger records *every* change, so an `state === 'playing'` entry may be an in-state announcement/position change, not the transition you want. For Nth-occurrence or restart assertions, filter to *transitions* (`timeline[i-1].state !== e.state`), not first-matches.

Working example: `Metronomad/test/e2e/playback.spec.cjs` (`startRecordedSequence`, `scheduleActionAt`, `transitionsTo`).

## `page.evaluate` Serialization Gotchas

`page.evaluate` bodies serialize as standalone programs: any helper defined in the spec's module scope and referenced inside the evaluated function **does not exist in the page**. The failure is a `ReferenceError` *inside the evaluated code* — and if it happens in a `setInterval` callback (like the 5 ms timing logger above), it is **silent**: the first tick throws, no entries are ever pushed, and the test fails later with a confusing empty-data assertion (`countingIn entry: null`) instead of the original error.

```javascript
// BAD — timeToSeconds is defined in the spec file, undefined in-page:
await page.evaluate(() => {
    const toSec = timeToSeconds; // ReferenceError on first use
    window.__iv = setInterval(() => { log(toSec(readout())); }, 5); // dies on tick 1, silently
});

// GOOD — define every helper locally inside the evaluated body:
await page.evaluate(() => {
    const toSec = (s) => { const [m, r] = s.trim().split(':'); return Number(m) * 60 + Number(r); };
    window.__iv = setInterval(() => { log(toSec(readout())); }, 5);
});
```

**Rule:** treat the evaluated function as a separate program. Local definitions serialize fine; pass external data in as `page.evaluate(fn, arg)` arguments — never reference spec-scope identifiers.

## Test Runner DOM Query Gotcha

After Mocha runs and populates the `#mocha` div with test results, `document.getElementById('mocha')` can return `null` in certain Playwright evaluation contexts, while `document.querySelector('#mocha')` reliably finds the element.

**Root cause:** Mocha's internal DOM manipulation (adding/removing classes, injecting child elements) can cause `getElementById` to fail in some execution contexts. This is a known HTML DOM edge case — `getElementById` is not always equivalent to `querySelector('#id')` when the DOM is dynamically modified.

**Fix in `scripts/run-tests.js`:**

```javascript
// WRONG — can return null after Mocha populates #mocha
const mochaEl = document.getElementById('mocha');

// CORRECT — reliably finds the element regardless of Mocha's DOM mutations
const mochaEl = document.querySelector('#mocha');
```

**Also prefer `waitForSelector` over `waitForTimeout` for test completion detection:**

```javascript
// WRONG — arbitrary timeout, may be too short or too long
await page.waitForTimeout(1000);

// CORRECT — waits for actual test output to appear
await page.waitForSelector('#mocha .test', { timeout: 10000 });
```

**Scope note:** `#mocha .test` only detects the *first rendered result*, not suite completion. For a full completion gate before extracting stats, use the Runner `end` event — see `testing-unit.md` "In-Browser Runner: Reliable Completion Signal (Mocha 10)". Waiting for the first result then extracting snapshots mid-run state for async suites.

**Rule:** Always use `querySelector` over `getElementById` in test runners when the DOM may be dynamically modified by test frameworks.

### File References

- `scripts/run-tests.js` — test runner DOM query fix
- `_agent_docs/learnings/2026-07-28-playwright-escape-key-vue-window-modifier.md` — Escape key unreliability details
- `Metronomad/test/e2e/playback.spec.cjs` — working in-page timing logger + scheduled action helpers
- `Metronomad/_agent_docs/learnings/2026-08-20-playwright-in-page-timing-and-evaluate-closures.md` — full diagnosis and origin of the timing/evaluate rules
- `Metronomad/_agent_docs/learnings/2026-08-22-playwright-fill-does-not-commit-enter-blur-fields.md` — origin of the `fill()` draft-vs-commit rule
