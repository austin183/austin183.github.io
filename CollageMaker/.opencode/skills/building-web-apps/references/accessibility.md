# Accessibility Patterns

## Contents
- Segmented Controls with Radiogroup
- Color Picker Accessibility
- Custom Button Keyboard Activation
- Loading State Buttons (aria-busy)
- Reduced Motion Preference
- ARIA Live Regions (Toast Notifications)
- ARIA Role Selection for Interactive Canvases
- Consolidating Duplicate Application Regions
- Reactive Numeric Readouts (role=status)
- Touch Target Sizing (WCAG 2.5.8)
- ARIA Tab Pattern (id + aria-controls + aria-labelledby)
- Focus Return on Dialog Close

## Segmented Controls with Radiogroup

For mutually exclusive options (format selectors, layout pickers, etc.) in Vue templates, use ARIA radiogroup for keyboard and screen reader accessibility.

```html
<label id="exportFormatLabel">Format</label>
<div class="segmented-control" role="radiogroup" aria-labelledby="exportFormatLabel">
    <button class="segment-btn"
            :class="{ active: exportFormat === 'jpeg' }"
            role="radio"
            :aria-checked="exportFormat === 'jpeg'"
            @click="exportFormat = 'jpeg'">
        JPEG
    </button>
    <button class="segment-btn"
            :class="{ active: exportFormat === 'png' }"
            role="radio"
            :aria-checked="exportFormat === 'png'"
            @click="exportFormat = 'png'">
        PNG
    </button>
</div>
```

**Key attributes:**
- `role="radiogroup"` on the container groups buttons as a radio group
- `aria-labelledby` associates the group with its label
- `role="radio"` on each button exposes it as a radio option to screen readers
- `:aria-checked` dynamically reflects the selected state
- `<button>` elements are natively keyboard-focusable and activatable (Enter/Space)

## Color Picker Accessibility

`<input type="color">` is a fully accessible, natively keyboard-focusable and activatable control. Do NOT add duplicate interactive targets (e.g., clickable swatches with `role="button"`) beside it.

### Descriptive Labels (Preferred)

Add descriptive text instead of duplicate click targets:

```html
<input type="color" id="bgColorPicker" v-model="backgroundColor" @input="onBackgroundColorChange">
<span class="color-swatch" :style="{ backgroundColor: backgroundColor }" aria-hidden="true"></span>
<span class="color-label">Background color</span>
```

**Why this approach:**
- `<input type="color">` already announces its value to screen readers
- Avoids Vue ref reliability issues with `$refs.myPicker.click()` — refs on color inputs may not expose `.click()` in all browsers
- Avoids browser security restrictions on programmatic color picker activation
- No custom keyboard handling needed

### Custom Swatch Buttons (If Required)

If a clickable swatch is unavoidable, it must handle Enter AND Space per WCAG 2.1 SC 2.1.1:

```html
<span role="button" tabindex="0"
      @click="openColorPicker"
      @keydown.enter="openColorPicker"
      @keydown.space.prevent="openColorPicker">
    Open color picker
</span>
```

