# Canvas 2D Rendering

## Lifecycle Pattern

```javascript
createCanvasRenderer(canvasId) {
    init({ width, height })   // Get canvas, context, set size
    resize(width, height)     // Update dimensions with DPR scaling
    scheduleRender(drawFn)    // Debounced render via requestAnimationFrame
    render(drawFn)            // Immediate render
    dispose()                 // Cancel pending renders, null references
}
```

## DPR Scaling

```javascript
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;
canvas.height = height * dpr;
canvas.style.width = width + 'px';
canvas.style.height = height + 'px';
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

Without DPR scaling, canvas content appears blurry on Retina displays.

## Rendering Pipeline

```
1. Clear canvas (ctx.clearRect)
2. White background (ctx.fillStyle + ctx.fillRect)
3. Background layer (color/gradient/image)
4. Panel layer (clip path + drawImage per panel)
5. Hover highlight (blue border)
6. Selection highlight (white border with shadow)
```

## Same-Panel Overlap Guard

When multiple visual overlays can target the same panel (e.g., drag target + selection border), Canvas 2D anti-aliasing produces artifacts where different border styles (dashed vs. solid) are drawn at identical coordinates.

**Fix: skip the lower-priority overlay when it would overlap:**

```javascript
// Skip drag target if it matches the selected panel
if (dragTargetId && panels && dragTargetId !== selectedPanelId) {
    panelRenderer.drawDragTarget(ctx, targetPanel);
}
```

**General rule:** When multiple overlays can target the same element, draw the highest-priority overlay last and skip lower-priority overlays when they would overlap.

**File Reference:**
- `MyESModules/Rendering/CollageAssembler.js` — drag target guard

## CoreGraphics → Canvas 2D Mapping

| CoreGraphics | Canvas 2D |
|-------------|-----------|
| `CGContext` | `CanvasRenderingContext2D` |
| `CGContextClearRect` | `ctx.clearRect()` |
| `CGContextSetFillColor` | `ctx.fillStyle` |
| `CGContextFillRect` | `ctx.fillRect()` |
| `CGContextDrawImage` | `ctx.drawImage()` |
| `CGContextBeginPath` | `ctx.beginPath()` |
| `CGContextMoveTo` | `ctx.moveTo()` |
| `CGContextAddLineToPoint` | `ctx.lineTo()` |
| `CGContextClosePath` | `ctx.closePath()` |
| `CGContextClip` | `ctx.clip()` |
| `CGContextSetShadow` | `ctx.shadow*` properties |
| `CGContextSaveGState` | `ctx.save()` |
| `CGContextRestoreGState` | `ctx.restore()` |

## Semi-Transparent Image Compositing

Canvas 2D `globalAlpha` blends directly against existing canvas pixels — unlike CSS `opacity` which creates an isolated compositing layer. A semi-transparent PNG drawn on a white or transparent canvas shows the canvas color through transparent areas, not the user's configured background.

**Always pre-fill the canvas before drawing semi-transparent images:**

```javascript
function renderImage(ctx, width, height, state) {
    // Step 1: Fill background so it shows through transparent image areas
    ctx.fillStyle = state.color1 || '#000000';
    ctx.fillRect(0, 0, width, height);

    // Step 2: Draw image with opacity on top
    if (state.image) {
        ctx.save();
        ctx.globalAlpha = state.opacity ?? 1.0;
        ctx.drawImage(state.image, 0, 0, width, height);
        ctx.restore();
    }
}
```

**Key rules:**
- `ctx.save()`/`ctx.restore()` isolates `globalAlpha` — prevents alpha leakage to subsequent pipeline stages
- Pre-fill even at 100% opacity — defensive coding; if opacity changes, the background is already there
- Skip `drawImage` when image is null — background fill alone suffices
- Test with Proxy-based context mocking: verify both `fillStyle`/`fillRect` (background) AND `globalAlpha`/`drawImage` (foreground) calls

## Config-Based Rendering Helpers

When multiple Canvas 2D methods share the same `save`/`restore` + property-setting + geometry-drawing pattern, extract a shared helper that accepts a style config object. This eliminates DRY violations while keeping each public method as a thin, readable wrapper.

```javascript
_drawPanelBorder(ctx, panel, config) {
    ctx.save();
    ctx.strokeStyle = config.strokeStyle;
    ctx.lineWidth = config.lineWidth;
    if (config.shadowColor !== undefined) ctx.shadowColor = config.shadowColor;
    if (config.shadowBlur !== undefined) ctx.shadowBlur = config.shadowBlur;
    if (config.shadowOffsetX !== undefined) ctx.shadowOffsetX = config.shadowOffsetX;
    if (config.shadowOffsetY !== undefined) ctx.shadowOffsetY = config.shadowOffsetY;
    // ... geometry drawing
    ctx.restore();
}

