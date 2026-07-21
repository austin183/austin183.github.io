/**
 * SaliencyDebugOverlay - Visual debug overlay for saliency analysis.
 * Renders focal point (green circle), geometric center (red dot),
 * shift vector (dashed green line), and crop rectangle outline.
 * Pure coordinate functions for testability, canvas rendering for display.
 * Deferred feature — only useful when ML saliency is enabled.
 *
 * Integration notes (for when ML saliency is wired up):
 * - focusPoints is keyed by image index. Clear or rebuild the Map when
 *   images are added, removed, or reordered to avoid stale markers.
 * - CollageState.focusPoints is a plain Map (not Vue-reactive). When
 *   integrating with Vue, assign a new Map instance to trigger reactivity.
 * - The render function guards against missing images/crops/NaN coords,
 *   so stale Map entries are safely skipped rather than causing errors.
 */

// ============================================================
// Constants
// ============================================================

/**
 * Visual style constants for debug overlay elements.
 * All values are in screen pixels (DPR-aware sizing applied at render time).
 */
export const DEBUG_OVERLAY_STYLES = {
    FOCAL_POINT: { color: '#00FF00', radius: 6, lineWidth: 2 },
    CENTER_DOT: { color: '#FF0000', radius: 4, lineWidth: 1 },
    SHIFT_VECTOR: { color: '#00FF00', lineWidth: 1, dashPattern: [4, 4] },
    CROP_RECT: { color: '#FFFF00', lineWidth: 1 },
    LABEL_FONT: '10px monospace',
    LABEL_OFFSET_X: 8,
    LABEL_OFFSET_Y: -8,
};

// ============================================================
// Pure Functions (testable without browser/canvas)
// ============================================================

/**
 * Validates that a focus point has finite numeric coordinates in [0, 1].
 * @param {Object} focusPoint - { x, y }
 * @returns {boolean} True if valid
 */
export function validateFocusPoint(focusPoint) {
    if (!focusPoint || typeof focusPoint !== 'object') return false;
    if (typeof focusPoint.x !== 'number' || typeof focusPoint.y !== 'number') return false;
    if (!isFinite(focusPoint.x) || !isFinite(focusPoint.y)) return false;
    return focusPoint.x >= 0 && focusPoint.x <= 1 && focusPoint.y >= 0 && focusPoint.y <= 1;
}

/**
 * Converts a normalized focus point to canvas pixel coordinates.
 * The focus point is relative to the full source image (0 = top/left, 1 = bottom/right).
 * The crop defines which region of the image is displayed and where on the canvas.
 *
 * @param {Object} focusPoint - { x, y } normalized to [0, 1] relative to source image
 * @param {Object} imageSize - { width, height } of the source image
 * @param {Object} crop - { sourceRect: { x, y, width, height }, destination: { x, y, width, height } }
 * @returns {{ x: number, y: number }} Canvas pixel coordinates
 */
export function focusPointToCanvasCoords(focusPoint, imageSize, crop) {
    const absX = focusPoint.x * imageSize.width;
    const absY = focusPoint.y * imageSize.height;

    const src = crop.sourceRect;
    const dst = crop.destination;

    const relX = ((absX - src.x) / src.width) * dst.width + dst.x;
    const relY = ((absY - src.y) / src.height) * dst.height + dst.y;

    return { x: relX, y: relY };
}

/**
 * Computes the canvas position of the image's geometric center.
 * Convenience wrapper for focusPointToCanvasCoords({ x: 0.5, y: 0.5 }, ...).
 *
 * @param {Object} imageSize - { width, height } of the source image
 * @param {Object} crop - { sourceRect, destination }
 * @returns {{ x: number, y: number }} Canvas pixel coordinates
 */
export function imageCenterToCanvasCoords(imageSize, crop) {
    return focusPointToCanvasCoords({ x: 0.5, y: 0.5 }, imageSize, crop);
}

/**
 * Assembles debug marker data for a single panel.
 * Returns an array of marker objects with type, position, and style info.
 *
 * @param {Object} panel - ImagePanel with geometry
 * @param {Object} imageItem - ImageItem with width/height
 * @param {Object} crop - { sourceRect, destination }
 * @param {Object} [focusPoint] - { x, y } normalized focus point (optional)
 * @returns {Array} Array of { type, x, y, ...style } marker objects
 */
export function computeDebugMarkers(panel, imageItem, crop, focusPoint) {
    // Guard: no crop or no image → no markers
    if (!crop || !imageItem) return [];

    const imageSize = { width: imageItem.width, height: imageItem.height };
    const center = imageCenterToCanvasCoords(imageSize, crop);

    const markers = [
        {
            type: 'center',
            x: center.x,
            y: center.y,
            color: DEBUG_OVERLAY_STYLES.CENTER_DOT.color,
            radius: DEBUG_OVERLAY_STYLES.CENTER_DOT.radius,
            lineWidth: DEBUG_OVERLAY_STYLES.CENTER_DOT.lineWidth
        }
    ];

    // Add focal point marker if focus point is valid
    if (validateFocusPoint(focusPoint)) {
        const focal = focusPointToCanvasCoords(focusPoint, imageSize, crop);
        markers.push({
            type: 'focal',
            x: focal.x,
            y: focal.y,
            color: DEBUG_OVERLAY_STYLES.FOCAL_POINT.color,
            radius: DEBUG_OVERLAY_STYLES.FOCAL_POINT.radius,
            lineWidth: DEBUG_OVERLAY_STYLES.FOCAL_POINT.lineWidth,
            centerX: center.x,
            centerY: center.y
        });
    }

    return markers;
}

