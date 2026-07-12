# Interaction & Keyboard Shortcuts

## Contents
- Three-layer architecture pattern
- Modifier matching rules
- Focus-aware suppression
- preventDefault ordering
- Test conventions
- Pointer handler coordination
- Global pointerup for drag cleanup
- Multi-touch and trackpad gestures
- TouchEvent / PointerEvent dual-input path
- PointerType guard (hybrid device protection)
- Unified gesture functions
- Wheel event handling (macOS trackpad)
- setPointerCapture gotchas
- Window blur / visibilitychange safety net
- touch-action: none CSS

## Three-Layer Architecture

Keyboard handlers follow a three-layer pattern: pure parsing → pattern matching → factory event handler.

```
parseKeyShortcut(event)     → pure: KeyboardEvent → {key, meta, ctrl, shift, alt}
matchesShortcut(parsed, pattern) → pure: parsed + string → boolean
createKeyboardHandler({callbacks}) → factory: {attach, detach, handleKeydown}
KEYBOARD_SHORTCUTS          → constant map of shortcut names to patterns/values
```

- Pure functions (`parseKeyShortcut`, `matchesShortcut`) exported for unit testing without DOM dependencies.
- Factory creates a handler with closure-scoped state (`_attached`, `_listener`, `_callbacks`).
- Layout shortcuts use `{ pattern, value }` objects; simple shortcuts use strings; multi-key patterns (e.g., DELETE/BACKSPACE) use arrays.

## Modifier Matching Rules

| Rule | Detail |
|------|--------|
| `"meta+"` matches `metaKey` AND `ctrlKey` | Cross-platform: Cmd on macOS, Ctrl on Windows/Linux |
| Pattern parts are order-insensitive | `"shift+meta+z"` === `"meta+shift+z"` |
| Key comparison is case-insensitive | `(parsed.key || '').toLowerCase()` |
| Alt is always strict | `hasAlt !== parsed.alt` — alt reserved for menus, never lenient |
| Shift: strict when pattern specifies it; **lenient for bare keys** | `Shift+Delete` matches `"Delete"` because no explicit shift in pattern |

### Bare-Key Leniency Logic

```javascript
const isBareKey = !hasMeta && !hasShift && !hasAlt;
// ...
if (hasShift && !parsed.shift) return false;           // Pattern says shift, event doesn't → fail
if (!isBareKey && !hasShift && parsed.shift) return false;  // Non-bare key with extra shift → fail
```

**Why?** `Shift+Delete` is a common variant of Delete. But `Alt+S` should NOT match `"s"` because alt is reserved for menus (always strict). The leniency only applies to **shift on bare keys**.

### Ctrl Without Meta Rejected for Non-Meta Patterns

```javascript
if (!hasMeta && parsed.ctrl) return false;
```

A pattern of just `"s"` does NOT match `Ctrl+S` — that would conflict with browser defaults. This preserves the distinction between global shortcuts (`meta+s`) and modifier-less keys.

## Focus-Aware Suppression: SHORTCUT_SAFE_INPUT_TYPES

Instead of suppressing all `<input>` elements, use an **allow-list** of input types where shortcuts should still fire:

```javascript
const SHORTCUT_SAFE_INPUT_TYPES = new Set([
    'button', 'submit', 'reset',   // Interactive controls — not text entry
    'checkbox', 'radio',            // Toggles — keyboard expected
    'color',                        // Color picker — click-driven, keyboard rare
    'range',                        // Slider — arrow keys drive value
    'number'                        // Numeric input — arrow keys drive value
]);

function _isFocusInEditableElement(e) {
    const el = e.target;
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    if (tag === 'input') {
        const inputType = (el.type || 'text').toLowerCase();
        if (!SHORTCUT_SAFE_INPUT_TYPES.has(inputType)) return true;  // Suppress text-like inputs
    }
    return false;
}
```

**Suppressed:** `<input type="text">`, password, search, email, url, tel, date — any free-form text entry.
**Allowed:** sliders, color pickers, checkboxes, radios, buttons — controls where keyboard shortcuts are expected to work.

