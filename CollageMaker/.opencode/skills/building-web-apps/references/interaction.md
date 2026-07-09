# Interaction & Keyboard Shortcuts

## Contents
- Three-layer architecture pattern
- Modifier matching rules
- Focus-aware suppression
- preventDefault ordering
- Test conventions
- Pointer handler coordination
- Multi-touch gestures

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

## Multi-Touch Gestures

Two-finger pan and pinch-to-zoom on mobile use direct `touchstart`/`touchmove`/`touchend` listeners (not pointer events), attached with `{ passive: false }` to allow `preventDefault()`.

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
