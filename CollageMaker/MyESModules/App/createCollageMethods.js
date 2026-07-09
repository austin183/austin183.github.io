/**
 * createCollageMethods - Vue methods factory for CollageMaker.
 * Composes smaller handler modules to avoid God Module anti-pattern.
 * Handlers use injected callbacks for DIP compliance — no direct
 * this._scheduleRender() calls inside handler modules.
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
import { computeShapeOverlayPoints, drawShapeOverlay } from '../Layout/CropOverlayShape.js';

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
    // Build the methods object first so callbacks can reference it.
    // This avoids circular dependencies and enables proper DIP:
    // handlers receive callbacks as factory parameters instead of
    // calling this._scheduleRender() directly.

    // ---- Core methods that handlers depend on ----

    function _scheduleRender(vm) {
        const canvasRenderer = base.getCanvasRenderer();
        if (!canvasRenderer) return;

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
                backgroundState: _buildBackgroundState(vm),
                overlayState: _buildOverlayState(vm),
                titleStyle: vm.titleStyle,
                titleRuns: vm.titleRuns
            });

            ctx.restore();
        });
    }

    function _buildBackgroundState(vm) {
        return {
            type: vm.backgroundStyle,
            color1: vm.backgroundColor,
            color2: vm.gradientColors ? vm.gradientColors[1] || vm.backgroundColor : vm.backgroundColor,
            angle: vm.gradientAngle,
            image: vm.backgroundImage,
            opacity: vm.backgroundOpacity
        };
    }

    function _buildOverlayState(vm) {
        return {
            image: vm.overlayImage,
            mode: vm.overlayMode,
            opacity: vm.overlayOpacity
        };
    }

    function _scheduleCropPreviewRender(vm) {
        if (vm._cropPreviewPending) return;
        vm._cropPreviewPending = true;

        requestAnimationFrame(() => {
            vm._cropPreviewPending = false;

            const cropManager = base.getCropManager();
            if (!vm.selectedPanelId || !cropManager) return;

            const crop = cropManager.getCrop(vm.selectedPanelId);
            const image = cropManager.getPanelImage(vm.selectedPanelId);
            if (!crop || !image) return;

            const canvas = document.getElementById(ids.cropPreviewCanvas);
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

            // Draw panel shape overlay for non-rectangular layouts
            const selectedPanel = vm.panels.find(p => p.id === vm.selectedPanelId);
            if (selectedPanel && selectedPanel.geometry) {
                const shapePoints = computeShapeOverlayPoints(
                    selectedPanel.geometry,
                    { x: cropScreenX, y: cropScreenY, width: cropScreenW, height: cropScreenH }
                );
                if (shapePoints) {
                    drawShapeOverlay(ctx, shapePoints);
                }
            }

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
    }

    function _updateUndoState(vm) {
        if (!base.undoManager) return;
        vm.canUndo = base.undoManager.canUndo();
        vm.canRedo = base.undoManager.canRedo();
    }

    function _performUndo(vm) {
        if (!base.undoManager || !base.undoManager.canUndo()) return;

        const hadUndo = base.undoManager.undo();
        if (!hadUndo) return;

        _updateUndoState(vm);
        _scheduleRender(vm);
        _scheduleCropPreviewRender(vm);
    }

    function _performRedo(vm) {
        if (!base.undoManager || !base.undoManager.canRedo()) return;

        const hadRedo = base.undoManager.redo();
        if (!hadRedo) return;

        _updateUndoState(vm);
        _scheduleRender(vm);
        _scheduleCropPreviewRender(vm);
    }

    function _regenerateAndRender(vm) {
        if (vm.layoutManager) {
            vm.layoutManager.regenerate();
        }
        _scheduleRender(vm);
    }

    // ---- Create handler factories with injected callbacks ----
    // Each callback receives the Vue instance (vm) as a parameter.

    const fileHandlers = createFileHandlers(
        () => base.getImageLibrary(),
        (vm) => _regenerateAndRender(vm),
        ids.fileInput
    );

    const imagePanelHandlers = createImagePanelHandlers(
        () => base.getImageLibrary(),
        () => base.getLayoutManager(),
        () => base.getCanvasRenderer()
    );

    const layoutHandlers = createLayoutHandlers(
        () => base.getLayoutManager(),
        (vm) => _scheduleRender(vm)
    );

    const cropHandlers = createCropHandlers(
        () => base?.getCropManager?.() ?? null,
        (vm) => _scheduleRender(vm),
        (vm) => _scheduleCropPreviewRender(vm)
    );

    const backgroundHandlers = createBackgroundHandlers(
        () => base.getBackgroundManager(),
        (vm) => _scheduleRender(vm)
    );

    const titleHandlers = createTitleHandlers(
        () => base.getTitleManager(),
        (vm) => _scheduleRender(vm)
    );

    const overlayHandlers = createOverlayHandlers(
        (vm) => _scheduleRender(vm)
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
            _performUndo(this);
        },
        redo() {
            _performRedo(this);
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
        toggleSection(sectionId) {
            this.expandedSections[sectionId] = !this.expandedSections[sectionId];
        },
        autoExpandCropOnSelect(panelId) {
            if (panelId) {
                this.expandedSections.crop = true;
            }
            // Deselecting (panelId === null) does NOT collapse crop — user control
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
        // (kept as Vue methods for lifecycle hooks and template bindings)
        // ========================

        /**
         * Regenerates layout and triggers a render.
         * @private
         */
        _regenerateAndRender() {
            _regenerateAndRender(this);
        },

        /**
         * Schedules a canvas render with the current state.
         * Uses on-demand rendering (no continuous loop) — only renders
         * when state changes, saving CPU/battery.
         * @private
         */
        _scheduleRender() {
            _scheduleRender(this);
        },

        /**
         * Builds the background state object for the assembler.
         * @private
         */
        _buildBackgroundState() {
            return _buildBackgroundState(this);
        },

        /**
         * Builds the overlay state object for the assembler.
         * @private
         */
        _buildOverlayState() {
            return _buildOverlayState(this);
        },

        /**
         * Schedules a crop preview canvas render.
         * Debounced via requestAnimationFrame to prevent excessive synchronous
         * canvas operations during rapid crop adjustments (drag handles).
         * @private
         */
        _scheduleCropPreviewRender() {
            _scheduleCropPreviewRender(this);
        },

        /**
         * Updates the canUndo/canRedo reactive state.
         * @private
         */
        _updateUndoState() {
            _updateUndoState(this);
        },

        /**
         * Performs an undo operation.
         * @private
         */
        _performUndo() {
            _performUndo(this);
        },

        /**
         * Performs a redo operation.
         * @private
         */
        _performRedo() {
            _performRedo(this);
        }
    };
}
