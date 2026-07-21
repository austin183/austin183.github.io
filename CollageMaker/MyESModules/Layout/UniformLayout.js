/**
 * UniformLayout - Simple grid layout strategy.
 * Ported from Swift UniformLayoutStrategy
 */

import { createImagePanel } from '../Models/ImagePanel.js';
import { createRectGeometry } from '../Models/PanelGeometry.js';

/**
 * Generates a uniform grid layout.
 * @param {Object} options
 * @param {number} options.numImages
 * @param {Object} options.canvasSize - { width, height }
 * @param {number} options.gutter
 * @param {number[]} [options.imageOrder]
 * @returns {Array} Array of ImagePanel objects
 */
export function generateUniformLayout({ numImages, canvasSize, gutter, imageOrder }) {
    if (numImages <= 0) return [];

    let columns, rows;

    if (numImages === 1) {
        columns = 1;
        rows = 1;
    } else {
        columns = Math.min(numImages, 3);
        rows = Math.ceil(numImages / columns);
    }

    const totalGutterX = (columns - 1) * gutter;
    const totalGutterY = (rows - 1) * gutter;
    const cellW = (canvasSize.width - totalGutterX) / columns;
    const cellH = (canvasSize.height - totalGutterY) / rows;

    const panels = [];
    for (let i = 0; i < numImages; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = col * (cellW + gutter);
        const y = row * (cellH + gutter);
        const frame = { x, y, width: cellW, height: cellH };
        const imgIdx = imageOrder ? (imageOrder[i] ?? i % numImages) : i;
        panels.push(createImagePanel({
            imageIndex: imgIdx,
            geometry: createRectGeometry(frame)
        }));
    }

    return panels;
}
