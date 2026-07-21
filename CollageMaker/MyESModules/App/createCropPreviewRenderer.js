/**
 * createCropPreviewRenderer — Crop preview rendering extracted from createCollageMethods.
 * Handles the inline canvas rendering for crop previews:
 * DPR scaling, image contain math, dark overlay, border,
 * corner handles, and shaped overlay.
 *
 * Uses DOM ID injection to avoid hardcoded getElementById calls.
 */

import { computeShapeOverlayPoints, drawShapeOverlay, beginPathFromPoints } from '../Layout/CropOverlayShape.js';
import { isRectGeometry } from '../Models/PanelGeometry.js';

/**
 * Default DOM element IDs.
 */
const DEFAULT_DOM_IDS = {
    cropPreviewCanvas: 'cropPreviewCanvas'
};

export function createCropPreviewRenderer(base, domIds = {}) {
    const ids = { ...DEFAULT_DOM_IDS, ...domIds };
    const cropManager = () => base?.getCropManager?.() || null;

    /**
     * Schedules a crop preview canvas render.
     * Debounced via requestAnimationFrame to prevent excessive synchronous
     * canvas operations during rapid crop adjustments (drag handles).
     * @param {Object} vm — Vue instance with reactive state
     */
    function _scheduleCropPreviewRender(vm) {
        if (vm._cropPreviewPending) return;
        vm._cropPreviewPending = true;

        requestAnimationFrame(() => {
            vm._cropPreviewPending = false;

            const cm = cropManager();
            if (!vm.selectedPanelId || !cm) return;

            const crop = cm.getCrop(vm.selectedPanelId);
            const image = cm.getPanelImage(vm.selectedPanelId);
            if (!crop || !image) return;

            const canvas = document.getElementById(ids.cropPreviewCanvas);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Size canvas to fit in the sidebar
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const cssW = rect.width || 200;
            const cssH = rect.height || 150;

            canvas.width = cssW * dpr;
            canvas.height = cssH * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Clear
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, cssW, cssH);

            // Calculate image draw size (contain)
            const imageAspect = image.width / image.height;
            const canvasAspect = cssW / cssH;

            let drawW, drawH, offsetX, offsetY;
            if (imageAspect > canvasAspect) {
                drawW = cssW;
                drawH = cssW / imageAspect;
                offsetX = 0;
                offsetY = (cssH - drawH) / 2;
            } else {
                drawH = cssH;
                drawW = cssH * imageAspect;
                offsetX = (cssW - drawW) / 2;
                offsetY = 0;
            }

            const scale = drawW / image.width;

            // Draw the full image
            ctx.drawImage(image.image, offsetX, offsetY, drawW, drawH);

            // Draw dark overlay outside the crop region
            const sr = crop.sourceRect;
            const cropScreenX = offsetX + sr.x * scale;
            const cropScreenY = offsetY + sr.y * scale;
            const cropScreenW = sr.width * scale;
            const cropScreenH = sr.height * scale;

            // Determine if the selected panel has a non-rectangular shape
            const selectedPanel = vm.panels?.find(p => p.id === vm.selectedPanelId);
            const isShaped = selectedPanel
                && selectedPanel.geometry
                && !isRectGeometry(selectedPanel.geometry);

            if (isShaped) {
                // For shaped panels: draw dark overlay with a shape-shaped hole
                // using an evenodd compound path — canvas rect + shape.
                // This matches how rectangular panels work: the image inside the
                // crop region is never touched by the overlay.
                const cropScreen = {
                    x: cropScreenX, y: cropScreenY,
                    width: cropScreenW, height: cropScreenH
                };
                const shapePoints = computeShapeOverlayPoints(
                    selectedPanel.geometry, cropScreen, 0
                );

                if (shapePoints) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                    ctx.beginPath();
                    // Outer: full canvas (everything dark)
                    ctx.rect(0, 0, cssW, cssH);
                    // Inner: shape (hole — image shows through)
                    beginPathFromPoints(ctx, shapePoints, true);
                    ctx.fill('evenodd');

                    // Draw crop border along shape outline
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    beginPathFromPoints(ctx, shapePoints);
                    ctx.stroke();
                }

                // Draw panel shape overlay (with default padding for visual breathing room)
                const overlayPoints = computeShapeOverlayPoints(
                    selectedPanel.geometry, cropScreen
                );
                if (overlayPoints) {
                    drawShapeOverlay(ctx, overlayPoints);
                }
            } else {
                // For rect panels: existing 4-rect approach (unchanged)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                // Top
                ctx.fillRect(0, 0, cssW, cropScreenY);
                // Bottom
                ctx.fillRect(0, cropScreenY + cropScreenH, cssW, cssH - cropScreenY - cropScreenH);
                // Left
                ctx.fillRect(0, cropScreenY, cropScreenX, cropScreenH);
                // Right
                ctx.fillRect(cropScreenX + cropScreenW, cropScreenY, cssW - cropScreenX - cropScreenW, cropScreenH);

                // Draw crop border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(cropScreenX, cropScreenY, cropScreenW, cropScreenH);
            }

            // Draw corner handles (size matches CORNER_HANDLE_SIZE in CropInteraction.js)
            const handleSize = 12;
            ctx.fillStyle = '#ffffff';
            const corners = [
                [cropScreenX, cropScreenY],
                [cropScreenX + cropScreenW, cropScreenY],
                [cropScreenX, cropScreenY + cropScreenH],
                [cropScreenX + cropScreenW, cropScreenY + cropScreenH]
            ];
            for (const [cx, cy] of corners) {
                ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
            }
        });
    }

    return { _scheduleCropPreviewRender };
}
