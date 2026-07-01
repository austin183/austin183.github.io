/**
 * MosaicLayout - Recursive subdivision layout with randomized splits.
 * Ported from Swift MosaicLayoutStrategy
 */

import { createImagePanel } from '../Models/ImagePanel.js';
import { createRectGeometry } from '../Models/PanelGeometry.js';
import { SeededPRNG } from './SeededPRNG.js';

// Mosaic split configuration (from Swift MosaicConfig)
const MOSAIC_CONFIG = {
    narrowThreshold: 0.3,
    balancedThreshold: 0.6,
    narrowRatio: 0.25,
    balancedRatio: 0.33,
    wideRatio: 0.4
};

function _splitRatio(rand, hasPanels) {
    if (rand < MOSAIC_CONFIG.narrowThreshold && hasPanels) {
        return MOSAIC_CONFIG.narrowRatio;
    } else if (rand < MOSAIC_CONFIG.balancedThreshold) {
        return MOSAIC_CONFIG.balancedRatio;
    } else {
        return MOSAIC_CONFIG.wideRatio;
    }
}

/**
 * Generates a mosaic layout.
 * @param {Object} options
 * @param {number} options.numImages
 * @param {Object} options.canvasSize - { width, height }
 * @param {number} options.gutter
 * @param {number[]} [options.imageOrder]
 * @param {number} [options.mosaicSeed]
 * @returns {Array} Array of ImagePanel objects
 */
export function generateMosaicLayout({ numImages, canvasSize, gutter, imageOrder, mosaicSeed }) {
    if (numImages <= 0) return [];

    if (numImages === 1) {
        const imgIdx = imageOrder ? (imageOrder[0] ?? 0) : 0;
        return [createImagePanel({
            imageIndex: imgIdx,
            geometry: createRectGeometry({ x: 0, y: 0, width: canvasSize.width, height: canvasSize.height })
        })];
    }

    let remaining = { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height };
    const panels = [];
    let imageIdx = 0;
    let rng = mosaicSeed !== undefined ? new SeededPRNG(mosaicSeed) : null;

    const maxSplits = numImages;

    for (let s = 0; s < maxSplits; s++) {
        if (imageIdx >= numImages) break;

        const w = remaining.width;
        const h = remaining.height;

        if (imageIdx === numImages - 1) {
            const imgIdx = imageOrder ? (imageOrder[imageIdx] ?? imageIdx) : imageIdx;
            panels.push(createImagePanel({
                imageIndex: imgIdx,
                geometry: createRectGeometry({ ...remaining })
            }));
            break;
        }

        const isWide = w > h;

        let rand;
        if (rng) {
            const bits = (rng.next() >>> 0) >> 12 & 0x000FFFFF;
            rand = bits / (1 << 20);
        } else {
            rand = Math.random();
        }

        const splitRatio = _splitRatio(rand, panels.length > 0);

        if (isWide) {
            const splitW = w * splitRatio;
            const panelFrame = {
                x: remaining.x,
                y: remaining.y,
                width: splitW,
                height: h
            };
            const imgIdx = imageOrder ? (imageOrder[imageIdx] ?? imageIdx) : imageIdx;
            panels.push(createImagePanel({
                imageIndex: imgIdx,
                geometry: createRectGeometry(panelFrame)
            }));
            remaining = {
                x: remaining.x + splitW + gutter,
                y: remaining.y,
                width: w - splitW - gutter,
                height: h
            };
        } else {
            const splitH = h * splitRatio;
            const panelFrame = {
                x: remaining.x,
                y: remaining.y,
                width: w,
                height: splitH
            };
            const imgIdx = imageOrder ? (imageOrder[imageIdx] ?? imageIdx) : imageIdx;
            panels.push(createImagePanel({
                imageIndex: imgIdx,
                geometry: createRectGeometry(panelFrame)
            }));
            remaining = {
                x: remaining.x,
                y: remaining.y + splitH + gutter,
                width: w,
                height: h - splitH - gutter
            };
        }

        imageIdx += 1;
    }

    return panels;
}
