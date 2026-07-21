/**
 * Layout handlers - Handles layout style, gutter, angle, and spacing changes.
 * Uses injected callback for DIP compliance — no direct this._scheduleRender().
 */

/**
 * Creates layout handlers.
 * @param {Function} getLayoutManager - Function that returns LayoutManager instance
 * @param {Function} onRenderScheduled - Callback to schedule a canvas render
 * @returns {Object} Layout handlers object
 */
export function createLayoutHandlers(getLayoutManager, onRenderScheduled) {
    return {
        /**
         * Handles layout style change.
         */
        onLayoutStyleChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setLayoutStyle(this.layoutStyle);
            onRenderScheduled(this);
        },

        /**
         * Handles gutter change.
         */
        onGutterChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setGutter(this.gutter);
            onRenderScheduled(this);
        },

        /**
         * Handles slice angle change.
         */
        onSliceAngleChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setSliceAngle(this.sliceAngle);
            onRenderScheduled(this);
        },

        /**
         * Handles hex spacing change.
         */
        onHexSpacingChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setHexSpacing(this.hexSpacing);
            onRenderScheduled(this);
        },

        /**
         * Handles hex size multiplier change.
         */
        onHexSizeMultiplierChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setHexSizeMultiplier(this.hexSizeMultiplier);
            onRenderScheduled(this);
        }
    };
}