drawSelectionBorder(ctx, panel) {
    this._drawPanelBorder(ctx, panel, {
        strokeStyle: '#ffffff',
        lineWidth: 3,
        shadowColor: 'rgba(0, 0, 0, 0.4)',
        shadowBlur: 4
    });
}

drawHoverBorder(ctx, panel) {
    this._drawPanelBorder(ctx, panel, {
        strokeStyle: '#4a9eff',
        lineWidth: 2
    });
}
```

**Critical: Guard optional config properties with `!== undefined`, not truthy checks.** Canvas property values like `0` (lineWidth, shadowBlur) and `''` (strokeStyle) are valid falsy values. A truthy check (`if (config.lineWidth)`) would silently skip setting `lineWidth: 0`, producing incorrect rendering.

**When to use:**
- 2+ methods share the same save/restore + property-setting pattern
- Methods differ only in which properties they set or their values
- The geometry-drawing logic is identical across callers

**File Reference:**
- `MyESModules/Rendering/PanelRenderer.js` — `_drawPanelBorder` extraction

## Gotchas

1. **Canvas coordinates are CSS pixels after DPR transform** — `ctx.setTransform(dpr, ...)` means you draw in CSS pixel coordinates
2. **Path clipping is persistent** — once `ctx.clip()` is called, all drawing is clipped until `ctx.restore()`
3. **`drawImage` 9-parameter form** — `drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` for cropped rendering
4. **Shadow requires 4 properties** — `shadowColor`, `shadowBlur`, `shadowOffsetX`, `shadowOffsetY`
5. **`globalAlpha` blends against canvas, not isolated** — pre-fill background before drawing semi-transparent images (see "Semi-Transparent Image Compositing" above)

## Backward-Compatible Renderer Extensions

When adding a new positioning or layout model to an existing renderer, preserve backward compatibility by detecting "legacy mode" at the top of the render function and reusing the flag across all rendering decisions (position, background, outline):

```javascript
// Detect legacy mode: no custom width or position set
const isLegacyMode = (titleStyle.titleBoxWidth === null || titleStyle.titleBoxWidth === undefined)
    && (titleStyle.titleBoxX === null || titleStyle.titleBoxX === undefined);
```

**Key rules:**
- **Use `=== null || === undefined`, not truthy/falsy** — `0` could be a valid value in some contexts
- **Compute the flag once** — reuse `isLegacyMode` across position, background, and outline decisions to ensure consistency
- **Background rect positioning differs between modes** — In legacy mode, `boxLeft` is at text start and `boxWidth` already includes padding, so background goes at `boxLeft - PADDING`. In box mode, `boxLeft` is at the box edge and `boxWidth` is user-set, so background goes at `boxLeft` directly.

### File Reference

- `MyESModules/Rendering/TitleRenderer.js` — legacy vs. box-based positioning

## Shared Offscreen Canvas for Text Measurement

Measurement functions that need `CanvasRenderingContext2D.measureText()` should accept an optional `measureCtx` parameter. When called in a hot path (e.g., `pointermove` during drag), **create a single shared offscreen canvas at factory init time** and pass its context to all measurement calls:

```javascript
// In factory function (e.g., createTitleInteraction):
const measureCanvas = document.createElement('canvas');
measureCanvas.width = 1;
measureCanvas.height = 1;
const measureCtx = measureCanvas.getContext('2d');

