# Vue 3 Options API Patterns

## Factory Decomposition

The Vue app is assembled from separate factory functions:

```javascript
// createCollageApp.js
export function createCollageApp({
    createApp,
    dataConfig,       // from createCollageData.js
    methodsConfig,    // from createCollageMethods.js
    lifecycleConfig,  // from createCollageLifecycle.js
    servicesConfig    // from createCollageServices.js
}) {
    return createApp({
        data: dataConfig,
        computed: { ... },
        methods: methodsConfig,
        ...lifecycleConfig,
        ...servicesConfig
    });
}
```

### Files

| File | Responsibility |
|------|---------------|
| `CollageBase.js` | Base services (assembler, dropHandler, componentRegistry) |
| `createCollageData.js` | Reactive data factory (returns function for Vue `data`) |
| `createCollageMethods.js` | Instance methods (all `this`-aware operations) |
| `createCollageLifecycle.js` | `mounted()` and `beforeUnmount()` hooks |
| `createCollageServices.js` | `provide()` / `inject()` for dependency injection |
| `createCollageApp.js` | Assembles everything into Vue app config |

## Gotchas

1. **`data` must be a function** — Vue requires `data` to be a factory function, not an object
2. **`this` context** — Methods and lifecycle hooks receive `this` as the Vue instance
3. **Spread operators** — `...lifecycleConfig` and `...servicesConfig` merge into Vue config
4. **State managers** — Receive Vue instance reference and mutate reactive properties directly

## Reactive State

All reactive state lives in the Vue instance's `data()` return value. State managers (`LayoutManager`, `CropManager`, etc.) mutate these properties directly. No Pinia, no Vuex.
