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
- PointerType-based dynamic thresholds
- Unified gesture functions
- Wheel event handling (macOS trackpad)
- Dual gesture direction conventions (negation vs. scrolling)
- setPointerCapture / releasePointerCapture lifecycle
- pointercancel cleanup
- pointer capture testing pattern
- Window blur / visibilitychange safety net
- touch-action: pan-y selective passthrough
- VISIBLE_MIN drag boundary clamping
- Testing gesture direction

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

When two pointer event handlers (e.g., `GestureHandler` for hover, `PanelSwapHandler` for drag-and-drop swap) both attach listeners to the same canvas, pointer events fire on both handlers simultaneously. This causes:
- Double panel selection on click
- Conflicting drag/click interpretation
- Unexpected state mutations

### Solution: Gesture-Active Flag Coordination

The swap handler is always active for all layouts. It coordinates with the multi-touch handler via a `_multiTouchGestureActive` flag on state:

```javascript
// PanelSwapHandler — always active, skips if multi-touch gesture active
_onPointerDown(e) {
    if (state._multiTouchGestureActive) return;
    // ... panel swap handling (works in all layouts)
}

// MultiTouchHandler — sets flag on gesture start/end
function startGesture(t1, t2) {
    gestureActive = true;
    state._multiTouchGestureActive = true;  // Signal to swap handler
    // ...
}

function endGesture() {
    gestureActive = false;
    state._multiTouchGestureActive = false;  // Clear signal
    // ...
}
```

**GestureHandler no longer handles pointerdown** — the swap handler's `_onPointerUp` handles click-to-select. GestureHandler provides hover-only (pointermove/pointerleave).

### Key Design Decisions

1. **Both handlers always attached** — no attach/detach cycles on layout change. The gesture-active flag check is O(1) and happens at pointerdown time.

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
- `MyESModules/Interaction/PanelSwap.js` — global pointerup cleanup

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

## PointerType-Based Dynamic Thresholds

Use `pointerType` on PointerEvent to select between fine and coarse interaction thresholds. This is simpler and more reliable than feature detection or CSS media queries, and it's available on every pointer event.

```javascript
const EDGE_THRESHOLD_FINE = 8;   // px — mouse/pen precision
const EDGE_THRESHOLD_COARSE = 16; // px — touch (WCAG 2.5.5 recommends 24px)

function hitTestTitleBox(pointerType, cssX, cssBoxLeft, cssBoxWidth) {
    const edgeThreshold = pointerType === 'touch' ? EDGE_THRESHOLD_COARSE : EDGE_THRESHOLD_FINE;

    const distToLeft = cssX - cssBoxLeft;
    const distToRight = (cssBoxLeft + cssBoxWidth) - cssX;

    if (distToLeft <= edgeThreshold) return { hit: true, target: 'left-edge' };
    if (distToRight <= edgeThreshold) return { hit: true, target: 'right-edge' };
    return { hit: true, target: 'body' };
}
```

**Key points:**
- `pointerType` is `'mouse'`, `'touch'`, or `'pen'` — covers all pointer input types
- Touch gets a wider threshold for easier hit detection on coarse pointers
- Mouse/pen keep a tight threshold for precision
- **WCAG 2.5.5 gap** — The current `EDGE_THRESHOLD_COARSE = 16` falls short of the WCAG 2.5.5 recommendation of 24x24px touch targets. Consider increasing to 24px for full compliance.

**When to use:**
- Resize handles, drag edges, or any interaction where pointer precision varies by input type
- Any UI element where touch users need larger hit areas than mouse users

