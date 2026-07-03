/**
 * createCollageData - Reactive data factory for Vue app.
 * Returns a function that creates the initial data object.
 */

import { LayoutStyle } from '../Models/LayoutStyle.js';
import { createTitleStyle } from '../Models/TitleStyle.js';

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
            backgroundStyle: 'solid',
            backgroundColor: '#ffffff',
            gradientColors: ['#ffffff', '#e0e0e0'],
            gradientAngle: 90,
            backgroundImage: null,
            backgroundOpacity: 1.0,

            // Title
            titleText: '',
            titleRuns: [],
            titleStyle: createTitleStyle(),
            titleSelectionStart: 0,
            titleSelectionEnd: 0,

            // Overlay
            overlayImage: null,
            overlayMode: 'multiply',
            overlayOpacity: 0.5,

            // Export
            exportQuality: 0.92,
            isExporting: false,
            exportStatus: '',

            // Search
            searchQuery: '',

            // Undo/Redo state
            canUndo: false,
            canRedo: false,

            // Right sidebar toggle
            rightSidebarOpen: true,

            // Layout style options (from base)
            layoutStyles: base.layoutStyleOptions
        };
    };
}
