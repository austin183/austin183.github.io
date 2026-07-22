# Undo/Redo Snapshot Patterns

Patterns for capturing state snapshots before mutations so undo/redo can restore or re-apply changes.

## Contents

- [Shallow copy preserves object references](#shallow-copy-preserves-object-references)
- [onUndoCommand callback pattern](#onundocommand-callback-pattern)
- [Crops deep copy pattern](#crops-deep-copy-pattern)
- [Add Images redo limitation](#add-images-redo-limitation)
- [Testing disposed-image toast](#testing-disposed-image-toast)
- [Vue v-model timing for undo snapshots](#vue-v-model-timing-for-undo-snapshots)
- [Segmented controls and checkboxes need inline snapshot/commit](#segmented-controls-and-checkboxes-need-inline-snapshotcommit)
- [Atomic handler methods (refinement)](#atomic-handler-methods-refinement)
- [Lifecycle cleanup: commit pending snapshots on unmount](#lifecycle-cleanup-commit-pending-snapshots-on-unmount)
- [Related learnings](#related-learnings)

## Shallow Copy Preserves Object References

When snapshotting objects that contain references to DOM elements (like `HTMLImageElement`), the spread operator `{ ...item }` copies property **values** (which are references), not the properties themselves.

```javascript
// Snapshot BEFORE disposal
const removedItem = { ...this.images[index] };
// removedItem.image === this.images[index].image (same reference)

// Dispose the original
imageLibrary.disposeImage(index);
// this.images[index].image is now null, item was spliced from array
// removedItem.image STILL references the original HTMLImageElement
```

**This means undo CAN restore the image** because the snapshot preserved the reference. The "Cannot undo — image data no longer available" toast only shows when the image reference is externally invalidated (e.g., user navigates away and the browser GC collects the element).

**Common misconception:** `{ ...item }` creates a shared reference such that disposing the original also nulls the snapshot. This is **incorrect** — the spread copies the value of each property at the time of the spread. The `image` property value is a reference to an `HTMLImageElement`, and that reference is copied into the snapshot. Setting `original.image = null` only changes `original.image`, not the snapshot's copy of the reference.

## onUndoCommand Callback Pattern

Handler factories use callback injection to push undo commands without knowing about the UndoManager:

```javascript
// Handler factory accepts optional onUndoCommand
export function createImagePanelHandlers(getImageLibrary, ..., onUndoCommand) {
    return {
        removeImage(index) {
            const removedItem = { ...this.images[index] };
            // ... perform mutation ...
            if (onUndoCommand) {
                onUndoCommand(this, {
                    label: 'Remove Image',
                    undoFn: (vm) => { /* restore */ },
                    redoFn: (vm) => { /* re-mutate */ }
                });
            }
        }
    };
}

// Wiring layer provides the implementation
const imagePanelHandlers = createImagePanelHandlers(
    () => base.getImageLibrary(),
    // ...
    (vm, cmd) => pushUndoCommand(vm, cmd)
);
```

**Key design decisions:**

- **`onUndoCommand(vm, cmd)`** — receives both the Vue instance and the command object
- **`cmd.undoFn(vm)` / `cmd.redoFn(vm)`** — undo/redo functions receive the Vue instance as a parameter (not `this`), enabling the wiring layer to bind the correct context
- **Optional parameter** — handlers work without undo support (backward compatible)
- **Wiring layer wraps in try/catch** — errors in undo/redo are caught and shown as toasts

## Crops Deep Copy Pattern

Crops arrays are deep-copied using `JSON.parse(JSON.stringify(crops))` for undo snapshots. This is safe because crops are plain objects with numeric properties (`x`, `y`, `w`, `h`) — no DOM references or complex types.

```javascript
// Safe deep copy for undo snapshot
const preCrops = JSON.parse(JSON.stringify(this.crops || []));
```

**Guard against null:** Always use `this.crops || []`. Without the guard, `JSON.stringify(null)` returns `"null"` and `JSON.parse("null")` returns `null`, which breaks array operations.

## Add Images Redo Limitation

The "Add Images" action cannot be fully redone because `File` objects are not serializable and are lost after the file input is reset. The redo function restores crop state but cannot re-add the images:

```javascript
redoFn: (vm) => {
    // Re-adding images is not possible (File objects are gone)
    // Restore to post-state crops
    if (vm.crops) {
        vm.crops.length = 0;
        vm.crops.push(...JSON.parse(JSON.stringify(postCrops)));
    }
    if (vm._regenerateAndRender) vm._regenerateAndRender();
}
```

This is an acceptable UX trade-off — the user can re-add images manually if needed.

## Testing Disposed-Image Toast

To test the "Cannot undo — image data no longer available" toast, you cannot rely on the normal disposal flow (because the snapshot preserves the image reference). Instead, create a test image item with `image: null` from the start:

```javascript
const disposedItem = { id: 'img-x', image: null, filename: 'test.jpg', width: 100, height: 100 };
const vm = makeVm([disposedItem], []);
// Now removeImage will capture removedItem.image === null
```

## Vue v-model Timing for Undo Snapshots

**Critical:** In Vue 3, `v-model` updates reactive data **before** `@change` (select) or `@input` (range/text) fires. By the time the change handler runs, `this.someValue` is already the NEW value — you cannot capture the pre-change state inside the handler.

**Solution:** Capture pre-state on events that fire BEFORE v-model updates:

| Element | Snapshot Event | Change Event | Commit Event |
|---------|---------------|--------------|--------------|
| `<select>` | `@focus` | `@change` | — (immediate) |
| `<input type="range">` | `@focus` + `@pointerdown` | `@input` | `@blur` |
| `<input type="color">` | `@focus` | `@input` | `@blur` |
| `<textarea>` | `@focus` | `@input` | `@blur` |
| `<button>` (segmented) | Inline `@click` | Inline `@click` | Inline `@click` |
| `<input type="checkbox">` | Inline `@change` | Inline `@change` | Inline `@change` |

**Key rule:** If the element doesn't have a natural blur event, use inline snapshot/commit.

**Why `@pointerdown` not `@mousedown`?** `@mousedown` does not fire on touch devices for form elements. `@pointerdown` unifies mouse, touch, and pen input.

**Why `@focus`?** Keyboard navigation (Tab + arrow keys) changes range values without `@pointerdown`. `@focus` captures the snapshot when the user tabs to the control.

**Batching pattern for sliders:** Snapshot on interaction start, update on every input, commit on blur. Use a closure variable to hold the pre-state snapshot.

```javascript
let optionsSnapshot = null;

snapshotLayoutOptions() {
    if (!optionsSnapshot) {
        optionsSnapshot = { gutter: this.gutter, /* ... */ };
    }
}

commitLayoutOptions() {
    if (optionsSnapshot) {
        // Push undo command with optionsSnapshot as pre-state
        optionsSnapshot = null;
    }
}
```

**Testing:** In unit tests, simulate Vue event order: `snapshot() → change value → call handler()`.

## Segmented Controls and Checkboxes Need Inline Snapshot/Commit

Form inputs (range, select, color, textarea) naturally receive focus/blur events, enabling the snapshot-on-focus, commit-on-blur pattern. **Segmented control buttons and checkboxes do NOT have natural blur events.**

**Solution:** Capture snapshot and commit inline in the `@click`/`@change` handler:

```html
<!-- Segmented control button -->
<button @click="snapshotTitleStyle(); titleStyle.alignment = 'left'; onTitleAlignmentChange(); commitTitleStyle()">
    Left
</button>

<!-- Checkbox -->
<input type="checkbox" v-model="titleStyle.showBackground"
       @change="snapshotTitleStyle(); onTitleShowBackgroundChange(); commitTitleStyle()">
```

Each button click is a discrete, atomic action — individually undoable. There's no "interaction session" to batch.

## Atomic Handler Methods (Refinement)

**When to extract:** When you have 3+ inline expressions performing the same snapshot/mutate/commit cycle, or when you need to test the undo lifecycle in isolation.

The inline snapshot/commit pattern works correctly but makes the undo lifecycle hard to test — you must simulate the exact Vue event sequence (snapshot → mutate → handler → commit), coupling tests to template implementation details.

**Extract into a dedicated handler method:**

```html
<!-- Before: multi-statement inline expression -->
<button @click="snapshotTitleStyle(); titleStyle.alignment = 'left'; onTitleAlignmentChange(); commitTitleStyle()">
    Left
</button>

<!-- After: single atomic method call -->
<button @click="setTitleAlignment('left')">Left</button>
```

```javascript
setTitleAlignment(alignment) {
    const preState = this.titleStyle.alignment;
    this.titleStyle.alignment = alignment;
    const titleManager = getTitleManager();
    if (titleManager) titleManager.setAlignment(alignment);
    onRenderScheduled(this);
    if (onUndoCommand && preState !== alignment) {
        onUndoCommand(this, {
            label: 'Change Title Style',
            undoFn: (v) => { /* restore preState */ },
            redoFn: (v) => { /* re-apply alignment */ }
        });
    }
}
```

**Benefits:**
1. **Testability** — Call `handlers.setTitleAlignment.call(vm, 'left')` directly. No Vue event simulation.
2. **API contract** — Method signature documents the interface. Consumer story is clear.
3. **Template clarity** — Single method call vs. multi-statement expression.
4. **IDE support** — Refactoring, navigation, and autocomplete work on method names.

### Design Rules for Atomic Methods

**Setters: Guard Against No-Op** — Methods that SET a specific value should skip undo when value is unchanged:

```javascript
// setTitleAlignment — no-op guard
if (onUndoCommand && preState !== alignment) {
    onUndoCommand(this, { /* ... */ });
}
```

Clicking "Center" when alignment is already "center" should not produce an undo command. Keeps the undo history clean.

**Toggles: Always Push Undo** — Methods that TOGGLE a value should always push:

```javascript
// toggleTitleShowBackground — no guard needed
this.titleStyle.showBackground = !preState;
// ...
if (onUndoCommand) {
    onUndoCommand(this, { /* ... */ });
}
```

A toggle always changes the value (false→true or true→false), so an undo command is always meaningful.

**Removals: Early Return Guard** — Methods that REMOVE something should return early if there's nothing to remove:

```javascript
// removeBackgroundImageAtomic — early return
if (!preState.backgroundImage) {
    return;
}
```

Prevents unnecessary state mutations and undo commands. The template typically guards with `v-if="backgroundImage"`, but the method-level guard provides defense-in-depth for programmatic calls.

### Testing Atomic Methods

```javascript
it('setTitleAlignment pushes undo command when value changes', () => {
    const handlers = createTitleHandlers(
        () => mockTitleManager,
        () => {},
        (vmRef, cmd) => undoCommands.push(cmd)
    );

    // Direct method call — no Vue event simulation needed
    handlers.setTitleAlignment.call(vm, 'left');

    expect(undoCommands.length).to.equal(1);
    expect(vm.titleStyle.alignment).to.equal('left');
});

it('setTitleAlignment no-op when value unchanged', () => {
    handlers.setTitleAlignment.call(vm, 'center'); // Already center
    expect(undoCommands.length).to.equal(0);
});
```

### Refactoring Progression

| Stage | Pattern | Testability |
|-------|---------|-------------|
| 1. Discovery | Inline snapshot/commit in template | Hard (simulate Vue events) |
| 2. Extraction | Atomic handler method | Easy (call method directly) |

## Lifecycle Cleanup: Commit Pending Snapshots on Unmount

When the Vue app is destroyed, pending undo snapshots are lost. Commit all pending snapshots in `beforeUnmount`:

```javascript
beforeUnmount() {
    if (this.commitTitleText) this.commitTitleText();
    if (this.commitTitleStyle) this.commitTitleStyle();
    if (this.commitBackground) this.commitBackground();
    if (this.commitOverlay) this.commitOverlay();
    if (this.commitLayoutOptions) this.commitLayoutOptions();
    // ... rest of cleanup
}
```

Guard with `if (this.method)` because commit methods may not exist if the handler factory wasn't wired with an `onUndoCommand` callback.

## Related Learnings

- `2026-07-21-undo-closure-reference-bug.md` — closure reference bug in undo commands
- `2026-07-21-undo-snapshot-patterns-image-operations.md` — undo snapshot patterns for image operations
- `2026-07-21-vue-vmodel-timing-undo-snapshots.md` — Vue v-model timing and pre-change snapshot patterns
- `2026-07-21-undo-batching-segmented-controls.md` — segmented controls need inline snapshot/commit
- `2026-07-22-atomic-undo-methods-extracting-inline-expressions.md` — extract inline snapshot/commit into atomic handler methods
- `undomanager-batch-bug.md` — UndoManager batch composition bug

---

Base directory: `.opencode/skills/building-web-apps/`
