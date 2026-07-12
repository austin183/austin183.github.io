# E2E and Event Testing Patterns

## Contents
- E2E Tests — Playwright
- Buffer-Based File Upload
- Playwright Page Load Strategy
- PointerEvent Testing
- TouchEvent Constructor
- DragEvent Testing
- Document-Level Event Listener Test Isolation
- Testing undo/redo buttons

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
