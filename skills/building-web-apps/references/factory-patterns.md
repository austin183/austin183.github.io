# Factory Wiring & Testability Patterns

Patterns for wiring Vue factory modules: callback injection, ID injection, provider functions, closure safety, and service locator access.

## Contents

- [Callback injection for handler DIP](#callback-injection-for-handler-dip)
- [Handler binding convention](#handler-binding-convention)
- [DOM ID injection](#dom-id-injection)
- [Internal vs. module extraction](#internal-vs-module-extraction)
- [Callback wiring in extracted modules](#callback-wiring-in-extracted-modules)
- [Provider functions vs. direct callbacks](#provider-functions-vs-direct-callbacks)
- [Closure reference safety for undo commands](#closure-reference-safety-for-undo-commands)
- [Service locator access safety](#service-locator-access-safety)
- [Return object exposure for internal functions](#return-object-exposure-for-internal-functions)
- [Internal closure pattern for factory testability](#internal-closure-pattern-for-factory-testability)

## Callback Injection for Handler DIP

Decouple Vue handler modules from render logic by injecting callbacks that receive the Vue instance:

```javascript
// Handler factory accepts callback that receives Vue instance
export function createLayoutHandlers(getLayoutManager, onRenderScheduled) {
    return {
        onLayoutStyleChange() {
            const lm = getLayoutManager();
            if (lm) lm.setLayoutStyle(this.layoutStyle);
            onRenderScheduled(this); // Pass Vue instance to callback
        }
    };
}

// Wiring: build internal functions first, then handlers
export function createCollageMethods(base) {
    function _scheduleRender(vm) {
        const renderer = base.getCanvasRenderer();
        // ... render logic using vm.state
    }
    const layoutHandlers = createLayoutHandlers(
        () => base.getLayoutManager(),
        (vm) => _scheduleRender(vm)
    );
    return {
        _scheduleRender() { _scheduleRender(this); },
        onLayoutStyleChange() { layoutHandlers.onLayoutStyleChange.call(this); }
    };
}
```

- Internal functions are pure closures over `base` (services) accepting an explicit `vm` parameter — no `this` dependency
- Callbacks are created at factory time, capturing the internal function reference
- **Do NOT use `() => this._scheduleRender()` as callback** — at factory creation time, `this` is not the Vue instance

## Handler Binding Convention

All handlers from extracted modules use `.call(this, ...)` in `createCollageMethods.js` to bind the Vue instance as `this`. This gives handlers access to `this.titleText`, `this.showToast`, etc. Always follow this convention for new handlers — verify by checking existing handler bindings before adding new ones.

## DOM ID Injection

Accept DOM element IDs as factory configuration instead of hardcoding `document.getElementById()`:

```javascript
const DEFAULT_DOM_IDS = { previewCanvas: 'previewCanvas', cropPreviewCanvas: 'cropPreviewCanvas' };
export function createCollageLifecycle(base, domIds = {}) {
    const ids = { ...DEFAULT_DOM_IDS, ...domIds };
    // Use ids.previewCanvas instead of hardcoded string
}
```

- Always provide sensible defaults so existing callers don't break
- Tests can supply mock IDs to verify `getElementById` is called with the correct ID

## Internal vs. Module Extraction

Callback injection is the *primary* DIP improvement. Module extraction is the *secondary* SRP improvement. If internal functions have clear boundaries AND the file exceeds ~400 lines, extraction is worthwhile: it yields independent testability, clearer module boundaries, and reduced cognitive load (the composition layer becomes a wiring diagram rather than intertwined logic). If the file stays under ~400 lines and functions are tightly coupled to Vue internals, skip extraction to avoid unnecessary import complexity.

## Callback Wiring in Extracted Modules

When extracted modules depend on each other, accept callback objects as factory parameters instead of importing sibling modules. This prevents circular dependencies and preserves one-way dependency flow: `Composition → Extracted Modules`.

## Provider Functions vs. Direct Callbacks

Choose based on whether the referenced objects are stable:

- **Direct callbacks** — Use when the referenced objects are stable for the factory's lifetime (simpler, less indirection):

```javascript
// Safe: layoutManager is never replaced after factory creation
const layoutHandlers = createLayoutHandlers(
    () => base.getLayoutManager(),
    (vm) => renderMethods._scheduleRender(vm)  // Direct callback — renderMethods is stable
);
```

- **Provider functions** — Use when callbacks reference objects that may be replaced after factory creation. The provider returns the callback at *call time*, not factory time:

```javascript
// Provider functions return the callback at undo/redo time, preventing stale references
const undoMethods = createUndoMethods(base, {
    getOnRenderScheduled: () => (vm) => renderMethods._scheduleRender(vm),
    getOnCropPreviewRender: () => (vm) => cropPreviewMethods._scheduleCropPreviewRender(vm)
});
```

Inside the factory, invoke providers with a defensive guard:

```javascript
const getOnRenderScheduled = callbacks.getOnRenderScheduled || (() => () => {});

function _invokeProvider(provider, vm) {
    const callback = provider();
    if (typeof callback === 'function') { callback(vm); }
}
_invokeProvider(getOnRenderScheduled, vm);
```

## Closure Reference Safety for Undo Commands

When building undo/redo closures that reference a mutable outer variable (e.g., a snapshot variable later set to `null`), copy the values into a local `const` before building the closure. JavaScript closures capture variables by reference, not by value:

```javascript
// WRONG — titleUndoSnapshot is captured by reference, later nullified
this.undoManager.push({
    undo: () => {
        this.titleStyle.titleBoxX = titleUndoSnapshot.titleBoxX; // → TypeError: null
    }
});
titleUndoSnapshot = null; // Breaks the closure

// CORRECT — local const captures values at closure creation time
const preState = { ...titleUndoSnapshot };
this.undoManager.push({
    undo: () => {
        this.titleStyle.titleBoxX = preState.titleBoxX; // Safe — preState is const
    }
});
titleUndoSnapshot = null; // Does not affect the closure
```

- This pattern is common in interaction handlers that capture a pre-state snapshot, build an undo command at interaction end, then null the snapshot variable
- The crop drag undo in `createCollageLifecycle.js` demonstrates the correct pattern: `const preState = { ...cropUndoSnapshot };`
- Any closure referencing an outer variable that is later reassigned is vulnerable — look for this during code review

## Service Locator Access Safety

Two rules for accessing the `base` service locator:

1. **Use consistent optional chaining** — Always access optional services with `base?.getService?.() || null`. Using `base.getService()` without optional chaining throws if the service is not registered. Apply the same pattern across all modules.
2. **Look up services inside callbacks, not outside** — When a callback may execute long after factory creation, look up the service inside the callback. Capturing the service at factory time risks a stale or undefined reference if the service is later disposed or replaced:

```javascript
// WRONG — assembler captured at factory time, may be stale when callback runs
const asm = assembler();
renderer.scheduleRender(function (ctx, width, height) {
    asm.render(ctx, { ... }); // THROWS if asm is undefined
});

// CORRECT — assembler looked up at render time
renderer.scheduleRender(function (ctx, width, height) {
    const asm = assembler();
    if (!asm) return;
    asm.render(ctx, { ... });
});
```

## Return Object Exposure for Internal Functions

When an internal factory function has meaningful behavior worth testing (error handling, validation, etc.) but is genuinely internal (not needed by other modules), expose it as a method on the factory's return object instead of exporting it as a module-level named export:

```javascript
// Internal function — scoped to factory, not exported
function pushUndoCommand(vm, cmd) {
    if (vm.undoManager) {
        vm.undoManager.push({
            label: cmd.label,
            undo: () => {
                try { cmd.undoFn(vm); } catch (e) {
                    console.error(`Undo error (${cmd.label}):`, e);
                    if (vm.showToast) {
                        vm.showToast('Undo failed. Please try again.', 'error', 5000);
                    }
                }
            },
            // ... redo wrapper
        });
        vm._updateUndoState();
    }
}

// Expose on return object for testability
return {
    // ... other methods
    pushUndoCommand(vm, cmd) {
        pushUndoCommand(vm, cmd);
    },
};
```

- Keeps the function scoped to the factory — no new import dependency for tests
- Preserves closure benefits — function still captures factory-scoped dependencies
- Use when the function relies on factory-scoped closures and you don't want to extract it to a separate module
- Avoid when the function is already testable through the public API, or is simple enough that integration testing suffices

## Internal Closure Pattern for Factory Testability

When a Vue factory method calls other methods on `this`, tests that mock partial VMs (spreading only state, not all methods) break. Use factory-scoped closures to avoid `this` dependencies in internal lifecycle methods:

```javascript
// Factory-scoped internal functions — no this dependency
let _focusTrapHandler = null;

function _trapFocus(vm) { /* ... */ }
function _releaseFocus(vm) { /* ... */ }

return {
    // Internal lifecycle methods use closures directly
    toggleBottomSheet() {
        if (this.isOpen) {
            _trapFocus(this);
        } else {
            _releaseFocus(this);
        }
    },

    // Public API delegates to closures (for external callers / tests)
    trapFocusInBottomSheet() { _trapFocus(this); },
    releaseFocusTrap() { _releaseFocus(this); }
};
```

- Internal functions capture factory dependencies (like constants, shared state) without creating new import dependencies
- Public methods delegate to closures, enabling both internal lifecycle use and external testability
- Prefer over module-level exports when the function relies on factory-scoped closures

## Related References

- `references/manager-patterns.md` — Return value pattern for side-effect notification (manager → handler)
- `references/undo-snapshots.md` — Undo/redo snapshot patterns (shallow copy, onUndoCommand, v-model timing)
- `references/testing-unit.md` — Mock VM construction for testing factory methods
