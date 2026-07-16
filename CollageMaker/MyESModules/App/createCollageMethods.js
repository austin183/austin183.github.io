/**
 * createCollageMethods - Vue methods factory for CollageMaker.
 * Composes smaller handler modules to avoid God Module anti-pattern.
 * Handlers use injected callbacks for DIP compliance — no direct
 * this._scheduleRender() calls inside handler modules.
 *
 * Render, crop preview, and undo methods are extracted into
 * dedicated modules (createRenderMethods, createCropPreviewRenderer,
 * createUndoMethods) and composed here.
 */

import { loadImageFromFile } from '../Utils/loadImageFromFile.js';
import { createFileHandlers } from './createFileHandlers.js';
import { createImagePanelHandlers } from './createImagePanelHandlers.js';
import { createLayoutHandlers } from './createLayoutHandlers.js';
import { createCropHandlers } from './createCropHandlers.js';
import { createBackgroundHandlers } from './createBackgroundHandlers.js';
import { createTitleHandlers } from './createTitleHandlers.js';
import { createOverlayHandlers } from './createOverlayHandlers.js';
import { createExportHandlers } from './createExportHandlers.js';
import { createSettingsHandlers } from './createSettingsHandlers.js';
import { createRenderMethods } from './createRenderMethods.js';
import { createCropPreviewRenderer } from './createCropPreviewRenderer.js';
import { createUndoMethods } from './createUndoMethods.js';

/**
 * Default DOM element IDs. Passed as configuration to avoid
 * hardcoded getElementById calls in factory functions.
 */
const DEFAULT_DOM_IDS = {
    fileInput: 'fileInput',
    cropPreviewCanvas: 'cropPreviewCanvas'
};

