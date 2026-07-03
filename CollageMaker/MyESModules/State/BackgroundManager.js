/**
 * BackgroundManager - Manages background state and change notifications.
 * Provides methods to update background style, colors, gradients, and images.
 */

import { BackgroundStyle } from '../Models/BackgroundStyle.js';

/**
 * Creates a background manager.
 * @param {Object} state - Reactive state object (Vue instance or plain data)
 * @param {Function} [onChange] - Callback fired on any background state change
 * @returns {Object} BackgroundManager
 */
export function createBackgroundManager(state, onChange) {
    let changeCallback = onChange || null;

    function notify() {
        if (changeCallback) {
            changeCallback();
        }
    }

    function getState() {
        return {
            type: state.backgroundStyle,
            color1: state.backgroundColor,
            color2: state.gradientColors ? state.gradientColors[1] : state.gradientColors?.[1] || '#333333',
            gradientColors: state.gradientColors || [state.backgroundColor, '#333333'],
            angle: state.gradientAngle,
            image: state.backgroundImage,
            opacity: state.backgroundOpacity
        };
    }

    return {
        /**
         * Sets a callback for background change notifications.
         * @param {Function} fn
         */
        onBackgroundChanged(fn) {
            changeCallback = fn;
        },

        /**
         * Updates the background style type.
         * @param {string} newStyle - 'solid', 'gradient', or 'image'
         */
        updateStyle(newStyle) {
            state.backgroundStyle = newStyle;
            notify();
        },

        /**
         * Sets the primary background color.
         * @param {string} color - Hex color string
         */
        setColor(color) {
            state.backgroundColor = color;
            notify();
        },

        /**
         * Sets gradient colors.
         * @param {string} c1 - Start color (hex)
         * @param {string} c2 - End color (hex)
         */
        setGradientColors(c1, c2) {
            state.backgroundColor = c1;
            state.gradientColors = [c1, c2];
            notify();
        },

        /**
         * Sets the gradient angle.
         * @param {number} deg - Angle in degrees (0-360)
         */
        setAngle(deg) {
            state.gradientAngle = deg;
            notify();
        },

        /**
         * Sets a background image.
         * @param {HTMLImageElement|null} img - Image element or null to clear
         */
        setImage(img) {
            state.backgroundImage = img;
            notify();
        },

        /**
         * Sets the background image opacity.
         * @param {number} val - Opacity value (0-1)
         */
        setOpacity(val) {
            state.backgroundOpacity = Math.max(0, Math.min(1, val));
            notify();
        },

        /**
         * Returns the current background state snapshot.
         * @returns {Object}
         */
        getState
    };
}
