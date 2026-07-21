/**
 * CropManager - Per-panel crop state management.
 * Provides adjustCrop(panDelta), zoomCrop(scaleFactor), resetCrop(panelId).
 * Ported from Swift CropManager.swift
 */

import { createDefaultCrop } from '../Models/CropInfo.js';
import { setCropAction, resetCropAction } from './actions.js';

/**
 * Creates a crop manager instance.
 * @param {Object} state - The reactive CollageState (must have `crops` Map, `panels`, `images`, `panelAssignments`)
 * @param {Function} onCropChanged - Callback invoked after each crop mutation
 * @returns {Object} CropManager
 */
export function createCropManager(state, onCropChanged) {
    return {
        /**
         * Adjusts the crop source rectangle by a delta (in image-pixel coordinates).
         * Clamps the result to stay within the image bounds.
         * @param {string} panelId
         * @param {Object} delta - { x, y } pixel offset to pan the crop
         */
        adjustCrop(panelId, delta) {
            const crop = state.crops.get(panelId);
            if (!crop) return;

            const imageIndex = state.panelAssignments.get(panelId);
            if (imageIndex === undefined || imageIndex >= state.images.length) return;

            const image = state.images[imageIndex];
            const sr = crop.sourceRect;

            let newX = sr.x + delta.x;
            let newY = sr.y + delta.y;

            // Clamp: crop must stay within image bounds
            newX = Math.max(0, Math.min(newX, image.width - sr.width));
            newY = Math.max(0, Math.min(newY, image.height - sr.height));

            // Create new crop with updated source rect and use action
            const updatedCrop = {
                ...crop,
                sourceRect: { ...sr, x: newX, y: newY }
            };
            setCropAction(state, panelId, updatedCrop);

            onCropChanged();
        },

        /**
         * Zooms the crop by a scale factor around the crop center.
         * factor > 1 zooms in (smaller source rect), factor < 1 zooms out.
         * @param {string} panelId
         * @param {number} factor - Scale factor (e.g., 1.1 for 10% zoom in)
         */
        zoomCrop(panelId, factor) {
            const crop = state.crops.get(panelId);
            if (!crop) return;

            const imageIndex = state.panelAssignments.get(panelId);
            if (imageIndex === undefined || imageIndex >= state.images.length) return;

            const image = state.images[imageIndex];
            const sr = crop.sourceRect;

            // New size
            let newW = sr.width / factor;
            let newH = sr.height / factor;

            // Clamp size: can't be larger than the image
            newW = Math.min(newW, image.width);
            newH = Math.min(newH, image.height);

            // Can't be smaller than 1 pixel
            newW = Math.max(newW, 1);
            newH = Math.max(newH, 1);

            // Keep center the same
            const centerX = sr.x + sr.width / 2;
            const centerY = sr.y + sr.height / 2;

            let newX = centerX - newW / 2;
            let newY = centerY - newH / 2;

            // Clamp position to image bounds
            newX = Math.max(0, Math.min(newX, image.width - newW));
            newY = Math.max(0, Math.min(newY, image.height - newH));

            // Create new crop with updated source rect and use action
            const updatedCrop = {
                ...crop,
                sourceRect: { x: newX, y: newY, width: newW, height: newH }
            };
            setCropAction(state, panelId, updatedCrop);

            onCropChanged();
        },

        /**
         * Resets a panel's crop to the default centered crop.
         * @param {string} panelId
         */
        resetCrop(panelId) {
            const panel = state.panels.find(p => p.id === panelId);
            if (!panel) return;

            const imageIndex = state.panelAssignments.get(panelId);
            if (imageIndex === undefined || imageIndex >= state.images.length) return;

            const image = state.images[imageIndex];
            const panelSize = panel.geometry.type === 'rect'
                ? panel.geometry.rect
                : panel.geometry.boundingRect;

            // Use action to reset crop
            resetCropAction(state, panelId, panel, state.images, state.panelAssignments, createDefaultCrop);

            onCropChanged();
        },

        /**
         * Sets the source rect directly (used by crop preview interaction).
         * @param {string} panelId
         * @param {Object} sourceRect - { x, y, width, height }
         */
        setSourceRect(panelId, sourceRect) {
            const crop = state.crops.get(panelId);
            if (!crop) return;

            const imageIndex = state.panelAssignments.get(panelId);
            if (imageIndex === undefined || imageIndex >= state.images.length) return;

            const image = state.images[imageIndex];

            // Clamp to image bounds
            const newRect = {
                x: Math.max(0, Math.min(sourceRect.x, image.width - sourceRect.width)),
                y: Math.max(0, Math.min(sourceRect.y, image.height - sourceRect.height)),
                width: Math.max(1, Math.min(sourceRect.width, image.width)),
                height: Math.max(1, Math.min(sourceRect.height, image.height))
            };

            // Create new crop with updated source rect and use action
            const updatedCrop = {
                ...crop,
                sourceRect: newRect
            };
            setCropAction(state, panelId, updatedCrop);

            onCropChanged();
        },

        /**
         * Gets the crop info for a panel.
         * @param {string} panelId
         * @returns {Object|null} CropInfo or null
         */
        getCrop(panelId) {
            return state.crops.get(panelId) || null;
        },

        /**
         * Gets the image for a panel (for displaying in crop preview).
         * @param {string} panelId
         * @returns {Object|null} ImageItem or null
         */
        getPanelImage(panelId) {
            const imageIndex = state.panelAssignments.get(panelId);
            if (imageIndex === undefined || imageIndex >= state.images.length) return null;
            return state.images[imageIndex];
        }
    };
}
