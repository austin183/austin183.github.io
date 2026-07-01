/**
 * DiagonalSlicesLayout - Parallelogram panels with configurable shear angle.
 * Ported from Swift DiagonalSlicesLayoutStrategy
 */

import { createImagePanel } from '../Models/ImagePanel.js';
import { createPathGeometry } from '../Models/PanelGeometry.js';

/**
 * Generates a diagonal slices layout.
 * @param {Object} options
 * @param {number} options.numImages
 * @param {Object} options.canvasSize - { width, height }
 * @param {number} options.gutter
 * @param {number[]} [options.imageOrder]
 * @param {number} [options.angle] - Shear angle in degrees (default 45)
 * @returns {Array} Array of ImagePanel objects
 */
export function generateDiagonalSlicesLayout({ numImages, canvasSize, gutter, imageOrder, angle = 45 }) {
    if (numImages <= 0) return [];

    if (numImages === 1) {
        const imgIdx = imageOrder ? (imageOrder[0] ?? 0) : 0;
        return [createImagePanel({
            imageIndex: imgIdx,
            geometry: createPathGeometry(
                [[0, 0], [canvasSize.width, 0], [canvasSize.width, canvasSize.height], [0, canvasSize.height]],
                { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height }
            )
        })];
    }

    const radians = angle * Math.PI / 180;
    const shear = Math.tan(radians);
    const cosA = Math.cos(radians);

    const shearOffset = canvasSize.height * shear;
    const effectiveGutter = gutter * cosA * cosA;
    const totalGutter = (numImages - 1) * effectiveGutter;
    const colWidth = (canvasSize.width + shearOffset - totalGutter) / numImages;
    const centerOffset = -shearOffset;

    const panels = [];

    for (let i = 0; i < numImages; i++) {
        const unshearedX = centerOffset + i * (colWidth + effectiveGutter);
        const ux = unshearedX;
        const uy = 0;
        const uw = colWidth;
        const uh = canvasSize.height;

        const corners = [
            [ux + uy * shear, uy],
            [ux + uw + uy * shear, uy],
            [ux + uw + uh * shear, uh],
            [ux + uh * shear, uh]
        ];

        const minX = Math.min(corners[0][0], corners[1][0], corners[2][0], corners[3][0]);
        const minY = Math.min(corners[0][1], corners[1][1], corners[2][1], corners[3][1]);
        const maxX = Math.max(corners[0][0], corners[1][0], corners[2][0], corners[3][0]);
        const maxY = Math.max(corners[0][1], corners[1][1], corners[2][1], corners[3][1]);
        const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

        const imgIdx = imageOrder ? (imageOrder[i] ?? i) : i;
        panels.push(createImagePanel({
            imageIndex: imgIdx,
            geometry: createPathGeometry(corners, bounds)
        }));
    }

    return panels;
}
