/**
 * CropInteraction - Drag and corner-resize on crop preview canvas.
 * Handles pointer events for adjusting the crop region displayed
 * in the crop preview panel.
 * Ported from Swift crop interaction in Views/CropEditorView.swift
 */

/**
 * Creates a crop interaction handler.
 * @param {Object} options
 * @param {string} options.canvasId - DOM ID of the crop preview canvas
 * @param {Object} options.cropManager - The CropManager instance
 * @param {string} options.panelId - The currently selected panel ID
 * @param {Function} options.onRenderScheduled - Call to trigger main canvas re-render
 * @param {Function} options.onCropPreviewRender - Call to re-render the crop preview canvas
 * @param {Function} [options.onDragStart] - Called when a drag/resize starts (for undo batching)
 * @param {Function} [options.onDragEnd] - Called when a drag/resize ends (for undo batching)
 * @returns {Object} CropInteraction
 */
export function createCropInteraction({ canvasId, cropManager, panelId, onRenderScheduled, onCropPreviewRender, onDragStart, onDragEnd }) {
    let canvas = null;
    let isDragging = false;
    let isResizing = false;
    let dragStartScreen = { x: 0, y: 0 };
    let cropStart = { x: 0, y: 0, width: 0, height: 0 };
    let resizeCorner = null; // 'tl', 'tr', 'bl', 'br'
    let handlerAttached = false;

    // Corner handle size in CSS pixels
    const CORNER_HANDLE_SIZE = 12;

    return {
        /**
         * Attaches pointer event listeners to the crop preview canvas.
         */
        attach() {
            if (handlerAttached) return;
            handlerAttached = true;

            canvas = document.getElementById(canvasId);
            if (!canvas) return;

            canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
            canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
            canvas.addEventListener('pointerup', (e) => this._onPointerUp(e));
            canvas.addEventListener('pointercancel', (e) => this._onPointerUp(e));
        },

        /**
         * Removes all event listeners.
         */
        detach() {
            if (!handlerAttached) return;
            handlerAttached = false;

            if (canvas) {
                canvas.removeEventListener('pointerdown', this._onPointerDown);
                canvas.removeEventListener('pointermove', this._onPointerMove);
                canvas.removeEventListener('pointerup', this._onPointerUp);
                canvas.removeEventListener('pointercancel', this._onPointerUp);
            }
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
        screenToImageCoords(screenX, screenY) {
            if (!canvas) return { x: 0, y: 0, imageScale: 1 };

            const crop = cropManager.getCrop(panelId);
            const image = cropManager.getPanelImage(panelId);
            if (!crop || !image) return { x: 0, y: 0, imageScale: 1 };

            const rect = canvas.getBoundingClientRect();
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
        hitTestCorner(screenX, screenY) {
            const crop = cropManager.getCrop(panelId);
            const image = cropManager.getPanelImage(panelId);
            if (!crop || !image) return null;

            const sr = crop.sourceRect;

            // Convert crop rect corners to screen coordinates
            const corners = this._getCornersInScreen();
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
        _getCornersInScreen() {
            const crop = cropManager.getCrop(panelId);
            const image = cropManager.getPanelImage(panelId);
            if (!crop || !image || !canvas) return {};

            const sr = crop.sourceRect;

            const rect = canvas.getBoundingClientRect();
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
            canvas.setPointerCapture(e.pointerId);

            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            // Check corner handles first
            const corner = this.hitTestCorner(screenX, screenY);
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
            const coords = this.screenToImageCoords(screenX, screenY);
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
            if (!isDragging && !isResizing) {
                // Update cursor based on hover
                if (panelId && canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const screenX = e.clientX - rect.left;
                    const screenY = e.clientY - rect.top;
                    const corner = this.hitTestCorner(screenX, screenY);
                    if (corner) {
                        canvas.style.cursor = this._cornerCursor(corner);
                    } else {
                        const coords = this.screenToImageCoords(screenX, screenY);
                        const crop = cropManager.getCrop(panelId);
                        if (crop) {
                            const sr = crop.sourceRect;
                            const inCrop = coords.x >= sr.x && coords.x <= sr.x + sr.width &&
                                coords.y >= sr.y && coords.y <= sr.y + sr.height;
                            canvas.style.cursor = inCrop ? 'grab' : 'default';
                        }
                    }
                }
                return;
            }

            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            if (isDragging) {
                this._handleDrag(screenX, screenY);
            } else if (isResizing) {
                this._handleResize(screenX, screenY);
            }
        },

        _onPointerUp(e) {
            if (isDragging || isResizing) {
                if (onDragEnd) onDragEnd();
                onRenderScheduled();
            }
            isDragging = false;
            isResizing = false;
            resizeCorner = null;
        },

        _handleDrag(screenX, screenY) {
            const delta = this.screenToImageCoords(screenX, screenY);
            const startDelta = this.screenToImageCoords(dragStartScreen.x, dragStartScreen.y);

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

        _handleResize(screenX, screenY) {
            const coords = this.screenToImageCoords(screenX, screenY);
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
}
