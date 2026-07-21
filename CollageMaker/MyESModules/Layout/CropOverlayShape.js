/**
 * CropOverlayShape — Pure math for computing shaped crop preview overlays.
 * Given a panel geometry and crop preview dimensions, computes the screen-space
 * polygon points for drawing a shape overlay on the crop preview canvas.
 */

import { isRectGeometry } from '../Models/PanelGeometry.js';

/**
 * Computes the screen-space polygon for a shaped crop preview overlay.
 * The shape is centered and scaled to fit within the crop screen region,
 * maintaining the panel's aspect ratio.
 *
 * @param {Object} geometry - PanelGeometry (rect or path)
 * @param {Object} cropScreen - Screen coords of crop region: { x, y, width, height }
 * @param {number} padding - Inner padding in CSS pixels (default 8)
 * @returns {Array|null} Array of [x, y] points, or null for rect geometry
 */
export function computeShapeOverlayPoints(geometry, cropScreen, padding = 8) {
    if (isRectGeometry(geometry)) {
        return null;
    }

    const points = geometry.points;
    const br = geometry.boundingRect;

    // Available area for the shape (crop region minus padding)
    const availW = cropScreen.width - padding * 2;
    const availH = cropScreen.height - padding * 2;
    if (availW <= 0 || availH <= 0) return null;

    // Scale to fit within available area, maintaining aspect ratio
    const shapeAspect = br.width / br.height;
    const availAspect = availW / availH;

    let drawW, drawH;
    if (shapeAspect > availAspect) {
        drawW = availW;
        drawH = availW / shapeAspect;
    } else {
        drawH = availH;
        drawW = availH * shapeAspect;
    }

    // Center the shape within the crop region
    const offsetX = cropScreen.x + padding + (availW - drawW) / 2;
    const offsetY = cropScreen.y + padding + (availH - drawH) / 2;

    const scaleX = drawW / br.width;
    const scaleY = drawH / br.height;

    return points.map(([px, py]) => [
        offsetX + (px - br.x) * scaleX,
        offsetY + (py - br.y) * scaleY
    ]);
}

/**
 * Draws a shaped overlay on the given canvas context.
 * Draws a semi-transparent fill and a stroke outline of the shape.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Array} points - Array of [x, y] screen-space points
 */
export function drawShapeOverlay(ctx, points) {
    if (!points || points.length < 3) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();

    // Transparent fill — the image is fully visible inside the crop shape
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fill();

    // Thin solid stroke — defines the shape boundary without obfuscating the image
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.restore();
}

/**
 * Begins a path from an array of [x, y] points.
 * Useful for drawing or clipping shaped overlays without duplicating
 * the beginPath/moveTo/lineTo/closePath sequence.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} points - Array of [x, y] points
 * @param {boolean} continuePath - If true, skips beginPath() so the
 *        sub-path can be appended to an existing compound path (e.g.,
 *        for evenodd fill with a canvas rect + shape hole).
 */
export function beginPathFromPoints(ctx, points, continuePath = false) {
    if (!points || points.length < 3) return;
    if (!continuePath) {
        ctx.beginPath();
    }
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
}
