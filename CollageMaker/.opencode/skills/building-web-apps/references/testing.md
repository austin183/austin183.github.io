# Testing Patterns

## Contents
- Unit Tests — Mocha + Chai
- Real Objects Over Mocks
- Mocking Browser APIs
- RAF Mocking
- Canvas Dimension Interception
- Canvas 2D Context Mocking
- Chai CDN Limitations
- Manager-Specific Testing
- Falsy vs. Missing Field Validation
- E2E Tests — Playwright
- Playwright Page Load Strategy
- PointerEvent Testing
- DragEvent Testing
- Deferred Feature Tests
- Pure Function Testing
- Cache API Gotchas
- Gotchas
- Testing Strategy for Deduplication
- Assertion Density

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

```javascript
function createMockCtx(width = 1920, height = 1080) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const realCtx = canvas.getContext('2d');

    const calls = {
        fillStyle: [],
        font: [],
        fillRect: [],
        fillText: [],
        createLinearGradient: [],
        addColorStop: []
    };

    return new Proxy(realCtx, {
        set(target, prop, value) {
            if (prop === 'fillStyle') calls.fillStyle.push(value);
            else if (prop === 'font') calls.font.push(value);
            // ... track other properties as needed
            target[prop] = value;
            return true;
        },
        get(target, prop) {
            if (prop === 'fillStyle') return calls.fillStyle[calls.fillStyle.length - 1] || '#000000';
            if (prop === 'font') return calls.font[calls.font.length - 1] || '36px Arial';
            if (prop === 'fillRect') {
                return function(x, y, w, h) {
                    calls.fillRect.push({ x, y, w, h });
                    return target.fillRect.call(target, x, y, w, h);
                };
            }
            if (prop === 'fillText') {
                return function(text, x, y) {
                    calls.fillText.push({ text, x, y });
                    return target.fillText.call(target, x, y);
                };
            }
            if (prop === 'createLinearGradient') {
                return function(x1, y1, x2, y2) {
                    calls.createLinearGradient.push({ x1, y1, x2, y2 });
                    const gradient = target.createLinearGradient.call(target, x1, y1, x2, y2);
                    // Intercept addColorStop on returned gradients
                    const origAddColorStop = gradient.addColorStop.bind(gradient);
                    gradient.addColorStop = function(offset, color) {
                        calls.addColorStop.push({ offset, color });
                        return origAddColorStop(offset, color);
                    };
                    return gradient;
                };
            }
            return target[prop];
        }
    });
}
```

**Key patterns:**
- **Use Proxy instead of `Object.defineProperty`** — works reliably across all browsers with host objects
- Real canvas context preserves accurate metrics (`measureText`, `strokeText`) and rendering behavior
- Intercept properties via `set`/`get` traps, methods via `get` trap returning wrapped functions
- **Intercept methods on returned objects too** — e.g., `addColorStop` is on `CanvasGradient`
- Use offscreen `<canvas>` elements as image sources instead of `new Image()` (since `Image.complete` is read-only)

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
- Use tolerance only when legitimate variation exists (e.g., font metric differences across platforms)
- For positioning assertions where exact values are hard to compute, use relative relationships:
  ```javascript
  expect(bg.x).to.be.lessThanOrEqual(textX - 12);
  expect(bg.w).to.be.closeTo(textWidth + 24, 0.5);
  ```

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

**TitleManager** — `toggleBold(start, end)` passes `{ bold: undefined }` to `applyFormattingToRange`, which flips **all three** formatting flags (bold, italic, underline) via the `undefined` fallback. Tests must verify actual cross-flag toggling behavior, not the intuitive "only bold toggles" expectation. See `MyESModules/State/TitleManager.js` lines 91-93.

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

## DragEvent Testing

### DragEvent.dataTransfer Cannot Be Mocked

You cannot pass a custom `dataTransfer` object to the `DragEvent` constructor in any browser:

```javascript
// FAILS — TypeError: Failed to convert value to 'DataTransfer'
const event = new DragEvent('drop', {
    dataTransfer: { files: [mockFile] }
});
```

**Workaround:** Test listener presence by tracking `preventDefault()` calls rather than simulating file drops:

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

## Deferred Feature Tests

For deferred features (PWA, ML saliency, responsive CSS), tests serve as requirements documentation:

- **Unit tests for pure functions** pass immediately (no browser API dependencies)
- **E2E tests** document expected behavior but will fail until the feature ships
- **Deferred tests** include clear comments explaining what's needed
- **Test numbering** follows the priority plan sections for traceability

```javascript
it('3.5.3.1 — Style.css: @media rules (deferred — documents requirement)', () => {
    // Responsive media queries are a deferred feature.
    // This test documents the requirement: @media rules should be added
    // for mobile (<768px) and tablet (<1200px) breakpoints.
    expect(css).to.be.a('string');
    expect(css.length).to.be.greaterThan(100);
});
```

