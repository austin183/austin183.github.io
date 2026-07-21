/**
 * HeroLayout - Hero image on left, grid of remaining images on right.
 * Ported from Swift HeroLayoutStrategy
 */

import { createImagePanel } from '../Models/ImagePanel.js';
import { createRectGeometry } from '../Models/PanelGeometry.js';
import { generateUniformLayout } from './UniformLayout.js';

/**
 * Generates a hero layout.
 * @param {Object} options
 * @param {number} options.numImages
 * @param {Object} options.canvasSize - { width, height }
 * @param {number} options.gutter
 * @param {number[]} [options.imageOrder]
 * @returns {Array} Array of ImagePanel objects
 */
export function generateHeroLayout({ numImages, canvasSize, gutter, imageOrder }) {
    if (numImages <= 0) return [];

    if (numImages < 2) {
        return generateUniformLayout({ numImages, canvasSize, gutter, imageOrder });
    }

    const midX = canvasSize.width / 2;

    const heroFrame = {
        x: 0,
        y: 0,
        width: midX - gutter / 2,
        height: canvasSize.height
    };

    const sideW = midX - gutter / 2;
    const sideAreaH = canvasSize.height;
    const remaining = numImages - 1;
    const sideCols = remaining <= 2 ? 1 : 2;
    const sideRows = Math.ceil(remaining / sideCols);
    const sideGutterY = (sideRows - 1) * gutter;
    const cellH = (sideAreaH - sideGutterY) / sideRows;

    const panels = [];
    const heroImgIdx = imageOrder ? (imageOrder[0] ?? 0) : 0;
    panels.push(createImagePanel({
        imageIndex: heroImgIdx,
        geometry: createRectGeometry(heroFrame)
    }));

    for (let i = 0; i < remaining; i++) {
        const col = i % sideCols;
        const row = Math.floor(i / sideCols);
        const x = midX + gutter / 2 + col * (sideW / sideCols) + (col > 0 ? gutter : 0);
        const y = row * (cellH + gutter);
        const cellW = sideW / sideCols;
        const frame = { x, y, width: cellW, height: cellH };
        const imgIdx = imageOrder ? (imageOrder[i + 1] ?? i + 1) : i + 1;
        panels.push(createImagePanel({
            imageIndex: imgIdx,
            geometry: createRectGeometry(frame)
        }));
    }

    return panels;
}
