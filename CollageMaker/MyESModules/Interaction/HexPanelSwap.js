/**
 * HexPanelSwap — Pure function for swapping image assignments between hex panels.
 * Used by the hex drag-and-drop handler to reassign images between hex cells.
 */

import { LayoutStyle } from '../Models/LayoutStyle.js';

/**
 * Swaps image assignments between two panels in the reactive state.
 * Updates both the panels array (imageIndex) and the panelAssignments Map.
 *
 * @param {Object} state - Vue reactive state with panels, panelAssignments
 * @param {string} sourceId - Panel ID of the source (dragged from)
 * @param {string} targetId - Panel ID of the target (dropped on)
 * @returns {boolean} True if swap occurred, false if IDs are the same or not found
 */
export function swapPanelAssignments(state, sourceId, targetId) {
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

    return true;
}

/**
 * Creates a hex panel drag-and-drop handler for the main preview canvas.
 * When the layout is hexagonal, dragging from one hex panel to another
 * swaps their image assignments.
 *
 * @param {Object} options
 * @param {string} options.canvasId - DOM ID of the canvas element
 * @param {Object} options.state - The reactive CollageState
 * @param {Function} options.onPanelSelected - Called with panelId when a panel is selected
 * @param {Function} options.onRenderScheduled - Call to trigger a canvas re-render
 * @param {Function} options.onSwapPerformed - Called after a successful swap for undo tracking
 * @param {Function} [options.onTargetHovered] - Called with target panelId (or null) during drag
 * @param {Function} [options.onDragStart] - Called when drag begins (for cursor feedback)
 * @param {Function} [options.onDragEnd] - Called when drag ends (for cursor feedback)
 * @returns {Object} HexDragHandler
 */
export function createHexDragHandler({ canvasId, state, onPanelSelected, onRenderScheduled, onSwapPerformed, onTargetHovered, onDragStart, onDragEnd }) {
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
            if (canvas) canvas.style.cursor = '';
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
            // Only handle hexagonal layout
            if (state.layoutStyle !== LayoutStyle.HEXAGONAL) return;

            const coords = this._screenToCanvas(e);
            if (!coords) return;

            const canvas = document.getElementById(canvasId);
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

                        swapPanelAssignments(state, dragSourceId, targetId);

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
