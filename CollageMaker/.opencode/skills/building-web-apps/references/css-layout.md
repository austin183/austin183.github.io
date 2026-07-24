# CSS Layout

## Flex Column Chain: `min-height: 0` Requirement

**Rule:** Every flex item with `flex: 1` (or `flex-grow: 1`) inside a `flex-direction: column` container must have `min-height: 0` to respect the parent's height constraint.

Without it, `min-height: auto` (the default) means "don't shrink below content's intrinsic minimum height," which overrides the flex constraint and causes the entire chain to expand beyond the viewport.

The same rule applies horizontally: `flex: 1` inside `flex-direction: row` needs `min-width: 0`.

### CollageMaker flex chain

```
body (height: 100dvh, flex column, safe-area padding)
  └── #app (flex: 1, min-height: 0)
      └── .collage-toolbar (flex-shrink: 0)
      └── .main-layout (flex: 1, min-height: 0)
          ├── .sidebar (flex-direction: column)
          │   └── .image-library (flex: 1, min-height: 0)
          ├── .canvas-area (flex: 1, min-height: 0, min-width: 0)
          │   └── .canvas-container (flex: 1, min-height: 0)
          └── .sidebar-right (flex-direction: column)
              └── .sidebar-scroll-container (flex: 1, min-height: 0)
```

### Where `min-height: 0` appears in `Style.css`

| Selector | Line | Notes |
|---|---|---|
| `.main-layout` | 81 | Row flex, 3-panel layout |
| `.image-library` | 139 | Vertical scroll inside sidebar |
| `#app` | 239 | Root flex chain constraint |
| `.canvas-area` | 253 | Also has `min-width: 0` |
| `.canvas-container` | 264 | Innermost canvas flex item |
| `.sidebar-scroll-container` | 498 | Right sidebar scroll area |

### Where `min-width: 0` appears in `Style.css`

| Selector | Line | Notes |
|---|---|---|
| `.image-name` | 207 | Text ellipsis on flex row item |
| `.canvas-area` | 252 | Prevents horizontal overflow |
| `.sidebar-collapsed` | 504 | Force-collapse override |

## Responsive Sidebar Config

In stacked mobile layouts, `SIDEBAR_CONFIG.MOBILE.width = 0` means **"sidebar is not inline"** — not "sidebar is invisible." The actual sidebar width is determined by CSS (full viewport width minus padding).

Always document the semantics of `width: 0`:

```javascript
// Note: MOBILE width=0 means sidebar is not inline; in stacked mode,
// sidebars render as full-width sections below the canvas (CSS-driven).
export const SIDEBAR_CONFIG = {
    MOBILE: { width: 0, min: 0, max: 0, mode: 'stacked' },
};
```

## CSS Computed Value Naming

When returning computed values consumed as CSS properties, name them explicitly to prevent implementation bugs.

```javascript
// BAD — "padding" is ambiguous (per-side? total?)
return { padding: 12, finalWidth: 44, finalHeight: 44 };

// GOOD — explicit about what the value represents
return { totalPaddingIncrease: 12, finalWidth: 44, finalHeight: 44 };
// Comment: To apply as CSS padding, use totalPaddingIncrease / 2 on each side.
```

An implementer seeing `padding: 12` may apply `padding: 12px` on each side (left/right), effectively doubling the intended size.

## Mobile Safe Areas

For bottom-positioned fixed elements (toast notifications, bottom bars, FABs), use `env(safe-area-inset-bottom)` to avoid overlap with the iOS home indicator:

```css
.toast-notification {
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}
```

**Why:** On iPhone X and later, the home indicator occupies the bottom ~34px of the viewport. Without the safe area inset, fixed elements will be partially obscured. The `0px` fallback ensures no extra padding on non-Notch devices.

Apply the same pattern to `env(safe-area-inset-top)` for top-positioned fixed elements on devices with dynamic islands or notches.

### Complete Safe Area Pattern

All five pieces must be in place for safe areas to work correctly on iOS:

