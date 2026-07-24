/**
 * LayoutManager - Layout style, gutter, panel regeneration.
 * Ported from Swift ViewModel/LayoutManager.swift
 */

import { LayoutGenerator } from '../Layout/LayoutGenerator.js';
import { SIZE_CONSTANTS } from '../Models/SizeConstants.js';
import { regenerateLayoutAction } from './actions.js';

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
                 // Use action to clear and reset state
                 state.panels = [];
                 state.crops = new Map();
                 state.panelAssignments = new Map();
                 state.layoutVersion += 1;
                 return;
             }

             const imageOrder = Array.from({ length: state.images.length }, (_, i) => i);

              const panels = LayoutGenerator.generate({
                  numImages: state.images.length,
                  canvasSize: {
                      width: SIZE_CONSTANTS.defaultCanvasWidth,
                      height: SIZE_CONSTANTS.defaultCanvasHeight
                  },
                  gutter: state.gutter,
                  style: state.layoutStyle,
                  imageOrder: imageOrder,
                  sliceAngle: state.sliceAngle,
                  hexSpacing: state.hexSpacing,
                  hexSizeMultiplier: state.hexSizeMultiplier
              });

             // Build panel assignments
             const panelAssignments = new Map();
             panels.forEach((panel, i) => {
                 panelAssignments.set(panel.id, imageOrder[i]);
             });

             // Use action to apply layout changes
             regenerateLayoutAction(state, panels, new Map(), panelAssignments, assembler.computeDefaultCrops);
         },

        /**
         * Changes the layout style and regenerates.
         * Note: This is a configuration change not tracked by UndoManager.
         * @param {string} style
         */
        setLayoutStyle(style) {
            state.layoutStyle = style;
            this.regenerate();
        },

        /**
         * Changes the gutter and regenerates.
         * Note: This is a configuration change not tracked by UndoManager.
         * @param {number} value
         */
        setGutter(value) {
            state.gutter = value;
            this.regenerate();
        },

        /**
         * Changes the slice angle and regenerates (for diagonal slices).
         * Note: This is a configuration change not tracked by UndoManager.
         * @param {number} value
         */
        setSliceAngle(value) {
            state.sliceAngle = value;
            this.regenerate();
        },

        /**
         * Changes the hex spacing and regenerates (for hexagonal).
         * Note: This is a configuration change not tracked by UndoManager.
         * @param {number} value
         */
        setHexSpacing(value) {
            state.hexSpacing = value;
            this.regenerate();
        },

        /**
         * Changes the hex size multiplier and regenerates (for hexagonal).
         * Note: This is a configuration change not tracked by UndoManager.
         * @param {number} value
         */
        setHexSizeMultiplier(value) {
            state.hexSizeMultiplier = value;
            this.regenerate();
        }
    };
}
