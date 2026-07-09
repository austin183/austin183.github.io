/**
 * Crop handlers - Handles crop adjustments and reset.
 * Uses injected callbacks for DIP compliance — no direct this._scheduleRender().
 */

/**
 * Creates crop handlers.
 * @param {Function} getCropManager - Function that returns CropManager instance
 * @param {Function} onRenderScheduled - Callback to schedule a canvas render
 * @param {Function} onCropPreviewRender - Callback to schedule a crop preview render
 * @returns {Object} Crop handlers object
 */
export function createCropHandlers(getCropManager, onRenderScheduled, onCropPreviewRender) {
    return {
        /**
         * Selects a panel on the canvas.
         * @param {string|null} panelId
         * @param {Object} cropInteraction - CropInteraction instance (optional)
         */
        selectPanel(panelId, cropInteraction = null) {
            this.selectedPanelId = panelId;
            onRenderScheduled(this);
            // Auto-expand crop section when a panel is selected
            if (this.autoExpandCropOnSelect) {
                this.autoExpandCropOnSelect(panelId);
            }
            // Delay both crop interaction attach and crop preview render until
            // after Vue updates the DOM (the crop canvas is inside a v-if block).
            this.$nextTick(() => {
                if (cropInteraction) {
                    cropInteraction.setPanelId(panelId);
                }
                onCropPreviewRender(this);
            });
        },

        /**
         * Resets the crop of the currently selected panel.
         */
        resetSelectedCrop() {
            const cropManager = getCropManager();
            if (!this.selectedPanelId || !cropManager) return;

            // Save state for undo
            const prevCrop = cropManager.getCrop(this.selectedPanelId);
            const panelId = this.selectedPanelId;

            if (prevCrop) {
                // We'll handle undo in the caller, just trigger reset here
                cropManager.resetCrop(panelId);
                onRenderScheduled(this);
            }
        },

        /**
         * Adjusts crop by panning.
         * @param {string} panelId - Panel ID
         * @param {Object} delta - { x, y } pixel offset
         */
        adjustCrop(panelId, delta) {
            const cropManager = getCropManager();
            if (cropManager) {
                cropManager.adjustCrop(panelId, delta);
                onRenderScheduled(this);
            }
        },

        /**
         * Zooms the crop by a scale factor.
         * @param {string} panelId - Panel ID
         * @param {number} factor - Scale factor (e.g., 1.1 for zoom in)
         */
        zoomCrop(panelId, factor) {
            const cropManager = getCropManager();
            if (cropManager) {
                cropManager.zoomCrop(panelId, factor);
                onRenderScheduled(this);
            }
        }
    };
}
