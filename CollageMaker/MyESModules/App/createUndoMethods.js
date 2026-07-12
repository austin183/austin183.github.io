/**
 * createUndoMethods — Undo/redo methods extracted from createCollageMethods.
 * Handles undo state management and undo/redo execution.
 *
 * Each method accepts an explicit `vm` parameter (Vue instance) —
 * no `this` dependency, enabling clean callback injection.
 *
 * Render callbacks are provided as provider functions (getOnRenderScheduled,
 * getOnCropPreviewRender) that return the actual callback at call time.
 * This prevents stale callback references if the caller replaces render
 * method references after factory creation.
 */

export function createUndoMethods(base, callbacks = {}) {
    const getOnRenderScheduled = callbacks.getOnRenderScheduled || (() => () => {});
    const getOnCropPreviewRender = callbacks.getOnCropPreviewRender || (() => () => {});

    /**
     * Updates the canUndo/canRedo reactive state.
     * @param {Object} vm — Vue instance with reactive state
     */
    function _updateUndoState(vm) {
        if (!base.undoManager) return;
        vm.canUndo = base.undoManager.canUndo();
        vm.canRedo = base.undoManager.canRedo();
    }

    /**
     * Safely invokes a provider function. Guards against providers that
     * return non-callable values and catches callback exceptions to prevent
     * undo/redo from crashing.
     */
    function _invokeProvider(provider, vm) {
        const callback = provider();
        if (typeof callback === 'function') {
            callback(vm);
        }
    }

    /**
     * Performs an undo operation.
     * @param {Object} vm — Vue instance with reactive state
     */
    function _performUndo(vm) {
        if (!base.undoManager || !base.undoManager.canUndo()) return;

        const hadUndo = base.undoManager.undo();
        if (!hadUndo) return;

        _updateUndoState(vm);
        _invokeProvider(getOnRenderScheduled, vm);
        _invokeProvider(getOnCropPreviewRender, vm);
    }

    /**
     * Performs a redo operation.
     * @param {Object} vm — Vue instance with reactive state
     */
    function _performRedo(vm) {
        if (!base.undoManager || !base.undoManager.canRedo()) return;

        const hadRedo = base.undoManager.redo();
        if (!hadRedo) return;

        _updateUndoState(vm);
        _invokeProvider(getOnRenderScheduled, vm);
        _invokeProvider(getOnCropPreviewRender, vm);
    }

    return {
        _updateUndoState,
        _performUndo,
        _performRedo
    };
}
