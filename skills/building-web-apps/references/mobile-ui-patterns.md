# Mobile UI Patterns

## Contents

- Dual-State Toggle Pattern
- CSS `!important` Cascade in Media Queries
- Scoped CSS Selectors for Shared Classes
- Vue `.window` Modifier for Global Escape Key
- `display: none` for Overlay Backdrops
- ARIA `aria-expanded` on Mobile Toggle Buttons
- Bottom Sheet Content Duplication with ID Prefixing
- Bottom Sheet Visual Drag Handle
- Bottom Sheet Auto-Switch Tab on Content Change
- Fixed Element Z-Index Occlusion
- Diagnosing "Visible But Unclickable" with Playwright

## Dual-State Toggle Pattern

When a UI element (like a sidebar) has different visibility mechanisms on desktop vs mobile, use **two independent reactive state properties** toggled by a single method. CSS media queries determine which state has visual effect.

### The Problem

Desktop sidebar visibility uses a CSS class (`.sidebar-collapsed`) bound to `rightSidebarOpen`. Mobile sidebar visibility uses a different CSS class (`.mobile-open`) bound to `rightSidebarMobileOpen`. A single toggle button needs to work in both contexts.

### Anti-Pattern: Viewport Detection in JavaScript

```javascript
// BAD — couples JS to CSS breakpoint values
toggleRightSidebar() {
    if (window.innerWidth <= 699) {
        this.rightSidebarMobileOpen = !this.rightSidebarMobileOpen;
    } else {
        this.rightSidebarOpen = !this.rightSidebarOpen;
    }
}
```

**Problems:**
- Duplicates the breakpoint value in two places
- Breaks if CSS breakpoint changes
- Requires runtime viewport measurement
- Doesn't handle rapid resize during open state

### Solution: Toggle Both States

```javascript
// GOOD — CSS media queries determine which state matters
toggleRightSidebar() {
    this.rightSidebarOpen = !this.rightSidebarOpen;
    this.rightSidebarMobileOpen = !this.rightSidebarMobileOpen;
    if (this.rightSidebarMobileOpen) {
        this.leftSidebarMobileOpen = false; // mutual exclusion
    }
}
```

**Why it works:**
- On desktop (>= 700px): `rightSidebarOpen` controls `sidebar-collapsed` class; `rightSidebarMobileOpen` has no CSS effect (media query inactive)
- On mobile (< 700px): `rightSidebarMobileOpen` controls `mobile-open` class; `rightSidebarOpen` has no visual effect (sidebar is fixed off-screen)
- Both states stay in sync — toggling one toggles the other
- Zero JavaScript viewport detection needed

### Template Binding

```html
<div class="sidebar sidebar-right"
     :class="{ 'sidebar-collapsed': !rightSidebarOpen, 'mobile-open': rightSidebarMobileOpen }">
```

### File References

- `MyESModules/App/createCollageData.js` — Dual-state reactive properties
- `MyESModules/App/createCollageMethods.js` — Dual-state toggle method
- `index.html` — Template bindings

---

## CSS `!important` Cascade in Media Queries

When a desktop CSS class uses `!important` declarations, mobile media query overrides need **equally specific selectors with `!important`** to win the cascade.

### The Problem

Desktop `.sidebar-collapsed` uses `!important` to force collapse:

```css
.sidebar-collapsed {
    width: 0 !important;
    min-width: 0 !important;
    padding: 0 !important;
    border-left: none !important;
    overflow: hidden !important;
}
```

Mobile media query tries to show the sidebar:

```css
@media (max-width: 699px) {
    .sidebar-right.mobile-open {
        right: 0;
        width: 280px;  /* LOSES to .sidebar-collapsed width: 0 !important */
    }
}
```

When both classes are present (`.sidebar-right.sidebar-collapsed.mobile-open`), the `!important` rules from `.sidebar-collapsed` override the mobile styles.

### Solution: Match Specificity with `!important`

```css
@media (max-width: 699px) {
    .sidebar-right.sidebar-collapsed.mobile-open {
        width: 280px !important;
        min-width: 0 !important;
        border-left: 1px solid var(--color-surface-variant) !important;
        overflow: visible !important;
    }
}
```

**Key rules:**
1. **Match specificity** — `.sidebar-right.sidebar-collapsed.mobile-open` (3 classes) matches `.sidebar-collapsed` (1 class) in specificity context within the media query
2. **Use `!important` to beat `!important`** — without it, the desktop `!important` wins regardless of media query
3. **Only override conflicting properties** — don't repeat all properties, only the ones that conflict
4. **Keep the media query wrapper** — these overrides only apply when the media query is active

### When to Avoid `!important`

