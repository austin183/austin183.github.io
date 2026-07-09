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

    // Semi-transparent fill to indicate shape boundary
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();

    // Stroke outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();

    ctx.restore();
}
