/**
 * HexagonalLayout - Hex grid layout with pointy-top hexagons.
 * Ported from Swift HexagonalLayoutStrategy
 */

import { createImagePanel } from '../Models/ImagePanel.js';
import { createPathGeometry } from '../Models/PanelGeometry.js';

/**
 * Generates a hexagonal layout.
 * @param {Object} options
 * @param {number} options.numImages
 * @param {Object} options.canvasSize - { width, height }
 * @param {number} options.gutter
 * @param {number[]} [options.imageOrder]
 * @param {number} [options.spacing] - Visual spacing between hexagons (default 8)
 * @param {number} [options.hexSizeMultiplier] - Size multiplier for hexagons (default 1.0)
 * @returns {Array} Array of ImagePanel objects
 */
export function generateHexagonalLayout({ numImages, canvasSize, gutter, imageOrder, spacing = 8, hexSizeMultiplier = 1.0 }) {
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

    const canvasCenter = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

    // Estimate rings needed to hold all images (center + rings)
    const remaining = numImages - 1;
    let ringsNeeded = 0;
    let capacity = 0;
    while (capacity < remaining) {
        ringsNeeded += 1;
        capacity += 6 * ringsNeeded;
    }

    // Effective radius for grid spacing
    const R_eff = Math.min(
        canvasSize.width / (Math.sqrt(3) * (2 * ringsNeeded + 1)),
        canvasSize.height / (3 * ringsNeeded + Math.sqrt(3))
    );
    let R = Math.max(Math.sqrt(3) / 2 * R_eff - spacing / 2, spacing);

    // Apply size multiplier to hexagon radius
    R = R * hexSizeMultiplier;

    // R_eff is the base grid spacing derived from canvas size and ring count.
    // R_grid applies the size multiplier to R_eff so center positions move apart
    // proportionally with hexagon size, maintaining consistent relative spacing
    // across multipliers.
    const R_grid = R_eff * hexSizeMultiplier;

    // Axial coordinate directions for pointy-top hex ring traversal
    const directions = [
        { dq: 0, dr: -1 },
        { dq: -1, dr: 0 },
        { dq: -1, dr: 1 },
        { dq: 0, dr: 1 },
        { dq: 1, dr: 0 },
        { dq: 1, dr: -1 }
    ];

    // Generate hexagon center positions using axial hex grid
    const centers = [canvasCenter];

    for (let ring = 1; ring <= ringsNeeded; ring++) {
        let q = ring;
        let r = 0;
        for (const { dq, dr } of directions) {
            for (let s = 0; s < ring; s++) {
                if (centers.length - 1 >= numImages) break;
                const x = canvasCenter.x + (q + r / 2) * Math.sqrt(3) * R_grid;
                const y = canvasCenter.y + r * 1.5 * R_grid;
                centers.push({ x, y });
                q += dq;
                r += dr;
            }
            if (centers.length - 1 >= numImages) break;
        }
        if (centers.length - 1 >= numImages) break;
    }

    const panels = [];
    for (let i = 0; i < numImages; i++) {
        if (i >= centers.length) break;
        const center = centers[i];
        const { points, bounds } = _createHexagonPath(center, R);
        const imgIdx = imageOrder ? (imageOrder[i] ?? i) : i;
        panels.push(createImagePanel({
            imageIndex: imgIdx,
            geometry: createPathGeometry(points, bounds)
        }));
    }

    return panels;
}

/**
 * Creates a pointy-top hexagon path.
 * @param {Object} center - { x, y }
 * @param {number} radius
 * @returns {{ points: Array, bounds: { x, y, width, height } }}
 */
function _createHexagonPath(center, radius) {
    const points = [];

    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 6 + Math.PI / 3 * i;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        points.push([x, y]);
    }

    const minX = Math.min(...points.map(p => p[0]));
    const minY = Math.min(...points.map(p => p[1]));
    const maxX = Math.max(...points.map(p => p[0]));
    const maxY = Math.max(...points.map(p => p[1]));
    const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

    return { points, bounds };
}
