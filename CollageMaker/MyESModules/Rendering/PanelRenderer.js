/**
 * PanelRenderer - Per-panel clip + drawImage on Canvas 2D.
 * Maps CoreGraphics CGContext calls to Canvas 2D API.
 * Ported from Swift PanelRenderer.swift
 */

import { geometryBoundingRect, isRectGeometry } from '../Models/PanelGeometry.js';

/**
 * Creates a panel renderer instance.
 * @returns {Object} PanelRenderer
 */
export function createPanelRenderer() {
    return {
        /**
         * Draws all panels onto the canvas context.
         * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
         * @param {Array} panels - Array of ImagePanel objects
         * @param {Array} images - Array of ImageItem objects
         * @param {Map} crops - Map of panelId -> CropInfo { sourceRect, destination }
         * @param {Map} panelAssignments - Map of panelId -> imageIndex
         */
        drawPanels(ctx, panels, images, crops, panelAssignments) {
            for (const panel of panels) {
                const effectiveIndex = panelAssignments.get(panel.id) ?? panel.imageIndex;
                if (effectiveIndex >= images.length) continue;

                const imageItem = images[effectiveIndex];
                if (!imageItem || !imageItem.image) continue;

                const crop = crops.get(panel.id);
                if (!crop) continue;

                const sourceRect = crop.sourceRect;
                const destRect = crop.destination;

                ctx.save();

                // Clip to panel geometry
                this._applyClip(ctx, panel.geometry);

                // Draw the cropped image
                this._drawImage(ctx, imageItem.image, sourceRect, destRect);

                ctx.restore();
            }
        },

        /**
         * Draws a single panel.
         * @param {CanvasRenderingContext2D} ctx
         * @param {Object} panel - ImagePanel
         * @param {Object} imageItem - ImageItem
         * @param {Object} cropInfo - { sourceRect, destination }
         */
        drawSinglePanel(ctx, panel, imageItem, cropInfo) {
            if (!imageItem || !imageItem.image) return;

            const sourceRect = cropInfo.sourceRect;
            const destRect = cropInfo.destination;

            ctx.save();
            this._applyClip(ctx, panel.geometry);
            this._drawImage(ctx, imageItem.image, sourceRect, destRect);
            ctx.restore();
        },

        /**
         * Draws a selected panel highlight border.
         * @param {CanvasRenderingContext2D} ctx
         * @param {Object} panel - ImagePanel
         */
        drawSelectionBorder(ctx, panel) {
            const bounds = geometryBoundingRect(panel.geometry);
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 4;

            if (isRectGeometry(panel.geometry)) {
                ctx.strokeRect(bounds.x + 1.5, bounds.y + 1.5, bounds.width - 3, bounds.height - 3);
            } else {
                this._drawPath(ctx, panel.geometry.points);
                ctx.stroke();
            }

            ctx.restore();
        },

        /**
         * Draws a hover highlight border on a panel.
         * @param {CanvasRenderingContext2D} ctx
         * @param {Object} panel - ImagePanel
         */
        drawHoverBorder(ctx, panel) {
            const bounds = geometryBoundingRect(panel.geometry);
            ctx.save();
            ctx.strokeStyle = 'rgba(100, 160, 255, 0.7)';
            ctx.lineWidth = 2;

            if (isRectGeometry(panel.geometry)) {
                ctx.strokeRect(bounds.x + 1, bounds.y + 1, bounds.width - 2, bounds.height - 2);
            } else {
                this._drawPath(ctx, panel.geometry.points);
                ctx.stroke();
            }

            ctx.restore();
        },

        // Private methods

        _applyClip(ctx, geometry) {
            if (isRectGeometry(geometry)) {
                const rect = geometry.rect;
                ctx.beginPath();
                ctx.rect(rect.x, rect.y, rect.width, rect.height);
                ctx.clip();
            } else {
                this._drawPath(ctx, geometry.points);
                ctx.clip();
            }
        },

        _drawPath(ctx, points) {
            if (!points || points.length === 0) return;
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
        },

        _drawImage(ctx, img, sourceRect, destRect) {
            // Clamp source rect to image bounds
            const clampedX = Math.max(0, sourceRect.x);
            const clampedY = Math.max(0, sourceRect.y);
            const clampedW = Math.min(sourceRect.width, img.naturalWidth - clampedX);
            const clampedH = Math.min(sourceRect.height, img.naturalHeight - clampedY);

            if (clampedW <= 0 || clampedH <= 0) return;

            // Calculate destination offset for clamped crop
            const offsetX = (clampedX - sourceRect.x) / sourceRect.width * destRect.width;
            const offsetY = (clampedY - sourceRect.y) / sourceRect.height * destRect.height;
            const drawW = (clampedW / sourceRect.width) * destRect.width;
            const drawH = (clampedH / sourceRect.height) * destRect.height;

            ctx.drawImage(
                img,
                clampedX, clampedY, clampedW, clampedH,
                destRect.x + offsetX, destRect.y + offsetY, drawW, drawH
            );
        }
    };
}
