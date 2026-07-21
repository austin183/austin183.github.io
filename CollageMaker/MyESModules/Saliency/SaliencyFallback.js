/**
 * SaliencyFallback - Center-weighted default crop heuristic.
 * Used as the MVP saliency approach until ML-based saliency is added in Phase 4.
 * Wraps FitMath.sourceRect() for centered crops.
 * Ported from Swift SaliencyAnalyzer.swift (center fallback path)
 */

import { sourceRect as fitSourceRect } from '../Layout/FitMath.js';

/**
 * Computes a default crop that centers the image within the panel's aspect ratio.
 * This is the fallback when no saliency analysis is available.
 * @param {Object} imageSize - { width, height } of the source image
 * @param {Object} panelSize - { width, height } of the panel (position not needed)
 * @returns {{ x, y, width, height }} Source rectangle in image coordinates
 */
export function defaultCenterCrop(imageSize, panelSize) {
    return fitSourceRect(imageSize, panelSize);
}

/**
 * Computes a focus-point-weighted crop.
 * Currently falls back to center since no ML saliency is available.
 * In Phase 4, this will use face/object detection to shift the crop toward salient regions.
 * @param {Object} imageSize - { width, height } of the source image
 * @param {Object} panelSize - { width, height } of the panel
 * @param {Object} [focusPoint] - { x, y } normalized (0-1) focus point (unused in MVP)
 * @returns {{ x, y, width, height }} Source rectangle in image coordinates
 */
export function saliencyCrop(imageSize, panelSize, focusPoint) {
    // MVP: ignore focusPoint, use center
    return defaultCenterCrop(imageSize, panelSize);
}