1. **Viewport meta must include `viewport-fit=cover`** — Without it, `env(safe-area-inset-*)` returns 0 on iOS Safari:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    ```
    - Tells the browser to render edge-to-edge, covering areas behind the notch and home indicator. The safe area inset values then tell you how much space to leave clear.
    - Does NOT prevent user zoom. Keep `user-scalable=yes` (the default) for accessibility.
    - On non-iOS browsers (Chrome Android, desktop), `viewport-fit=cover` is ignored. The `env()` fallback values (`0px`) handle graceful degradation.

2. **Body padding for flow content** — Protects inline elements (toolbar, main layout):
   ```css
   body {
       padding-top: env(safe-area-inset-top, 0px);
       padding-bottom: env(safe-area-inset-bottom, 0px);
       box-sizing: border-box; /* Prevents padding from increasing height beyond 100vh */
   }
   ```

3. **Fixed-positioned elements need individual treatment** — `position: fixed` is relative to viewport, not padded body. Body padding only protects flow content:
    ```css
    /* Fixed element with top offset */
    .fixed-top-element {
        top: calc(var(--offset) + env(safe-area-inset-top, 0px));
    }

    /* Fixed overlay panel spanning full height */
    .fixed-overlay {
        top: env(safe-area-inset-top, 0px);
        height: calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    }
    ```

    **Elements at risk in CollageMaker:**

    | Element | Position | Safe Area Risk | Fix |
    |---------|----------|----------------|-----|
    | `#themeToggle` | `fixed; top: var(--space-3)` | Dynamic island overlap | `calc(var(--space-3) + env(safe-area-inset-top, 0px))` |
    | `.sidebar-left` (mobile) | `fixed; top: 0; height: 100vh` | Content behind notch | `top: env(safe-area-inset-top, 0px); height: calc(100vh - top - bottom)` |
    | `.sidebar-right` (mobile) | `fixed; top: 0; height: 100vh` | Content behind notch | Same as sidebar-left |
    | `.toast-notification` | `fixed; bottom: calc(...)` | Home indicator overlap | Already uses `env(safe-area-inset-bottom)` |
    | `#app` toolbar | Flow content | Protected by body padding | No change needed |

4. **Use `100dvh` for body height** — iOS Safari's `100vh` includes the browser toolbar height and doesn't adjust when it hides:
    ```css
    body {
        height: 100vh;   /* Fallback */
        height: 100dvh;  /* Dynamic viewport height — adjusts with toolbar */
    }
    ```
    - **Symptoms of missing `100dvh`:** page content extends below visible area when address bar is hidden, layout shift when toolbar appears/disappears, canvas area doesn't fill available viewport height.
    - **Override pattern:** CSS uses the last declared value. Older browsers skip `100dvh` (unrecognized) and use `100vh`. Modern browsers apply both, with `100dvh` winning.
    - **Browser support:** iOS Safari 15+, Chrome 89+, Firefox 110+, Edge 89+.

5. **`box-sizing: border-box` on body** — Required when adding safe area padding to prevent overflow. Without it, `body height = 100vh + padding-top + padding-bottom` causes vertical overflow.

### Testing Safe Area CSS

Safe area CSS cannot be verified via computed styles in headless browsers (no notch device). Use CSS content validation — the CSS source is deterministic and version-controlled, making it more reliable than testing computed styles in an environment that doesn't match the target device.

```javascript
// Fetch and parse the CSS file
const css = await (await fetch('../Style.css')).text();

// Verify body has safe area padding with fallback
const bodyBlock = css.match(/body\s*\{[^}]*\}/);
expect(bodyBlock[0]).to.include('env(safe-area-inset-top, 0px)');

// Verify viewport meta tag
const doc = new DOMParser().parseFromString(html, 'text/html');
const viewport = doc.querySelector('meta[name="viewport"]');
expect(viewport.getAttribute('content')).to.include('viewport-fit=cover');

// Verify 100dvh comes after 100vh (override pattern)
const bodyRule = bodyBlock[0];
const vhIndex = bodyRule.indexOf('height: 100vh');
const dvhIndex = bodyRule.lastIndexOf('height: 100dvh');
expect(dvhIndex).to.be.greaterThan(vhIndex);
```

### Safe Area Implementation Checklist

When implementing mobile safe areas, verify all six pieces are in place:

| # | Requirement | Location |
|---|-------------|----------|
| 1 | `viewport-fit=cover` in viewport meta tag | `index.html` |
| 2 | `padding-top: env(safe-area-inset-top, 0px)` on body | `Style.css` body rule |
| 3 | `padding-bottom: env(safe-area-inset-bottom, 0px)` on body | `Style.css` body rule |
| 4 | `box-sizing: border-box` on body | `Style.css` body rule |
| 5 | Fixed elements use `calc(... + env(safe-area-inset-*))` | Each fixed element |
| 6 | `height: 100dvh` with `100vh` fallback on body | `Style.css` body rule |