**File Reference:**
- `MyESModules/Interaction/TitleInteraction.js` — dynamic threshold in `hitTestTitleBox`

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

    let hasAction = false;

    // Pan: two-finger drag
    if (e.deltaY !== 0 || e.deltaX !== 0) {
        cropManager.adjustCrop(panelId, {
            x: e.deltaX * panSensitivity * imageScale,
            y: e.deltaY * panSensitivity * imageScale
        });
        hasAction = true;
    }

    // Zoom: pinch-to-zoom (deltaZ) or ctrlKey + deltaY (cross-platform fallback)
    let zoomDelta = 0;
    if (e.deltaZ !== 0) {
        zoomDelta = e.deltaZ;
    } else if (e.ctrlKey && e.deltaY !== 0) {
        zoomDelta = e.deltaY;
    }
    if (zoomDelta !== 0) {
        const factor = Math.exp(-zoomDelta * zoomSensitivity);
        cropManager.zoomCrop(panelId, factor);
        hasAction = true;
    }

    // Only suppress browser default if we actually processed a gesture.
    // Without this guard, a wheel event with zero deltas (e.g., single-finger
    // mouse scroll over canvas with panel selected) blocks page scrolling.
    if (hasAction) {
        e.preventDefault();
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

## Dual Gesture Direction Conventions (Negation vs. Scrolling)

Touch-based gestures (TouchEvent, PointerEvent) and wheel-based gestures (WheelEvent) follow **opposite conventions** for pan direction:

| Input Path | Convention | Delta Sign | User Action → Content Movement |
|------------|-----------|------------|--------------------------------|
| **TouchEvent** (phone touchscreen) | Direct manipulation | Negate | Drag right → content moves right |
| **PointerEvent** (hybrid devices) | Direct manipulation | Negate | Drag right → content moves right |
| **WheelEvent** (macOS trackpad) | Scrolling | No negation | Scroll down → view moves down |

**Implementation pattern:**
```javascript
// TouchEvent / PointerEvent path — negate for direct manipulation
function processGesture(t1, t2) {
    const dx = currentMidpoint.x - initialMidpoint.x;
    const dy = currentMidpoint.y - initialMidpoint.y;
    cropManager.adjustCrop(panelId, {
        x: -dx * imageScale,  // Negated
        y: -dy * imageScale   // Negated
    });
}

// WheelEvent path — no negation (scrolling convention)
function _onWheel(e) {
    cropManager.adjustCrop(panelId, {
        x: e.deltaX * sensitivity * imageScale,  // NOT negated
        y: e.deltaY * sensitivity * imageScale   // NOT negated
    });
}
```

**Why this matters:** On mobile, users expect "drag follows finger" (direct manipulation). On trackpads, users expect scroll-wheel behavior. The same codebase must support both conventions because the browser exposes them as different event types.

**Key insight:** The WheelEvent path (`_onWheel`) never calls `processGesture()` — it computes its own delta inline. This natural separation makes it easy to apply different conventions to each path.

## Pointer Capture Lifecycle: setPointerCapture and releasePointerCapture

`canvas.setPointerCapture(pointerId)` only succeeds for the pointer that fired the current event. Attempting to capture a different pointer's ID throws.

### Capture: Each pointer independently on pointerdown

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

**Correct — capture each pointer on its own pointerdown:**
```javascript
function _onPointerDown(e) {
    activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Capture this pointer so events continue if cursor leaves canvas bounds.
    // Each pointer is captured at its own pointerdown event.
    if (canvas && canvas.setPointerCapture) {
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch (_) { /* not all browsers support */ }
    }

    if (activePointers.size === 2) {
        // ... start gesture
    }
}
```

**Key:** Do NOT wait until `activePointers.size === 2` to capture. The first pointer needs capture too — if it drags off-canvas before the second pointer arrives, it loses events.

### Release: pointerup — release current pointer + remaining pointers on gesture end

```javascript
function _onPointerUp(e) {
    // Release capture for this pointer
    if (canvas && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    activePointers.delete(e.pointerId);

    if (activePointers.size < 2) {
        endGesture();
        // Release capture for any remaining pointer
        if (canvas && canvas.releasePointerCapture) {
            for (const pid of activePointers.keys()) {
                try { canvas.releasePointerCapture(pid); } catch (_) {}
            }
        }
        activePointers.clear();
    }
}
```

**Key ordering:** `activePointers.delete(e.pointerId)` MUST happen BEFORE the release loop. The loop iterates over `activePointers.keys()` — the tracking data structure — not a separate list of captured pointer IDs. This ensures the loop only sees pointers still tracked, and deleting first prevents double-release of the lifted pointer.

### Release: pointercancel — release all captures

`pointercancel` fires when the browser cancels pointer events (e.g., input type change, device orientation change, element removed from DOM). It requires the same cleanup as `pointerup`:

```javascript
function _onPointerCancel(e) {
    // Release capture for this pointer
    if (canvas && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    activePointers.delete(e.pointerId);

    if (activePointers.size < 2) {
        endGesture();
        pointerGestureActive = false;
        // Release capture for any remaining pointers
        if (canvas && canvas.releasePointerCapture) {
            for (const pid of activePointers.keys()) {
                try { canvas.releasePointerCapture(pid); } catch (_) {}
            }
        }
        activePointers.clear();
    }
}
```

### Gotchas

**Browser auto-release is not reliable.** The browser auto-releases pointer captures only when the element loses focus or the page unloads. During normal interaction (e.g., user lifts one finger of a two-finger gesture), the browser does NOT auto-release the remaining capture. You MUST call `releasePointerCapture` explicitly.

**releasePointerCapture throws on invalid states.** Calling `releasePointerCapture` for a pointer that was never captured, already released, or whose capture was auto-released throws a `DOMException`. Always wrap in try/catch — these are non-fatal hygiene operations.

**Feature detection is required.** Not all browsers support pointer capture. Always check for method existence before calling.

**For the wheel event path:** Pointer capture is irrelevant since wheel events don't use pointer IDs.

### Testing Pattern

Test capture and release by overriding the canvas methods:

```javascript
let capturedIds = [];
let releasedIds = [];
canvas.setPointerCapture = (pid) => { capturedIds.push(pid); };
canvas.releasePointerCapture = (pid) => { releasedIds.push(pid); };

// Fire pointerdown events
canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, ... }));
canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, ... }));

expect(capturedIds).to.include(1);
expect(capturedIds).to.include(2);

// Fire pointerup for one pointer
canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, ... }));

expect(releasedIds).to.include(1);
expect(releasedIds).to.include(2); // Remaining pointer also released
```

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

## touch-action: pan-y Selective Passthrough

The CSS `touch-action` property controls which touch gestures the browser handles natively vs. which are passed to JavaScript:

| Value | Browser Handles | JavaScript Can Intercept |
|-------|----------------|-------------------------|
| `none` | Nothing | Everything (must call preventDefault) |
| `pan-y` | One-finger vertical scroll | Two-finger gestures, horizontal swipes |
| `manipulation` | Scroll and zoom | Nothing (default browser behavior) |

**Use `pan-y` when:**
- You want one-finger vertical drag to scroll the page (not trigger app gestures)
- You still want JavaScript to handle two-finger gestures (pan, pinch-to-zoom)
- You want JavaScript to handle horizontal one-finger swipes (e.g., panel swapping)

**Implementation:**
```css
#previewCanvas {
    touch-action: pan-y;
}
```

**Critical requirement:** Your JavaScript handler MUST call `e.preventDefault()` on `touchmove` when a two-finger gesture is active. Without it, `pan-y` allows the browser to scroll during two-finger drag.

```javascript
// MultiTouchHandler pattern:
function _onTouchMove(e) {
    if (!gestureActive) return;  // One-finger → browser handles (pan-y)
    if (e.touches.length !== 2) { /* cancel */ return; }
    e.preventDefault();  // Two-finger → JavaScript handles, block browser scroll
    processGesture(touches[0], touches[1]);
}
```

**Anti-pattern:** Using `touch-action: none` blocks ALL browser gestures, including page scrolling. On mobile, this makes the app feel "stuck" — users cannot scroll to see content below the fold.

**iOS Safari note:** `pan-y` does NOT prevent the browser's edge-swipe back gesture. Two-finger horizontal swipe from the screen edge may still trigger browser navigation. This is an acceptable trade-off.

**Accessibility consideration:** `pan-y` preserves native page scrolling for one-finger vertical drag, providing a better mobile experience than `none`. Ensure users have alternative input methods (mouse, keyboard) for gesture-dependent functionality.

## VISIBLE_MIN Drag Boundary Clamping

### Problem: Stranded UI

When a draggable UI element is clamped to stay fully within its container, users can accidentally drag it to the exact edge where it becomes hard to grab again. If the clamp allows the element to go fully off-screen, the grab handle becomes inaccessible and the element is permanently stranded.

**Anti-pattern — full containment clamping:**
```javascript
// Element must stay fully within canvas — grab handle can land at the edge
newX = Math.max(0, Math.min(newX, containerWidth - elementWidth));
```

### Solution: VISIBLE_MIN Threshold

Allow the element to extend partially off-screen, but require at least `VISIBLE_MIN` pixels to remain visible at all times:

```javascript
const VISIBLE_MIN = 50; // px of element that must remain visible at edges
newX = Math.max(
    -elementWidth + VISIBLE_MIN,
    Math.min(newX, containerWidth - VISIBLE_MIN)
);
```

**How it works:**

| Direction | Clamp Formula | Result |
|-----------|--------------|--------|
| **Left edge** | `Math.max(-elementWidth + VISIBLE_MIN, ...)` | Element can extend left up to `VISIBLE_MIN` pixels visible |
| **Right edge** | `Math.min(..., containerWidth - VISIBLE_MIN)` | Element's left edge can go right up to `containerWidth - VISIBLE_MIN` |

**Concrete example** (element width = 400px, container = 1920px):

| Before (full containment) | After (VISIBLE_MIN = 50) |
|--------|-------------------------|
| Left clamp: `x >= 0` | Left clamp: `x >= -350` (50px of 400px box visible) |
| Right clamp: `x <= 1520` (1920-400) | Right clamp: `x <= 1870` (1920-50, 50px visible) |

### Choosing VISIBLE_MIN

The `VISIBLE_MIN = 50` value balances:
- **Enough to grab:** 50px provides sufficient area for mouse or touch re-acquisition
- **Not too much:** Allows meaningful off-screen positioning for creative layouts
- **Proportional to hit areas:** If resize handles use `EDGE_THRESHOLD = 8`, then 50px provides ~6x the minimum grab area

### Edge Cases

**Element narrower than VISIBLE_MIN** — If `elementWidth < VISIBLE_MIN` (e.g., 30px element), the left clamp becomes `-30 + 50 = 20`. The element is forced to start at x=20, keeping it fully visible. This is correct — small elements don't need partial visibility.

**Zero or negative width** — Guard with a fallback: `const actualWidth = elementWidth ?? 400;`. A zero or negative width produces nonsensical clamping.

**Asymmetric axes** — VISIBLE_MIN may apply to only one axis. The other axis may use a different positioning model (e.g., text baseline clamping) with its own constraints.

### When to Use

**Use VISIBLE_MIN when:**
1. The draggable element has a grab handle — users need to re-acquire it
2. The element can be wider/taller than the container — full containment restricts positioning
3. Creative positioning is desired — users may want elements partially off-screen
4. Recovery is impossible otherwise — no reset button or keyboard shortcut to recover off-screen elements

**Do NOT use when:**
- The element must always be fully visible (form fields, critical controls)
- The container has scroll/pan behavior (scrolling provides recovery)
- Keyboard navigation is the primary interaction (focus provides recovery)

### Testing

The VISIBLE_MIN pattern is a pure math function — ideal for TDD with concrete input/output pairs:

```javascript
// Drag left: clamped to -boxWidth + VISIBLE_MIN
expect(lastPosition.x).to.equal(-350); // not -400 or 0

// Drag right: clamped to containerWidth - VISIBLE_MIN
expect(lastPosition.x).to.equal(1870); // not 1520

// Within bounds: no clamping
expect(lastPosition.x).to.equal(760); // exact drag result
```

**File Reference:**
- `MyESModules/Interaction/TitleInteraction.js` — VISIBLE_MIN in `_onPointerMove` drag handler
- `MyComponents/TitleInteractionTest.html` — drag VISIBLE_MIN clamping tests

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

**Stricter variant for WheelEvent:** Even when the handler is "active" (panel selected), a wheel event with zero deltas (e.g., single-finger mouse scroll over canvas) should NOT call `preventDefault()`. Use a `hasAction` flag that tracks whether pan or zoom deltas were actually processed, and only call `preventDefault()` when `hasAction` is true. This prevents blocking page scrolling when the user scrolls normally over the canvas with a panel selected. Also guard the `ctrlKey + deltaY` zoom path: if `ctrlKey` is true but `deltaY` and `deltaZ` are both zero, do NOT call `preventDefault()` (would block browser zoom).

## Testing Gesture Direction

When testing gesture direction, verify the **sign** of the delta passed to the crop manager:

```javascript
// TouchEvent: drag RIGHT (positive dx) should produce NEGATIVE adjustCrop x
expect(adjustDelta.x).to.be.lessThan(0);

// WheelEvent: scroll RIGHT (positive deltaX) should produce POSITIVE adjustCrop x
expect(adjustDelta.x).to.be.greaterThan(0);
```

**Triangulation pattern:** Test both cardinal directions (right/left, up/down) and diagonal to ensure the negation is applied consistently across axes. Also test the threshold guard — sub-threshold movement should NOT trigger the crop adjustment at all.
