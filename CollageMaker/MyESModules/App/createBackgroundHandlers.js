/**
 * Background handlers - Handles background controls.
 */

import { loadImageFromFile } from '../Utils/loadImageFromFile.js';

/**
 * Creates background handlers.
 * @param {Function} getBackgroundManager - Function that returns BackgroundManager instance
 * @param {Function} getCanvasRenderer - Function that returns CanvasRenderer instance
 * @returns {Object} Background handlers object
 */
export function createBackgroundHandlers(getBackgroundManager, getCanvasRenderer) {
    return {
        /**
         * Handles background style change.
         */
        onBackgroundStyleChange() {
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.updateStyle(this.backgroundStyle);
            }
            this._scheduleRender();
        },

        /**
         * Handles background color change.
         */
        onBackgroundColorChange() {
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setColor(this.backgroundColor);
            }
            this._scheduleRender();
        },

        /**
         * Handles gradient color 1 change.
         * @param {string} c1 - Start color (hex)
         * @param {string} c2 - End color (hex)
         */
        onGradientColor1Change(c1, c2) {
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setGradientColors(c1, c2);
            }
            this._scheduleRender();
        },

        /**
         * Handles gradient color 2 change.
         * @param {string} c1 - Start color (hex)
         * @param {string} c2 - End color (hex)
         */
        onGradientColor2Change(c1, c2) {
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setGradientColors(c1, c2);
            }
            this._scheduleRender();
        },

        /**
         * Handles gradient angle change.
         */
        onGradientAngleChange() {
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setAngle(this.gradientAngle);
            }
            this._scheduleRender();
        },

        /**
         * Handles background image file input.
         * @param {File} file - Selected file
         */
        async handleBackgroundImageChange(file) {
            if (!file) return;

            const img = await loadImageFromFile(file);
            if (img) {
                this.backgroundImage = img;
                this.backgroundStyle = 'image';
                const backgroundManager = getBackgroundManager();
                if (backgroundManager) {
                    backgroundManager.setImage(img);
                }
                this._scheduleRender();
            }
            // Reset file input so re-selecting the same file triggers @change
            // This is handled by caller setting value=''
        },

        /**
         * Handles background opacity change.
         */
        onBackgroundOpacityChange() {
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setOpacity(this.backgroundOpacity);
            }
            this._scheduleRender();
        },

        /**
         * Removes the background image.
         */
        removeBackgroundImage() {
            this.backgroundImage = null;
            this.backgroundStyle = 'solid';
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setImage(null);
            }
            this._scheduleRender();
        }
    };
}
