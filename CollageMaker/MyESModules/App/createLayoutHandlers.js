/**
 * Layout handlers - Handles layout style, gutter, angle, and spacing changes.
 */

/**
 * Creates layout handlers.
 * @param {Function} getLayoutManager - Function that returns LayoutManager instance
 * @param {Function} getCanvasRenderer - Function that returns CanvasRenderer instance
 * @returns {Object} Layout handlers object
 */
export function createLayoutHandlers(getLayoutManager, getCanvasRenderer) {
    return {
        /**
         * Handles layout style change.
         */
        onLayoutStyleChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setLayoutStyle(this.layoutStyle);
            this._scheduleRender();
        },

        /**
         * Handles gutter change.
         */
        onGutterChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setGutter(this.gutter);
            this._scheduleRender();
        },

        /**
         * Handles slice angle change.
         */
        onSliceAngleChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setSliceAngle(this.sliceAngle);
            this._scheduleRender();
        },

        /**
         * Handles hex spacing change.
         */
        onHexSpacingChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setHexSpacing(this.hexSpacing);
            this._scheduleRender();
        }
    };
}
