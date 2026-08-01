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
import { computeMultiLineBounds, PADDING, MARGIN } from '../Rendering/TitleRenderer.js';
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
    let lastPointerType = null; // 'mouse', 'touch', or 'pen'

    const DRAG_THRESHOLD = 3;         // CSS pixels — minimum movement to trigger drag
    const EDGE_THRESHOLD_FINE = 8;    // CSS pixels — mouse/pen resize handle hit area
    const EDGE_THRESHOLD_COARSE = 22; // CSS pixels — touch resize handle hit area (WCAG 44px target / 2)

    // Shared offscreen canvas for text measurement — avoids creating
    // a new canvas per pointermove during drag/resize operations
    const measureCanvas = document.createElement('canvas');
    measureCanvas.width = 1;
    measureCanvas.height = 1;
    const measureCtx = measureCanvas.getContext('2d');

    // Placeholder for bound handlers (set after handler object is created)
    let onPointerDown, onPointerMove, onPointerUp, onGlobalPointerUp, onPointerLeave;

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
            canvas.addEventListener('pointerleave', onPointerLeave);
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
            canvas.removeEventListener('pointerleave', onPointerLeave);
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
            state.titleInteractionPointerType = null;
            lastHoverTarget = null;
            lastPointerType = null;

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
         * Uses the same position computation as TitleRenderer.render() to ensure
         * the clickable area matches the rendered area in all modes:
         * - Legacy mode (no custom position/width): centers text, not box
         * - Custom width only: centers box
         * - Custom position: uses explicit position
         * - Multi-line: uses computed multi-line bounds for Y and height
         * @param {number} cssX - CSS x coordinate
         * @param {number} cssY - CSS y coordinate
         * @param {number} canvasWidth - CSS canvas width
         * @param {number} canvasHeight - CSS canvas height
         * @param {string} [pointerType] - Pointer type ('mouse', 'touch', 'pen') for dynamic edge threshold
         * @returns {{ hit: boolean, target: string | null }}
         * @private
         */
        _hitTestTitle(cssX, cssY, canvasWidth, canvasHeight, pointerType) {
            const runs = titleManager.getRuns();
            if (!runs || runs.length === 0) {
                return { hit: false };
            }

            const bounds = computeMultiLineBounds(state.titleStyle, runs, SIZE_CONSTANTS.defaultCanvasWidth, SIZE_CONSTANTS.defaultCanvasHeight, measureCtx);
            const boxWidth = bounds.boxWidth;

            // Determine if legacy mode (no custom position AND no custom width)
            // Matches TitleRenderer.render() logic exactly
            const isLegacyMode = (state.titleStyle.titleBoxWidth === null || state.titleStyle.titleBoxWidth === undefined)
                && (state.titleStyle.titleBoxX === null || state.titleStyle.titleBoxX === undefined);

            // Compute box X position — matches TitleRenderer.render()
            let effectiveBoxX;
            if (state.titleStyle.titleBoxX !== null && state.titleStyle.titleBoxX !== undefined) {
                effectiveBoxX = state.titleStyle.titleBoxX;
            } else if (state.titleStyle.titleBoxWidth !== null && state.titleStyle.titleBoxWidth !== undefined) {
                effectiveBoxX = (SIZE_CONSTANTS.defaultCanvasWidth - boxWidth) / 2;
            } else {
                // Legacy mode: center text within canvas (not the box)
                const textWidth = bounds.textWidth;
                const alignment = state.titleStyle.alignment || 'center';
                switch (alignment) {
                    case 'left':
                        effectiveBoxX = MARGIN;
                        break;
                    case 'right':
                        effectiveBoxX = SIZE_CONSTANTS.defaultCanvasWidth - MARGIN - textWidth;
                        break;
                    case 'center':
                    default:
                        effectiveBoxX = (SIZE_CONSTANTS.defaultCanvasWidth - textWidth) / 2;
                        break;
                }
            }

            // The hit test area matches the rendered background/outline area.
            // In legacy mode, background is offset by PADDING from text start.
            const bgX = isLegacyMode ? effectiveBoxX - PADDING : effectiveBoxX;

            // Box top uses computeMultiLineBounds.y which accounts for multi-line height
            const boxTop = bounds.y;

            // Convert logical box to CSS coords
            const scaleX = canvasWidth / SIZE_CONSTANTS.defaultCanvasWidth;
            const scaleY = canvasHeight / SIZE_CONSTANTS.defaultCanvasHeight;
            const cssBoxLeft = bgX * scaleX;
            const cssBoxTop = boxTop * scaleY;
            const cssBoxWidth = boxWidth * scaleX;
            const cssBoxHeight = bounds.height * scaleY;

            // Check if point is within the title box
            if (cssX < cssBoxLeft || cssX > cssBoxLeft + cssBoxWidth ||
                cssY < cssBoxTop || cssY > cssBoxTop + cssBoxHeight) {
                return { hit: false };
            }

            // Check edge proximity (in CSS pixels) with dynamic threshold based on pointer type
            const distToLeft = cssX - cssBoxLeft;
            const distToRight = (cssBoxLeft + cssBoxWidth) - cssX;
            const edgeThreshold = pointerType === 'touch' ? EDGE_THRESHOLD_COARSE : EDGE_THRESHOLD_FINE;

            if (distToLeft <= edgeThreshold) {
                return { hit: true, target: 'left-edge' };
            }
            if (distToRight <= edgeThreshold) {
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

            const hit = this._hitTestTitle(coords.x, coords.y, canvasWidth, canvasHeight, e.pointerType);
            if (!hit.hit) return;

            // Capture pointer so events continue if cursor leaves canvas bounds
            if (canvas.setPointerCapture) {
                try {
                    canvas.setPointerCapture(e.pointerId);
                    capturedPointerId = e.pointerId;
                } catch (_) {}
            }

            // Record start state — compute box position matching TitleRenderer.render()
            dragStartCoords = { x: coords.x, y: coords.y };

            // Compute actual rendered bounds (handles auto-fit and multi-line)
            const runs = titleManager.getRuns();
            const bounds = computeMultiLineBounds(state.titleStyle, runs, SIZE_CONSTANTS.defaultCanvasWidth, SIZE_CONSTANTS.defaultCanvasHeight, measureCtx);
            dragStartBoxWidth = bounds.boxWidth;

            // Compute drag start position matching the renderer's box position logic.
            // dragStartBoxX is the background/outline X (bgX in renderer terms) so that
            // setPosition() during drag produces the correct visual result.
            const isLegacyMode = (state.titleStyle.titleBoxWidth === null || state.titleStyle.titleBoxWidth === undefined)
                && (state.titleStyle.titleBoxX === null || state.titleStyle.titleBoxX === undefined);

            let effectiveBoxX;
            if (state.titleStyle.titleBoxX !== null && state.titleStyle.titleBoxX !== undefined) {
                effectiveBoxX = state.titleStyle.titleBoxX;
            } else if (state.titleStyle.titleBoxWidth !== null && state.titleStyle.titleBoxWidth !== undefined) {
                effectiveBoxX = (SIZE_CONSTANTS.defaultCanvasWidth - bounds.boxWidth) / 2;
            } else {
                // Legacy mode: center text within canvas (not the box)
                const textWidth = bounds.textWidth;
                const alignment = state.titleStyle.alignment || 'center';
                switch (alignment) {
                    case 'left':
                        effectiveBoxX = MARGIN;
                        break;
                    case 'right':
                        effectiveBoxX = SIZE_CONSTANTS.defaultCanvasWidth - MARGIN - textWidth;
                        break;
                    case 'center':
                    default:
                        effectiveBoxX = (SIZE_CONSTANTS.defaultCanvasWidth - textWidth) / 2;
                        break;
                }
            }
            // In legacy mode, the background/outline is offset by PADDING from text start
            dragStartBoxX = isLegacyMode ? effectiveBoxX - PADDING : effectiveBoxX;

            dragStartBoxY = state.titleStyle.titleBoxY !== null && state.titleStyle.titleBoxY !== undefined
                ? state.titleStyle.titleBoxY
                : SIZE_CONSTANTS.defaultCanvasHeight - 40;

            // Determine interaction type from hit target
            interactionType = hit.target === 'body' ? 'drag' :
                              hit.target === 'left-edge' ? 'resize-left' :
                              hit.target === 'right-edge' ? 'resize-right' : null;

            // Set interaction mode immediately so PanelSwap's guard sees it
            // and backs off — prevents panel drag starting behind the title
            state.titleHoverTarget = hit.target;
            state.titleInteractionMode = interactionType;
            lastPointerType = e.pointerType;
            state.titleInteractionPointerType = lastPointerType;

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
                    const VISIBLE_MIN = 50; // px of box that must remain visible at edges
                    // Use multi-line box height for Y clamp (handles multi-line titles)
                    const runs = titleManager.getRuns();
                    const bounds = computeMultiLineBounds(state.titleStyle, runs, SIZE_CONSTANTS.defaultCanvasWidth, SIZE_CONSTANTS.defaultCanvasHeight, measureCtx);
                    const boxHeight = bounds.height;
                    newX = Math.max(-actualBoxWidth + VISIBLE_MIN, Math.min(newX, SIZE_CONSTANTS.defaultCanvasWidth - VISIBLE_MIN));
                    newY = Math.max(boxHeight, Math.min(newY, SIZE_CONSTANTS.defaultCanvasHeight - 12));

                    titleManager.setPosition(newX, newY);
                } else if (interactionType === 'resize-right') {
                    // Resize from right: change width, keep X
                    let newWidth = dragStartBoxWidth + dxLogical;
                    // Clamp width — include padding so background never clips text
                    const runs = titleManager.getRuns();
                    const bounds = computeMultiLineBounds(state.titleStyle, runs, SIZE_CONSTANTS.defaultCanvasWidth, SIZE_CONSTANTS.defaultCanvasHeight, measureCtx);
                    const minWidth = Math.max(100, bounds.textWidth + PADDING * 2);
                    const maxWidth = SIZE_CONSTANTS.defaultCanvasWidth - 80;
                    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

                    titleManager.setWidth(newWidth);
                } else if (interactionType === 'resize-left') {
                    // Resize from left: change width AND X
                    let newWidth = dragStartBoxWidth - dxLogical;
                    // Clamp width — include padding so background never clips text
                    const runs = titleManager.getRuns();
                    const bounds = computeMultiLineBounds(state.titleStyle, runs, SIZE_CONSTANTS.defaultCanvasWidth, SIZE_CONSTANTS.defaultCanvasHeight, measureCtx);
                    const minWidth = Math.max(100, bounds.textWidth + PADDING * 2);
                    const maxWidth = SIZE_CONSTANTS.defaultCanvasWidth - 80;
                    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

                    const widthDelta = newWidth - dragStartBoxWidth;
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
            const hit = this._hitTestTitle(coords.x, coords.y, canvasWidth, canvasHeight, e.pointerType);
            if (hit.hit) {
                state.titleHoverTarget = hit.target;
                state.titleInteractionPointerType = e.pointerType;
                canvas.style.cursor = hit.target === 'body' ? 'grab' : 'ew-resize';
            } else {
                state.titleHoverTarget = null;
                state.titleInteractionPointerType = null;
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
         * Handles pointerleave events — clears hover state when pointer
         * exits the canvas so touch handles don't persist.
         * Does NOT clear active drag/resize interaction (pointer capture
         * still delivers events even outside canvas bounds).
         * @param {PointerEvent} e
         * @private
         */
        _onPointerLeave() {
            // Only clear hover state — active interaction uses pointer capture
            // so pointerleave fires but events still arrive via capture
            if (isInteracting) return;

            state.titleHoverTarget = null;
            state.titleInteractionPointerType = null;
            lastHoverTarget = null;

            const canvas = document.getElementById(canvasId);
            if (canvas) {
                canvas.style.cursor = '';
            }

            if (onRenderScheduled) {
                onRenderScheduled();
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
    onPointerLeave = (e) => handler._onPointerLeave(e);
    onGlobalPointerUp = () => {
        // Only clean up if an interaction is in progress (pointerup happened outside canvas)
        if (isInteracting || dragStartCoords) {
            handler._clearInteractionState();
        }
    };

    return handler;
}
