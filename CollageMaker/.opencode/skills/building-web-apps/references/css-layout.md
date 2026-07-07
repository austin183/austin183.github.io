# CSS Layout

## Flex Column Chain: `min-height: 0` Requirement

**Rule:** Every flex item with `flex: 1` (or `flex-grow: 1`) inside a `flex-direction: column` container must have `min-height: 0` to respect the parent's height constraint.

Without it, `min-height: auto` (the default) means "don't shrink below content's intrinsic minimum height," which overrides the flex constraint and causes the entire chain to expand beyond the viewport.

The same rule applies horizontally: `flex: 1` inside `flex-direction: row` needs `min-width: 0`.

### CollageMaker flex chain

```
body (height: 100vh, flex column)
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
