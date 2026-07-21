/**
 * PanelSwap — Pure function for swapping image assignments between panels.
 * Used by the panel drag-and-drop handler to reassign images between panels
 * in any layout (uniform, hero, mosaic, diagonal slices, hexagonal).
 * When crops and images are provided, also swaps crop coordinates so the
 * visual appearance of each panel is preserved after the swap.
 */

import { createDefaultCrop } from '../Models/CropInfo.js';
import { geometryBoundingRect } from '../Models/PanelGeometry.js';

/**
 * Adapts a crop sourceRect to match a new panel's aspect ratio while
 * preserving the crop center (focal point) as much as possible.
 *
 * This prevents image skew when a crop is moved between panels of
 * different aspect ratios (e.g., tall hero sidebar vs wide hero main).
 *
 * Algorithm:
 * 1. Compute target dimensions using FitMath.sourceRect() logic for the
 *    new panel's aspect ratio against the image size
 * 2. Center the new sourceRect around the old crop center
 * 3. Clamp to image bounds
 *
 * @param {Object} sourceRect - Current sourceRect { x, y, width, height }
 * @param {Object} imageSize - { width, height } of the target image
 * @param {Object} panelSize - { width, height } of the target panel
 * @returns {Object} Adapted sourceRect matching panel aspect ratio
 */
export function adaptCropToPanelAspect(sourceRect, imageSize, panelSize) {
    // Guard degenerate inputs
    if (imageSize.height <= 0 || !isFinite(imageSize.height) ||
        panelSize.height <= 0 || !isFinite(panelSize.height)) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    const panelAspect = panelSize.width / panelSize.height;
    const oldAspect = sourceRect.width / sourceRect.height;

    let targetW, targetH;

    if (Math.abs(oldAspect - panelAspect) < 0.01) {
        // Aspect ratios match — preserve original dimensions (zoom level)
        targetW = Math.min(sourceRect.width, imageSize.width);
        targetH = Math.min(sourceRect.height, imageSize.height);
    } else {
        // Aspect ratios differ — scale from old dimensions to new aspect ratio.
        // Preserve the larger dimension to avoid losing too much of the crop.
        // Try preserving width: compute height from panel aspect
        let tryW = sourceRect.width;
        let tryH = tryW / panelAspect;
        // Try preserving height: compute width from panel aspect
        let tryH2 = sourceRect.height;
        let tryW2 = tryH2 * panelAspect;

        // Clamp each trial to image bounds, re-enforcing aspect ratio
        if (tryW > imageSize.width) {
            tryW = imageSize.width;
            tryH = tryW / panelAspect;
        }
        if (tryH > imageSize.height) {
            tryH = imageSize.height;
            tryW = tryH * panelAspect;
        }

        if (tryW2 > imageSize.width) {
            tryW2 = imageSize.width;
            tryH2 = tryW2 / panelAspect;
        }
        if (tryH2 > imageSize.height) {
            tryH2 = imageSize.height;
            tryW2 = tryH2 * panelAspect;
        }

        // Pick the option that keeps the larger area (less loss)
        if (tryW * tryH > tryW2 * tryH2) {
            targetW = tryW;
            targetH = tryH;
        } else {
            targetW = tryW2;
            targetH = tryH2;
        }
    }

    // Final clamp (safety)
    targetW = Math.max(1, Math.min(targetW, imageSize.width));
    targetH = Math.max(1, Math.min(targetH, imageSize.height));

    // Preserve the old crop center as the focal point
    const oldCenterX = sourceRect.x + sourceRect.width / 2;
    const oldCenterY = sourceRect.y + sourceRect.height / 2;

    let newX = oldCenterX - targetW / 2;
    let newY = oldCenterY - targetH / 2;

    // Clamp position to image bounds
    newX = Math.max(0, Math.min(newX, imageSize.width - targetW));
    newY = Math.max(0, Math.min(newY, imageSize.height - targetH));

    return { x: newX, y: newY, width: targetW, height: targetH };
}

/**
 * Gets the panel size (bounding rect) from a panel's geometry.
 *
 * @param {Object} panel - Panel with geometry property
 * @returns {Object} { x, y, width, height } bounding rect
 */
function getPanelSize(panel) {
    return geometryBoundingRect(panel.geometry);
}

