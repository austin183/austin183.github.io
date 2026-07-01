/**
 * ImagePanel - Panel data structure.
 * Ported from Swift ImagePanel.swift
 */

let _panelIdCounter = 0;

/**
 * Creates an ImagePanel.
 * @param {Object} options
 * @param {number} options.imageIndex - Index into the images array
 * @param {Object} options.geometry - PanelGeometry (rect or path)
 * @returns {Object} ImagePanel
 */
export function createImagePanel({ imageIndex, geometry }) {
    return {
        id: 'panel_' + (++_panelIdCounter) + '_' + Date.now(),
        imageIndex: imageIndex,
        geometry: geometry
    };
}