If you control both the desktop and mobile CSS, prefer avoiding `!important` entirely. The mobile override wins by specificity + source order:

```css
/* Desktop — no !important */
.sidebar-collapsed {
    width: 0;
    min-width: 0;
    overflow: hidden;
}

/* Mobile — wins by specificity + source order */
@media (max-width: 699px) {
    .sidebar-right.mobile-open {
        width: 280px;
        overflow: visible;
    }
}
```

However, when desktop CSS is established and uses `!important` (like a shared component library or legacy code), the `!important` cascade pattern is the pragmatic fix.

### File References

- `Style.css` — Mobile media queries with `!important` cascade overrides

---

## Scoped CSS Selectors for Shared Classes

When a CSS class with `!important` properties is shared across different element types via framework bindings (Vue `:class`, React `className`, etc.), scope the selector with an element type or parent class to prevent collateral damage.

### The Problem

The `.sidebar-collapsed` class serves two purposes in CollageMaker:

1. **On sidebar `<div>`s** — collapses the panel to zero width (desired)
2. **On toggle `<button>`s** — indicates collapsed state for repositioning (desired)

A bare class selector applies destructive styles to **all** elements carrying the class:

```css
/* BAD — matches ANY element with sidebar-collapsed, including toggle buttons */
.sidebar-collapsed {
    width: 0 !important;
    min-width: 0 !important;
    padding: 0 !important;
    border-left: none !important;
    overflow: hidden !important;
}
```

The `!important` flag overrides the `.sidebar-float-btn` rule's `width: 40px`, rendering the buttons invisible (computed width: 0, collapsing to 1px due to flex shrink).

### Why It Happens

- Toggle buttons were **added after** the `.sidebar-collapsed` rule existed
- The class name was reused for a different purpose (state tracking + positioning) without considering existing `!important` properties
- `!important` makes specificity irrelevant — it always wins over non-`!important` declarations regardless of specificity

### The Fix: Scope with Element Type + Parent Class

```css
/* GOOD — only matches <div class="sidebar sidebar-collapsed"> */
div.sidebar.sidebar-collapsed {
    width: 0 !important;
    min-width: 0 !important;
    padding: 0 !important;
    border-left: none !important;
    overflow: hidden !important;
}
```

**Why this works:**
- Toggle buttons have classes `sidebar-float-btn sidebar-float-left sidebar-collapsed` — they lack the `sidebar` class, so the scoped selector doesn't match them
- Sidebar divs have classes `sidebar sidebar-left sidebar-collapsed` — they match `div`, `.sidebar`, and `.sidebar-collapsed`
- Mobile overrides (`.sidebar-left.sidebar-collapsed.mobile-open`, etc.) still work because they're already more specific compound selectors

### Pattern: Separate State Class from Style Class

```css
/* State class — bare, non-destructive (or no styles at all) */
.sidebar-collapsed {
    /* Only non-destructive properties, if any */
}

/* Style class — scoped to target element type */
div.sidebar.sidebar-collapsed {
    width: 0 !important;  /* Only affects sidebar divs */
}

/* Positioning class — scoped to target element type */
.sidebar-float-left.sidebar-collapsed {
    left: 8px;  /* Only affects left toggle buttons */
}
```

### Prevention Checklist

| Check | Action |
|-------|--------|
| Does the class have `!important` properties? | Scope with element type: `div.class-name` not `.class-name` |
| Is the class applied to multiple element types? | Use compound selectors: `div.parent.child` not `.child` |
| Will new elements reuse this class? | Document the class contract — what it styles vs what it signals |
| Could `!important` be avoided? | Prefer higher specificity over `!important` when possible |

### When Bare Class Selectors Are Safe

A bare `.class-name` selector is safe when:
- The class is **only** applied to one element type
- The class has **no** `!important` properties
- The class is used purely for **state signaling** (e.g., `.sidebar-collapsed` on buttons for positioning) and the destructive styles live in a scoped selector

### Debugging: Unexpected Zero Dimensions

When an element has unexpected zero width or height:

1. **Check computed dimensions** — `getComputedStyle(el).width` will show `0px` or `1px`
2. **Look for `!important` in matching rules** — DevTools shows `!important` rules; if nothing overrides them, they win
3. **Check all classes on the element** — a shared class from a Vue `:class` binding might be applying unexpected styles
4. **Search for the class in CSS** — `grep .class-name Style.css` to find all rules that could match

### File References

- `Style.css` — `div.sidebar.sidebar-collapsed` (line 614), `.sidebar-float-left.sidebar-collapsed` (line 450), `.sidebar-float-right.sidebar-collapsed` (line 460)
- `index.html` — Vue `:class` bindings on sidebar divs and toggle buttons