## preventDefault Ordering Rule

**Call `preventDefault()` AFTER the callback succeeds**, not before. If a callback throws:
- The error is caught and logged via `console.error`
- `preventDefault()` is NOT called (browser default can still fire)
- The handler remains functional for subsequent events

```javascript
try {
    cb();  // or cb(shortcut.value) for layouts
    e.preventDefault();  // Only suppress browser default on success
} catch (err) {
    console.error('Keyboard shortcut failed (' + name + '):', err);
}
```

**Edge case:** If the shortcut is recognized but no callback is registered, `preventDefault()` IS still called to suppress browser defaults (e.g., Cmd+S save dialog).

## Test Conventions

- **Direct call tests** (callback dispatch, edge cases): Pass plain objects with mock `preventDefault: () => {}`. Works because `_isFocusInEditableElement` checks `el.tagName` which exists on mock targets.
- **Lifecycle tests** (attach/detach/keydown-only): Use real `KeyboardEvent` + `document.dispatchEvent()`. The event's target is `document`, not `document.body`.
- **Focus suppression tests**: Create actual DOM elements (`document.createElement('input')`) and pass them as `target`. Real elements have proper `tagName` and can be assigned `.type`.

## Common Gotchas

- Pattern lowercased to `'escape'` but key comparison must also lowercase: `(parsed.key || '').toLowerCase()`
- Events with `target=document` (no tagName) — guard with `(el.tagName || '')`
- DELETE and BACKSPACE are separate keys — consolidate into single array pattern when they share a callback

## Pointer Handler Coordination

### Problem

When two pointer event handlers (e.g., `GestureHandler` for panel selection, `HexDragHandler` for hex panel swap) both attach listeners to the same canvas, pointer events fire on both handlers simultaneously. This causes:
- Double panel selection on click
- Conflicting drag/click interpretation
- Unexpected state mutations

### Solution: Layout-Gated Handler Delegation

Each handler checks the current layout at pointerdown time and returns early if it's not responsible:

```javascript
// GestureHandler — general-purpose, skips hexagonal layout
_onPointerDown(e) {
    if (state.layoutStyle === LayoutStyle.HEXAGONAL) return;
    // ... rest of handler
}

// HexDragHandler — hex-specific, skips non-hexagonal layouts
_onPointerDown(e) {
    if (state.layoutStyle !== LayoutStyle.HEXAGONAL) return;
    // ... hex-specific handling
}
```

### Key Design Decisions

1. **Both handlers always attached** — no attach/detach cycles on layout change. The layout check is O(1) and happens at pointerdown time.

2. **Drag threshold distinguishes click from drag** — 10 CSS pixels of movement triggers drag mode. Below threshold, the interaction is treated as a click:

```javascript
_onPointerUp(e) {
    if (isDragging) {
        // Drag: find target panel and swap
        swapPanelAssignments(state, dragSourceId, targetId);
    } else {
        // Click: select panel
        onPanelSelected(dragSourceId);
    }
}
```

3. **CSS pixel threshold** — on high-DPR displays, the threshold feels the same regardless of physical pixel density because CSS pixels are device-independent.

### Gotchas

- **Guard is mandatory on the general handler** — `GestureHandler` MUST return early for hexagonal layout. Without it, the click fires twice.

- **Panel geometry type matters** — hexagonal layout with 1 image returns a rectangular path geometry (not a rect geometry). The hit test must handle both via `geometry.type === 'rect'` check.

### When to Use This Pattern

Use layout-gated delegation when:
- Two handlers need to interact with the same DOM element
- One handler is layout-specific (hex drag-and-drop)
- The other handler is general-purpose (panel selection)
- You want to avoid attach/detach cycles on layout changes

## Global Pointerup for Drag Cleanup

