/**
 * createCollageMethods - Vue methods factory for CollageMaker.
 * Composes smaller handler modules to avoid God Module anti-pattern.
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

export function createCollageMethods(base) {
    // Compose all handler modules with their dependencies
    const fileHandlers = createFileHandlers(
        () => base.getImageLibrary(),
        () => {
            const layoutManager = base.getLayoutManager();
            const canvasRenderer = base.getCanvasRenderer();
            if (layoutManager) layoutManager.regenerate();
            if (canvasRenderer) canvasRenderer.scheduleRender(() => {});
        }
    );

    const imagePanelHandlers = createImagePanelHandlers(
        () => base.getImageLibrary(),
        () => base.getLayoutManager(),
        () => base.getCanvasRenderer()
    );

    const layoutHandlers = createLayoutHandlers(
        () => base.getLayoutManager(),
        () => base.getCanvasRenderer()
    );

    // Need to fix cropManager access - adding getter for now
    const cropHandlers = createCropHandlers(
        () => base?.getCropManager?.() ?? null,
        () => base.getCanvasRenderer()
    );

    const backgroundHandlers = createBackgroundHandlers(
        () => base.getBackgroundManager(),
        () => base.getCanvasRenderer()
    );

    const titleHandlers = createTitleHandlers(
        () => base.getTitleManager(),
        () => base.getCanvasRenderer()
    );

    const overlayHandlers = createOverlayHandlers(() => base.getCanvasRenderer());

    const exportHandlers = createExportHandlers(base.assembler);

    const settingsHandlers = createSettingsHandlers();

    // Merge all handlers into a single methods object
    // Note: methods are bound to `this` (Vue instance) when called
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
        handleFileInputChange(event) {
            fileHandlers.handleFileInputChange.call(this, event);
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

        // Crop handlers
        selectPanel(panelId) {
            cropHandlers.selectPanel.call(this, panelId, this._cropInteraction);
        },
        resetSelectedCrop() {
            cropHandlers.resetSelectedCrop.call(this);
        },
        undo() {
            this._performUndo();
        },
        redo() {
            this._performRedo();
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

        // Sidebar methods
        toggleRightSidebar() {
            this.rightSidebarOpen = !this.rightSidebarOpen;
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
        // Legacy Methods (kept for compatibility but may be refactored)
        // ========================

        /**
         * Regenerates layout and triggers a render.
         * @private
         */
        _regenerateAndRender() {
            if (this.layoutManager) {
                this.layoutManager.regenerate();
            }
            this._scheduleRender();
        },

        /**
         * Schedules a canvas render with the current state.
         * Uses on-demand rendering (no continuous loop) — only renders
         * when state changes, saving CPU/battery.
         * @private
         */
        _scheduleRender() {
            const canvasRenderer = base.getCanvasRenderer();
            if (!canvasRenderer) return;

            const vm = this;
            const assembler = base.assembler;

            canvasRenderer.scheduleRender(function (ctx, width, height) {
                if (!vm.images || vm.images.length === 0) return;

                const scaleX = width / 1920;
                const scaleY = height / 1080;

                ctx.save();
                ctx.scale(scaleX, scaleY);

                assembler.render(ctx, {
                    panels: vm.panels,
                    images: vm.images,
                    crops: vm.crops,
                    panelAssignments: vm.panelAssignments,
                    backgroundColor: vm.backgroundColor,
                    canvasSize: {
                        width: 1920,
                        height: 1080
                    },
                    selectedPanelId: vm.selectedPanelId,
                    hoveredPanelId: vm.hoveredPanelId,
                    backgroundState: vm._buildBackgroundState(),
                    overlayState: vm._buildOverlayState(),
                    titleStyle: vm.titleStyle,
                    titleRuns: vm.titleRuns
                });

                ctx.restore();
            });
        },

        /**
         * Builds the background state object for the assembler.
         * @private
         */
        _buildBackgroundState() {
            return {
                type: this.backgroundStyle,
                color1: this.backgroundColor,
                color2: this.gradientColors ? this.gradientColors[1] || this.backgroundColor : this.backgroundColor,
                angle: this.gradientAngle,
                image: this.backgroundImage,
                opacity: this.backgroundOpacity
            };
        },

        /**
         * Builds the overlay state object for the assembler.
         * @private
         */
        _buildOverlayState() {
            return {
                image: this.overlayImage,
                mode: this.overlayMode,
                opacity: this.overlayOpacity
            };
        },

        /**
         * Schedules a crop preview canvas render.
         * Debounced via requestAnimationFrame to prevent excessive synchronous
         * canvas operations during rapid crop adjustments (drag handles).
         * @private
         */
        _scheduleCropPreviewRender() {
            if (this._cropPreviewPending) return;
            this._cropPreviewPending = true;

            requestAnimationFrame(() => {
                this._cropPreviewPending = false;

                const cropManager = base.getCropManager();
                if (!this.selectedPanelId || !cropManager) return;

                const crop = cropManager.getCrop(this.selectedPanelId);
                const image = cropManager.getPanelImage(this.selectedPanelId);
                if (!crop || !image) return;

                const canvas = document.getElementById('cropPreviewCanvas');
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Size canvas to fit in the sidebar
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                const cssW = rect.width || 200;
                const cssH = rect.height || 150;

                canvas.width = cssW * dpr;
                canvas.height = cssH * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

                // Clear
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, cssW, cssH);

                // Calculate image draw size (contain)
                const imageAspect = image.width / image.height;
                const canvasAspect = cssW / cssH;

                let drawW, drawH, offsetX, offsetY;
                if (imageAspect > canvasAspect) {
                    drawW = cssW;
                    drawH = cssW / imageAspect;
                    offsetX = 0;
                    offsetY = (cssH - drawH) / 2;
                } else {
                    drawH = cssH;
                    drawW = cssH * imageAspect;
                    offsetX = (cssW - drawW) / 2;
                    offsetY = 0;
                }

                const scale = drawW / image.width;

                // Draw the full image
                ctx.drawImage(image.image, offsetX, offsetY, drawW, drawH);

                // Draw dark overlay outside the crop region
                const sr = crop.sourceRect;
                const cropScreenX = offsetX + sr.x * scale;
                const cropScreenY = offsetY + sr.y * scale;
                const cropScreenW = sr.width * scale;
                const cropScreenH = sr.height * scale;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                // Top
                ctx.fillRect(0, 0, cssW, cropScreenY);
                // Bottom
                ctx.fillRect(0, cropScreenY + cropScreenH, cssW, cssH - cropScreenY - cropScreenH);
                // Left
                ctx.fillRect(0, cropScreenY, cropScreenX, cropScreenH);
                // Right
                ctx.fillRect(cropScreenX + cropScreenW, cropScreenY, cssW - cropScreenX - cropScreenW, cropScreenH);

                // Draw crop border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(cropScreenX, cropScreenY, cropScreenW, cropScreenH);

                // Draw corner handles (size matches CORNER_HANDLE_SIZE in CropInteraction.js)
                const handleSize = 12;
                ctx.fillStyle = '#ffffff';
                const corners = [
                    [cropScreenX, cropScreenY],
                    [cropScreenX + cropScreenW, cropScreenY],
                    [cropScreenX, cropScreenY + cropScreenH],
                    [cropScreenX + cropScreenW, cropScreenY + cropScreenH]
                ];
                for (const [cx, cy] of corners) {
                    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
                }
            });
        },

        /**
         * Updates the canUndo/canRedo reactive state.
         * @private
         */
        _updateUndoState() {
            if (!base.undoManager) return;
            this.canUndo = base.undoManager.canUndo();
            this.canRedo = base.undoManager.canRedo();
        },

        /**
         * Performs an undo operation.
         * @private
         */
        _performUndo() {
            if (!base.undoManager || !base.undoManager.canUndo()) return;

            const hadUndo = base.undoManager.undo();
            if (!hadUndo) return;

            this._updateUndoState();
            this._scheduleRender();
            this._scheduleCropPreviewRender();
        },

        /**
         * Performs a redo operation.
         * @private
         */
        _performRedo() {
            if (!base.undoManager || !base.undoManager.canRedo()) return;

            const hadRedo = base.undoManager.redo();
            if (!hadRedo) return;

            this._updateUndoState();
            this._scheduleRender();
            this._scheduleCropPreviewRender();
        }
    };
}
