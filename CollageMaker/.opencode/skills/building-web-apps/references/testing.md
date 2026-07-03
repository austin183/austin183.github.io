# Testing Patterns

## Contents
- Unit Tests — Mocha + Chai
- Mocking Browser APIs
- Chai CDN Limitations
- Manager-Specific Testing
- E2E Tests — Playwright
- Gotchas
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

### Manager-Specific Testing

**TitleManager** — `toggleBold(start, end)` passes `{ bold: undefined }` to `applyFormattingToRange`, which flips **all three** formatting flags (bold, italic, underline) via the `undefined` fallback. Tests must verify actual cross-flag toggling behavior, not the intuitive "only bold toggles" expectation. See `MyESModules/State/TitleManager.js` lines 91-93.

**ExportManager** — `exportToJpeg` creates an offscreen canvas never appended to the DOM. Use a mock assembler with a `render()` method that records calls. Verify: canvas is NOT in `document.body`, no `<a>` download links remain (cleanup runs in `finally`), and mock assembler received correct canvas size and context.

**SettingsPersistence** — `save()`/`load()` use `localStorage` directly. Testing strategy:
1. `beforeEach`: `localStorage.removeItem(STORAGE_KEY)` to start clean
2. **Corrupted JSON**: Write invalid JSON, verify `load()` returns defaults
3. **Quota exceeded**: Mock `localStorage.setItem` to throw `QuotaExceededError`
4. **Partial data**: Write incomplete settings, verify defaults fill missing fields
5. **Empty string**: `localStorage.setItem(key, '')` — falsy, so `load()` returns defaults

`load()` merges via `{ ...defaults, ...parsed }` — stored values override defaults, missing keys get defaults. This is the versioning strategy for evolving settings.

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

## Gotchas

1. **CORS for ES modules** — Tests must run on HTTP server, not `file://`
2. **`mocha.run()` timing** — Must be after all `describe` blocks
3. **`waitForTimeout()` is fragile** — Use assertion-based waits in Playwright
4. **Canvas is opaque** — Can't inspect canvas pixels directly in Playwright
5. **Undo history is crop-only** — Only crop operations push undo commands. Image removal, layout changes, gutter adjustments, and other actions do NOT create undo history. The `#undoBtn` and `#redoBtn` use `:disabled="!canUndo"` / `:disabled="!canRedo"` bindings, so they stay disabled if no undo commands exist on the stack.
6. **Chai CDN lacks plugins** — No `eventually` for async or `startWith` for strings. Use try/catch and regex.
7. **TitleManager cross-flag toggling** — `toggleBold()` flips bold+italic+underline. Test actual behavior, not intuitive expectation.
8. **Mock restore discipline** — Always restore mocked browser APIs in `finally` blocks. A leaking mock breaks all subsequent tests.
9. **E2E dev server port** — Full session tests require dev server on port 8000 and are sensitive to Vue mount timing.

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

## Assertion Density

Rule of thumb: unit tests average 2-3 assertions per test. E2E tests average fewer assertions since each interaction is expensive. Grep-based counting (`grep -c 'expect(' file`) is a quick way to estimate coverage.
