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

            // Image loading progress overlay
            imageLoadingProgress: {
                visible: false,
                current: 0,
                total: 0
            },

            // Layout
            panels: [],
            layoutStyle: LayoutStyle.HERO,
            gutter: 0,
            sliceAngle: 45,
            hexSpacing: 8,
            hexSizeMultiplier: 1.0,
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
            titleHoverTarget: null,
            titleInteractionMode: null,

            // Overlay
            overlayImage: null,
            overlayMode: 'multiply',
            overlayOpacity: 0.5,

            // Export
            exportFormat: 'jpeg',
            exportQuality: 0.92,
            isExporting: false,
            exportStatus: '',

            // Toast notifications
            toast: {
                message: '',
                type: '',       // 'info', 'success', 'error'
                visible: false,
                timer: null
            },

            // Search
            searchQuery: '',

            // Undo/Redo state
            canUndo: false,
            canRedo: false,

            // Right sidebar toggle
            rightSidebarOpen: true,

            // Left sidebar toggle
            leftSidebarOpen: true,

            // Mobile sidebar overlay state
            leftSidebarMobileOpen: false,
            rightSidebarMobileOpen: false,

            // Bottom sheet (mobile)
            bottomSheetOpen: false,
            activeBottomSheetTab: 'images',  // 'images' | 'edit' | 'export'

            // Drag target (for visual feedback during panel swap)
            dragTargetId: null,

            // Left sidebar sections
            leftSidebarSections: [
                { id: 'layout', label: 'Layout' },
                { id: 'library', label: 'Image Library' }
            ],
            expandedLeftSections: {
                library: true,
                layout: false
            },

            // Right sidebar sections
            sidebarSections: [
                { id: 'crop', label: 'Crop' },
                { id: 'background', label: 'Background' },
                { id: 'overlay', label: 'Overlay' },
                { id: 'title', label: 'Title' },
                { id: 'export', label: 'Export' }
            ],
            expandedSections: {
                crop: false,
                background: false,
                overlay: false,
                title: false,
                export: false
            },

            // Layout style options (from base)
            layoutStyles: base.layoutStyleOptions
        };
    };
}