export function createCollageMethods(base, domIds = {}) {
    const ids = { ...DEFAULT_DOM_IDS, ...domIds };

    // ---- Compose extracted method modules ----
    // Each module accepts explicit `vm` parameters (no `this` dependency)
    // and returns plain functions that are spread into the Vue methods object.

    const renderMethods = createRenderMethods(base);
    const cropPreviewMethods = createCropPreviewRenderer(base, ids);

    // Undo methods need render callbacks to trigger re-renders after undo/redo
    // Provider functions return the callback at call time, preventing stale references
    const undoMethods = createUndoMethods(base, {
        getOnRenderScheduled: () => (vm) => renderMethods._scheduleRender(vm),
        getOnCropPreviewRender: () => (vm) => cropPreviewMethods._scheduleCropPreviewRender(vm)
    });

    // ---- Create handler factories with injected callbacks ----
    // Each callback receives the Vue instance (vm) as a parameter.

    const fileHandlers = createFileHandlers(
        () => base.getImageLibrary(),
        (vm) => renderMethods._regenerateAndRender(vm),
        ids.fileInput
    );

    const imagePanelHandlers = createImagePanelHandlers(
        () => base.getImageLibrary(),
        () => base.getLayoutManager(),
        () => base.getCanvasRenderer()
    );

    const layoutHandlers = createLayoutHandlers(
        () => base.getLayoutManager(),
        (vm) => renderMethods._scheduleRender(vm)
    );

    const cropHandlers = createCropHandlers(
        () => base?.getCropManager?.() ?? null,
        (vm) => renderMethods._scheduleRender(vm),
        (vm) => cropPreviewMethods._scheduleCropPreviewRender(vm)
    );

    const backgroundHandlers = createBackgroundHandlers(
        () => base.getBackgroundManager(),
        (vm) => renderMethods._scheduleRender(vm)
    );

    const titleHandlers = createTitleHandlers(
        () => base.getTitleManager(),
        (vm) => renderMethods._scheduleRender(vm)
    );

    const overlayHandlers = createOverlayHandlers(
        (vm) => renderMethods._scheduleRender(vm)
    );

    const exportHandlers = createExportHandlers(base.assembler);

    const settingsHandlers = createSettingsHandlers();

    // ---- Merge all handlers into a single methods object ----
    // Methods are bound to `this` (Vue instance) when called via .call(this)
    return {
        /**
         * Truncates a filename for display.
         * @param {string} filename
         * @param {number} maxLen
         * @returns {string}
         */
        truncateFilename(filename, maxLen = 20) {
            if (!filename) return '';
            if (filename.length <= maxLen) return filename;
            const extDot = filename.lastIndexOf('.');
            if (extDot > 0 && filename.length - extDot <= 5) {
                return filename.substring(0, maxLen - 3) + '...' + filename.substring(extDot);
            }
            return filename.substring(0, maxLen - 3) + '...';
        },

        // File handlers
        triggerFilePicker() {
            fileHandlers.triggerFilePicker.call(this);
        },
        handleFileInputChange() {
            fileHandlers.handleFileInputChange.call(this);
        },

        // Image panel handlers
        selectImage(index) {
            imagePanelHandlers.selectImage.call(this, index);
        },
        removeImage(index) {
            imagePanelHandlers.removeImage.call(this, index);
        },
        clearAllImages() {
            imagePanelHandlers.clearAllImages.call(this);
        },
        removeSelectedImage() {
            imagePanelHandlers.removeSelectedImage.call(this);
        },

        // Layout handlers
        onLayoutStyleChange() {
            layoutHandlers.onLayoutStyleChange.call(this);
        },
        onGutterChange() {
            layoutHandlers.onGutterChange.call(this);
        },
        onSliceAngleChange() {
            layoutHandlers.onSliceAngleChange.call(this);
        },
        onHexSpacingChange() {
            layoutHandlers.onHexSpacingChange.call(this);
        },
        onHexSizeMultiplierChange() {
            layoutHandlers.onHexSizeMultiplierChange.call(this);
        },

        // Crop handlers
        selectPanel(panelId) {
            cropHandlers.selectPanel.call(this, panelId, this._cropInteraction);
        },
        resetSelectedCrop() {
            cropHandlers.resetSelectedCrop.call(this);
        },
        undo() {
            undoMethods._performUndo(this);
        },
        redo() {
            undoMethods._performRedo(this);
        },

        // Background handlers
        onBackgroundStyleChange() {
            backgroundHandlers.onBackgroundStyleChange.call(this);
        },
        onBackgroundColorChange() {
            backgroundHandlers.onBackgroundColorChange.call(this);
        },
        onGradientColor1Change() {
            const c1 = this.backgroundColor;
            const c2 = this.gradientColors ? this.gradientColors[1] : '#333333';
            this.gradientColors = [c1, c2];
            backgroundHandlers.onGradientColor1Change.call(this, c1, c2);
        },
        onGradientColor2Input(event) {
            const c1 = this.backgroundColor;
            const c2 = event.target.value;
            this.gradientColors = [c1, c2];
            backgroundHandlers.onGradientColor2Change.call(this, c1, c2);
        },
        onGradientColor2Change() {
            const c1 = this.backgroundColor;
            const c2 = this.gradientColors ? this.gradientColors[1] : '#333333';
            this.gradientColors = [c1, c2];
            backgroundHandlers.onGradientColor2Change.call(this, c1, c2);
        },
        onGradientAngleChange() {
            backgroundHandlers.onGradientAngleChange.call(this);
        },
        handleBackgroundImageChange(event) {
            const file = event.target.files[0];
            if (!file) return;
            backgroundHandlers.handleBackgroundImageChange.call(this, file);
        },
        onBackgroundOpacityChange() {
            backgroundHandlers.onBackgroundOpacityChange.call(this);
        },
        removeBackgroundImage() {
            backgroundHandlers.removeBackgroundImage.call(this);
        },

        // Title handlers
        onTitleTextChange() {
            titleHandlers.onTitleTextChange.call(this);
        },
        onTitleSelectionChange(event) {
            titleHandlers.onTitleSelectionChange.call(this, event);
        },
        toggleTitleBold() {
            titleHandlers.toggleTitleBold.call(this);
        },
        toggleTitleItalic() {
            titleHandlers.toggleTitleItalic.call(this);
        },
        toggleTitleUnderline() {
            titleHandlers.toggleTitleUnderline.call(this);
        },
        isTitleFormatActive(prop) {
            return titleHandlers.isTitleFormatActive.call(this, prop);
        },
        onTitleFontFamilyChange() {
            titleHandlers.onTitleFontFamilyChange.call(this);
        },
        onTitleFontSizeChange() {
            titleHandlers.onTitleFontSizeChange.call(this);
        },
        onTitleFontColorChange() {
            titleHandlers.onTitleFontColorChange.call(this);
        },
        onTitleBackgroundColorChange() {
            titleHandlers.onTitleBackgroundColorChange.call(this);
        },
        onTitleAlignmentChange() {
            titleHandlers.onTitleAlignmentChange.call(this);
        },
        onTitleShowBackgroundChange() {
            titleHandlers.onTitleShowBackgroundChange.call(this);
        },
        onTitleFontOpacityChange() {
            titleHandlers.onTitleFontOpacityChange.call(this);
        },
        onTitleBgOpacityChange() {
            titleHandlers.onTitleBgOpacityChange.call(this);
        },
        onTitleWidthChange() {
            titleHandlers.onTitleWidthChange.call(this);
        },
        resetTitlePosition() {
            titleHandlers.resetTitlePosition.call(this);
        },

        // Overlay handlers
        handleOverlayImageChange(event) {
            const file = event.target.files[0];
            if (!file) return;
            overlayHandlers.handleOverlayImageChange.call(this, file);
        },
        onOverlayModeChange() {
            overlayHandlers.onOverlayModeChange.call(this);
        },
        onOverlayOpacityChange() {
            overlayHandlers.onOverlayOpacityChange.call(this);
        },
        removeOverlay() {
            overlayHandlers.removeOverlay.call(this);
        },

        // Export handlers
        exportCollage() {
            exportHandlers.exportCollage.call(this);
        },
        onExportQualityChange() {
            exportHandlers.onExportQualityChange.call(this);
        },

        // Toast notifications
        showToast(message, type, duration) {
            type = type || 'info';
            duration = duration != null ? duration : 5000;
            if (this.toast.timer) {
                clearTimeout(this.toast.timer);
            }
            this.toast.message = message;
            this.toast.type = type;
            this.toast.visible = true;
            this.toast.timer = setTimeout(() => {
                this.toast.visible = false;
                this.toast.message = '';
                this.toast.timer = null;
            }, duration);
        },

        // Sidebar methods
        toggleRightSidebar() {
            this.rightSidebarOpen = !this.rightSidebarOpen;
        },
        toggleSection(sectionId) {
            this.expandedSections[sectionId] = !this.expandedSections[sectionId];
        },
        toggleLeftSection(sectionId) {
            this.expandedLeftSections[sectionId] = !this.expandedLeftSections[sectionId];
        },
        autoExpandCropOnSelect(panelId) {
            if (panelId) {
                this.expandedSections.crop = true;
            }
            // Deselecting (panelId === null) does NOT collapse crop — user control
        },
        autoExpandLayoutOnImages() {
            if (this.images && this.images.length > 1) {
                this.expandedLeftSections.layout = true;
            }
        },

        // Settings persistence
        _saveSettings() {
            settingsHandlers._saveSettings.call(this, this);
        },

        // Private utilities
        /**
         * Thin wrapper around the shared loadImageFromFile utility.
         * Kept as a method for Vue template compatibility — templates
         * call this._loadImageFromFile(file) and we delegate to the
         * shared utility to avoid duplication.
         * @param {File} file
         * @returns {Promise<HTMLImageElement|null>}
         * @private
         */
        _loadImageFromFile(file) {
            return loadImageFromFile(file);
        },

        // ========================
        // Render / Crop / Undo methods
        // (delegated to extracted modules, wrapped for Vue `this` binding)
        // ========================

        /**
         * Regenerates layout and triggers a render.
         * @private
         */
        _regenerateAndRender() {
            renderMethods._regenerateAndRender(this);
        },

        /**
         * Schedules a canvas render with the current state.
         * Uses on-demand rendering (no continuous loop) — only renders
         * when state changes, saving CPU/battery.
         * @private
         */
        _scheduleRender() {
            renderMethods._scheduleRender(this);
        },

        /**
         * Builds the background state object for the assembler.
         * @private
         */
        _buildBackgroundState() {
            return renderMethods._buildBackgroundState(this);
        },

        /**
         * Builds the overlay state object for the assembler.
         * @private
         */
        _buildOverlayState() {
            return renderMethods._buildOverlayState(this);
        },

        /**
         * Schedules a crop preview canvas render.
         * Debounced via requestAnimationFrame to prevent excessive synchronous
         * canvas operations during rapid crop adjustments (drag handles).
         * @private
         */
        _scheduleCropPreviewRender() {
            cropPreviewMethods._scheduleCropPreviewRender(this);
        },

        /**
         * Updates the canUndo/canRedo reactive state.
         * @private
         */
        _updateUndoState() {
            undoMethods._updateUndoState(this);
        },

        /**
         * Performs an undo operation.
         * @private
         */
        _performUndo() {
            undoMethods._performUndo(this);
        },

        /**
         * Performs a redo operation.
         * @private
         */
        _performRedo() {
            undoMethods._performRedo(this);
        }
    };
}
