/**
 * Background handlers - Handles background controls.
 * Uses injected callback for DIP compliance — no direct this._scheduleRender().
 */

import { loadImageFromFile } from '../Utils/loadImageFromFile.js';

/**
 * Creates background handlers.
 * @param {Function} getBackgroundManager - Function that returns BackgroundManager instance
 * @param {Function} onRenderScheduled - Callback to schedule a canvas render
 * @returns {Object} Background handlers object
 */
export function createBackgroundHandlers(getBackgroundManager, onRenderScheduled) {
    return {
        /**
         * Handles background style change.
         */
        onBackgroundStyleChange() {
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.updateStyle(this.backgroundStyle);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles background color change.
         */
        onBackgroundColorChange() {
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setColor(this.backgroundColor);
            }
            onRenderScheduled(this);
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
            onRenderScheduled(this);
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
            onRenderScheduled(this);
        },

        /**
         * Handles gradient angle change.
         */
        onGradientAngleChange() {
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setAngle(this.gradientAngle);
            }
            onRenderScheduled(this);
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
                onRenderScheduled(this);
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
            onRenderScheduled(this);
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
            onRenderScheduled(this);
        }
    };
}
