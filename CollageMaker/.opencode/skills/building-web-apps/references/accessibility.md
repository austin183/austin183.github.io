# Accessibility Patterns

## Contents
- Segmented Controls with Radiogroup
- Color Picker Accessibility
- Custom Button Keyboard Activation
- Loading State Buttons (aria-busy)
- Reduced Motion Preference
- ARIA Live Regions (Toast Notifications)
- ARIA Role Selection for Interactive Canvases

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

## File Reference

- `index.html` — Export format selector, color pickers, export button, toast notification template
- `Style.css` — `.color-swatch`, `.export-spinner`, `.toast-notification` styles, `prefers-reduced-motion` media query
- `MyESModules/App/createCollageData.js` — toast reactive state, `isExporting` state
- `MyESModules/App/createCollageMethods.js` — `showToast()` method
- `MyComponents/Phase2FollowUpTest.html` — Custom button keyboard activation tests
