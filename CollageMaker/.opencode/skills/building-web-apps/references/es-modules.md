# ES Module Conventions

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

## Barrel Export Verification

When re-exporting from a source module, **verify the source actually exports the name you're re-exporting**. A barrel that re-exports a non-existent name will silently export `undefined` at runtime (no compile-time error in browsers).

```javascript
// WRONG — ExportManager.js exports { ExportManager }, not exportToJpeg
export { exportToJpeg } from './Export/ExportManager.js';

// CORRECT — re-export from the actual source module
export { exportToJpeg } from './Export/formats/jpegExporter.js';
```

**Verify by checking the source file** for `export function exportToJpeg` or `export const exportToJpeg`. If the source exports a namespace object (like `ExportManager`), you cannot re-export its methods via `export { method } from './source.js'`.

## Gotchas

1. **`.js` extension required** — ES modules in browsers require explicit file extensions in imports
2. **CORS enforcement** — ES module imports are subject to CORS. Must serve via HTTP, not `file://`
3. **`type="module"` required** — Script tags must have `type="module"` to use import/export
4. **Top-level await not needed** — All async initialization happens in Vue lifecycle hooks
5. **Barrel re-exports of missing names** — `export { foo } from './bar.js'` where `bar.js` doesn't export `foo` silently yields `undefined`. Always verify the source module exports the name.
6. **Destructured parameter scoping** — When a function destructures its parameter object, the original variable name is not accessible inside the function body. Destructure all needed properties explicitly:
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