See [Custom Button Keyboard Activation](#custom-button-keyboard-activation) for details.

## Custom Button Keyboard Activation

When a non-interactive element (`<span>`, `<div>`) is given `role="button"` and `tabindex="0"`, it becomes a custom button. Per WAI-ARIA Authoring Practices, it MUST activate on **both** Enter and Space keys.

```html
<span role="button" tabindex="0"
      @click="doSomething"
      @keydown.enter="doSomething"
      @keydown.space.prevent="doSomething">
    Click me
</span>
```

**Key points:**
- **`@keydown.space.prevent`** — Space on a focused element triggers page scroll. `.prevent` blocks this.
- **Always pair Enter and Space** — if you handle one, handle the other.
- **`@click` covers mouse users** — no need for separate `@mousedown` or `@mouseup`.
- **Prefer native `<button>`** — handles Enter/Space automatically. Reserve `role="button"` for layout-constrained cases.

### Testing Custom Buttons

```javascript
// Enter key
const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
element.dispatchEvent(enterEvent);

// Space key — key is ' ' (space character), NOT 'Space'
const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
element.dispatchEvent(spaceEvent);
```

## Loading State Buttons (aria-busy)

When a button triggers an async operation (e.g., export), communicate loading state to screen readers:

```html
<button :aria-busy="isExporting" :disabled="isExporting">
    <span v-if="isExporting" class="spinner" aria-hidden="true">...</span>
    {{ isExporting ? 'Exporting...' : 'Export' }}
</button>
```

**Key points:**
- **`:aria-busy`** — Screen readers announce "busy" during loading
- **`:disabled`** — Prevents double-clicks and native focus behavior
- **`aria-hidden="true"` on spinner** — Decorative; text + aria-busy provide context

## Reduced Motion Preference

Respect `prefers-reduced-motion` for all CSS animations, especially continuous ones (spinners, pulsing, sliding):

```css
.export-spinner {
    animation: export-spin 1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
    .export-spinner {
        animation: none;
    }
}
```

**Key points:**
- Set by users in OS/browser settings for vestibular disorder accommodation
- `animation: none` disables motion; icon remains static as visual indicator
- **Always pair animations with text feedback** (e.g., "Exporting...") so loading state is communicated when motion is disabled
- Addresses WCAG 2.1 SC 2.3.3 (Animation from Interactions), Level AAA — low effort, high impact

## ARIA Live Regions (Toast Notifications)

For toast notifications, choosing the right ARIA role determines screen reader behavior:

| Role | Implicit `aria-live` | Behavior | Use when |
|------|---------------------|----------|----------|
| `role="status"` | `polite` | Announces when user is idle | Info messages, success confirmations |
| `role="alert"` | `assertive` | Interrupts immediately | Critical errors, security warnings |

### Rule of Thumb

- **Info toasts** (e.g., "AI features unavailable — using default focus"): Use `role="status" aria-live="polite"`. Informational, no immediate attention required.
- **Error toasts** (e.g., "Export failed: ..."): Use `role="alert"` for critical errors that block the user's workflow. For non-blocking errors, `role="status"` is fine.
- **Success toasts** (e.g., "Collage exported!"): Use `role="status" aria-live="polite"`.

### Anti-Pattern

Do NOT combine `role="alert"` with `aria-live="polite"` — they contradict each other. `role="alert"` implicitly sets `aria-live="assertive"`. Adding `aria-live="polite"` creates invalid ARIA that may confuse screen readers.

### Decorative Icons in Live Regions

Always add `aria-hidden="true"` to decorative icons inside live regions. Screen readers will read the icon text content ("error" or "info") which duplicates the message meaning.

```html
<span class="material-icons" aria-hidden="true">
    {{ toast.type === 'error' ? 'error' : 'info' }}
</span>
```

## Reactive Numeric Readouts (role=status)

When displaying dynamically-updating numeric values (crop coordinates, dimensions, progress, etc.), use `role="status"` on the container so screen readers announce value changes automatically.

### Why `role="status"` over `aria-live` alone?

- `role="status"` implicitly sets `aria-live="polite"` AND `aria-atomic="true"`
- `aria-atomic="true"` ensures the entire readout is announced as a unit, not individual numbers
- Screen readers treat `role="status"` as a live region by default — no additional attributes needed

### Why `aria-live="polite"` over `assertive`?

- Values update frequently during interactions (e.g., drag gestures)
- `polite` waits for the user to pause before announcing; `assertive` interrupts
- Numeric readouts are supplementary information, not critical alerts

### Pattern

```html
<div class="detail-section" aria-label="Crop settings">
    <div class="crop-info" role="status" aria-live="polite">
        <span class="crop-info-item">X: {{ Math.round(selectedCropInfo.sourceRect.x) }}</span>
        <span class="crop-info-item">Y: {{ Math.round(selectedCropInfo.sourceRect.y) }}</span>
        <span class="crop-info-item">W: {{ Math.round(selectedCropInfo.sourceRect.width) }}</span>
        <span class="crop-info-item">H: {{ Math.round(selectedCropInfo.sourceRect.height) }}</span>
    </div>
</div>
```

Vue reactivity updates the text content automatically; `role="status"` ensures screen readers announce the changes.

**File Reference:**
- `index.html` — crop info readout in `#bs-panel-edit`

## ARIA Role Selection for Interactive Canvases

Choosing the correct ARIA role for a `<canvas>` element determines how screen readers present it to users.

| Role | Use when | Screen reader behavior |
|------|----------|----------------------|
| `role="img"` | **Static, non-interactive** images | Announces as an image; expects `aria-label` for description |
| `role="application"` | **Complex interactive widgets** (canvas editors, games, drag-and-drop surfaces) | Switches to application mode; users rely on custom keyboard navigation |
| No role (default) | Canvas is decorative or has no meaningful content | Ignored by screen readers |

### `role="application"` for Interactive Canvases

For canvas-based editors that accept pointer interactions (drag-and-drop, selection, gestures), use `role="application"` with a descriptive `aria-label`:

```html
<canvas
    id="previewCanvas"
    role="application"
    aria-label="Collage editor. Use arrow keys to navigate panels, Space to select, drag to rearrange.">
</canvas>
```

**Key points:**
- `role="application"` tells assistive technologies that standard widget semantics don't apply
- The `aria-label` should describe what the user can do, not just what the element is
- Pair with actual keyboard navigation — `role="application"` sets the expectation that users can interact via keyboard

### Anti-Pattern: `role="img"` on Interactive Canvases

Using `role="img"` on a canvas that accepts pointer interactions misleads screen reader users into thinking the element is static content. They will not expect to be able to interact with it.

```html
<!-- WRONG — canvas accepts drag, selection, and gestures -->
<canvas id="previewCanvas" role="img" aria-label="Collage preview"></canvas>

<!-- CORRECT -->
<canvas id="previewCanvas" role="application" aria-label="Collage editor. ..."></canvas>
```

**File Reference:**
- `index.html` — canvas ARIA role

## Consolidating Duplicate Application Regions

When the same interaction (e.g., crop editing) is available in multiple UI locations (desktop sidebar, mobile bottom sheet), avoid creating multiple `role="application"` regions. Screen reader users encounter duplicate focus targets, ambiguous navigation, and context-switching overhead.

### Pattern: Single Source of Truth

Designate one region as the primary interactive region. Other locations should be **read-only** or removed entirely.

```html
<!-- Main canvas — primary crop interaction (keep role="application") -->
<canvas id="previewCanvas" role="application" aria-label="Canvas"></canvas>

<!-- Mobile bottom sheet — read-only crop info (no role="application") -->
<div class="detail-section" aria-label="Crop settings">
    <div class="crop-info" role="status" aria-live="polite">
        <span class="crop-info-item">X: 120</span>
        <span class="crop-info-item">Y: 340</span>
        <span class="crop-info-item">W: 800</span>
        <span class="crop-info-item">H: 600</span>
    </div>
    <button class="pure-button reset-crop-btn">Reset Crop</button>
</div>
```

### Decision Framework

| Factor | Keep as `role="application"` | Demote to read-only |
|--------|------------------------------|---------------------|
| Touch targets meet 44x44px minimum | Yes | No |
| Spatial context is sufficient for interaction | Yes | No |
| User can perform the action meaningfully here | Yes | No |
| Main canvas provides adequate feedback | N/A | Prefer demote |

**File Reference:**
- `index.html` — crop section in `#bs-panel-edit` (mobile bottom sheet Edit tab)
- `MyESModules/Interaction/CropInteraction.js` — single canvas ID normalization

## Touch Target Sizing (WCAG 2.5.8)

WCAG 2.1 SC 2.5.8 (Target Size: Minimum) requires interactive touch targets to be at least **44x44 CSS pixels**. Elevates to Level AA in WCAG 2.2.

### Choosing the sizing property

| Button type | Properties | Why |
|---|---|---|
| **Text buttons** (`.pure-button`, `.segment-btn`, `.export-btn`) | `min-height: 44px` | Grows if content exceeds minimum (font zoom, accessibility overrides) |
| **Icon-only buttons** (`.toolbar-icon-btn`, `#themeToggle`, `.remove-btn`) | `min-width: 44px` + `min-height: 44px` | No text content to drive size — both dimensions need minimums |
| **Fixed-size buttons** (`.format-btn` in formatting bars) | `width: 44px` + `height: 44px` | Uniform sizing critical for visual alignment in rows |

### Circular buttons

For `border-radius: 50%` buttons, maintain a perfect circle:

```css
.remove-btn {
    min-width: 44px;
    min-height: 44px; /* Equal to min-width = square aspect ratio */
    border-radius: 50%;
    padding: var(--space-2); /* Equal padding on all sides */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0; /* Prevent flex container from squishing into oval */
}
```

### Native form controls with custom styling

Standard native controls (checkboxes, radios, range sliders) fall under the WCAG "Unavoidable" exception. **Custom-styled controls are NOT exempt.**

**`<input type="color">`** — Typically renders at 32-36px. Override with:
```css
input[type="color"] {
    height: 44px;
    min-height: 44px;
    padding: 0;
}
```

**`<input type="file">`** — The `::-webkit-file-upload-button` pseudo-element has limited height control. Increasing it causes cross-browser rendering inconsistencies. Defer if problematic.

### Verification

Manual: DevTools → Elements → Computed tab → verify `min-width`/`min-height` >= 44px.

Automated (Playwright):
```javascript
const style = await page.locator('#themeToggle').evaluate(el => getComputedStyle(el));
expect(parseInt(style.minWidth)).toBeGreaterThanOrEqual(44);
expect(parseInt(style.minHeight)).toBeGreaterThanOrEqual(44);
```

## ARIA Tab Pattern: Complete `id` + `aria-controls` + `aria-labelledby` Wiring

The WAI-ARIA tabs pattern requires three relationships — `role="tab"`, `aria-selected`, **and** the programmatic wiring between tabs and panels via `id`/`aria-controls`/`aria-labelledby`.

### Incomplete Pattern (Common Mistake)

```html
<!-- Has role="tab" and aria-selected but missing id/aria-controls -->
<button role="tab" :aria-selected="active === 'images'" @click="setTab('images')">
    Images
</button>
<div role="tabpanel" v-show="active === 'images'">
    <!-- Content -->
</div>
```

Works visually and screen readers announce `aria-selected`, but assistive technologies that rely on `aria-controls` for tab-to-panel navigation (VoiceOver rotor, JAWS tab list) will not function.

### Complete Pattern

```html
<!-- Tab: needs id + aria-controls pointing to panel -->
<button id="bs-tab-images" role="tab"
        :aria-selected="activeBottomSheetTab === 'images'"
        aria-controls="bs-panel-images"
        @click="setBottomSheetTab('images')">
    Images
</button>

<!-- Panel: needs id matching aria-controls + aria-labelledby pointing to tab -->
<div id="bs-panel-images" role="tabpanel"
     aria-labelledby="bs-tab-images"
     v-show="activeBottomSheetTab === 'images'">
    <!-- Content -->
</div>
```

### Why Both `aria-controls` AND `aria-labelledby`?

- **`aria-controls`** (on the tab): Tells assistive tech "this tab controls this panel". Enables tab-to-panel navigation.
- **`aria-labelledby`** (on the panel): Tells assistive tech "this panel's label comes from this tab". When focus enters the panel, the tab label is announced as context.

## Focus Return on Dialog Close

When a modal dialog (`role="dialog" aria-modal="true"`) closes, focus **MUST** return to the element that opened it. This is WCAG 2.1 Level A (2.4.3 Focus Order).

### Pattern

```javascript
closeSidebars() {
    const wasBottomSheetOpen = this.bottomSheetOpen;
    this.leftSidebarMobileOpen = false;
    this.rightSidebarMobileOpen = false;
    this.bottomSheetOpen = false;
    // Return focus to the element that opened the dialog
    if (wasBottomSheetOpen) {
        const btn = document.getElementById('bottomSheetToggleBtn');
        if (btn) btn.focus();
    }
}
```

### Key Details

- **Capture state before mutation** — `wasBottomSheetOpen` is read before setting `bottomSheetOpen = false`, because the method handles all dismissal paths (backdrop tap, Escape key).
- **Defensive DOM lookup** — `getElementById()` may return `null` if the element is hidden by CSS (`display: none`) at lookup time. Guard with `if (btn)`.
- **Scope to the closing dialog** — Only return focus when the specific dialog that closed was the one the user opened.

## File Reference

- `index.html` — Export format selector, color pickers, export button, toast notification template, bottom sheet tabs and panels, crop info readout in `#bs-panel-edit`, canvas ARIA roles
- `Style.css` — `.color-swatch`, `.export-spinner`, `.toast-notification` styles, `prefers-reduced-motion` media query, touch target sizing
- `MyESModules/App/createCollageData.js` — toast reactive state, `isExporting` state
- `MyESModules/App/createCollageMethods.js` — `showToast()` method, `closeSidebars()` focus return
- `MyESModules/Interaction/CropInteraction.js` — single canvas ID normalization for duplicate region avoidance
- `MyComponents/Phase2FollowUpTest.html` — Custom button keyboard activation tests
