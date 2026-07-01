/**
 * BrowserUtils - Feature detection utilities.
 * Adapted from Midiestro BrowserUtils.js
 */

export function getBrowserUtils() {
    return {
        isFileAPISupported: () =>
            !!(window.File && window.FileReader && window.FileReader.prototype.readAsDataURL)
    };
}
