/**
 * TitleStyle - Configuration for title appearance.
 * Defines font, color, alignment, and background settings for the collage title.
 */

/**
 * Creates a title style configuration.
 * @param {Object} [options] - Title style options
 * @param {string} [options.fontFamily] - Font family name
 * @param {number} [options.fontSize] - Font size in points
 * @param {string} [options.fontColor] - Font color (hex)
 * @param {string} [options.backgroundColor] - Background color (hex)
 * @param {string} [options.alignment] - Text alignment (left, center, right)
 * @param {boolean} [options.showBackground] - Whether to show background rect
 * @returns {Object} Title style configuration
 */
export function createTitleStyle(options = {}) {
    return {
        fontFamily: options.fontFamily || 'Arial',
        fontSize: options.fontSize ?? 36,
        fontColor: options.fontColor || '#FFFFFF',
        backgroundColor: options.backgroundColor || '#000000',
        alignment: options.alignment || 'center',
        showBackground: options.showBackground ?? false
    };
}

/**
 * Web-safe font options for the title font family selector.
 */
export const TITLE_FONT_OPTIONS = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Verdana',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS',
    'Palatino',
    'Lucida Console',
    'Garamond',
    'Bookman'
];
