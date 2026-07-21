/**
 * SizeConstants - Canvas dimension constants.
 * Ported from Swift SizeConstants.swift
 */

export const SIZE_CONSTANTS = {
    defaultCanvasWidth: 1920,
    defaultCanvasHeight: 1080,
    defaultPreviewWidth: 960,
    defaultPreviewHeight: 540,
    get canvasAspect() {
        return this.defaultCanvasWidth / this.defaultCanvasHeight;
    },
    get canvasToPreviewScale() {
        return this.defaultPreviewWidth / this.defaultCanvasWidth;
    }
};