// Pass to all measurement calls:
const bounds = computeMultiLineBounds(style, runs, width, height, measureCtx);
```

**Why this matters:** Without a shared canvas, each `measureText()` call creates a new offscreen canvas and 2D context. During a 1-second drag at 60fps, that's 60 canvases — all immediately garbage-collected. The shared canvas eliminates this allocation entirely.

**Key details:**
- **1x1 sizing** — `measureText()` only needs the context, not the drawing surface. `width = 1; height = 1` minimizes allocation.
- **No race conditions** — JavaScript is single-threaded. Each `measureText()` call sets `ctx.font` before measuring, preventing state leakage.
- **Factory-scoped** — The shared canvas lives in the factory closure, not globally. Each handler instance gets its own canvas.
- **Backward compatible** — The `measureCtx` parameter is optional. Callers that omit it still work (they create per-call canvases).

**Measurement function signature:**
```javascript
export function computeMultiLineBounds(style, runs, width, height, measureCtx) {
    const ctx = measureCtx || (() => {
        const offscreen = document.createElement('canvas');
        return offscreen.getContext('2d');
    })();
    // ... measurement using ctx.measureText()
}
```

**Testing the pattern:** Wrap `document.createElement` to count canvas creations. After factory init (which creates the shared canvas), reset the counter. Simulate hot-path calls — expect zero new canvases:

```javascript
let createCanvasCalls = 0;
const origCreateElement = document.createElement.bind(document);
document.createElement = function (tagName) {
    if (tagName.toLowerCase() === 'canvas') createCanvasCalls++;
    return origCreateElement(tagName);
};

const handler = createTitleInteraction({...}); // Factory creates shared canvas
createCanvasCalls = 0; // Reset after init

// Simulate drag — should create 0 new canvases
for (let i = 0; i < 20; i++) {
    canvas.dispatchEvent(new PointerEvent('pointermove', {...}));
}
expect(createCanvasCalls).to.equal(0);

document.createElement = origCreateElement; // Restore
```

**When to apply:**
1. A measurement function accepts an optional context parameter
2. The function is called in a hot path (`pointermove`, animation frame)
3. The caller has a stable factory scope to hold the shared resource

## Offscreen Canvas Export

To export at a resolution different from the on-screen preview, create a detached canvas (never appended to the DOM), render into it, then convert to blob:

```javascript
function exportToJpeg(assembler, state, quality) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        assembler.render(ctx, { ...state, canvasSize: { width: 1920, height: 1080 } });

        canvas.toBlob((blob) => {
            if (!blob) { reject('Failed'); return; }
            const url = URL.createObjectURL(blob);
            let a = null;
            try {
                a = document.createElement('a');
                a.href = url;
                a.download = 'collage.jpg';
                document.body.appendChild(a);
                a.click();
            } finally {
                if (a && document.body.contains(a)) {
                    document.body.removeChild(a);
                }
                URL.revokeObjectURL(url); // Critical: prevents memory leak
            }
            resolve('success');
        }, 'image/jpeg', quality);
    });
}
```

### Critical: `try/finally` for Object URL Cleanup

If `a.click()` throws (e.g., popup blocker), cleanup code after it never runs. The `URL.createObjectURL()` blob remains in memory indefinitely — a **memory leak**. Always wrap the download trigger in `try/finally`.

The offscreen canvas is a local variable with no DOM attachment — it is auto-collected by GC after the callback. No explicit cleanup needed.

### File Reference

- `MyESModules/Export/ExportManager.js` — Offscreen canvas export

## Canvas `destination-out` Compositing for Shape Cutouts

When you need to cut a shaped hole in a filled region on Canvas 2D (e.g., dark overlay with a shaped "hole" for crop preview), use `globalCompositeOperation = 'destination-out'`:

```javascript
// 1. Fill entire canvas with dark overlay
ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
ctx.fillRect(0, 0, cssW, cssH);

