# Toast Notifications

Minimal toast system using reactive state + `setTimeout` for auto-dismiss. No dedicated component — just data, a method, and a template element.

## Reactive State

In `createCollageData.js`:

```javascript
toast: {
    message: '',
    type: '',       // 'info', 'success', 'error'
    visible: false,
    timer: null
},
```

## Method

In `createCollageMethods.js`:

```javascript
showToast(message, type, duration) {
    type = type || 'info';
    duration = duration != null ? duration : 5000;
    if (this.toast.timer) clearTimeout(this.toast.timer);
    this.toast.message = message;
    this.toast.type = type;
    this.toast.visible = true;
    this.toast.timer = setTimeout(() => {
        this.toast.visible = false;
        this.toast.message = '';
        this.toast.timer = null;
    }, duration);
},
```

## Template

In `index.html`:

```html
<div class="toast-notification"
     v-show="toast.visible"
     :class="'toast-' + toast.type"
     role="status"
     aria-live="polite">
    <span class="material-icons" aria-hidden="true">
        {{ toast.type === 'error' ? 'error' : 'info' }}
    </span>
    {{ toast.message }}
</div>
```

## Key Gotchas

- **Timer cleanup in `beforeUnmount()`** — Clear the toast timer to prevent updating reactive state on a destroyed instance: `if (this.toast && this.toast.timer) { clearTimeout(this.toast.timer); this.toast.timer = null; }`
- **Toast coalescing** — Rapid successive calls clear the previous timer and overwrite the message. Only the last message is shown. Prevents spam but loses quick successive errors.
- **`v-show` with CSS transitions** — `v-show` toggles `display: none`, which cannot be CSS-transitioned. For fade animations, use `v-if` with `<transition>` or bind `visibility` + `opacity` via inline styles. For simple toasts, `v-show` is acceptable (instant show/hide).
- **Mobile safe areas** — Use `calc(16px + env(safe-area-inset-bottom, 0px))` for bottom-positioned fixed elements to avoid iOS home indicator overlap. Requires `viewport-fit=cover` in the viewport meta tag or `env()` returns 0. See `references/css-layout.md` for the complete safe area pattern.
- **ARIA live region role** — Use `role="status" aria-live="polite"` for info/success toasts. Consider `role="alert"` for critical errors. Never combine `role="alert"` with `aria-live="polite"` — they contradict each other. Always add `aria-hidden="true"` to decorative icons inside live regions. See `references/accessibility.md`.
