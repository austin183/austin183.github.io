/**
 * Overlay handlers - Handles overlay controls.
 * Uses injected callback for DIP compliance — no direct this._scheduleRender().
 */

import { loadImageFromFile } from '../Utils/loadImageFromFile.js';

/**
 * Creates overlay handlers.
 * @param {Function} onRenderScheduled - Callback to schedule a canvas render
 * @returns {Object} Overlay handlers object
 */
export function createOverlayHandlers(onRenderScheduled) {
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
                onRenderScheduled(this);
            }
        },

        /**
         * Handles overlay mode change.
         */
        onOverlayModeChange() {
            this.overlayMode = this.overlayMode || 'source-over'; // ensure it's set
            onRenderScheduled(this);
        },

        /**
         * Handles overlay opacity change.
         */
        onOverlayOpacityChange() {
            this.overlayOpacity = this.overlayOpacity || 1;
            onRenderScheduled(this);
        },

        /**
         * Removes the overlay image.
         */
        removeOverlay() {
            this.overlayImage = null;
            onRenderScheduled(this);
        }
    };
}

