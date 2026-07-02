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

## Gotchas

1. **`.js` extension required** — ES modules in browsers require explicit file extensions in imports
2. **CORS enforcement** — ES module imports are subject to CORS. Must serve via HTTP, not `file://`
3. **`type="module"` required** — Script tags must have `type="module"` to use import/export
4. **Top-level await not needed** — All async initialization happens in Vue lifecycle hooks
