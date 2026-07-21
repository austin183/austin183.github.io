/**
 * BackgroundRenderer - Renders background layers on canvas.
 * Supports solid color, linear gradient, and image backgrounds.
 */

/**
 * Renders the background onto the canvas context.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} bgState - Background state
 * @param {string} bgState.type - 'solid', 'gradient', or 'image'
 * @param {string} [bgState.color1] - Primary color (hex)
 * @param {string} [bgState.color2] - Secondary color for gradient (hex)
 * @param {number} [bgState.angle] - Gradient angle in degrees
 * @param {HTMLImageElement} [bgState.image] - Background image element
 * @param {number} [bgState.opacity] - Image opacity (0-1)
 */
export function render(ctx, width, height, bgState) {
    if (!bgState || !bgState.type) return;

    switch (bgState.type) {
        case 'solid':
            renderSolid(ctx, width, height, bgState);
            break;
        case 'gradient':
            renderGradient(ctx, width, height, bgState);
            break;
        case 'image':
            renderImage(ctx, width, height, bgState);
            break;
        default:
            // Fallback to white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
    }
}

/**
 * Renders a solid color background.
 * @private
 */
function renderSolid(ctx, width, height, state) {
    ctx.fillStyle = state.color1 || '#000000';
    ctx.fillRect(0, 0, width, height);
}

/**
 * Renders a linear gradient background.
 * Calculates start/end points using the angle (degrees).
 * @private
 */
function renderGradient(ctx, width, height, state) {
    const angleRad = (state.angle || 0) * (Math.PI / 180);

    // Calculate gradient endpoints from center
    const centerX = width / 2;
    const centerY = height / 2;
    const halfDiag = Math.sqrt(width * width + height * height) / 2;

    const x1 = centerX - Math.cos(angleRad) * halfDiag;
    const y1 = centerY - Math.sin(angleRad) * halfDiag;
    const x2 = centerX + Math.cos(angleRad) * halfDiag;
    const y2 = centerY + Math.sin(angleRad) * halfDiag;

    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, state.color1 || '#000000');
    gradient.addColorStop(1, state.color2 || '#333333');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

/**
 * Renders an image background stretched to fill the canvas.
 * Pre-fills the canvas with the configured background color or gradient
 * so that transparent/semi-transparent areas of the image show the
 * background instead of white canvas.
 * @private
 */
function renderImage(ctx, width, height, state) {
    // Step 1: Fill background (color or gradient) so it shows through
    // transparent areas of the image
    if (state.color2 && state.angle !== undefined) {
        // Gradient background behind image
        renderGradient(ctx, width, height, state);
    } else {
        // Solid color background behind image
        ctx.fillStyle = state.color1 || '#000000';
        ctx.fillRect(0, 0, width, height);
    }

    // Step 2: Draw image with opacity on top
    if (!state.image) {
        // No image provided — background fill is sufficient
        return;
    }

    ctx.save();
    ctx.globalAlpha = state.opacity ?? 1.0;
    ctx.drawImage(state.image, 0, 0, width, height);
    ctx.restore();
}