// ============================================================
// Canvas Rendering
// ============================================================

/**
 * Renders the debug overlay on the canvas context.
 * Draws focal points, center dots, shift vectors, and crop rectangles.
 * Renders outside panel clip paths (no clipping applied).
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 * @param {Array} panels - Array of ImagePanel objects
 * @param {Array} images - Array of ImageItem objects
 * @param {Map} crops - Map of panelId -> CropInfo { sourceRect, destination }
 * @param {Map} panelAssignments - Map of panelId -> imageIndex
 * @param {Map} [focusPoints] - Map of imageIndex -> focusPoint { x, y } (optional)
 * @param {Object} canvasSize - { width, height }
 * @param {number} [dpr] - Device pixel ratio (default: window.devicePixelRatio || 1)
 */
export function render(ctx, panels, images, crops, panelAssignments, focusPoints, canvasSize, dpr) {
    if (!ctx) return;
    if (!panels || !images || !crops || !panelAssignments) return;

    dpr = dpr || (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;

    ctx.save();
    ctx.globalAlpha = 0.85;

    for (const panel of panels) {
        const effectiveIndex = panelAssignments.get(panel.id) ?? panel.imageIndex;
        if (effectiveIndex >= images.length) continue;

        const imageItem = images[effectiveIndex];
        if (!imageItem) continue;

        const crop = crops.get(panel.id);
        if (!crop) continue;

        const imageSize = { width: imageItem.width, height: imageItem.height };

        // Guard: skip panels with zero-size images or crops
        if (imageSize.width <= 0 || imageSize.height <= 0) continue;
        if (crop.sourceRect.width <= 0 || crop.sourceRect.height <= 0) continue;
        if (crop.destination.width <= 0 || crop.destination.height <= 0) continue;

        // Guard: skip if crop coords are NaN/Infinity
        if (!isFinite(crop.sourceRect.x) || !isFinite(crop.destination.x)) continue;

        const dst = crop.destination;

        // 1. Crop rectangle outline
        ctx.strokeStyle = DEBUG_OVERLAY_STYLES.CROP_RECT.color;
        ctx.lineWidth = DEBUG_OVERLAY_STYLES.CROP_RECT.lineWidth / dpr;
        ctx.strokeRect(dst.x, dst.y, dst.width, dst.height);

        // 2. Compute center
        const center = imageCenterToCanvasCoords(imageSize, crop);

        // 3. Get focus point (if available)
        let focusPoint = null;
        if (focusPoints) {
            focusPoint = focusPoints.get(effectiveIndex) ?? null;
        }

        const isValidFocus = validateFocusPoint(focusPoint);

        // 4. Draw center dot (always)
        drawMarker(ctx, center.x, center.y, DEBUG_OVERLAY_STYLES.CENTER_DOT, dpr);

        // 5. Draw focal point (if valid)
        if (isValidFocus) {
            const focal = focusPointToCanvasCoords(focusPoint, imageSize, crop);
            drawMarker(ctx, focal.x, focal.y, DEBUG_OVERLAY_STYLES.FOCAL_POINT, dpr);

            // 6. Draw shift vector line (if focus differs from center)
            const dx = focal.x - center.x;
            const dy = focal.y - center.y;
            if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                drawShiftVector(ctx, center.x, center.y, focal.x, focal.y, dpr);
            }
        }
    }

    ctx.restore();
}

/**
 * Draws a circular marker (filled circle with stroke outline).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Canvas x coordinate
 * @param {number} y - Canvas y coordinate
 * @param {Object} style - { color, radius, lineWidth }
 * @param {number} dpr - Device pixel ratio
 */
function drawMarker(ctx, x, y, style, dpr) {
    const radius = style.radius / dpr;
    const lineWidth = style.lineWidth / dpr;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = style.color;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = style.color;
    ctx.stroke();
}

/**
 * Draws a dashed line connecting two points (shift vector).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1 - Start x
 * @param {number} y1 - Start y
 * @param {number} x2 - End x
 * @param {number} y2 - End y
 * @param {number} dpr - Device pixel ratio
 */
function drawShiftVector(ctx, x1, y1, x2, y2, dpr) {
    ctx.save();
    ctx.strokeStyle = DEBUG_OVERLAY_STYLES.SHIFT_VECTOR.color;
    ctx.lineWidth = DEBUG_OVERLAY_STYLES.SHIFT_VECTOR.lineWidth / dpr;
    ctx.setLineDash(DEBUG_OVERLAY_STYLES.SHIFT_VECTOR.dashPattern.map(d => d / dpr));
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

// ============================================================
// Factory for Assembler Integration
// ============================================================

/**
 * Creates a debug overlay instance compatible with CollageAssembler's pipeline.
 * @returns {Object} DebugOverlay with render method
 */
export function createDebugOverlay() {
    return {
        /**
         * Renders the debug overlay. Compatible with assembler render options.
         * @param {CanvasRenderingContext2D} ctx
         * @param {Object} options - Assembler-compatible render options
         */
        render(ctx, options) {
            render(
                ctx,
                options.panels,
                options.images,
                options.crops,
                options.panelAssignments,
                options.focusPoints,
                options.canvasSize,
                options.dpr
            );
        }
    };
}