---

## Vue `.window` Modifier for Global Escape Key

Use `@keydown.escape.window.prevent` on the app root to catch Escape key globally, regardless of which element has focus.

```html
<div id="app" @keydown.escape.window.prevent="closeSidebars">
```

**Why `.window`:** A bare `@keydown.escape` on a div only fires when that div has focus. The `.window` modifier attaches the listener to `window`, ensuring Escape is caught regardless of focus state.

**Why `.prevent`:** Prevents browser default Escape behavior (closing dialogs, canceling operations) when a sidebar is open.

### E2E Testing Caveat

`page.keyboard.press('Escape')` is **unreliable** for triggering `@keydown.escape.window.prevent` in headless Chromium, especially in mobile viewport with modal/overlay contexts. For E2E tests that need to verify Escape-dismiss behavior:

- **Preferred:** Use backdrop click (`page.mouse.click(100, 100)`) to exercise the same dismiss code path
- **Alternative:** Unit test `closeSidebars()` directly in Mocha/Chai — deterministic, no browser quirks

See `references/testing-e2e.md` for the full gotcha and all workarounds.

### File References

- `index.html` — Escape key handler on app root

---

## `display: none` for Overlay Backdrops

Use `display: none` (not `opacity: 0`) for overlay backdrops that should not intercept pointer events when hidden.

```css
/* GOOD — completely removed from rendering and event flow */
.sidebar-overlay {
    display: none;
}
.sidebar-overlay.visible {
    display: block;
}

/* BAD — invisible but still intercepts clicks */
.sidebar-overlay {
    opacity: 0;
    pointer-events: none; /* extra property needed */
}
.sidebar-overlay.visible {
    opacity: 1;
    pointer-events: auto; /* must remember to set this too */
}
```

**Trade-off:** `display: none` cannot be CSS-transitioned (no fade animation). For a backdrop overlay that appears/disappears with sidebar slides, instant show/hide is acceptable.

### File References

- `Style.css` — `.sidebar-overlay` styles
- `index.html` — Overlay template with `v-show` or `:class` binding

---

## ARIA `aria-expanded` on Mobile Toggle Buttons

Bind `:aria-expanded` to the mobile sidebar state so screen readers announce the open/closed state:

```html
<button @click="toggleLeftSidebar"
        :aria-expanded="leftSidebarMobileOpen"
        aria-label="Toggle image panel">
    <span class="material-icons">{{ leftSidebarMobileOpen ? 'chevron_left' : 'chevron_right' }}</span>
</button>
```

**Note:** When using dual-state toggles, bind `aria-expanded` to the **mobile** state property, since that's what controls the overlay visibility on mobile devices. On desktop, the sidebar is always inline and `aria-expanded` is less relevant.

### File References

- `index.html` — Mobile toggle buttons with `aria-expanded`

---

## Bottom Sheet Content Duplication with ID Prefixing

When duplicating sidebar content into a bottom sheet, every `id` attribute must be unique in the DOM. Duplicate IDs cause `document.getElementById()` to return the wrong element, break ARIA associations (`for`/`aria-labelledby`/`aria-describedby`), and fail HTML validation.

### Pattern

Prefix all bottom sheet IDs with `bs`:

| Sidebar ID | Bottom Sheet ID |
|---|---|
| `layoutStyleSelect` | `bsLayoutStyleSelect` |
| `gutterSlider` | `bsGutterSlider` |
| `cropPreviewCanvas` | `bsCropPreviewCanvas` |
| `bgColorPicker` | `bsBgColorPicker` |
| `exportBtn` | `bsExportBtn` |

### Key Details

- **Consistent prefix** — Using `bs` (bottom sheet) across all duplicated elements makes the pattern easy to audit.
- **`for` attributes must match** — When a `<label for="bsBgColorPicker">` references an `<input id="bsBgColorPicker">`, both must use the prefixed ID.
- **`v-for` keys** — Use a distinct key prefix in `v-for` loops (e.g., `:key="'bs-img-' + image.id"`) to avoid Vue key conflicts between sidebar and bottom sheet lists.

---

## Bottom Sheet Visual Drag Handle

A bottom sheet that slides up from the bottom has no obvious "close" affordance for touch users. Backdrop tap and Escape key are invisible dismiss methods. A visual drag handle (grab bar) signals that the sheet can be dismissed.

### Pattern

```html
<div class="bottom-sheet-handle" aria-hidden="true">
    <span class="bottom-sheet-handle-bar"></span>
</div>
```

