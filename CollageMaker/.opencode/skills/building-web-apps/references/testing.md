# Testing Patterns

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

## Gotchas

1. **CORS for ES modules** — Tests must run on HTTP server, not `file://`
2. **`mocha.run()` timing** — Must be after all `describe` blocks
3. **`waitForTimeout()` is fragile** — Use assertion-based waits in Playwright
4. **Canvas is opaque** — Can't inspect canvas pixels directly in Playwright
5. **Undo history is crop-only** — Only crop operations push undo commands. Image removal, layout changes, gutter adjustments, and other actions do NOT create undo history. The `#undoBtn` and `#redoBtn` use `:disabled="!canUndo"` / `:disabled="!canRedo"` bindings, so they stay disabled if no undo commands exist on the stack.

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
