/**
 * CanvasRenderer - Canvas 2D lifecycle management.
 * Follows ThreeJSRenderer lifecycle pattern: init/resize/render/dispose
 * Ported concept from Swift rendering pipeline
 */

import { SIZE_CONSTANTS } from '../Models/SizeConstants.js';

/**
 * Creates a canvas renderer instance.
 * @param {string} canvasId - The DOM ID of the canvas element
 * @returns {Object} CanvasRenderer instance
 */
export function createCanvasRenderer(canvasId) {
    let canvas = null;
    let ctx = null;
    let renderPending = false;
    let rafId = null;
    let pendingDrawFn = null;

    return {
        /**
         * Initialize the canvas renderer.
         * @param {Object} options
         * @param {number} [options.width] - Canvas width (default: preview width)
         * @param {number} [options.height] - Canvas height (default: preview height)
         */
        init({ width = SIZE_CONSTANTS.defaultPreviewWidth, height = SIZE_CONSTANTS.defaultPreviewHeight } = {}) {
            canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.error('CanvasRenderer: Canvas element not found:', canvasId);
                return false;
            }

            ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('CanvasRenderer: Failed to get 2D context');
                return false;
            }

            this.resize(width, height);
            return true;
        },

        /**
         * Resize the canvas.
         * @param {number} width
         * @param {number} height
         */
        resize(width, height) {
            if (!canvas) return;
            width = width || SIZE_CONSTANTS.defaultPreviewWidth;
            height = height || SIZE_CONSTANTS.defaultPreviewHeight;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';

            if (ctx) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
        },

        /**
         * Schedule a render (debounced via requestAnimationFrame).
         * Only the last scheduled drawFn within a single frame will execute.
         * @param {Function} [drawFn] - function(ctx, width, height) to draw content
         */
        scheduleRender(drawFn) {
            if (drawFn) {
                pendingDrawFn = drawFn;
            }

            if (renderPending) return;
            renderPending = true;

            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(() => {
                renderPending = false;
                rafId = null;
                const drawFnToUse = pendingDrawFn;
                pendingDrawFn = null;
                this.render(drawFnToUse);
            });
        },

        /**
         * Execute the render immediately.
         * @param {Function} [drawFn] - Optional function(ctx, width, height) to draw content
         */
        render(drawFn) {
            if (!ctx || !canvas) return;

            const width = canvas.width / (window.devicePixelRatio || 1);
            const height = canvas.height / (window.devicePixelRatio || 1);

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Fill white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // Execute custom draw function
            if (drawFn && typeof drawFn === 'function') {
                drawFn(ctx, width, height);
            }
        },

        /**
         * Clear any pending renders and cancel animation frame.
         */
        cancelPending() {
            renderPending = false;
            pendingDrawFn = null;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        },

        /**
         * Dispose of resources.
         */
        dispose() {
            this.cancelPending();
            canvas = null;
            ctx = null;
        },

        /**
         * Get the canvas element.
         * @returns {HTMLCanvasElement|null}
         */
        getCanvas() {
            return canvas;
        },

        /**
         * Get the rendering context.
         * @returns {CanvasRenderingContext2D|null}
         */
        getContext() {
            return ctx;
        }
    };
}