/**
 * Creates a default crop for a panel given the current image assignment.
 *
 * @param {string} panelId
 * @param {Object} panel - Panel object
 * @param {Map} panelAssignments - Map of panelId to imageIndex
 * @param {Array} images - Array of image items
 * @param {Function} createDefaultCropFn - Factory function (injected for testability)
 * @returns {Object|null} CropInfo or null if no valid image
 */
function ensureCropExists(panelId, panel, panelAssignments, images, createDefaultCropFn) {
    const imageIndex = panelAssignments.get(panelId);
    if (imageIndex === undefined || imageIndex >= images.length) return null;
    const image = images[imageIndex];
    const panelSize = getPanelSize(panel);
    return createDefaultCropFn({
        panelId,
        imageSize: { width: image.width, height: image.height },
        panelSize
    });
}

/**
 * Swaps crop sourceRect values between two panels, adapting aspect ratios
 * to match each panel's geometry and clamping to image bounds.
 * Destination rects stay with their panels (tied to canvas position).
 *
 * @param {Map} crops - Crops Map keyed by panelId
 * @param {string} sourceId - Source panel ID
 * @param {string} targetId - Target panel ID
 * @param {Map} panelAssignments - Map of panelId to imageIndex (after swap)
 * @param {Array} images - Array of image items
 * @param {Object} sourcePanelSize - { width, height } of source panel
 * @param {Object} targetPanelSize - { width, height } of target panel
 */
function swapPanelCrops(crops, sourceId, targetId, panelAssignments, images, sourcePanelSize, targetPanelSize) {
    if (!crops.has(sourceId) || !crops.has(targetId)) return;

    const sourceCrop = crops.get(sourceId);
    const targetCrop = crops.get(targetId);

    // Swap sourceRect values (destination stays with each panel)
    const tempSourceRect = { ...sourceCrop.sourceRect };
    const newSourceSourceRect = { ...targetCrop.sourceRect };
    const newTargetSourceRect = { ...tempSourceRect };

    // Adapt each sourceRect to its new panel's aspect ratio and clamp to image bounds
    const newSourceImageIndex = panelAssignments.get(sourceId);
    const newTargetImageIndex = panelAssignments.get(targetId);

    let adaptedSourceRect = newSourceSourceRect;
    let adaptedTargetRect = newTargetSourceRect;

    if (newSourceImageIndex !== undefined && newSourceImageIndex < images.length) {
        adaptedSourceRect = adaptCropToPanelAspect(
            newSourceSourceRect,
            { width: images[newSourceImageIndex].width, height: images[newSourceImageIndex].height },
            sourcePanelSize
        );
    }
    if (newTargetImageIndex !== undefined && newTargetImageIndex < images.length) {
        adaptedTargetRect = adaptCropToPanelAspect(
            newTargetSourceRect,
            { width: images[newTargetImageIndex].width, height: images[newTargetImageIndex].height },
            targetPanelSize
        );
    }

    crops.set(sourceId, {
        ...sourceCrop,
        sourceRect: adaptedSourceRect
    });
    crops.set(targetId, {
        ...targetCrop,
        sourceRect: adaptedTargetRect
    });
}

/**
 * Swaps image assignments between two panels in the reactive state.
 * Updates both the panels array (imageIndex) and the panelAssignments Map.
 * When crops and images are provided, also swaps crop sourceRect values
 * so crop coordinates follow the images between panels.
 *
 * @param {Object} state - Vue reactive state with panels, panelAssignments
 * @param {string} sourceId - Panel ID of the source (dragged from)
 * @param {string} targetId - Panel ID of the target (dropped on)
 * @param {Map} [crops] - Optional crops Map (keyed by panelId) to swap alongside images
 * @param {Array} [images] - Optional images array (needed for clamping when crops are swapped)
 * @returns {boolean} True if swap occurred, false if IDs are the same or not found
 */
