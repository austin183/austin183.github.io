/**
 * Image panel handlers - Handles image selection and removal.
 * Uses injected callback for DIP compliance — no direct this._scheduleRender().
 * Supports optional onUndoCommand callback for undo/redo of image operations.
 */

/**
 * Restores crops array from a snapshot.
 * @param {Object} vm - Vue instance
 * @param {Array} cropsSnapshot - Deep-clonable crops snapshot
 */
function restoreCrops(vm, cropsSnapshot) {
    if (vm.crops) {
        vm.crops.length = 0;
        vm.crops.push(...JSON.parse(JSON.stringify(cropsSnapshot)));
    }
}

/**
 * Triggers post-state update: layout regeneration and render.
 * @param {Object} vm - Vue instance
 */
function triggerUpdate(vm) {
    if (vm.layoutManager) vm.layoutManager.regenerate();
    if (vm._scheduleRender) vm._scheduleRender();
}

/**
 * Builds an undo command for removing a single image.
 * Shared between removeImage() and removeSelectedImage().
 * @param {Object} removedItem - Snapshot of the removed image item
 * @param {number} removedIndex - Original index of the removed image
 * @param {Array} preCrops - Crops snapshot before removal
 * @param {Array} postCrops - Crops snapshot after removal
 * @returns {Object} Undo command with label, undoFn, redoFn
 */
function buildRemoveImageCommand(removedItem, removedIndex, preCrops, postCrops) {
    return {
        label: 'Remove Image',
        undoFn: (vm) => {
            if (!removedItem.image) {
                if (vm.showToast) {
                    vm.showToast('Cannot undo — image data no longer available', 'error', 5000);
                }
                return;
            }
            vm.images.splice(removedIndex, 0, removedItem);
            restoreCrops(vm, preCrops);
            triggerUpdate(vm);
        },
        redoFn: (vm) => {
            const idx = vm.images.findIndex(img => img.id === removedItem.id);
            if (idx !== -1) {
                if (vm.imageLibrary) vm.imageLibrary.disposeImage(idx);
                restoreCrops(vm, postCrops);
                triggerUpdate(vm);
            }
        }
    };
}

/**
 * Creates image panel handlers.
 * @param {Function} getImageLibrary - Function that returns ImageLibrary instance
 * @param {Function} getLayoutManager - Function that returns LayoutManager instance
 * @param {Function} getCanvasRenderer - Function that returns CanvasRenderer instance
 * @param {Function} [onRenderScheduled] - Optional callback to schedule a canvas render
 * @param {Function} [onUndoCommand] - Optional callback(vm, cmd) to push undo commands
 * @returns {Object} Image panel handlers object
 */
export function createImagePanelHandlers(getImageLibrary, getLayoutManager, getCanvasRenderer, onRenderScheduled, onUndoCommand) {
    return {
        /**
         * Selects an image from the library.
         * @param {number} index
         */
        selectImage(index) {
            if (index >= 0 && index < this.images.length) {
                this.selectedImageId = this.images[index].id;
            }
        },

        /**
         * Removes an image at the given index.
         * @param {number} index
         */
        removeImage(index) {
            const imageLibrary = getImageLibrary();
            const layoutManager = getLayoutManager();

            // Snapshot before disposal
            const removedItem = this.images[index] ? { ...this.images[index] } : null;
            const removedIndex = index;
            const preCrops = JSON.parse(JSON.stringify(this.crops || []));

            if (imageLibrary) imageLibrary.disposeImage(index);
            if (layoutManager) layoutManager.regenerate();

            if (onUndoCommand && removedItem) {
                const postCrops = JSON.parse(JSON.stringify(this.crops || []));
                onUndoCommand(this, buildRemoveImageCommand(removedItem, removedIndex, preCrops, postCrops));
            }

            if (typeof onRenderScheduled === 'function') {
                onRenderScheduled(this);
            }
        },

        /**
         * Clears all images.
         */
        clearAllImages() {
            const imageLibrary = getImageLibrary();
            const layoutManager = getLayoutManager();

            // Snapshot before clearing
            const savedItems = this.images.map(item => ({ ...item }));
            const preCrops = JSON.parse(JSON.stringify(this.crops || []));

            if (imageLibrary) imageLibrary.clearAll();
            if (layoutManager) layoutManager.regenerate();

            if (onUndoCommand && savedItems.length > 0) {
                const postCrops = JSON.parse(JSON.stringify(this.crops || []));
                onUndoCommand(this, {
                    label: 'Clear All Images',
                    undoFn: (vm) => {
                        const stillValid = savedItems.filter(item => item.image !== null);
                        if (stillValid.length === 0) {
                            if (vm.showToast) {
                                vm.showToast('Cannot undo — image data no longer available', 'error', 5000);
                            }
                            return;
                        }
                        vm.images.push(...stillValid);
                        restoreCrops(vm, preCrops);
                        triggerUpdate(vm);
                    },
                    redoFn: (vm) => {
                        const idsToRemove = savedItems.map(item => item.id);
                        for (let i = vm.images.length - 1; i >= 0; i--) {
                            if (idsToRemove.includes(vm.images[i].id)) {
                                if (vm.imageLibrary) vm.imageLibrary.disposeImage(i);
                            }
                        }
                        restoreCrops(vm, postCrops);
                        triggerUpdate(vm);
                    }
                });
            }

            if (typeof onRenderScheduled === 'function') {
                onRenderScheduled(this);
            }
        },

        /**
         * Removes the image associated with the currently selected panel.
         * Used by Delete/Backspace keyboard shortcut.
         */
        removeSelectedImage() {
            if (!this.selectedPanelId) return;

            // Find the panel to get its imageId
            const panel = this.panels.find(p => p.id === this.selectedPanelId);
            if (!panel) return;

            // Find the image index in the images array
            const imageIndex = this.images.findIndex(img => img.id === panel.imageId);
            if (imageIndex === -1) return;

            const imageLibrary = getImageLibrary();
            const layoutManager = getLayoutManager();

            // Snapshot before disposal
            const removedItem = this.images[imageIndex] ? { ...this.images[imageIndex] } : null;
            const removedIndex = imageIndex;
            const preCrops = JSON.parse(JSON.stringify(this.crops || []));

            if (imageLibrary) imageLibrary.disposeImage(imageIndex);

            // Deselect and regenerate
            this.selectedPanelId = null;
            if (layoutManager) layoutManager.regenerate();

            if (onUndoCommand && removedItem) {
                const postCrops = JSON.parse(JSON.stringify(this.crops || []));
                onUndoCommand(this, buildRemoveImageCommand(removedItem, removedIndex, preCrops, postCrops));
            }

            if (typeof onRenderScheduled === 'function') {
                onRenderScheduled(this);
            }
        }
    };
}