When implementing drag-and-drop on a specific element (e.g., a canvas), always add a global `window.addEventListener('pointerup', ...)` listener to clean up drag state. If the user releases the pointer outside the element (drags off-screen, switches tabs, window loses focus), the element-level `pointerup` never fires and drag state gets stuck — cursor remains 'grabbing', visual highlights persist, and subsequent interactions are corrupted.

```javascript
attach() {
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointerup', this._onGlobalPointerUp);
}

detach() {
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointerup', this._onGlobalPointerUp);
}

_onGlobalPointerUp = () => {
    if (this._isDragging || this._dragSourceId) {
        this._clearDragState();
    }
};
```

**Key points:**
- The global listener is a **safety net**, not a replacement. The element-level `pointerup` still fires for normal interactions.
- Guard the cleanup with a state check (`if (isDragging || dragSourceId)`) to avoid unnecessary work on every global pointerup.
- **Always detach the global listener in `detach()`** — a stale global listener on a disposed handler causes errors and memory leaks.
- Use arrow function property initializers (`_onGlobalPointerUp = () => {...}`) to preserve `this` binding, or bind explicitly.

**File Reference:**
- `MyESModules/Interaction/HexPanelSwap.js` — global pointerup cleanup

## Multi-Touch and Trackpad Gestures

Pan and zoom gestures must support **three input paths** for cross-platform coverage:

| Path | Platform | Events |
|------|----------|--------|
| **TouchEvent** | Mobile touchscreen | `touchstart`/`touchmove`/`touchend` |
| **PointerEvent** | Windows precision touchpad, some Linux | `pointerdown`/`pointermove`/`pointerup` (two pointers) |
| **WheelEvent** | macOS trackpad (universal) | `wheel` with `deltaX`/`deltaY` (pan) and `deltaZ` (zoom) |

**Critical: macOS trackpad gestures are wheel events, NOT pointer events.** The browser synthesizes two-finger trackpad input as a single `wheel` event. A PointerEvent-based two-pointer approach never activates on macOS. The wheel event path is the universal solution for trackpad gestures.

## TouchEvent / PointerEvent Dual-Input Path

When a handler supports both TouchEvent and PointerEvent, extract shared gesture logic into functions that both paths call. This eliminates duplication and ensures consistent behavior.

### Unified Gesture Functions

```javascript
// Shared functions (called by both TouchEvent and PointerEvent paths)
function startGesture(t1, t2) {
    if (!state.selectedPanelId) return false;
    gestureActive = true;
    initialMidpoint = computeTouchMidpoint(t1, t2);
    initialDistance = computeTouchDistance(t1, t2);
    return true;
}

function processGesture(t1, t2) {
    if (!gestureActive) return;
    // ... pan and zoom logic
}

function endGesture() {
    gestureActive = false;
    initialMidpoint = null;
    initialDistance = 0;
    onRenderScheduled();
}

// TouchEvent path
function _onTouchStart(e) {
    if (e.touches.length !== 2) return;
    if (startGesture(e.touches[0], e.touches[1])) {
        e.preventDefault();
    }
}

// PointerEvent path
function _onPointerDown(e) {
    if (e.pointerType === 'touch') return; // Delegate to TouchEvent path
    activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if (activePointers.size === 2) {
        const pointers = [...activePointers.values()];
        if (startGesture(pointers[0], pointers[1])) {
            e.preventDefault();
        }
    }
}
```

**Benefits:**
- Both paths use identical gesture math and state management
- Adding a third input path only requires wiring to the shared functions
- Testing the shared functions in isolation is straightforward

## PointerType Guard (Hybrid Device Protection)

On devices with both touchscreens and trackpads (e.g., Surface Pro, iPad with Magic Trackpad), the browser fires **both** TouchEvents and PointerEvents for touch input. Without a guard, every gesture fires twice.

**The guard — in the PointerEvent handler only:**
```javascript
function _onPointerDown(e) {
    // Skip touch pointers — delegate to TouchEvent path
    if (e.pointerType === 'touch') return;
    // ... handle mouse/pen pointers
}
```

