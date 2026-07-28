# Unit Testing Patterns

## Contents
- Unit Tests — Mocha + Chai
- Real Objects Over Mocks
- Mocking Browser APIs
- RAF Mocking
- Canvas Dimension Interception
- Canvas 2D Context Mocking
- Canvas Render Order Testing via Context Method Wrapping
- Test State, Not Just Actions
- Tolerance Precision in Positioning Tests
- Testing Default Behavior Explicitly
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