// 2. Cut out the shape, clipped to crop rect
ctx.save();
try {
    ctx.globalCompositeOperation = 'destination-out';

    // Clip to crop rectangle first
    ctx.beginPath();
    ctx.rect(cropScreenX, cropScreenY, cropScreenW, cropScreenH);
    ctx.clip();

    // Draw the shape — this erases the dark overlay where the shape is
    beginPathFromPoints(ctx, shapePoints);
    ctx.fill();
} finally {
    ctx.restore();
}
```

### Key Patterns

**Always use `try/finally` for save/restore safety.** If an exception occurs between `ctx.save()` and `ctx.restore()` (e.g., malformed points, invalid path), the canvas state leaks: `globalCompositeOperation` remains `'destination-out'` and the clip region stays active, corrupting all subsequent drawing. The `try/finally` guarantees restoration:

```javascript
ctx.save();
try {
    ctx.globalCompositeOperation = 'destination-out';
    // ... risky operations ...
} finally {
    ctx.restore();
}
```

**Clip before composite.** The clip region is persistent until `ctx.restore()`. Set it before the composite operation so the shape cutout is constrained to the crop rectangle.

**Compute shape points once.** When the same shape points are needed for multiple operations (cutout fill, border stroke, decorative overlay), compute them once and reuse:

```javascript
const shapePoints = computeShapeOverlayPoints(geometry, cropScreen, 0);
// Reuse for cutout, border, and overlay
```

### Anti-Aliasing Considerations

Canvas 2D anti-aliasing at the shape edges of a `destination-out` fill produces a semi-transparent fringe (the "halo effect"). This is usually visually acceptable and is further masked by the decorative shape overlay drawn on top with a solid stroke. If the halo is objectionable, slightly increase the shape size (negative padding) to compensate.

### Testing Strategy

Test the shaped overlay approach by wrapping canvas context methods to capture operations:

```javascript
// Capture clip() and globalCompositeOperation changes
ctx.clip = function () {
    captured.clip.push(true);
    return origClip();
};

Object.defineProperty(ctx, 'globalCompositeOperation', {
    get: function () { return this._gco || 'source-over'; },
    set: function (v) {
        captured.globalCompositeOperation.push(v);
        this._gco = v;
    },
    configurable: true
});
```

Verify:
- Shaped panels: `clip` called at least once, `globalCompositeOperation` includes `'destination-out'`
- Rect panels: no `clip` calls, no `'destination-out'` compositing
- save/restore counts are balanced

### When to Use This Pattern

- When you need to cut a shaped hole in a filled region on Canvas 2D
- When the shape is defined by polygon points (not a simple rectangle)
- When the cutout needs to be constrained to a rectangular region
- For crop previews, mask overlays, and any UI where a shape defines a "visible through" area

### File References

- `MyESModules/App/createCropPreviewRenderer.js` — shaped dark overlay implementation
- `MyESModules/Layout/CropOverlayShape.js` — `beginPathFromPoints` helper

## Dual-Canvas Visibility Guard

When rendering to multiple canvases (e.g., desktop sidebar + mobile bottom sheet), skip draw operations for canvases that are hidden or disconnected. CSS `display: none` does not prevent Canvas 2D from executing all draw calls, wasting CPU/GPU cycles — especially costly on high-DPR mobile screens (2x–3x).

**Guard with O(1) visibility check before rendering:**

```javascript
function _renderCropPreviewOnCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Skip disconnected or hidden canvases
    if (!canvas.isConnected || canvas.offsetParent === null) return;

    const ctx = canvas.getContext('2d');
    // ... draw operations (only executed for visible canvases)
}
```

**Key details:**
- `canvas.isConnected` — `false` if the canvas was removed from the DOM
- `canvas.offsetParent === null` — `true` for `display: none` and `visibility: hidden` elements; also catches `position: fixed` elements with zero dimensions
- Both checks are O(1) and prevent all Canvas 2D draw operations for hidden canvases
- On mobile with dual canvases, this halves the rendering workload during interactive crop adjustments

**When to apply:**
- Multiple canvases receive the same rendering output (e.g., desktop + mobile previews)
- One or more canvases may be hidden via CSS based on viewport or layout state
- Rendering is called on every interaction frame (crop drag, zoom, etc.)

### File References

- `MyESModules/App/createCropPreviewRenderer.js` — dual-canvas visibility guard