**PointerType values:**
- `'mouse'` — mouse or trackpad pointer
- `'touch'` — touchscreen contact
- `'pen'` — stylus/pen

**Anti-pattern:** Using `pointerType !== 'touch'` to gate the TouchEvent path. The TouchEvent path has no `pointerType` property — it simply fires for all touch input. The guard belongs **only** in the PointerEvent handler.

## Wheel Event Handling (macOS Trackpad)

On macOS, two-finger trackpad gestures are delivered as a single `wheel` event:

| Gesture | Wheel event property |
|---------|---------------------|
| Two-finger drag (pan) | `deltaY` (vertical), `deltaX` (horizontal) |
| Pinch-to-zoom | `deltaZ` |

```javascript
function _onWheel(e) {
    const panelId = state.selectedPanelId;
    if (!panelId) return;
    e.preventDefault();

    // Pan: two-finger drag
    if (e.deltaY !== 0 || e.deltaX !== 0) {
        cropManager.adjustCrop(panelId, {
            x: e.deltaX * panSensitivity * imageScale,
            y: e.deltaY * panSensitivity * imageScale
        });
    }

    // Zoom: pinch-to-zoom
    if (e.deltaZ !== 0) {
        const factor = Math.exp(-e.deltaZ * zoomSensitivity);
        cropManager.zoomCrop(panelId, factor);
    }
}
```

**Key details:**
- `deltaZ` is negative for pinch-open (zoom in), positive for pinch-close (zoom out)
- `deltaY`/`deltaX` direction depends on browser/platform — **always test manually and be prepared to flip signs**
- **Must attach with `{ passive: false }`**, otherwise `preventDefault()` is silently ignored
- Wheel events fire at high frequency — ensure your crop/render pipeline is efficient
- Sensitivity constants (`panSensitivity`, `zoomSensitivity`) are platform-dependent and require empirical tuning

**Anti-pattern that caused a real bug:**
```javascript
// This NEVER activates on macOS trackpad
function _onPointerDown(e) {
    activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if (activePointers.size === 2) {
        // macOS trackpad only ever fires ONE pointerdown, not two
        startGesture(...); // Never reached
    }
}
```

## setPointerCapture Gotchas

`canvas.setPointerCapture(pointerId)` only succeeds for the pointer that fired the current event. Attempting to capture a different pointer's ID silently throws.

**Anti-pattern — trying to capture all pointers at once:**
```javascript
// BUG: setPointerCapture(pid) throws for the first pointer's ID
// because this code runs during the SECOND pointer's pointerdown event
if (activePointers.size === 2) {
    for (const pid of activePointers.keys()) {
        canvas.setPointerCapture(pid);
    }
}
```

**Correct — only capture the current pointer:**
```javascript
if (activePointers.size === 2) {
    try {
        canvas.setPointerCapture(e.pointerId); // Only the current pointer
    } catch (_) { /* not supported */ }
}
```

**If you need both pointers captured:** Capture the first one during its own `pointerdown`, and the second one during its `pointerdown`. For the wheel event path, pointer capture is irrelevant since wheel events don't use pointer IDs.

**Always wrap in try/catch** — `setPointerCapture` may throw on some browsers.

## Window Blur / Visibility Change Safety Net

If the user switches tabs, minimizes the browser, or the window loses focus during an active gesture, the browser may pause or silently cancel pointer/touch events. The gesture state (`gestureActive`, `activePointers`) remains set, causing subsequent interactions to be misinterpreted.

**Safety net pattern:**
```javascript
// In attach():
const handleBlur = () => {
    if (gestureActive || pointerGestureActive) {
        endGesture();
        pointerGestureActive = false;
        activePointers.clear();
    }
};
window.addEventListener('blur', handleBlur);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) handleBlur();
});

// In detach():
window.removeEventListener('blur', handleBlur);
document.removeEventListener('visibilitychange', handleVisibilityChange);
```

