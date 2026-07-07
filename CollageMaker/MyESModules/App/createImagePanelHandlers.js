/**
 * Image panel handlers - Handles image selection and removal.
 */

/**
 * Creates image panel handlers.
 * @param {Function} getImageLibrary - Function that returns ImageLibrary instance
 * @param {Function} getLayoutManager - Function that returns LayoutManager instance
 * @param {Function} getCanvasRenderer - Function that returns CanvasRenderer instance
 * @returns {Object} Image panel handlers object
 */
export function createImagePanelHandlers(getImageLibrary, getLayoutManager, getCanvasRenderer) {
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
            // Use disposeImage for proper cleanup of image references
            const imageLibrary = getImageLibrary();
            const layoutManager = getLayoutManager();
            if (imageLibrary) imageLibrary.disposeImage(index);
            if (layoutManager) layoutManager.regenerate();
            this._scheduleRender();
        },

        /**
         * Clears all images.
         */
        clearAllImages() {
            const imageLibrary = getImageLibrary();
            const layoutManager = getLayoutManager();
            if (imageLibrary) imageLibrary.clearAll();
            if (layoutManager) layoutManager.regenerate();
            this._scheduleRender();
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

            // Use disposeImage for proper cleanup of image references
            const imageLibrary = getImageLibrary();
            const layoutManager = getLayoutManager();
            if (imageLibrary) imageLibrary.disposeImage(imageIndex);

            // Deselect and regenerate
            this.selectedPanelId = null;
            if (layoutManager) layoutManager.regenerate();
            this._scheduleRender();
        }
    };
}
