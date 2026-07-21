/**
 * CropInfo - Crop data structure for a single panel.
 * Stores the source rectangle (portion of source image to display)
 * and the destination rectangle (panel position on canvas).
 * Ported from Swift CropInfo.swift
 */

import { sourceRect as fitSourceRect } from '../Layout/FitMath.js';

/**
 * Creates a CropInfo for a panel.
 * @param {Object} options
 * @param {string} options.panelId - The panel this crop belongs to
 * @param {Object} options.sourceRect - { x, y, width, height } in source image coordinates
 * @param {Object} options.destination - { x, y, width, height } in canvas coordinates
 * @returns {Object} CropInfo
 */
export function createCropInfo({ panelId, sourceRect, destination }) {
    return {
        panelId: panelId,
        sourceRect: { x: sourceRect.x, y: sourceRect.y, width: sourceRect.width, height: sourceRect.height },
        destination: { x: destination.x, y: destination.y, width: destination.width, height: destination.height }
    };
}

/**
 * Creates a default (centered) crop for a panel given the image and panel sizes.
 * Uses FitMath.sourceRect() for center-weighted default crop.
 * @param {Object} options
 * @param {string} options.panelId
 * @param {Object} options.imageSize - { width, height } of the source image
 * @param {Object} options.panelSize - { x, y, width, height } of the panel on canvas
 * @returns {Object} CropInfo
 */
export function createDefaultCrop({ panelId, imageSize, panelSize }) {
    const sourceRect = fitSourceRect(imageSize, panelSize);
    const destination = {
        x: panelSize.x,
        y: panelSize.y,
        width: panelSize.width,
        height: panelSize.height
    };
    return createCropInfo({ panelId, sourceRect, destination });
}

/**
 * Deep-clones a CropInfo.
 * @param {Object} cropInfo
 * @returns {Object} A new CropInfo with the same values
 */
export function cloneCropInfo(cropInfo) {
    return createCropInfo({
        panelId: cropInfo.panelId,
        sourceRect: { ...cropInfo.sourceRect },
        destination: { ...cropInfo.destination }
    });
}
