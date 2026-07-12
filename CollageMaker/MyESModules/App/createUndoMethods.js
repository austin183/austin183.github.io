/**
 * createUndoMethods — Undo/redo methods extracted from createCollageMethods.
 * Handles undo state management and undo/redo execution.
 *
 * Each method accepts an explicit `vm` parameter (Vue instance) —
 * no `this` dependency, enabling clean callback injection.
 *
 * Optional render callbacks allow the undo methods to trigger
 * re-renders after state changes without importing render logic.
 */

export function createUndoMethods(base, callbacks = {}) {
    const onRenderScheduled = callbacks.onRenderScheduled || (() => {});
    const onCropPreviewRender = callbacks.onCropPreviewRender || (() => {});

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
     * Performs an undo operation.
     * @param {Object} vm — Vue instance with reactive state
     */
    function _performUndo(vm) {
        if (!base.undoManager || !base.undoManager.canUndo()) return;

        const hadUndo = base.undoManager.undo();
        if (!hadUndo) return;

        _updateUndoState(vm);
        onRenderScheduled(vm);
        onCropPreviewRender(vm);
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
        onRenderScheduled(vm);
        onCropPreviewRender(vm);
    }

    return {
        _updateUndoState,
        _performUndo,
        _performRedo
    };
}
