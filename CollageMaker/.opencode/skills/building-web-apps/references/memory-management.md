# Memory Management Patterns

## Disposing HTMLImageElement References

When images are removed from Vue state, the `HTMLImageElement` references must be explicitly nullified to allow garbage collection. Failing to do so keeps images in memory indefinitely.

### Pattern: `disposeImageItem()`

```javascript
export function disposeImageItem(imageItem) {
    if (imageItem && imageItem.img instanceof HTMLImageElement) {
        imageItem.img = null;
    }
}
```

**Use this utility consistently** when removing images from state. Cross-module review catches underutilization — creating the utility but not using it everywhere is a common oversight.

### Replacing Image References — Critical Cleanup Pattern

When replacing an image reference (e.g., background image, overlay image), **always null out the old reference before assigning the new one**:

```javascript
// WRONG — memory leak: old background not disposed
backgroundImage = newImage;

// CORRECT — explicit disposal before replacement
if (backgroundImage && backgroundImage.img) {
    disposeImageItem({ img: backgroundImage });
}
backgroundImage = newImage;
```

**Why this matters:** Memory leaks from replacing images are subtle and often only caught through systematic review. They don't manifest in normal usage because the old reference is silently kept alive.

### State Mutation

When clearing all images, **maintain the same array reference**:

```javascript
// CORRECT — maintains array reference for reactivity
state.images.forEach(disposeImageItem);
state.images.length = 0;

// OR using splice
state.images.splice(0);
```

**Why not `state.images = []`?** Reassignment creates a new array reference. External code holding a reference to the original array will see stale state, and Vue's reactivity tracking may behave inconsistently.

See `references/vue-options-api.md` for more on array mutation patterns.

## URL.createObjectURL Cleanup

Blob URLs created with `URL.createObjectURL()` must be revoked to prevent memory leaks. Always wrap in `try/finally`:

```javascript
const url = URL.createObjectURL(blob);
let a = null;
try {
    a = document.createElement('a');
    a.href = url;
    a.click();
} finally {
    if (a && document.body.contains(a)) {
        document.body.removeChild(a);
    }
    URL.revokeObjectURL(url); // Critical: prevents memory leak
}
```

If `click()` throws (e.g., popup blocker), the `finally` block still runs and revokes the URL.

## Lifecycle Cleanup Checklist

For any module or component acquiring resources, implement cleanup in `beforeUnmount()` or equivalent:

- [ ] Cancel pending `requestAnimationFrame` renders (`cancelAnimationFrame()`)
- [ ] Remove event listeners (window, document, canvas) — track handlers for removal
- [ ] Nullify HTMLImageElement references in state
- [ ] Revoke `URL.createObjectURL` URLs if not already done
- [ ] Dispose Canvas 2D contexts (if created dynamically with `getContext('webgl')`)
- [ ] Clear any timers (`setTimeout`, `setInterval`) — use `clearTimeout(id); id = null;` on every exit path (success, failure, error, dispose). For timeout guards on Web Workers, also add a guard clause in the callback: `if (this.isDisposed || !this.worker) return;`. See `references/web-workers.md`

### Example: Canvas Renderer Disposal

```javascript
createCanvasRenderer(canvasId) {
    let animationFrameId = null;
    
    function dispose() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Force GPU memory release (context loss) before nulling references
        if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
        }
        canvas = null;
        ctx = null;
    }
    
    return {
        init: () => { /* ... */ },
        resize: () => { /* ... */ },
        scheduleRender: (fn) => { /* ... */ },
        dispose: dispose
    };
}
```

## Lifecycle Cleanup Ordering

When `beforeUnmount()` disposes resources, the **order matters** if interaction handlers are async. Remove all interaction listeners BEFORE disposing renderers and state managers:

```javascript
// WRONG — async drop handler may fire after canvas disposal:
beforeUnmount() {
    this.canvasRenderer.dispose();    // canvas = null
    this._dropCleanup();              // too late — drop promise already pending
}

// CORRECT — stop interactions first:
beforeUnmount() {
    this._dropCleanup();              // no new drops can start
    this._keyboardHandler.detach();
    this._gestureHandler.detach();
    this.canvasRenderer.dispose();    // safe — no pending interactions
}
```

**Rule:** Remove all interaction listeners (drop, keyboard, gesture, crop) BEFORE disposing renderers and state managers.

## Visual State Cleanup

A cleanup function should leave the system in the same state as before setup — including DOM classes, counters, and any other side effects:

```javascript
// INCOMPLETE — removes listeners but leaves visual state:
return function cleanup() {
    document.removeEventListener('dragenter', onDragEnter);
};

// COMPLETE — also clears visual feedback:
return function cleanup() {
    document.removeEventListener('dragenter', onDragEnter);
    document.body.classList.remove('drag-over');
};
```

**Rule:** Every setup function that modifies visual state (DOM classes, CSS properties, counters) must reverse those changes in its cleanup function.

## Canvas GPU Memory Release

Setting canvas dimensions to zero forces context loss and GPU memory release across all modern browsers. This is more reliable than just nulling the JS reference, which may leave GPU-backed buffer memory allocated (especially in Safari/WebKit):

```javascript
dispose() {
    if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
    }
    canvas = null;
    ctx = null;
}
```

Use this pattern in canvas renderer `dispose()` methods to ensure GPU memory is fully released.

## Gotchas

1. **Base64 thumbnails temporarily increase memory** — Converting images to base64 strings creates additional copies. This is acceptable for operations like `clearAll()` but could be optimized later if needed.
2. **Offscreen canvases are auto-collected** — If created as local variables and not attached to DOM, they don't need explicit cleanup.
3. **Dispose utilities must be used consistently** — Creating `disposeImageItem()` but not using it in `ImageLibrary.js` is a common oversight caught by world-review.

---

Base directory: `.opencode/skills/building-web-apps/`
