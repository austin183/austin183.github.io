/**
 * CollageAssembler - Composites all layers on canvas.
 * Pipeline: clear -> background -> panels -> overlay -> title
 * Ported from Swift CollageAssembler.swift
 */

import { createPanelRenderer } from './PanelRenderer.js';
import { render as renderBackground } from './BackgroundRenderer.js';
import { render as renderOverlay } from './OverlayRenderer.js';
import { render as renderTitle } from './TitleRenderer.js';
import { geometryBoundingRect } from '../Models/PanelGeometry.js';
import { sourceRect as fitSourceRect } from '../Layout/FitMath.js';

/**
 * Creates a collage assembler instance.
 * @returns {Object} CollageAssembler
 */
export function createCollageAssembler() {
    const panelRenderer = createPanelRenderer();

    return {
        /**
         * Renders the full collage onto the canvas context.
         * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
         * @param {Object} options
         * @param {Array} options.panels - Array of ImagePanel objects
         * @param {Array} options.images - Array of ImageItem objects
         * @param {Map} options.crops - Map of panelId -> CropInfo
         * @param {Map} options.panelAssignments - Map of panelId -> imageIndex
         * @param {Object} options.backgroundColor - { r, g, b } or hex string
         * @param {Object} options.canvasSize - { width, height }
         * @param {string} [options.selectedPanelId] - Panel ID to highlight
         * @param {string} [options.hoveredPanelId] - Panel ID to show hover border
         * @param {Object} [options.backgroundState] - Background state for BackgroundRenderer
         * @param {Object} [options.overlayState] - Overlay state for OverlayRenderer
         * @param {Object} [options.titleStyle] - Title style for TitleRenderer
         * @param {Array} [options.titleRuns] - Title runs for TitleRenderer
         */
        render(ctx, { panels, images, crops, panelAssignments, backgroundColor, canvasSize, selectedPanelId, hoveredPanelId, backgroundState, overlayState, titleStyle, titleRuns }) {
            const w = canvasSize.width;
            const h = canvasSize.height;

            // 1. Clear
            ctx.clearRect(0, 0, w, h);

            // 2. Background (use BackgroundRenderer if backgroundState provided, else legacy fallback)
            if (backgroundState) {
                renderBackground(ctx, w, h, backgroundState);
            } else {
                this._drawBackground(ctx, canvasSize, backgroundColor);
            }

            // 3. Panels
            panelRenderer.drawPanels(ctx, panels, images, crops, panelAssignments);

            // 4. Hover highlight (drawn before selection so selection is on top)
            if (hoveredPanelId && panels && hoveredPanelId !== selectedPanelId) {
                const hoveredPanel = panels.find(p => p.id === hoveredPanelId);
                if (hoveredPanel) {
                    panelRenderer.drawHoverBorder(ctx, hoveredPanel);
                }
            }

            // 5. Selection highlight
            if (selectedPanelId && panels) {
                const selectedPanel = panels.find(p => p.id === selectedPanelId);
                if (selectedPanel) {
                    panelRenderer.drawSelectionBorder(ctx, selectedPanel);
                }
            }

            // 6. Overlay
            if (overlayState) {
                renderOverlay(ctx, w, h, overlayState);
            }

            // 7. Title
            if (titleStyle && titleRuns) {
                renderTitle(ctx, w, h, titleStyle, titleRuns);
            }
        },

        /**
         * Computes default crops for all panels using center-weighted heuristic.
         * @param {Array} panels - Array of ImagePanel objects
         * @param {Array} images - Array of ImageItem objects
         * @param {Map} panelAssignments - Map of panelId -> imageIndex
         * @returns {Map} Map of panelId -> CropInfo
         */
        computeDefaultCrops(panels, images, panelAssignments) {
            const crops = new Map();

            for (const panel of panels) {
                const effectiveIndex = panelAssignments.get(panel.id) ?? panel.imageIndex;
                if (effectiveIndex >= images.length) continue;

                const imageItem = images[effectiveIndex];
                if (!imageItem) continue;

                const panelSize = geometryBoundingRect(panel.geometry);
                const imageSize = { width: imageItem.width, height: imageItem.height };

                const sourceRect = fitSourceRect(imageSize, panelSize);
                const destination = {
                    x: panelSize.x,
                    y: panelSize.y,
                    width: panelSize.width,
                    height: panelSize.height
                };

                crops.set(panel.id, {
                    sourceRect,
                    destination
                });
            }

            return crops;
        },

        _drawBackground(ctx, canvasSize, color) {
            if (typeof color === 'string') {
                ctx.fillStyle = color;
            } else if (color && color.r !== undefined) {
                ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            } else {
                ctx.fillStyle = '#ffffff';
            }
            ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
        }
    };
}