**Why both `blur` and `visibilitychange`?**
- `blur` fires when the window loses focus (clicking another window, Alt+Tab)
- `visibilitychange` fires when the tab is hidden (switching tabs, minimizing)
- Some browsers may fire one but not the other depending on the trigger

**Always guard the cleanup with a state check** (`if (gestureActive)`) to avoid unnecessary work on every blur event.

## touch-action: none CSS

When implementing custom multi-touch or pointer gestures on a canvas element, add `touch-action: none` to prevent the browser from handling default gestures (scroll, zoom, double-tap zoom).

```css
#previewCanvas {
    touch-action: none;
}
```

**Without this CSS property:**
- Two-finger drag on trackpad scrolls the page instead of panning the image
- Pinch gesture on touchscreen zooms the page instead of zooming the image
- The browser consumes the events before your handlers see them

**Accessibility consideration:** `touch-action: none` disables all default touch gestures. Ensure users have alternative input methods (mouse, keyboard) for any functionality that relies on gestures.

## TouchEvent-Specific Gotchas

### Exactly 2 Fingers, Not 2+

Mobile OSes reserve 3-finger and 4-finger gestures for system navigation:
- **iOS Safari:** 3-finger swipe for back/forward and app switcher
- **Android Chrome:** 3-finger swipe for split-screen and recent apps

**Anti-pattern:**
```javascript
// Activates on 3+ fingers — may conflict with OS gestures
if (e.touches.length < 2) return;
```

**Correct:**
```javascript
// Exactly 2 fingers only
if (e.touches.length !== 2) return;
```

Additionally, cancel the gesture if the finger count changes mid-gesture:
```javascript
_onTouchMove(e) {
    if (!gestureActive) return;
    if (e.touches.length !== 2) {
        // Cancel — 3rd finger added or 1st lifted
        gestureActive = false;
        return;
    }
    // ... gesture processing
}
```

### removeEventListener Must Match addEventListener Options

When listeners are added with `{ passive: false }`, removal must include the same options. Mismatched options cause `removeEventListener` to silently fail, leaking handlers.

```javascript
// Attach
canvas.addEventListener('touchstart', handler, { passive: false });

// Detach — MUST include { passive: false }
canvas.removeEventListener('touchstart', handler, { passive: false });
```

This applies to all touch event types: `touchstart`, `touchmove`, `touchend`.

### Consolidate Render Calls

When a single `touchmove` can trigger both pan and zoom, calling the render callback after each creates unnecessary double rendering. Use a flag to consolidate:

```javascript
let needsRender = false;

if (panThresholdExceeded) {
    cropManager.adjustCrop(panelId, delta);
    needsRender = true;
}

if (zoomThresholdExceeded) {
    cropManager.zoomCrop(panelId, factor);
    needsRender = true;
}

if (needsRender) {
    onCropPreviewRender(); // Called at most once per touchmove
}
```

### Incremental Pinch Scale Factor

The raw pinch distance ratio (e.g., 2.0 for doubling the finger distance) is too aggressive for a single zoom call. Apply a root to convert to a small incremental factor:

```javascript
const scaleRatio = currentDistance / initialDistance; // e.g., 2.0
const factor = Math.pow(scaleRatio, 0.15);            // e.g., 2.0^0.15 ≈ 1.12
cropManager.zoomCrop(panelId, factor);
```

The exponent `0.15` produces smooth, responsive zooming without overshooting. After each successful zoom, reset the reference distance to avoid accumulating scale.

### preventDefault After Gesture Check

For gesture handlers that conditionally activate (e.g., only when a panel is selected), call `preventDefault()` **after** confirming the gesture should activate, not before:

```javascript
function _onTouchStart(e) {
    if (e.touches.length !== 2) return;
    if (startGesture(e.touches[0], e.touches[1])) {
        e.preventDefault(); // Only suppress when gesture activates
    }
}
```

When no panel is selected, `preventDefault()` still fires if called unconditionally — blocking browser defaults like page scrolling. This pattern applies equally to TouchEvent and PointerEvent paths.
