/**
 * createCollageData - Reactive data factory for Vue app.
 * Returns a function that creates the initial data object.
 */

import { LayoutStyle } from '../Models/LayoutStyle.js';

export function createCollageData(base) {
    return function () {
        return {
            // Image library
            images: [],

            // Layout
            panels: [],
            layoutStyle: LayoutStyle.HERO,
            gutter: 0,
            sliceAngle: 45,
            hexSpacing: 8,
            panelAssignments: new Map(),
            layoutVersion: 0,

            // Crops: Map of panelId -> { sourceRect, destination }
            crops: new Map(),

            // Selection
            selectedPanelId: null,
            hoveredPanelId: null,
            selectedImageId: null,

            // Background
            backgroundColor: '#ffffff',

            // Search
            searchQuery: '',

            // Undo/Redo state
            canUndo: false,
            canRedo: false,

            // Layout style options (from base)
            layoutStyles: base.layoutStyleOptions
        };
    };
}
