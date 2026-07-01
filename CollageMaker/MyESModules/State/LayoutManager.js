/**
 * LayoutManager - Layout style, gutter, panel regeneration.
 * Ported from Swift ViewModel/LayoutManager.swift
 */

import { LayoutGenerator } from '../Layout/LayoutGenerator.js';
import { SIZE_CONSTANTS } from '../Models/SizeConstants.js';

/**
 * Creates a layout manager instance.
 * @param {Object} state - The reactive CollageState
 * @param {Object} assembler - The CollageAssembler instance
 * @returns {Object} LayoutManager
 */
export function createLayoutManager(state, assembler) {
    return {
        /**
         * Regenerates the layout for the current images.
         */
        regenerate() {
            if (state.images.length === 0) {
                state.panels = [];
                state.crops = new Map();
                state.panelAssignments = new Map();
                return;
            }

            state.layoutVersion += 1;

            const imageOrder = Array.from({ length: state.images.length }, (_, i) => i);

            state.panels = LayoutGenerator.generate({
                numImages: state.images.length,
                canvasSize: {
                    width: SIZE_CONSTANTS.defaultCanvasWidth,
                    height: SIZE_CONSTANTS.defaultCanvasHeight
                },
                gutter: state.gutter,
                style: state.layoutStyle,
                imageOrder: imageOrder,
                sliceAngle: state.sliceAngle,
                hexSpacing: state.hexSpacing
            });

            // Build panel assignments
            state.panelAssignments = new Map();
            state.panels.forEach((panel, i) => {
                state.panelAssignments.set(panel.id, imageOrder[i]);
            });

            // Compute default crops
            state.crops = assembler.computeDefaultCrops(
                state.panels,
                state.images,
                state.panelAssignments
            );
        },

        /**
         * Changes the layout style and regenerates.
         * @param {string} style
         */
        setLayoutStyle(style) {
            state.layoutStyle = style;
            this.regenerate();
        },

        /**
         * Changes the gutter and regenerates.
         * @param {number} value
         */
        setGutter(value) {
            state.gutter = value;
            this.regenerate();
        },

        /**
         * Changes the slice angle and regenerates (for diagonal slices).
         * @param {number} value
         */
        setSliceAngle(value) {
            state.sliceAngle = value;
            if (state.layoutStyle === 'diagonalSlices') {
                this.regenerate();
            }
        },

        /**
         * Changes the hex spacing and regenerates (for hexagonal).
         * @param {number} value
         */
        setHexSpacing(value) {
            state.hexSpacing = value;
            if (state.layoutStyle === 'hexagonal') {
                this.regenerate();
            }
        }
    };
}
