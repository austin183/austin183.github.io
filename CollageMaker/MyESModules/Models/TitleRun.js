/**
 * TitleRun - Formatted text segment for rich text titles.
 * Each run represents a contiguous stretch of text with identical formatting.
 */

/**
 * Creates a title run (formatted text segment).
 * @param {string} text - The text content
 * @param {boolean} [bold] - Whether text is bold
 * @param {boolean} [italic] - Whether text is italic
 * @param {boolean} [underline] - Whether text is underlined
 * @returns {Object} Title run
 */
export function createTitleRun(text, bold = false, italic = false, underline = false) {
    return {
        text: String(text),
        bold: !!bold,
        italic: !!italic,
        underline: !!underline
    };
}

/**
 * Clones a title run.
 * @param {Object} run - The title run to clone
 * @returns {Object} A new title run with the same properties
 */
export function cloneTitleRun(run) {
    return createTitleRun(run.text, run.bold, run.italic, run.underline);
}

/**
 * Checks if two runs have identical formatting (ignoring text content).
 * @param {Object} a - First run
 * @param {Object} b - Second run
 * @returns {boolean} True if formatting matches
 */
export function runsHaveSameFormatting(a, b) {
    return a.bold === b.bold && a.italic === b.italic && a.underline === b.underline;
}