**Rules:**
1. Label tests as **"deferred"** in the test name
2. Verify base selectors exist (`.main-layout`, `.sidebar`, `#previewCanvas`)
3. Comment with `TODO` for the future assertion
4. **Never assert on features that don't exist yet** — causes CI failures

### Pure Function Testing

Design browser-dependent utilities as pure functions that can be unit tested without browser APIs. Example: PWA cache utilities (`PWACacheUtils.js`) export pure functions for URL routing, cache key computation, and manifest validation — all testable in Mocha without a service worker context.

### Cache API Gotchas

- **No built-in eviction** — The Cache API has no LRU eviction or size limits. Implement eviction logic in the service worker `activate` event.
- **Opaque responses cannot be cached** — Cross-origin requests without CORS headers return `response.type === 'opaque'`. `caches.put()` throws `TypeError` on opaque responses. Always check `response.type !== 'opaque'` before caching.

## Gotchas

1. **CORS for ES modules** — Tests must run on HTTP server, not `file://`
2. **Viewport resize waits** — After `setViewportSize()`, use `waitForSelector('#app', { state: 'visible' })` to wait for Vue re-render, not `waitForTimeout()`. Fixed timeouts are fragile.
3. **`mocha.run()` timing** — Must be after all `describe` blocks
4. **`waitForTimeout()` is fragile** — Use assertion-based waits in Playwright. For viewport resizes, wait for `#app` visibility instead.
5. **Canvas is opaque** — Can't inspect canvas pixels directly in Playwright
6. **Undo history is crop-only** — Only crop operations push undo commands. Image removal, layout changes, gutter adjustments, and other actions do NOT create undo history. The `#undoBtn` and `#redoBtn` use `:disabled="!canUndo"` / `:disabled="!canRedo"` bindings, so they stay disabled if no undo commands exist on the stack.
7. **Chai CDN lacks plugins** — No `eventually` for async or `startWith` for strings. Use try/catch and regex.
8. **TitleManager cross-flag toggling** — `toggleBold()` flips bold+italic+underline. Test actual behavior, not intuitive expectation.
9. **Mock restore discipline** — Always restore mocked browser APIs in `finally` blocks. A leaking mock breaks all subsequent tests.
10. **E2E dev server port** — Full session tests require dev server on port 8000 and are sensitive to Vue mount timing.
11. **Hit test boundary points** — For a 2x2 grid, (50%, 50%) lands on all four panel boundaries. Use 25% or 75% offsets.
12. **`networkidle` timeouts** — `waitUntil: 'networkidle'` in test runners times out when tests include `fetch()` for non-existent resources. Use `domcontentloaded` + `waitForSelector('#mocha', { state: 'attached' })` instead.
13. **World-review catches gaps** — An external reviewer asks "What edge cases are not covered?" and often discovers missing tests for combined formatting, default behavior, property state, and exact positioning. Schedule world-review for all P1 test files before marking them complete.
14. **Registry signature alignment** — Test the dispatcher → strategy integration path, not just the strategy in isolation. A misaligned strategy signature silently corrupts output (e.g., quality passed where exportSize is expected).
15. **Barrel export verification** — Test barrel exports explicitly: `expect(typeof barrel.exportToJpeg).to.equal('function')`. A re-export of a non-existent name silently yields `undefined`.
16. **DragEvent.dataTransfer is unmockable** — Cannot pass custom `dataTransfer` to `DragEvent` constructor. Test listener presence via `preventDefault()` tracking instead.
17. **Document-level listeners leak across tests** — Listeners on `document` persist between Mocha tests. Use describe-level `afterEach` cleanup, never `beforeEach` + per-test setup (causes accumulation).
18. **RAF mock must be bound** — `window.requestAnimationFrame.bind(window)` preserves `this`. Without bind, restoring the original fails in strict mode. Always restore in `afterEach`.
19. **Read state inside RAF callback** — When debouncing with RAF, capture state at frame time, not call time. Reading at call time produces stale values during rapid interactions.
20. **Null inputs crash browser API utilities** — `FileReader.readAsDataURL(null)` throws `TypeError`. Always guard: `if (!file) return Promise.resolve(null)`.

### Testing undo/redo buttons

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

## Testing Strategy for Deduplication

When extracting a shared utility from N duplicated implementations, follow this 4-step testing approach:

1. **Test the utility in isolation** — happy path, error paths, null inputs
2. **Test the barrel export** — verify the re-export resolves to a function: `expect(typeof barrel.loadImageFromFile).to.equal('function')`
3. **Test the consumers still work** — the existing test suite should catch regressions
4. **Verify line count reduction** — document how many lines were eliminated

This strategy ensures the extracted utility is correct on its own, properly wired through the module system, and doesn't break existing callers.

## Assertion Density

Rule of thumb: unit tests average 2-3 assertions per test. E2E tests average fewer assertions since each interaction is expensive. Grep-based counting (`grep -c 'expect(' file`) is a quick way to estimate coverage.