export function swapPanelAssignments(state, sourceId, targetId, crops, images) {
    if (sourceId === targetId) return false;

    const sourcePanel = state.panels.find(p => p.id === sourceId);
    const targetPanel = state.panels.find(p => p.id === targetId);
    if (!sourcePanel || !targetPanel) return false;

    // Swap imageIndex values
    const tempIndex = sourcePanel.imageIndex;
    sourcePanel.imageIndex = targetPanel.imageIndex;
    targetPanel.imageIndex = tempIndex;

    // Update panelAssignments Map
    const tempAssign = state.panelAssignments.get(sourceId);
    state.panelAssignments.set(sourceId, state.panelAssignments.get(targetId));
    state.panelAssignments.set(targetId, tempAssign);

    // Swap crop coordinates so they follow the images between panels
    if (crops && images) {
        // Ensure both panels have crops (create defaults for missing ones)
        if (!crops.has(sourceId)) {
            const defaultCrop = ensureCropExists(sourceId, sourcePanel, state.panelAssignments, images, createDefaultCrop);
            if (defaultCrop) crops.set(sourceId, defaultCrop);
        }
        if (!crops.has(targetId)) {
            const defaultCrop = ensureCropExists(targetId, targetPanel, state.panelAssignments, images, createDefaultCrop);
            if (defaultCrop) crops.set(targetId, defaultCrop);
        }

        const sourcePanelSize = getPanelSize(sourcePanel);
        const targetPanelSize = getPanelSize(targetPanel);
        swapPanelCrops(crops, sourceId, targetId, state.panelAssignments, images, sourcePanelSize, targetPanelSize);
    }

    return true;
}

/**
 * Creates a panel drag-and-drop handler for the main preview canvas.
 * When dragging from one panel to another, swaps their image assignments.
 * Works in all layouts. Skips pointerdown if multi-touch gesture is active.
 *
 * @param {Object} options
 * @param {string} options.canvasId - DOM ID of the canvas element
 * @param {Object} options.state - The reactive CollageState
 * @param {Function} options.onPanelSelected - Called with panelId when a panel is selected
 * @param {Function} options.onRenderScheduled - Call to trigger a canvas re-render
 * @param {Function} options.onSwapPerformed - Called after a successful swap for undo tracking
 * @param {Function} options.onCropPreviewRender - Call to re-render the crop preview canvas
 * @param {Function} [options.onTargetHovered] - Called with target panelId (or null) during drag
 * @param {Function} [options.onDragStart] - Called when drag begins (for cursor feedback)
 * @param {Function} [options.onDragEnd] - Called when drag ends (for cursor feedback)
 * @returns {Object} PanelSwapHandler
 */
