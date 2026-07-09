/**
 * GestureHandler - Canvas click/tap hit testing for panel selection.
 * Converts screen coordinates to canvas coordinates and determines
 * which panel (if any) was clicked.
 * Ported from Swift gesture handling in Views/
 */

import { isRectGeometry } from '../Models/PanelGeometry.js';
import { LayoutStyle } from '../Models/LayoutStyle.js';

/**
 * Creates a gesture handler for the main preview canvas.
 * @param {Object} options
 * @param {string} options.canvasId - DOM ID of the canvas element
 * @param {Object} options.state - The reactive CollageState
 * @param {Function} options.onPanelSelected - Called with panelId (or null) when a panel is selected
 * @param {Function} options.onHoverChanged - Called with panelId (or null) when hover target changes
 * @param {Function} options.onRenderScheduled - Call to trigger a canvas re-render
 * @returns {Object} GestureHandler
 */
export function createGestureHandler({ canvasId, state, onPanelSelected, onHoverChanged, onRenderScheduled }) {
    let handlerAttached = false;
    let lastHoveredPanelId = null;

    // Placeholder for bound handlers (set after handler object is created)
    let onPointerDown, onPointerMove, onPointerLeave;

    const handler = {
        /**
         * Attaches pointer event listeners to the canvas.
         */
        attach() {
            if (handlerAttached) return;
            handlerAttached = true;

            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            canvas.addEventListener('pointerdown', onPointerDown);
            canvas.addEventListener('pointermove', onPointerMove);
            canvas.addEventListener('pointerleave', onPointerLeave);
        },

        /**
         * Removes all event listeners.
         */
        detach() {
            if (!handlerAttached) return;
            handlerAttached = false;

            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerleave', onPointerLeave);
        },

        /**
         * Converts a DOM event to canvas coordinates (in the canvas's logical space,
         * accounting for CSS scaling).
         * @param {PointerEvent} e
         * @returns {{ x: number, y: number }|null}
         */
        screenToCanvas(e) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return null;

            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        },

        /**
         * Finds the panel at a given canvas coordinate.
         * The coordinate should be in the canvas's CSS pixel space (not scaled).
         * @param {number} x - X in canvas CSS pixels
         * @param {number} y - Y in canvas CSS pixels
         * @param {number} canvasWidth - The canvas CSS width in pixels
         * @param {number} canvasHeight - The canvas CSS height in pixels
         * @returns {string|null} Panel ID or null
         */
        hitTestPanel(x, y, canvasWidth, canvasHeight) {
            // Convert CSS pixels to logical canvas coordinates (1920x1080)
            const scaleX = 1920 / canvasWidth;
            const scaleY = 1080 / canvasHeight;
            // Use the smaller scale to maintain aspect ratio (letterbox)
            const scale = Math.min(scaleX, scaleY);

            const logicalX = x * scaleX;
            const logicalY = y * scaleY;

            // Iterate panels in reverse order (top-most first)
            for (let i = state.panels.length - 1; i >= 0; i--) {
                const panel = state.panels[i];
                if (this._pointInPanel(logicalX, logicalY, panel.geometry)) {
                    return panel.id;
                }
            }
            return null;
        },

        /**
         * Tests if a point is inside a panel geometry.
         * @param {number} x
         * @param {number} y
         * @param {Object} geometry - PanelGeometry
         * @returns {boolean}
         */
        _pointInPanel(x, y, geometry) {
            if (isRectGeometry(geometry)) {
                const r = geometry.rect;
                return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
            }

            // Point-in-polygon test (even-odd fill rule)
            return this._pointInPolygon(x, y, geometry.points);
        },

        _pointInPolygon(x, y, points) {
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

        // Private event handlers
        _onPointerDown(e) {
            // Skip pointerdown for hexagonal layout — HexDragHandler handles it
            if (state.layoutStyle === LayoutStyle.HEXAGONAL) return;

            const coords = this.screenToCanvas(e);
            if (!coords) return;

            const canvas = document.getElementById(canvasId);
            const canvasWidth = canvas.getBoundingClientRect().width;
            const canvasHeight = canvas.getBoundingClientRect().height;

            const panelId = this.hitTestPanel(coords.x, coords.y, canvasWidth, canvasHeight);
            onPanelSelected(panelId);
            onRenderScheduled();
        },

        _onPointerMove(e) {
            const coords = this.screenToCanvas(e);
            if (!coords) return;

            const canvas = document.getElementById(canvasId);
            const canvasWidth = canvas.getBoundingClientRect().width;
            const canvasHeight = canvas.getBoundingClientRect().height;

            const panelId = this.hitTestPanel(coords.x, coords.y, canvasWidth, canvasHeight);

            // Only fire callback if hover target changed
            if (panelId !== lastHoveredPanelId) {
                lastHoveredPanelId = panelId;
                if (onHoverChanged) onHoverChanged(panelId);
                onRenderScheduled();
            }
        },

        _onPointerLeave() {
            if (lastHoveredPanelId !== null) {
                lastHoveredPanelId = null;
                if (onHoverChanged) onHoverChanged(null);
                onRenderScheduled();
            }
        }
    };

    // Bind event handlers now that handler object exists
    onPointerDown = (e) => handler._onPointerDown(e);
    onPointerMove = (e) => handler._onPointerMove(e);
    onPointerLeave = () => handler._onPointerLeave();

    return handler;
}