```css
.bottom-sheet-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 0 4px;
    flex-shrink: 0;
}

.bottom-sheet-handle-bar {
    width: 32px;
    height: 4px;
    background-color: var(--color-surface-variant);
    border-radius: 2px;
}
```

### Key Details

- **`aria-hidden="true"`** — The handle is purely decorative. Screen readers should not announce it as an interactive element.
- **`flex-shrink: 0`** — Prevents the handle from being compressed when the content area grows.
- **Positioned above the tab bar** — The handle is the first visual element users see when the sheet opens, establishing the "this is a dismissible panel" mental model.

---

## Bottom Sheet Auto-Switch Tab on Content Change

When the bottom sheet is open on a non-"Images" tab and the user adds new images, the new images are invisible until the user manually switches tabs. Auto-switching to the Images tab after adding images provides immediate feedback.

### Pattern

```javascript
// File picker path
async handleFileInputChange() {
    await fileHandlers.handleFileInputChange.call(this);
    if (this.bottomSheetOpen) {
        this.activeBottomSheetTab = 'images';
    }
}

// Drag-drop path — in lifecycle setup
this._regenerateAndRender();
if (this.bottomSheetOpen) {
    this.activeBottomSheetTab = 'images';
}
```

### Key Details

- **Both paths must be covered** — File picker and drag-drop are independent code paths. Both need the tab switch.
- **Only when bottom sheet is open** — Guarding with `if (this.bottomSheetOpen)` makes the intent explicit and avoids unnecessary reactive updates.

---

## Fixed Element Z-Index Occlusion

`position: fixed` elements are taken out of document flow and painted on their own stacking context. If a fixed element has a high `z-index` and its coordinates overlap a flow element (like a toolbar button), the fixed element **always wins** regardless of DOM order.

### The Problem

A fixed element like `#themeToggle` (`position: fixed; right: 24px; z-index: 200`) can completely occlude a toolbar button at the mobile breakpoint. The occluded button reports `isVisible() === true` and has full opacity — it is visually present but painted behind the fixed overlay.

### General Rule

> When placing mobile-only elements in a toolbar that also has `position: fixed` overlays (theme toggle, toast, etc.), always check the fixed element's bounding box at the mobile breakpoint. Place mobile elements on the **opposite side** of the toolbar from any fixed overlays.

### Prevention Checklist

| Check | How |
|-------|-----|
| What's the fixed element's right/left offset? | Read CSS `right:` or `left:` value |
| Where does the new element render at the mobile breakpoint? | Playwright `boundingBox()` at 675px |
| Do the bounding boxes overlap? | Compare x-coordinates |
| Does the fixed element have higher z-index? | Compare `z-index` values |

---

## Diagnosing "Visible But Unclickable" with Playwright

When Playwright reports `element.isVisible() === true` but `element.click()` fails with **"intercepts pointer events"**, the element is visually present but another element is painted on top of it.

### Diagnostic Pattern

```javascript
// 1. Verify the element is actually visible
const isVisible = await el.isVisible();
const box = await el.boundingBox();
console.log('isVisible:', isVisible, 'box:', JSON.stringify(box));

// 2. Check computed styles (display, visibility, opacity)
const display = await el.evaluate(e => getComputedStyle(e).display);
const visibility = await el.evaluate(e => getComputedStyle(e).visibility);
const opacity = await el.evaluate(e => getComputedStyle(e).opacity);

// 3. Walk the parent chain to find a hidden ancestor
const parentChain = await el.evaluate(e => {
    const chain = [];
    let node = e;
    while (node && node !== document.body) {
        const d = getComputedStyle(node).display;
        chain.push(`${node.tagName}${node.id ? '#' + node.id : ''} => display:${d}`);
        node = node.parentElement;
    }
    return chain;
});

// 4. If all checks pass but click still fails with "intercepts pointer events",
//    another element is overlapping. Check for fixed/absolute positioned elements
//    at similar coordinates with higher z-index.
```

### The Playwright Error Message Is Your Clue

```
- <button id="themeToggle"> intercepts pointer events
```

This tells you **exactly** which element is blocking the click. The element name in the error message is the occluder — not the target.

### Key Insight

`isVisible()` checks whether the element itself is rendered, not whether it's *accessible to pointer events*. An element can be fully visible but completely occluded by another element with a higher stacking context.

### File References

- `index.html` — Bottom sheet template, mobile toggle buttons, hamburger placement
- `Style.css` — Bottom sheet CSS, `.bottom-sheet-handle`, `#themeToggle` z-index, fixed element positioning
- `MyESModules/App/createCollageMethods.js` — `closeSidebars()` focus return, auto-switch tab logic
- `MyESModules/App/createCollageLifecycle.js` — Drag-drop tab switch path
