/**
 * BackgroundStyle - Background style enum and options.
 * Defines the available background types for the collage canvas.
 */

export const BackgroundStyle = {
    SOLID: 'solid',
    GRADIENT: 'gradient',
    IMAGE: 'image'
};

export const BACKGROUND_STYLE_OPTIONS = [
    { value: BackgroundStyle.SOLID, label: 'Solid' },
    { value: BackgroundStyle.GRADIENT, label: 'Gradient' },
    { value: BackgroundStyle.IMAGE, label: 'Image' }
];

/**
 * Creates a background style configuration.
 * @param {string} type - Background type (solid, gradient, image)
 * @param {Object} [options] - Additional options
 * @param {string} [options.color1] - Primary color (hex)
 * @param {string} [options.color2] - Secondary color for gradient (hex)
 * @param {number} [options.angle] - Gradient angle in degrees
 * @param {HTMLImageElement} [options.image] - Background image element
 * @param {number} [options.opacity] - Image opacity (0-1)
 * @returns {Object} Background style configuration
 */
export function createBackgroundStyle(type, options = {}) {
    return {
        type,
        color1: options.color1 || '#000000',
        color2: options.color2 || '#333333',
        angle: options.angle ?? 90,
        image: options.image || null,
        opacity: options.opacity ?? 1.0
    };
}
