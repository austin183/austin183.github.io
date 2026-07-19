# State Manager Patterns

This reference documents the two main patterns for state managers in the CollageMaker app, when to use each, and how they integrate with undo/redo systems.

## Pattern 1: Action-Based Managers

**Examples:** `CropManager`

**Characteristics:**
- State mutations are implemented as pure action functions (e.g., `setCropAction`, `resetCropAction`) in separate modules like `actions.js`
- Manager calls these action functions with state and parameters
- Action functions return new state objects or mutate state directly

**Use when:**
- State mutations are complex (e.g., managing crop rectangles, image positioning)
- You anticipate needing undo/redo functionality
- The same mutation logic needs to be used in multiple contexts
- You want maximum testability without Vue context

**Advantages:**
- Pure action functions are easily testable in isolation
- Clear separation between mutation logic and manager implementation
- Easy to integrate with undo/redo systems (just wrap action calls)
- Makes the data flow explicit

**Example structure:**
```javascript
// actions.js
export function setCropAction(state, cropData) {
    state.crops = state.crops.map(crop => 
        crop.id === cropData.id ? { ...crop, ...cropData } : crop
    );
}

// CropManager.js
createCropManager(vueInstance) {
    const actions = {
        setCrop: (cropData) => setCropAction(vueInstance.$data, cropData)
    };
    
    return {
        setCrop: (cropData) => {
            actions.setCrop(cropData);
            this.onChange?.(); // notify listeners
        }
    };
}
```

## Pattern 2: Direct Mutation Managers

**Examples:** `BackgroundManager`, `TitleManager` (for UI configuration changes)

**Characteristics:**
- Manager methods directly mutate Vue reactive state
- No intermediate action functions
- Simple, straightforward mutations of primitive values or simple objects

**Use when:**
- State mutations are simple (e.g., background color, layout style, font size)
- You don't anticipate needing undo/redo for this particular feature
- The mutation logic is trivial and doesn't need to be reused
- You want to minimize boilerplate

**Advantages:**
- Less boilerplate code
- Clear and direct — easy to understand what changes state
- Sufficient for simple configuration changes

**Example structure:**
```javascript
// BackgroundManager.js
createBackgroundManager(vueInstance) {
    return {
        setBackgroundColor: (color) => {
            vueInstance.$data.background.color = color;
            this.onChange?.();
        },
        setLayoutStyle: (style) => {
            vueInstance.$data.layout.style = style;
            this.onChange?.();
        }
    };
}
```

## When to Use Each Pattern

| Criteria | Action-Based | Direct Mutation |
|----------|--------------|-----------------|
| **Mutation complexity** | Complex logic, multiple steps | Simple assignments |
| **Undo/redo needed?** | Yes, or likely needed | No |
| **Testability requirements** | High (test without Vue) | Moderate (can test with mocks) |
| **Code reuse potential** | High (same action in multiple places) | Low |
| **Boilerplate tolerance** | Willing to write extra files | Prefer minimal code |

**Guideline:** Start with direct mutation for simple UI configuration changes. If you find yourself needing undo/redo or the mutation logic becomes complex, refactor to action-based pattern.

## Integration with Undo/Redo Systems

Action-based managers are designed for undo/redo integration:

```javascript
// UndoManager can wrap action calls
undoableCropSet(cropData) {
    const prevState = JSON.parse(JSON.stringify(this.state));
    
    // Execute action
    this.cropManager.setCrop(cropData);
    
    // Store undo command
    this.undoStack.push({
        undo: () => {
            // Restore previous state or call inverse action
            Object.assign(this.state, prevState);
        }
    });
}
```

For direct mutation managers without action functions, adding undo support later requires refactoring to extract actions. This is why considering undo needs early is important.

## Common Pitfalls

### 1. Mixed Patterns in One Manager
Don't mix action-based and direct mutation within the same manager unless there's a clear rationale. Keep the pattern consistent for maintainability.

### 2. Array Reassignment
When clearing arrays, **preserve the array reference** to avoid breaking external observers:
```javascript
// WRONG — creates new reference
state.titleRuns = [];

// CORRECT — maintains reference
state.titleRuns.length = 0;
// OR
state.titleRuns.splice(0);
```

See `references/vue-options-api.md` for more details.

### 3. Inconsistent Callback Naming
Managers use different callback names (`onCropChanged`, `onChange`). While not critical, establish a convention early if standardizing is low-risk. The learnings suggest: `onStateChange` or `onUpdate` are good generic names.

## Return Value for Side-Effect Notification

When a manager method performs a mutation that may trigger a side effect (e.g., truncation, clipping, saturation), return a result object describing what happened. The caller decides what to do with it.

**Why:** This cleanly separates the state mutation concern from the notification concern. The manager doesn't know about toasts, alerts, or any UI feedback. The handler doesn't need to duplicate truncation or clipping logic.

```javascript
// Manager: mutates state, returns metadata — knows nothing about toasts
setText(text) {
    const t = String(text || '');
    const lines = t.split('\n');
    const wasTruncated = lines.length > 3;
    const clampedText = wasTruncated ? lines.slice(0, 3).join('\n') : t;

    state.titleText = clampedText;
    // ... update runs ...
    notify();
    return { truncated: wasTruncated };
}

// Handler: uses return value to decide on user feedback
onTitleTextChange() {
    const titleManager = getTitleManager();
    if (titleManager) {
        const result = titleManager.setText(this.titleText);
        if (result && result.truncated && this.showToast) {
            this.showToast('Title limited to 3 lines', 'info', 3000);
        }
    }
    onRenderScheduled(this);
}
```

**Benefits:**
- **DIP compliance** — Manager depends on no UI layer; handler controls feedback
- **No duplicated logic** — Truncation decision lives in one place (the manager)
- **Flexible feedback** — Handler can choose toast, alert, or silent based on context
- **Testable in isolation** — Manager tests verify return values; handler tests verify feedback

**When to use:**
- Manager enforces a constraint that the user should be notified about
- The side effect is informational (not an error that should throw)
- Multiple callers might want different feedback for the same constraint

**File Reference:**
- `MyESModules/State/TitleManager.js` — `setText()` returns `{ truncated: boolean }`
- `MyESModules/App/createTitleHandlers.js` — `onTitleTextChange()` uses return value for toast

## Related References

- `references/vue-options-api.md` — Array mutation patterns for Vue reactivity
- `references/memory-management.md` — Disposing image references when replacing them
- `references/testing-unit.md` — Integration testing for handler-manager composition

---

Base directory: `.opencode/skills/building-web-apps/`
