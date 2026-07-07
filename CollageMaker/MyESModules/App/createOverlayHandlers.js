/**
 * Overlay handlers - Handles overlay controls.
 */

import { loadImageFromFile } from '../Utils/loadImageFromFile.js';

/**
 * Creates overlay handlers.
 * @param {Function} getCanvasRenderer - Function that returns CanvasRenderer instance
 * @returns {Object} Overlay handlers object
 */
export function createOverlayHandlers(getCanvasRenderer) {
    return {
        /**
         * Handles overlay image file input.
         * @param {File} file - Selected file
         */
        async handleOverlayImageChange(file) {
            if (!file) return;

            const img = await loadImageFromFile(file);
            if (img) {
                // Dispose old overlay image to prevent memory leaks
                if (this.overlayImage) {
                    this.overlayImage = null;
                }
                this.overlayImage = img;
                this._scheduleRender();
            }
        },

        /**
         * Handles overlay mode change.
         */
        onOverlayModeChange() {
            this.overlayMode = this.overlayMode || 'source-over'; // ensure it's set
            this._scheduleRender();
        },

        /**
         * Handles overlay opacity change.
         */
        onOverlayOpacityChange() {
            this.overlayOpacity = this.overlayOpacity || 1;
            this._scheduleRender();
        },

        /**
         * Removes the overlay image.
         */
        removeOverlay() {
            this.overlayImage = null;
            this._scheduleRender();
        }
    };
}

