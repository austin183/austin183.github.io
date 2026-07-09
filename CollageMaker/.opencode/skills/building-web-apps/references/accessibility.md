# Accessibility Patterns

## Contents
- Segmented Controls with Radiogroup
- Decorative Visual Indicators

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

## Decorative Visual Indicators

When a visual indicator duplicates information already available from an adjacent control, use `aria-hidden="true"` to prevent screen reader confusion.

```html
<div class="color-picker-row">
    <input type="color" id="bgColorPicker" v-model="backgroundColor" @input="onBackgroundColorChange">
    <span class="color-swatch" :style="{ backgroundColor: backgroundColor }" aria-hidden="true"></span>
</div>
```

**Why:** `<input type="color">` already announces its value to screen readers. A separate `aria-label` on the swatch would duplicate the announcement.

## File Reference

- `index.html` — Export format selector and color swatches
- `Style.css` — `.color-swatch` styles
