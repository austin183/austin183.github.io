# Vue 3 Options API Patterns

## Factory Decomposition

The Vue app is assembled from separate factory functions. The assembly function must explicitly merge methods (never use `...spread` for lifecycle configs that may contain a `methods:` key):

```javascript
// createCollageApp.js — CORRECT pattern
export function createCollageApp({
    createApp,
    dataConfig,       // from createCollageData.js
    methodsConfig,    // from createCollageMethods.js
    lifecycleConfig,  // from createCollageLifecycle.js
    servicesConfig    // from createCollageServices.js
}) {
    const allMethods = {
        ...methodsConfig,
        ...(lifecycleConfig.methods || {})
    };

    return createApp({
        data: dataConfig,
        computed: { ... },
        methods: allMethods,
        mounted: lifecycleConfig.mounted,
        beforeUnmount: lifecycleConfig.beforeUnmount,
        ...servicesConfig
    });
}
```

**Why this matters**: If `lifecycleConfig` contains a `methods:` key (e.g., helper functions that need lifecycle context), spreading `...lifecycleConfig` after `methods: methodsConfig` silently overwrites all template-referenced methods. Only the lifecycle helpers survive, causing `TypeError: X is not a function` at render time.

### Gotchas

1. **`data` must be a function** — Vue requires `data` to be a factory function, not an object
2. **`this` context** — Methods and lifecycle hooks receive `this` as the Vue instance
3. **Methods must be inside `methods:` block** — Functions at root level of Options API config are NOT bound to `this`. Only functions inside `methods: { }` and lifecycle hooks get bound. Root-level helper functions will cause `TypeError: X is not a function` when called via `this.X()`
4. **Object spread order overwrites silently** — When merging configs, later properties overwrite earlier ones. Never use `...lifecycleConfig` after setting `methods:` if lifecycle may contain a `methods:` key
5. **State managers** — Receive Vue instance reference and mutate reactive properties directly

## Reactive State

All reactive state lives in the Vue instance's `data()` return value. State managers (`LayoutManager`, `CropManager`, etc.) mutate these properties directly. No Pinia, no Vuex.

## provide() Timing

`provide()` is called during Vue component initialization, **before** `mounted()`. Services initialized in `mounted()` (like managers that need the reactive Vue instance) will be `null` when accessed via `provide()`.

```javascript
// WRONG — managers are null at provide() time
provide() {
    return {
        backgroundManager: base.getBackgroundManager(), // null!
        titleManager: base.getTitleManager()             // null!
    };
}
```

**Fix:** Only provide services available at init time. Services initialized in `mounted()` should be accessed via `this.managerName` on the Vue instance, not via `inject()`.

**Alternative:** Provide getter functions for lazy access:

```javascript
provide() {
    return {
        getBackgroundManager: () => base.getBackgroundManager(),
    };
}
// Child calls inject('getBackgroundManager')() after mounted
```

## @mousedown.prevent for Text Selection Preservation

When toolbar buttons (bold, italic, etc.) operate on a text input's selection, clicking a button steals focus and clears the selection. Use `@mousedown.prevent` to keep focus on the input:

```html
<!-- Button click steals focus, clearing selection -->
<button @click="toggleBold">B</button>

<!-- @mousedown.prevent keeps focus on the input -->
<button @mousedown.prevent @click="toggleBold">B</button>
```

This pattern applies to any toolbar button that operates on a text input's current selection range.

## Files

| File | Responsibility |
|------|---------------|
| `CollageBase.js` | Base services (assembler, dropHandler, componentRegistry) |
| `createCollageData.js` | Reactive data factory (returns function for Vue `data`) |
| `createCollageMethods.js` | Instance methods (all `this`-aware operations) |
| `createCollageLifecycle.js` | `mounted()` and `beforeUnmount()` hooks, plus any helper methods in `methods:` block |
| `createCollageServices.js` | `provide()` / `inject()` for dependency injection |
| `createCollageApp.js` | Assembles everything into Vue app config (explicit merge) |
