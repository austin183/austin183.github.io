/**
 * LayoutGenerator - Main generator that dispatches to layout strategies.
 * Ported from Swift LayoutGenerator.swift
 * Refactored to use strategy pattern for OCP compliance.
 */

import { LayoutStyle } from '../Models/LayoutStyle.js';
import { generateUniformLayout } from './UniformLayout.js';
import { generateHeroLayout } from './HeroLayout.js';
import { generateMosaicLayout } from './MosaicLayout.js';
import { generateDiagonalSlicesLayout } from './DiagonalSlicesLayout.js';
import { generateHexagonalLayout } from './HexagonalLayout.js';

// Map of layout styles to generator functions
const LAYOUT_GENERATORS = {
    [LayoutStyle.UNIFORM]: generateUniformLayout,
    [LayoutStyle.HERO]: generateHeroLayout,
    [LayoutStyle.MOSAIC]: generateMosaicLayout,
    [LayoutStyle.DIAGONAL_SLICES]: generateDiagonalSlicesLayout,
    [LayoutStyle.HEXAGONAL]: generateHexagonalLayout
};

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

        const generator = LAYOUT_GENERATORS[style];
        if (!generator) {
            console.warn(`Unknown layout style: ${style}, defaulting to HERO`);
            return generateHeroLayout(base);
        }

        // Pass all optional parameters; each generator extracts what it needs
        const generatorOptions = { ...base };
        if (mosaicSeed !== null) generatorOptions.mosaicSeed = mosaicSeed;
        if (sliceAngle !== 45) generatorOptions.angle = sliceAngle;
        if (hexSpacing !== 8) generatorOptions.spacing = hexSpacing;

        return generator(generatorOptions);
    },

    /**
     * Register a custom layout generator.
     * @param {string} styleName - The layout style name
     * @param {Function} generatorFn - Function that generates panels
     */
    registerLayoutStyle(styleName, generatorFn) {
        LAYOUT_GENERATORS[styleName] = generatorFn;
    }
};
