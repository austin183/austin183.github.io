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

    /**
     * Focusable element selector for the bottom sheet focus trap.
     * Matches all natively focusable elements plus explicit tabindex elements.
     */
    const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // ---- Bottom sheet focus trap (internal closures) ----
    // These are factory-scoped functions used by both the public API methods
    // and the internal lifecycle methods (toggleBottomSheet, closeSidebars, bsTouchEnd).
    // Using closures avoids `this` references that break when tests mock partial VMs.
    let _bottomSheetFocusTrapHandler = null;

    function _trapFocusInBottomSheet(vm) {
        const sheet = document.getElementById('bottomSheet');
        if (!sheet) return;

        const onTabKey = (e) => {
            if (e.key !== 'Tab') return;

            // Collect focusable elements from visible areas only
            const tabbar = sheet.querySelector('[role="tablist"]');
            const activePanel = sheet.querySelector('[role="tabpanel"]:not([style*="display: none"])');

            const tabbarElements = tabbar
                ? Array.from(tabbar.querySelectorAll(FOCUSABLE_SELECTOR))
                : [];

            const panelElements = activePanel
                ? Array.from(activePanel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
                    el => el.offsetParent !== null // Element is actually visible
                  )
                : [];

            // Deduplicate (tab bar elements won't overlap with panel elements, but be safe)
            const allFocusable = [...new Set([...tabbarElements, ...panelElements])];
            if (allFocusable.length === 0) return;

            const firstEl = allFocusable[0];
            const lastEl = allFocusable[allFocusable.length - 1];

            if (e.shiftKey) {
                // Shift+Tab: if on first element, wrap to last
                if (document.activeElement === firstEl) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                // Tab: if on last element, wrap to first
                if (document.activeElement === lastEl) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        };

        sheet.addEventListener('keydown', onTabKey);
        _bottomSheetFocusTrapHandler = onTabKey;
        vm._bottomSheetFocusTrapHandler = onTabKey; // Mirror on VM for testability
    }

    function _releaseFocusTrap(vm) {
        const sheet = document.getElementById('bottomSheet');
        if (sheet && _bottomSheetFocusTrapHandler) {
            sheet.removeEventListener('keydown', _bottomSheetFocusTrapHandler);
        }
        _bottomSheetFocusTrapHandler = null;
        if (vm) vm._bottomSheetFocusTrapHandler = null; // Mirror on VM for testability
    }

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

    // Shared undo command wiring — pushes commands to the Vue instance's undoManager
    // with error handling and render state updates.
    function pushUndoCommand(vm, cmd) {
        if (vm.undoManager) {
            vm.undoManager.push({
                label: cmd.label,
                undo: () => {
                    try { cmd.undoFn(vm); } catch (e) {
                        console.error(`Undo error (${cmd.label}):`, e);
                        if (vm.showToast) {
                            vm.showToast('Undo failed. Please try again.', 'error', 5000);
                        }
                    }
                },
                redo: () => {
                    try { cmd.redoFn(vm); } catch (e) {
                        console.error(`Redo error (${cmd.label}):`, e);
                        if (vm.showToast) {
                            vm.showToast('Redo failed. Please try again.', 'error', 5000);
                        }
                    }
                }
            });
            vm._updateUndoState();
        }
    }

    const fileHandlers = createFileHandlers(
        () => base.getImageLibrary(),
        (vm) => renderMethods._regenerateAndRender(vm),
        ids.fileInput,
        (vm, current, total) => vm._setImageLoadingProgress(current, total),
        (vm, failedCount, totalCount) => {
            vm.showToast(`${failedCount} of ${totalCount} image(s) failed to load`, 'error', 5000);
        },
        (vm, cmd) => pushUndoCommand(vm, cmd)
    );

    const imagePanelHandlers = createImagePanelHandlers(
        () => base.getImageLibrary(),
        () => base.getLayoutManager(),
        () => base.getCanvasRenderer(),
        (vm) => renderMethods._scheduleRender(vm),
        (vm, cmd) => pushUndoCommand(vm, cmd)
    );

    const layoutHandlers = createLayoutHandlers(
        () => base.getLayoutManager(),
        (vm) => renderMethods._scheduleRender(vm),
        (vm, cmd) => pushUndoCommand(vm, cmd)
    );

    const cropHandlers = createCropHandlers(
        () => base?.getCropManager?.() ?? null,
        (vm) => renderMethods._scheduleRender(vm),
        (vm) => cropPreviewMethods._scheduleCropPreviewRender(vm)
    );

    const backgroundHandlers = createBackgroundHandlers(
        () => base.getBackgroundManager(),
        (vm) => renderMethods._scheduleRender(vm),
        (vm, cmd) => pushUndoCommand(vm, cmd)
    );

    const titleHandlers = createTitleHandlers(
        () => base.getTitleManager(),
        (vm) => renderMethods._scheduleRender(vm),
        (vm, cmd) => pushUndoCommand(vm, cmd)
    );

    const overlayHandlers = createOverlayHandlers(
        (vm) => renderMethods._scheduleRender(vm),
        (vm, cmd) => pushUndoCommand(vm, cmd)
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
        async handleFileInputChange() {
            await fileHandlers.handleFileInputChange.call(this);
            // Switch bottom sheet to images tab when new images are added
            if (this.bottomSheetOpen) {
                this.activeBottomSheetTab = 'images';
            }
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
        snapshotLayoutStyle() {
            layoutHandlers.snapshotLayoutStyle.call(this);
        },
        snapshotLayoutOptions() {
            layoutHandlers.snapshotLayoutOptions.call(this);
        },
        commitLayoutOptions() {
            layoutHandlers.commitLayoutOptions.call(this);
        },
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
        /**
         * Pushes an undo command onto the undo stack. Wraps undoFn/redoFn
         * in try/catch — error handling (generic toast + console.error)
         * occurs during _performUndo/_performRedo execution, not at push time.
         * Exposed on the methods object for testability.
         * @param {Object} vm — Vue instance (for toast and undo state updates)
         * @param {Object} cmd — Command with label, undoFn, and redoFn
         */
        pushUndoCommand(vm, cmd) {
            pushUndoCommand(vm, cmd);
        },

        // Background handlers
        snapshotBackground() {
            backgroundHandlers.snapshotBackground.call(this);
        },
        commitBackground() {
            backgroundHandlers.commitBackground.call(this);
        },
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
        setBackgroundStyle(style) {
            backgroundHandlers.setBackgroundStyle.call(this, style);
        },
        removeBackgroundImageAtomic() {
            backgroundHandlers.removeBackgroundImageAtomic.call(this);
        },

        // Title handlers
        snapshotTitleText() {
            titleHandlers.snapshotTitleText.call(this);
        },
        commitTitleText() {
            titleHandlers.commitTitleText.call(this);
        },
        snapshotTitleStyle() {
            titleHandlers.snapshotTitleStyle.call(this);
        },
        commitTitleStyle() {
            titleHandlers.commitTitleStyle.call(this);
        },
        onTitleTextChange() {
            titleHandlers.onTitleTextChange.call(this);
        },
        onTitleEnterKey(event) {
            titleHandlers.onTitleEnterKey.call(this, event);
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
        setTitleAlignment(alignment) {
            titleHandlers.setTitleAlignment.call(this, alignment);
        },
        toggleTitleShowBackground() {
            titleHandlers.toggleTitleShowBackground.call(this);
        },

        // Overlay handlers
        snapshotOverlay() {
            overlayHandlers.snapshotOverlay.call(this);
        },
        commitOverlay() {
            overlayHandlers.commitOverlay.call(this);
        },
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
        removeOverlayAtomic() {
            overlayHandlers.removeOverlayAtomic.call(this);
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

        // Image loading progress
        beginImageLoading(total) {
            if (this.imageLoadingProgress.visible) return; // Guard against concurrent loading
            this.imageLoadingProgress.visible = true;
            this.imageLoadingProgress.current = 0;
            this.imageLoadingProgress.total = total;
        },
        updateImageLoadingProgress(current, total) {
            this.imageLoadingProgress.current = current;
            this.imageLoadingProgress.total = total;
        },
        endImageLoading() {
            this.imageLoadingProgress.visible = false;
            this.imageLoadingProgress.current = 0;
            this.imageLoadingProgress.total = 0;
        },
        /**
         * @private
         * Called by file handler progress callback.
         */
        _setImageLoadingProgress(current, total) {
            if (current === 0) {
                this.beginImageLoading(total);
            } else {
                this.updateImageLoadingProgress(current, total);
                if (current >= total) {
                    this.endImageLoading();
                }
            }
        },

        // Sidebar methods
        toggleRightSidebar() {
            this.rightSidebarOpen = !this.rightSidebarOpen;
            // Sync mobile overlay state with desktop toggle — on mobile the
            // sidebar-collapsed class has no visual effect (sidebar is fixed
            // off-screen), so we also toggle the mobile-open state.
            this.rightSidebarMobileOpen = !this.rightSidebarMobileOpen;
            // Ensure left mobile sidebar is closed
            if (this.rightSidebarMobileOpen) {
                this.leftSidebarMobileOpen = false;
            }
        },
        toggleLeftSidebar() {
            this.leftSidebarOpen = !this.leftSidebarOpen;
            // Sync mobile overlay state with desktop toggle — on mobile the
            // sidebar-collapsed class has no visual effect (sidebar is fixed
            // off-screen), so we also toggle the mobile-open state.
            this.leftSidebarMobileOpen = !this.leftSidebarMobileOpen;
            // Ensure right mobile sidebar is closed
            if (this.leftSidebarMobileOpen) {
                this.rightSidebarMobileOpen = false;
            }
        },
        toggleRightSidebarMobile() {
            this.rightSidebarMobileOpen = !this.rightSidebarMobileOpen;
            if (this.rightSidebarMobileOpen) {
                this.leftSidebarMobileOpen = false;
            }
        },
        closeSidebars() {
            const wasBottomSheetOpen = this.bottomSheetOpen;
            this.leftSidebarMobileOpen = false;
            this.rightSidebarMobileOpen = false;
            this.bottomSheetOpen = false;
            // Release body scroll lock
            document.body?.classList.remove('no-scroll');
            // Release focus trap
            _releaseFocusTrap(this);
            // Return focus to hamburger button when bottom sheet closes
            if (wasBottomSheetOpen) {
                const btn = document.getElementById('bottomSheetToggleBtn');
                if (btn) btn.focus();
            }
        },

        // Bottom sheet methods (mobile)
        toggleBottomSheet() {
            this.bottomSheetOpen = !this.bottomSheetOpen;
            if (this.bottomSheetOpen) {
                this.leftSidebarMobileOpen = false;
                this.rightSidebarMobileOpen = false;
                // Lock body scroll when bottom sheet opens
                document.body?.classList.add('no-scroll');
                // Set up focus trap and move focus to first tab
                // $nextTick ensures Vue has updated the DOM before querying elements
                if (this.$nextTick) {
                    this.$nextTick(() => {
                        // Guard against rapid open/close — if sheet was closed
                        // before this tick fired, skip setup
                        if (!this.bottomSheetOpen) return;
                        _trapFocusInBottomSheet(this);
                        const firstTab = document.getElementById('bs-tab-images');
                        if (firstTab) firstTab.focus();
                    });
                } else {
                    // Fallback for tests without $nextTick
                    _trapFocusInBottomSheet(this);
                    const firstTab = document.getElementById('bs-tab-images');
                    if (firstTab) firstTab.focus();
                }
            } else {
                // Release body scroll lock when bottom sheet closes
                document.body?.classList.remove('no-scroll');
                // Release focus trap
                _releaseFocusTrap(this);
                // Return focus to hamburger button
                const btn = document.getElementById('bottomSheetToggleBtn');
                if (btn) btn.focus();
            }
        },
        setBottomSheetTab(tabId) {
            this.activeBottomSheetTab = tabId;
        },
        /**
         * Cycles through bottom sheet tabs using arrow key delta.
         * Supports wrap-around navigation (Left on first → last, Right on last → first).
         * Guarded: only active when bottom sheet is open.
         * @param {number} delta — +1 for next, -1 for previous
         */
        switchBottomSheetTab(delta) {
            if (!this.bottomSheetOpen) return; // Only allow when sheet is open
            const validTabs = ['images', 'edit', 'export'];
            let idx = validTabs.indexOf(this.activeBottomSheetTab);
            if (idx === -1) idx = 0; // Reset to first if corrupted, then apply delta
            idx = (idx + delta + validTabs.length) % validTabs.length;
            this.activeBottomSheetTab = validTabs[idx];
        },
        /**
         * Touch start handler for swipe-to-dismiss on bottom sheet content area.
         * Always captures current scroll position (not cached) to handle
         * scroll state changes between opens.
         * Note: method names avoid `_` prefix — Vue 3 reserves `_` for internals
         * and refuses to resolve `_prefixed` properties in template expressions.
         * @param {TouchEvent} event
         */
        bsTouchStart(event) {
            this.bsTouchStartY = event.touches[0].clientY;
            // Always capture current scroll position — don't cache across interactions
            const contentEl = document.querySelector('.bottom-sheet-content');
            this.bsTouchStartScrollTop = contentEl ? contentEl.scrollTop : 0;
        },
        /**
         * Touch end handler for swipe-to-dismiss on bottom sheet content area.
         * Only dismisses if swiped down past threshold AND content was at scroll top.
         * Threshold is responsive: 8% of viewport height, minimum 60px.
         * @param {TouchEvent} event
         */
        bsTouchEnd(event) {
            if (this.bsTouchStartY == null) return;
            const touchEndY = event.changedTouches[0].clientY;
            const deltaY = touchEndY - this.bsTouchStartY;
            // Responsive threshold: 8% of viewport height, minimum 60px
            const minSwipeThreshold = Math.max(60, window.innerHeight * 0.08);
            // Only dismiss on downward swipe when content is at top
            if (deltaY > minSwipeThreshold && this.bsTouchStartScrollTop === 0) {
                _releaseFocusTrap(this);
                this.bottomSheetOpen = false;
                document.body?.classList.remove('no-scroll');
                // Return focus to hamburger button
                const btn = document.getElementById('bottomSheetToggleBtn');
                if (btn) btn.focus();
            }
            this.bsTouchStartY = null;
            this.bsTouchStartScrollTop = null;
        },
        /**
         * Touch cancel handler — cleans up swipe state when touch is interrupted
         * (e.g., app switch, phone call, pointer leaves surface).
         * @param {TouchEvent} _event
         */
        bsTouchCancel(_event) {
            this.bsTouchStartY = null;
            this.bsTouchStartScrollTop = null;
        },

        // ---- Focus trap for bottom sheet aria-modal dialog ----
        /**
         * Sets up a focus trap within the bottom sheet.
         * Tab/Shift+Tab cycles through focusable elements in the visible panel + tab bar.
         * Must be called after the bottom sheet is open (DOM elements are visible).
         */
        trapFocusInBottomSheet() {
            _trapFocusInBottomSheet(this);
        },

        /**
         * Removes the focus trap from the bottom sheet.
         * Call when the bottom sheet closes. Idempotent — safe to call multiple times.
         */
        releaseFocusTrap() {
            _releaseFocusTrap(this);
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
