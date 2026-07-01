/**
 * LayoutGenerator - Main generator that dispatches to layout strategies.
 * Ported from Swift LayoutGenerator.swift
 */

import { LayoutStyle } from '../Models/LayoutStyle.js';
import { generateUniformLayout } from './UniformLayout.js';
import { generateHeroLayout } from './HeroLayout.js';
import { generateMosaicLayout } from './MosaicLayout.js';
import { generateDiagonalSlicesLayout } from './DiagonalSlicesLayout.js';
import { generateHexagonalLayout } from './HexagonalLayout.js';

export const LayoutGenerator = {
    /**
     * Generates panels for the given configuration.
     * @param {Object} options
     * @param {number} options.numImages
     * @param {Object} [options.canvasSize] - { width, height } (defaults to 1920x1080)
     * @param {number} [options.gutter] - Spacing between panels (default 4)
     * @param {string} [options.style] - LayoutStyle value (default 'hero')
     * @param {number[]} [options.imageOrder] - Custom image ordering
     * @param {number} [options.mosaicSeed] - Seed for deterministic mosaic
     * @param {number} [options.sliceAngle] - Angle for diagonal slices (default 45)
     * @param {number} [options.hexSpacing] - Spacing for hexagonal (default 8)
     * @returns {Array} Array of ImagePanel objects
     */
    generate({
        numImages,
        canvasSize = { width: 1920, height: 1080 },
        gutter = 4,
        style = LayoutStyle.HERO,
        imageOrder = null,
        mosaicSeed = null,
        sliceAngle = 45,
        hexSpacing = 8
    }) {
        const base = { numImages, canvasSize, gutter, imageOrder };

        switch (style) {
            case LayoutStyle.UNIFORM:
                return generateUniformLayout(base);
            case LayoutStyle.HERO:
                return generateHeroLayout(base);
            case LayoutStyle.MOSAIC:
                return generateMosaicLayout({ ...base, mosaicSeed });
            case LayoutStyle.DIAGONAL_SLICES:
                return generateDiagonalSlicesLayout({ ...base, angle: sliceAngle });
            case LayoutStyle.HEXAGONAL:
                return generateHexagonalLayout({ ...base, spacing: hexSpacing });
            default:
                return generateHeroLayout(base);
        }
    }
};
