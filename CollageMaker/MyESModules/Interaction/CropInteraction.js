/**
 * CropInteraction - Drag and corner-resize on crop preview canvas.
 * Handles pointer events for adjusting the crop region displayed
 * in the crop preview panel.
 * Ported from Swift crop interaction in Views/CropEditorView.swift
 */

/**
 * Creates a crop interaction handler.
 * @param {Object} options
 * @param {string|string[]} options.canvasId - DOM ID(s) of the crop preview canvas(es).
 *   Pass a single string for one canvas, or an array of strings for multiple canvases
 *   (e.g., desktop sidebar + mobile bottom sheet).
 * @param {Object} options.cropManager - The CropManager instance
 * @param {string} options.panelId - The currently selected panel ID
 * @param {Function} options.onRenderScheduled - Call to trigger main canvas re-render
 * @param {Function} options.onCropPreviewRender - Call to re-render the crop preview canvas
 * @param {Function} [options.onDragStart] - Called when a drag/resize starts (for undo batching)
 * @param {Function} [options.onDragEnd] - Called when a drag/resize ends (for undo batching)
 * @returns {Object} CropInteraction
 */
export function createCropInteraction({ canvasId, cropManager, panelId, onRenderScheduled, onCropPreviewRender, onDragStart, onDragEnd }) {
    // Normalize canvasId to an array for uniform iteration
    const canvasIds = Array.isArray(canvasId) ? canvasId : [canvasId];

    /** @type {HTMLCanvasElement[]} */
    let canvases = [];
    let isDragging = false;
    let isResizing = false;
    let dragStartScreen = { x: 0, y: 0 };
    let cropStart = { x: 0, y: 0, width: 0, height: 0 };
    let resizeCorner = null; // 'tl', 'tr', 'bl', 'br'
    let handlerAttached = false;
    let lastPointerId = undefined;

    // Corner handle size in CSS pixels
    const CORNER_HANDLE_SIZE = 12;

    // Placeholder for bound handlers (set after handler object is created)
    let onPointerDown, onPointerMove, onPointerUp;

    const handler = {
        /**
         * Attaches pointer event listeners to all configured crop preview canvases.
         */
        attach() {
            if (handlerAttached) return;
            handlerAttached = true;

            canvases = [];
            for (const id of canvasIds) {
                const c = document.getElementById(id);
                if (c) {
                    canvases.push(c);
                    c.addEventListener('pointerdown', onPointerDown);
                    c.addEventListener('pointermove', onPointerMove);
                    c.addEventListener('pointerup', onPointerUp);
                    c.addEventListener('pointercancel', onPointerUp);
                }
            }
        },

        /**
         * Removes all event listeners from all canvases.
         */
        detach() {
            if (!handlerAttached) return;
            handlerAttached = false;

            // Release any captured pointer on detach
            for (const c of canvases) {
                if (c && c.releasePointerCapture && lastPointerId !== undefined) {
                    try { c.releasePointerCapture(lastPointerId); } catch (_) {}
                }
            }

            for (const c of canvases) {
                if (c) {
                    c.removeEventListener('pointerdown', onPointerDown);
                    c.removeEventListener('pointermove', onPointerMove);
                    c.removeEventListener('pointerup', onPointerUp);
                    c.removeEventListener('pointercancel', onPointerUp);
                }
            }
            canvases = [];
        },

        /**
         * Updates the panel ID (called when selection changes).
         * @param {string} newPanelId
         */
        setPanelId(newPanelId) {
            this.detach();
            panelId = newPanelId;
            if (panelId) {
                this.attach();
            }
        },

        /**
         * Converts screen coordinates to crop image coordinates.
         * @param {number} screenX - X in CSS pixels relative to crop canvas
         * @param {number} screenY - Y in CSS pixels relative to crop canvas
         * @returns {{ x: number, y: number, imageScale: number }}
         */
        screenToImageCoords(screenX, screenY, targetCanvas) {
            const c = targetCanvas || (canvases.length > 0 ? canvases[0] : null);
            if (!c) return { x: 0, y: 0, imageScale: 1 };

            const crop = cropManager.getCrop(panelId);
            const image = cropManager.getPanelImage(panelId);
            if (!crop || !image) return { x: 0, y: 0, imageScale: 1 };

            const rect = c.getBoundingClientRect();
            const canvasW = rect.width;
            const canvasH = rect.height;

            // The image is scaled to fit the canvas (contain)
            const imageAspect = image.width / image.height;
            const canvasAspect = canvasW / canvasH;

            let drawW, drawH, offsetX, offsetY;
            if (imageAspect > canvasAspect) {
                drawW = canvasW;
                drawH = canvasW / imageAspect;
                offsetX = 0;
                offsetY = (canvasH - drawH) / 2;
            } else {
                drawH = canvasH;
                drawW = canvasH * imageAspect;
                offsetX = (canvasW - drawW) / 2;
                offsetY = 0;
            }

            const imageScale = drawW / image.width;

            return {
                x: (screenX - offsetX) / imageScale,
                y: (screenY - offsetY) / imageScale,
                imageScale: imageScale
            };
        },

        /**
         * Checks if a screen position is over a corner handle.
         * @param {number} screenX
         * @param {number} screenY
         * @returns {string|null} Corner identifier or null
         */
        hitTestCorner(screenX, screenY, targetCanvas) {
            const crop = cropManager.getCrop(panelId);
            const image = cropManager.getPanelImage(panelId);
            if (!crop || !image) return null;

            const sr = crop.sourceRect;

            // Convert crop rect corners to screen coordinates
            const corners = this._getCornersInScreen(targetCanvas);
            const handleSize = CORNER_HANDLE_SIZE;

            for (const [corner, { x, y }] of Object.entries(corners)) {
                if (Math.abs(screenX - x) < handleSize && Math.abs(screenY - y) < handleSize) {
                    return corner;
                }
            }
            return null;
        },

        /**
         * Gets the four corner handles in screen coordinates (relative to crop canvas).
         * @returns {Object} { tl: {x,y}, tr: {x,y}, bl: {x,y}, br: {x,y} }
         */
        _getCornersInScreen(targetCanvas) {
            const c = targetCanvas || (canvases.length > 0 ? canvases[0] : null);
            const crop = cropManager.getCrop(panelId);
            const image = cropManager.getPanelImage(panelId);
            if (!crop || !image || !c) return {};

            const sr = crop.sourceRect;

            const rect = c.getBoundingClientRect();
            const canvasW = rect.width;
            const canvasH = rect.height;

            const imageAspect = image.width / image.height;
            const canvasAspect = canvasW / canvasH;

            let drawW, drawH, offsetX, offsetY;
            if (imageAspect > canvasAspect) {
                drawW = canvasW;
                drawH = canvasW / imageAspect;
                offsetX = 0;
                offsetY = (canvasH - drawH) / 2;
            } else {
                drawH = canvasH;
                drawW = canvasH * imageAspect;
                offsetX = (canvasW - drawW) / 2;
                offsetY = 0;
            }

            const scale = drawW / image.width;

            return {
                tl: { x: offsetX + sr.x * scale, y: offsetY + sr.y * scale },
                tr: { x: offsetX + (sr.x + sr.width) * scale, y: offsetY + sr.y * scale },
                bl: { x: offsetX + sr.x * scale, y: offsetY + (sr.y + sr.height) * scale },
                br: { x: offsetX + (sr.x + sr.width) * scale, y: offsetY + (sr.y + sr.height) * scale }
            };
        },

        // Private event handlers

        _onPointerDown(e) {
            if (!panelId) return;
            e.preventDefault();

            // Track pointer ID for cleanup in detach()
            lastPointerId = e.pointerId;

            // Use the canvas that received the event
            const targetCanvas = e.currentTarget;

            // Protect setPointerCapture — not all browsers support it
            if (targetCanvas && targetCanvas.setPointerCapture) {
                try {
                    targetCanvas.setPointerCapture(e.pointerId);
                } catch (_) {
                    // setPointerCapture not supported — pointer events still work
                }
            }

            const rect = targetCanvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            // Check corner handles first
            const corner = this.hitTestCorner(screenX, screenY, targetCanvas);
            if (corner) {
                isResizing = true;
                resizeCorner = corner;
                const crop = cropManager.getCrop(panelId);
                cropStart = { ...crop.sourceRect };
                dragStartScreen = { x: screenX, y: screenY };
                if (onDragStart) onDragStart();
                return;
            }

            // Otherwise, start dragging the crop region
            const coords = this.screenToImageCoords(screenX, screenY, targetCanvas);
            const crop = cropManager.getCrop(panelId);
            if (!crop) return;

            // Check if click is within the crop region
            const sr = crop.sourceRect;
            if (coords.x >= sr.x && coords.x <= sr.x + sr.width &&
                coords.y >= sr.y && coords.y <= sr.y + sr.height) {
                isDragging = true;
                cropStart = { ...sr };
                dragStartScreen = { x: screenX, y: screenY };
                if (onDragStart) onDragStart();
            }
        },

        _onPointerMove(e) {
            const targetCanvas = e.currentTarget;
            if (!isDragging && !isResizing) {
                // Update cursor based on hover
                if (panelId && targetCanvas) {
                    const rect = targetCanvas.getBoundingClientRect();
                    const screenX = e.clientX - rect.left;
                    const screenY = e.clientY - rect.top;
                    const corner = this.hitTestCorner(screenX, screenY, targetCanvas);
                    if (corner) {
                        targetCanvas.style.cursor = this._cornerCursor(corner);
                    } else {
                        const coords = this.screenToImageCoords(screenX, screenY, targetCanvas);
                        const crop = cropManager.getCrop(panelId);
                        if (crop) {
                            const sr = crop.sourceRect;
                            const inCrop = coords.x >= sr.x && coords.x <= sr.x + sr.width &&
                                coords.y >= sr.y && coords.y <= sr.y + sr.height;
                            targetCanvas.style.cursor = inCrop ? 'grab' : 'default';
                        }
                    }
                }
                return;
            }

            e.preventDefault();
            const rect = targetCanvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            if (isDragging) {
                this._handleDrag(screenX, screenY, targetCanvas);
            } else if (isResizing) {
                this._handleResize(screenX, screenY, targetCanvas);
            }
        },

        _onPointerUp(e) {
            // Release pointer capture to prevent stuck pointer state
            if (e.currentTarget && e.currentTarget.releasePointerCapture) {
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
            }

            if (isDragging || isResizing) {
                if (onDragEnd) onDragEnd();
                onRenderScheduled();
            }
            isDragging = false;
            isResizing = false;
            resizeCorner = null;
        },

        _handleDrag(screenX, screenY, targetCanvas) {
            const delta = this.screenToImageCoords(screenX, screenY, targetCanvas);
            const startDelta = this.screenToImageCoords(dragStartScreen.x, dragStartScreen.y, targetCanvas);

            const dx = delta.x - startDelta.x;
            const dy = delta.y - startDelta.y;

            const newSrc = {
                x: cropStart.x + dx,
                y: cropStart.y + dy,
                width: cropStart.width,
                height: cropStart.height
            };

            cropManager.setSourceRect(panelId, newSrc);
            onCropPreviewRender();
        },

        _handleResize(screenX, screenY, targetCanvas) {
            const coords = this.screenToImageCoords(screenX, screenY, targetCanvas);
            const crop = cropManager.getCrop(panelId);
            const image = cropManager.getPanelImage(panelId);
            if (!crop || !image) return;

            const aspectRatio = cropStart.width / cropStart.height;
            const corner = resizeCorner;

            // Determine which edges the corner controls
            const isLeft = corner === 'tl' || corner === 'bl';
            const isTop = corner === 'tl' || corner === 'tr';

            // Clamp cursor to prevent crop from flipping past the opposite edge.
            // Minimum crop size of 10px prevents the crop from collapsing entirely.
            const minX = 0;
            const maxX = image.width - 10;
            const minY = 0;
            const maxY = image.height - 10;

            let clampedX = coords.x;
            let clampedY = coords.y;

            if (isLeft) {
                // Dragging left edge: can't go past right edge of crop
                const oppositeEdge = cropStart.x + cropStart.width - 10;
                clampedX = Math.max(minX, Math.min(clampedX, oppositeEdge));
            } else {
                // Dragging right edge: can't go before left edge of crop
                const oppositeEdge = cropStart.x + 10;
                clampedX = Math.max(oppositeEdge, Math.min(clampedX, maxX));
            }

            if (isTop) {
                // Dragging top edge: can't go past bottom edge of crop
                const oppositeEdge = cropStart.y + cropStart.height - 10;
                clampedY = Math.max(minY, Math.min(clampedY, oppositeEdge));
            } else {
                // Dragging bottom edge: can't go before top edge of crop
                const oppositeEdge = cropStart.y + 10;
                clampedY = Math.max(oppositeEdge, Math.min(clampedY, maxY));
            }

            // Calculate new crop from clamped cursor position
            let newX, newY, newW, newH;

            if (isLeft) {
                newW = cropStart.x + cropStart.width - clampedX;
                newH = newW / aspectRatio;
                newX = clampedX;
                newY = isTop ? clampedY : cropStart.y + cropStart.height - newH;
            } else {
                newW = clampedX - cropStart.x;
                newH = newW / aspectRatio;
                newX = cropStart.x;
                newY = isTop ? clampedY : cropStart.y + cropStart.height - newH;
            }

            // Clamp to image bounds
            newX = Math.max(0, Math.min(newX, image.width - newW));
            newY = Math.max(0, Math.min(newY, image.height - newH));
            newW = Math.min(newW, image.width - newX);
            newH = Math.min(newH, image.height - newY);

            cropManager.setSourceRect(panelId, { x: newX, y: newY, width: newW, height: newH });
            onCropPreviewRender();
        },

        _cornerCursor(corner) {
            switch (corner) {
                case 'tl': return 'nwse-resize';
                case 'tr': return 'nesw-resize';
                case 'bl': return 'nesw-resize';
                case 'br': return 'nwse-resize';
                default: return 'default';
            }
        }
    };

    // Bind event handlers now that handler object exists
    onPointerDown = (e) => handler._onPointerDown(e);
    onPointerMove = (e) => handler._onPointerMove(e);
    onPointerUp = (e) => handler._onPointerUp(e);

    return handler;
}
