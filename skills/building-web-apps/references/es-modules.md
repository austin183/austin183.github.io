# ES Module Conventions

## Contents

- [Named exports only](#named-exports-only)
- [Barrel exports](#barrel-exports)
- [Relative imports with `.js` extension](#relative-imports-with-js-extension)
- [Factory functions](#factory-functions)
- [Pure functions for math](#pure-functions-for-math)
- [Pure function numeric guards](#pure-function-numeric-guards)
- [Barrel export verification](#barrel-export-verification)
- [Moving a function to a new module](#moving-a-function-to-a-new-module)
- [Gotchas](#gotchas)

## Named Exports Only

```javascript
// GOOD
export function createCanvasRenderer(canvasId) { ... }
export const LayoutGenerator = { ... };
export const SIZE_CONSTANTS = { ... };

// BAD — no default exports
export default function createCanvasRenderer(canvasId) { ... }
```

## Barrel Exports

`MyESModules/index.js` re-exports everything:

```javascript
export { createCanvasRenderer } from './Rendering/CanvasRenderer.js';
export { LayoutGenerator } from './Layout/LayoutGenerator.js';
export * as FitMath from './Layout/FitMath.js';
```

## Relative Imports with `.js` Extension

```javascript
// GOOD
import { createCanvasRenderer } from '../Rendering/CanvasRenderer.js';

// BAD — missing .js extension
import { createCanvasRenderer } from '../Rendering/CanvasRenderer';
```

## Factory Functions

```javascript
// GOOD — factory function returns plain object
export function createCanvasRenderer(canvasId) {
    let canvas = null;
    let ctx = null;
    return {
        init() { ... },
        render() { ... },
        dispose() { ... }
    };
}

// BAD — no classes unless needed
export class CanvasRenderer { ... }
```

## Pure Functions for Math

Layout math modules export pure functions:

```javascript
// FitMath.js — pure functions, no side effects
export function fit(sourceSize, containerSize) { ... }
export function sourceRect(imageSize, panelSize) { ... }
```

## Pure Function Numeric Guards

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

## Barrel Export Verification

When re-exporting from a source module, **verify the source actually exports the name you're re-exporting**. A barrel that re-exports a non-existent name will silently export `undefined` at runtime (no compile-time error in browsers).

```javascript
// WRONG — ExportManager.js exports { ExportManager }, not exportToJpeg
export { exportToJpeg } from './Export/ExportManager.js';

// CORRECT — re-export from the actual source module
export { exportToJpeg } from './Export/formats/jpegExporter.js';
```

**Verify by checking the source file** for `export function exportToJpeg` or `export const exportToJpeg`. If the source exports a namespace object (like `ExportManager`), you cannot re-export its methods via `export { method } from './source.js'`.

## Moving a Function to a New Module

Moving a function to a new module is the classic case where barrel re-exports go stale. The source module that the barrel's `from` clause points to no longer exports the name, so the barrel silently exports `undefined` — and nothing fails at load time. Checklist after every move:

1. **Update every import site** to the new module (or the barrel, per project convention).
2. **Update the barrel's `from` clause** in `MyESModules/index.js` to point to the new module (and the name, if the move was a rename).
3. **Verify the barrel directly** — grep the barrel for the moved name and confirm its `from` clause resolves to a module that actually exports it.

**The barrel check is vacuous if consumers bypass the barrel.** In projects where every consumer imports directly from source modules, a stale barrel passes every consumer and every test — the breakage only surfaces when someone later imports the name *through* the barrel. "All consumers work" is not evidence the barrel is correct; check the barrel explicitly.

## Gotchas

1. **`.js` extension required** — ES modules in browsers require explicit file extensions in imports
2. **CORS enforcement** — ES module imports are subject to CORS. Must serve via HTTP, not `file://`
3. **`type="module"` required** — Script tags must have `type="module"` to use import/export
4. **Top-level await not needed** — All async initialization happens in Vue lifecycle hooks
5. **Barrel re-exports of missing names** — `export { foo } from './bar.js'` where `bar.js` doesn't export `foo` silently yields `undefined`. Always verify the source module exports the name.
6. **Direct import of a missing name fails at link time — with a hang-shaped symptom** — `import { foo } from './bar.js'` where `bar.js` doesn't export `foo` is a `SyntaxError` at module-link time: the whole module graph (test script → imports → modules under test) never instantiates, so in the in-browser Mocha runner the file reports `mocha.run() was never reached within the timeout — test page error or hung suite` with **no per-test error**. This is the loud counterpart of gotcha 5 (barrel = silent `undefined`, direct import = broken page). Two consequences: (a) a TDD RED that adds a not-yet-existing name to an import list is a broken-page RED, not a failing-test RED — prefer asserting the behavior without touching the import list; (b) when a test file fails with the timeout message, check the page console (or `node --check` an extracted module script) before suspecting the harness — the link error names the missing export. A broken-page RED also *masks* the per-test REDs behind it in the same file: after the first fix, re-run and confirm the remaining failures are the ones you expect.
7. **Destructured parameter scoping** — When a function destructures its parameter object, the original variable name is not accessible inside the function body. Destructure all needed properties explicitly:
```javascript
// WRONG — `options` is not defined inside the function
render(ctx, { panels, images, titleStyle }) {
    helper(options.someProp); // ReferenceError!
}

// CORRECT — destructure the needed property too
render(ctx, { panels, images, titleStyle, someProp }) {
    helper(someProp); // Works
}
```
JavaScript destructuring creates new bindings for each destructured property. The original parameter name (`options`, `params`, etc.) is not preserved.
8. **Purity grep gates are substring matches — a sibling's filename contains the needle** — a phase gate like `rg "localStorage" savedLoops.js → zero hits` (2026-08-30, CR 004 Phase 1) was tripped by four JSDoc mentions of the sibling adapter module `localStorageAdapter.js`, whose *filename* contains `localStorage`. Behavior was never at issue — only documentation. When authoring a purity grep gate for a module, check whether *other filenames in that module's own directory* contain the needle; if so, never name the adapter sibling by filename in the gated module's prose (reword to "the raw-storage boundary" / "the sibling adapter module"). A word-boundary variant (`rg "localStorage\b"`) also works but changes the pinned gate — rewording the prose keeps the pin byte-for-byte.
