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

## Gotchas

1. **Canvas coordinates are CSS pixels after DPR transform** — `ctx.setTransform(dpr, ...)` means you draw in CSS pixel coordinates
2. **Path clipping is persistent** — once `ctx.clip()` is called, all drawing is clipped until `ctx.restore()`
3. **`drawImage` 9-parameter form** — `drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` for cropped rendering
4. **Shadow requires 4 properties** — `shadowColor`, `shadowBlur`, `shadowOffsetX`, `shadowOffsetY`

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