export function createPanelSwapHandler({ canvasId, state, onPanelSelected, onRenderScheduled, onSwapPerformed, onCropPreviewRender, onTargetHovered, onDragStart, onDragEnd }) {
    let handlerAttached = false;
    let isDragging = false;
    let dragSourceId = null;
    let dragTargetId = null;
    const DRAG_THRESHOLD = 10; // Minimum movement in CSS pixels to count as drag

    // Placeholder for bound handlers (set after handler object is created)
    let onPointerDown, onPointerMove, onPointerUp, onGlobalPointerUp;

    const handler = {
        attach() {
            if (handlerAttached) return;
            handlerAttached = true;

            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            canvas.addEventListener('pointerdown', onPointerDown);
            canvas.addEventListener('pointermove', onPointerMove);
            canvas.addEventListener('pointerup', onPointerUp);
            canvas.addEventListener('pointercancel', onPointerUp);
            // Global cleanup: catches drags that end outside the canvas
            window.addEventListener('pointerup', onGlobalPointerUp);
        },

        detach() {
            if (!handlerAttached) return;
            handlerAttached = false;

            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            window.removeEventListener('pointerup', onGlobalPointerUp);
        },

        _clearDragState() {
            dragTargetId = null;
            if (onTargetHovered) {
                onTargetHovered(null);
            }
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                canvas.style.cursor = '';
                // Release pointer capture if held
                if (canvas.releasePointerCapture && this._capturedPointerId !== undefined) {
                    try { canvas.releasePointerCapture(this._capturedPointerId); } catch (_) {}
                    this._capturedPointerId = undefined;
                }
            }
            if (onDragEnd) onDragEnd();
            dragSourceId = null;
            isDragging = false;
            this._dragStartCoords = null;
        },

        _screenToCanvas(e) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        },

        _hitTestPanel(x, y, canvasWidth, canvasHeight) {
            const scaleX = 1920 / canvasWidth;
            const scaleY = 1080 / canvasHeight;
            const logicalX = x * scaleX;
            const logicalY = y * scaleY;

            for (let i = state.panels.length - 1; i >= 0; i--) {
                const panel = state.panels[i];
                if (this._pointInPanel(logicalX, logicalY, panel.geometry)) {
                    return panel.id;
                }
            }
            return null;
        },

        _pointInPanel(x, y, geometry) {
            if (geometry.type === 'rect') {
                const r = geometry.rect;
                return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
            }
            const points = geometry.points;
            if (!points || points.length < 3) return false;

            let inside = false;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const xi = points[i][0], yi = points[i][1];
                const xj = points[j][0], yj = points[j][1];
                const intersect = ((yi > y) !== (yj > y))
                    && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        },

        _onPointerDown(e) {
            // Skip if multi-touch gesture is active (two-finger pan/zoom)
            if (state._multiTouchGestureActive) return;

            // Skip if title interaction is active (title box drag/resize)
            if (state.titleInteractionMode) return;

            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            // Capture pointer so events continue if cursor leaves canvas bounds
            if (canvas.setPointerCapture) {
                try {
                    canvas.setPointerCapture(e.pointerId);
                    this._capturedPointerId = e.pointerId;
                } catch (_) {}
            }

            const coords = this._screenToCanvas(e);
            if (!coords) return;

            const canvasWidth = canvas.getBoundingClientRect().width;
            const canvasHeight = canvas.getBoundingClientRect().height;

            const panelId = this._hitTestPanel(coords.x, coords.y, canvasWidth, canvasHeight);
            if (!panelId) return;

            // Record drag start
            dragSourceId = panelId;
            isDragging = false; // Not yet — need movement threshold
            this._dragStartCoords = { x: coords.x, y: coords.y };
        },

        _onPointerMove(e) {
            if (!dragSourceId) return;

            const coords = this._screenToCanvas(e);
            if (!coords) return;

            // Check if movement exceeds drag threshold
            if (!isDragging && this._dragStartCoords) {
                const dx = coords.x - this._dragStartCoords.x;
                const dy = coords.y - this._dragStartCoords.y;
                if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
                    isDragging = true;
                    // Set cursor to grabbing when drag begins
                    const canvas = document.getElementById(canvasId);
                    if (canvas) canvas.style.cursor = 'grabbing';
                    if (onDragStart) onDragStart();
                }
            }

            if (!isDragging) return;

            // Hit test for target panel during drag
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const canvasWidth = canvas.getBoundingClientRect().width;
            const canvasHeight = canvas.getBoundingClientRect().height;

            const newTargetId = this._hitTestPanel(coords.x, coords.y, canvasWidth, canvasHeight);
            if (newTargetId !== dragTargetId) {
                dragTargetId = newTargetId;
                if (onTargetHovered) {
                    onTargetHovered(dragTargetId);
                }
                if (onRenderScheduled) {
                    onRenderScheduled();
                }
            }
        },

        _onPointerUp(e) {
            if (!dragSourceId) return;

            if (isDragging) {
                // Find target panel under pointer
                const coords = this._screenToCanvas(e);
                if (coords) {
                    const canvas = document.getElementById(canvasId);
                    const canvasWidth = canvas.getBoundingClientRect().width;
                    const canvasHeight = canvas.getBoundingClientRect().height;

                    const targetId = this._hitTestPanel(coords.x, coords.y, canvasWidth, canvasHeight);

                    if (targetId && targetId !== dragSourceId) {
                        // Perform swap
                        const prevSource = state.panels.find(p => p.id === dragSourceId)?.imageIndex;
                        const prevTarget = state.panels.find(p => p.id === targetId)?.imageIndex;

                        swapPanelAssignments(state, dragSourceId, targetId, state.crops, state.images);

                        // Notify for undo tracking
                        if (onSwapPerformed) {
                            onSwapPerformed({
                                sourceId: dragSourceId,
                                targetId: targetId,
                                prevSourceIndex: prevSource,
                                prevTargetIndex: prevTarget
                            });
                        }

                        onRenderScheduled();
                        if (onCropPreviewRender) {
                            onCropPreviewRender();
                        }
                    }
                }
            } else {
                // Not a drag — treat as click (panel selection)
                if (onPanelSelected) {
                    onPanelSelected(dragSourceId);
                }
            }

            this._clearDragState();
        }
    };

    // Bind event handlers now that handler object exists
    onPointerDown = (e) => handler._onPointerDown(e);
    onPointerMove = (e) => handler._onPointerMove(e);
    onPointerUp = (e) => handler._onPointerUp(e);
    onGlobalPointerUp = () => {
        // Only clean up if a drag is in progress (pointerup happened outside canvas)
        if (isDragging || dragSourceId) {
            handler._clearDragState();
        }
    };

    return handler;
}
