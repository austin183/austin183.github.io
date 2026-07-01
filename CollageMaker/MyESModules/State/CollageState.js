/**
 * CollageState - Reactive state container.
 * Replaces Swift CollageViewModel.
 * Ported from Swift ViewModel/CollageViewModel.swift
 */

import { LayoutStyle } from '../Models/LayoutStyle.js';

/**
 * Creates the initial collage state object.
 * @returns {Object} CollageState
 */
export function createCollageState() {
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
        selectedImageId: null,

        // Background
        backgroundColor: '#ffffff',

        // Search
        searchQuery: '',

        // Computed (not reactive, derived)
        get filteredImages() {
            return this.images;
        }
    };
}
