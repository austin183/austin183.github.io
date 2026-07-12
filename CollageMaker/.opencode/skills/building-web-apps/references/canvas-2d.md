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

When multiple visual overlays can target the same panel (e.g., hex drag target + selection border), Canvas 2D anti-aliasing produces artifacts where different border styles (dashed vs. solid) are drawn at identical coordinates.

**Fix: skip the lower-priority overlay when it would overlap:**

```javascript
// Skip hex drag target if it matches the selected panel
if (hexDragTargetId && panels && hexDragTargetId !== selectedPanelId) {
    panelRenderer.drawHexDragTarget(ctx, targetPanel);
}
```

**General rule:** When multiple overlays can target the same element, draw the highest-priority overlay last and skip lower-priority overlays when they would overlap.

**File Reference:**
- `MyESModules/Rendering/CollageAssembler.js` — hex drag target guard

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
