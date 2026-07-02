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
