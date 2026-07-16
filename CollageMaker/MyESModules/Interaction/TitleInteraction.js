/**
 * TitleInteraction — Canvas pointer handler for title box manipulation.
 * Supports: drag to move, edge-drag to resize width.
 * Coordinates with PanelSwap via state.titleInteractionMode guard.
 * Coordinates with MultiTouch via state._multiTouchGestureActive guard.
 *
 * @param {Object} options
 * @param {string} options.canvasId - DOM ID of the canvas element
 * @param {Object} options.state - The reactive CollageState
 * @param {Object} options.titleManager - TitleManager instance with setPosition, setWidth, getRuns
 * @param {Function} options.onRenderScheduled - Call to trigger canvas re-render
 * @param {Function} options.onInteractionStart - Called when drag/resize begins
 * @param {Function} options.onInteractionEnd - Called when drag/resize ends
 * @returns {Object} TitleInteractionHandler
 */
import { computeBounds } from '../Rendering/TitleRenderer.js';
import { SIZE_CONSTANTS } from '../Models/SizeConstants.js';

export function createTitleInteraction({ canvasId, state, titleManager, onRenderScheduled, onInteractionStart, onInteractionEnd }) {
    let handlerAttached = false;
    let isInteracting = false;
    let interactionType = null; // 'drag', 'resize-left', 'resize-right'
    let lastHoverTarget = null; // Track to avoid redundant renders on hover
    let dragStartCoords = null; // CSS coordinates
    let dragStartBoxX = null;   // Logical coordinates
    let dragStartBoxY = null;   // Logical coordinates
    let dragStartBoxWidth = null; // Logical pixels
    let capturedPointerId = undefined;

    const DRAG_THRESHOLD = 3;   // CSS pixels — minimum movement to trigger drag
    const EDGE_THRESHOLD = 8;   // CSS pixels — resize handle hit area

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

        /**
         * Clears all interaction state and resets cursor.
         * @private
         */
        _clearInteractionState() {
            if (isInteracting && onInteractionEnd) {
                onInteractionEnd();
            }
            isInteracting = false;
            interactionType = null;
            dragStartCoords = null;
            dragStartBoxX = null;
            dragStartBoxY = null;
            dragStartBoxWidth = null;

            // Update reactive state
            state.titleInteractionMode = null;
            state.titleHoverTarget = null;
            lastHoverTarget = null;

            const canvas = document.getElementById(canvasId);
            if (canvas) {
                canvas.style.cursor = '';
                // Release pointer capture if held
                if (canvas.releasePointerCapture && capturedPointerId !== undefined) {
                    try { canvas.releasePointerCapture(capturedPointerId); } catch (_) {}
                    capturedPointerId = undefined;
                }
            }
        },

        /**
         * Converts CSS pointer coordinates to logical canvas coordinates.
         * @param {PointerEvent} e
         * @returns {{ x: number, y: number } | null}
         * @private
         */
        _screenToCanvas(e) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        },

        /**
         * Hit-tests the title bounding box at the given CSS coordinates.
         * @param {number} cssX - CSS x coordinate
         * @param {number} cssY - CSS y coordinate
         * @param {number} canvasWidth - CSS canvas width
         * @param {number} canvasHeight - CSS canvas height
         * @returns {{ hit: boolean, target: string | null }}
         * @private
         */
        _hitTestTitle(cssX, cssY, canvasWidth, canvasHeight) {
            const runs = titleManager.getRuns();
            if (!runs || runs.length === 0) {
                return { hit: false };
            }

            const bounds = computeBounds(state.titleStyle, runs, SIZE_CONSTANTS.defaultCanvasWidth, SIZE_CONSTANTS.defaultCanvasHeight);
            const boxWidth = bounds.boxWidth;
            const boxHeight = bounds.height;

            // Compute the title box position in logical coords
            const titleBoxX = state.titleStyle.titleBoxX !== null && state.titleStyle.titleBoxX !== undefined
                ? state.titleStyle.titleBoxX
                : (SIZE_CONSTANTS.defaultCanvasWidth - boxWidth) / 2; // Default: centered

            const titleBoxY = state.titleStyle.titleBoxY !== null && state.titleStyle.titleBoxY !== undefined
                ? state.titleStyle.titleBoxY
                : SIZE_CONSTANTS.defaultCanvasHeight - 40; // Default: bottom margin (MARGIN = 40)

            // Box top-left in logical coords
            const boxTop = titleBoxY - (state.titleStyle.fontSize || 36) - 12; // baselineY - fontSize - PADDING
            const boxLeft = titleBoxX;

            // Convert logical box to CSS coords
            const scaleX = canvasWidth / SIZE_CONSTANTS.defaultCanvasWidth;
            const scaleY = canvasHeight / SIZE_CONSTANTS.defaultCanvasHeight;
            const cssBoxLeft = boxLeft * scaleX;
            const cssBoxTop = boxTop * scaleY;
            const cssBoxWidth = boxWidth * scaleX;
            const cssBoxHeight = boxHeight * scaleY;

            // Check if point is within the title box
            if (cssX < cssBoxLeft || cssX > cssBoxLeft + cssBoxWidth ||
                cssY < cssBoxTop || cssY > cssBoxTop + cssBoxHeight) {
                return { hit: false };
            }

            // Check edge proximity (in CSS pixels)
            const distToLeft = cssX - cssBoxLeft;
            const distToRight = (cssBoxLeft + cssBoxWidth) - cssX;

            if (distToLeft <= EDGE_THRESHOLD) {
                return { hit: true, target: 'left-edge' };
            }
            if (distToRight <= EDGE_THRESHOLD) {
                return { hit: true, target: 'right-edge' };
            }

            return { hit: true, target: 'body' };
        },

        /**
         * Handles pointerdown events.
         * @param {PointerEvent} e
         * @private
         */
        _onPointerDown(e) {
            // Skip if multi-touch gesture is active
            if (state._multiTouchGestureActive) return;

            // Skip if already interacting (prevent double-start)
            if (isInteracting || state.titleInteractionMode) return;

            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const coords = this._screenToCanvas(e);
            if (!coords) return;

            const canvasWidth = canvas.getBoundingClientRect().width;
            const canvasHeight = canvas.getBoundingClientRect().height;

            const hit = this._hitTestTitle(coords.x, coords.y, canvasWidth, canvasHeight);
            if (!hit.hit) return;

            // Capture pointer so events continue if cursor leaves canvas bounds
            if (canvas.setPointerCapture) {
                try {
                    canvas.setPointerCapture(e.pointerId);
                    capturedPointerId = e.pointerId;
                } catch (_) {}
            }

            // Record start state
            dragStartCoords = { x: coords.x, y: coords.y };
            dragStartBoxX = state.titleStyle.titleBoxX !== null && state.titleStyle.titleBoxX !== undefined
                ? state.titleStyle.titleBoxX
                : (SIZE_CONSTANTS.defaultCanvasWidth - (state.titleStyle.titleBoxWidth ?? 0)) / 2;
            dragStartBoxY = state.titleStyle.titleBoxY !== null && state.titleStyle.titleBoxY !== undefined
                ? state.titleStyle.titleBoxY
                : SIZE_CONSTANTS.defaultCanvasHeight - 40;
            dragStartBoxWidth = state.titleStyle.titleBoxWidth ?? null;

            // Determine interaction type from hit target
            interactionType = hit.target === 'body' ? 'drag' :
                              hit.target === 'left-edge' ? 'resize-left' :
                              hit.target === 'right-edge' ? 'resize-right' : null;

            // Set interaction mode immediately so PanelSwap's guard sees it
            // and backs off — prevents panel drag starting behind the title
            state.titleHoverTarget = hit.target;
            state.titleInteractionMode = interactionType;

            // Set cursor based on target
            canvas.style.cursor = hit.target === 'body' ? 'grab' : 'ew-resize';

            // Schedule render so interaction outline appears immediately
            lastHoverTarget = state.titleHoverTarget;
            if (onRenderScheduled) {
                onRenderScheduled();
            }
        },

        /**
         * Handles pointermove events.
         * @param {PointerEvent} e
         * @private
         */
        _onPointerMove(e) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const coords = this._screenToCanvas(e);
            if (!coords) return;

            const canvasWidth = canvas.getBoundingClientRect().width;
            const canvasHeight = canvas.getBoundingClientRect().height;

            // If we have a drag start but haven't crossed threshold yet, check for drag
            if (dragStartCoords && !isInteracting) {
                const dx = coords.x - dragStartCoords.x;
                const dy = coords.y - dragStartCoords.y;
                if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
                    // Crossed drag threshold — start interaction
                    isInteracting = true;
                    state.titleInteractionMode = interactionType;
                    // Update cursor to show active grabbing
                    canvas.style.cursor = interactionType === 'drag' ? 'grabbing' : 'ew-resize';
                    if (onInteractionStart) {
                        onInteractionStart();
                    }
                }
            }

            // If actively interacting, apply delta
            if (isInteracting && interactionType) {
                const scaleX = SIZE_CONSTANTS.defaultCanvasWidth / canvasWidth;
                const scaleY = SIZE_CONSTANTS.defaultCanvasHeight / canvasHeight;
                const dxLogical = (coords.x - dragStartCoords.x) * scaleX;
                const dyLogical = (coords.y - dragStartCoords.y) * scaleY;

                const boxWidth = state.titleStyle.titleBoxWidth ?? 400;

                if (interactionType === 'drag') {
                    // Move: apply delta to position
                    let newX = dragStartBoxX + dxLogical;
                    let newY = dragStartBoxY + dyLogical;

                    // Clamp to canvas bounds with VISIBLE_MIN — keep at least 50px visible
                    const actualBoxWidth = state.titleStyle.titleBoxWidth ?? 400;
                    const fontSize = state.titleStyle.fontSize || 36;
                    const VISIBLE_MIN = 50; // px of box that must remain visible at edges
                    newX = Math.max(-actualBoxWidth + VISIBLE_MIN, Math.min(newX, SIZE_CONSTANTS.defaultCanvasWidth - VISIBLE_MIN));
                    newY = Math.max(fontSize + 12, Math.min(newY, SIZE_CONSTANTS.defaultCanvasHeight - 12));

                    titleManager.setPosition(newX, newY);
                } else if (interactionType === 'resize-right') {
                    // Resize from right: change width, keep X
                    let newWidth = (dragStartBoxWidth ?? boxWidth) + dxLogical;
                    // Clamp width
                    const runs = titleManager.getRuns();
                    const bounds = computeBounds(state.titleStyle, runs, SIZE_CONSTANTS.defaultCanvasWidth, SIZE_CONSTANTS.defaultCanvasHeight);
                    const minWidth = Math.max(100, bounds.textWidth);
                    const maxWidth = SIZE_CONSTANTS.defaultCanvasWidth - 80;
                    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

                    titleManager.setWidth(newWidth);
                } else if (interactionType === 'resize-left') {
                    // Resize from left: change width AND X
                    let newWidth = (dragStartBoxWidth ?? boxWidth) - dxLogical;
                    // Clamp width
                    const runs = titleManager.getRuns();
                    const bounds = computeBounds(state.titleStyle, runs, SIZE_CONSTANTS.defaultCanvasWidth, SIZE_CONSTANTS.defaultCanvasHeight);
                    const minWidth = Math.max(100, bounds.textWidth);
                    const maxWidth = SIZE_CONSTANTS.defaultCanvasWidth - 80;
                    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

                    const widthDelta = newWidth - (dragStartBoxWidth ?? boxWidth);
                    let newX = dragStartBoxX - widthDelta;
                    newX = Math.max(0, Math.min(newX, SIZE_CONSTANTS.defaultCanvasWidth - newWidth));

                    titleManager.setPosition(newX, state.titleStyle.titleBoxY);
                    titleManager.setWidth(newWidth);
                }

                if (onRenderScheduled) {
                    onRenderScheduled();
                }
                return;
            }

            // Not interacting — check hover for cursor feedback
            const hit = this._hitTestTitle(coords.x, coords.y, canvasWidth, canvasHeight);
            if (hit.hit) {
                state.titleHoverTarget = hit.target;
                canvas.style.cursor = hit.target === 'body' ? 'grab' : 'ew-resize';
            } else {
                state.titleHoverTarget = null;
                canvas.style.cursor = '';
            }
            // Schedule render only when hover state changes (outline visibility)
            if (state.titleHoverTarget !== lastHoverTarget) {
                lastHoverTarget = state.titleHoverTarget;
                if (onRenderScheduled) {
                    onRenderScheduled();
                }
            }
        },

        /**
         * Handles pointerup events.
         * @param {PointerEvent} e
         * @private
         */
        _onPointerUp(e) {
            this._clearInteractionState();
        }
    };

    // Bind event handlers now that handler object exists
    onPointerDown = (e) => handler._onPointerDown(e);
    onPointerMove = (e) => handler._onPointerMove(e);
    onPointerUp = (e) => handler._onPointerUp(e);
    onGlobalPointerUp = () => {
        // Only clean up if an interaction is in progress (pointerup happened outside canvas)
        if (isInteracting || dragStartCoords) {
            handler._clearInteractionState();
        }
    };

    return handler;
}
