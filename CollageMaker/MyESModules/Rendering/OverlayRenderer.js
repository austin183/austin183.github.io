/**
 * OverlayRenderer - Renders overlay/mask layer on canvas.
 * Applies blend modes and opacity to an overlay image.
 */

/**
 * All valid Canvas 2D globalCompositeOperation values.
 */
export const BLEND_MODES = [
    'source-over',
    'source-in',
    'source-out',
    'source-atop',
    'destination-over',
    'destination-in',
    'destination-out',
    'destination-atop',
    'lighter',
    'copy',
    'xor',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity'
];

/**
 * Renders an overlay image with blend mode and opacity.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} overlayState - Overlay state
 * @param {HTMLImageElement} [overlayState.image] - Overlay image element
 * @param {string} [overlayState.mode] - Blend mode (globalCompositeOperation value)
 * @param {number} [overlayState.opacity] - Opacity (0-1)
 */
export function render(ctx, width, height, overlayState) {
    if (!overlayState || !overlayState.image) return;

    const img = overlayState.image;
    if (!img.complete || img.naturalWidth === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = overlayState.mode || 'multiply';
    ctx.globalAlpha = overlayState.opacity ?? 0.5;
    ctx.drawImage(img, 0, 0, width, height);
    ctx.restore();
}
