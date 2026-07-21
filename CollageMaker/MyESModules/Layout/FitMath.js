/**
 * FitMath - Aspect-ratio-aware fit calculations.
 * Direct port from Swift FitMath.swift
 */

/**
 * Fits sourceSize inside containerSize while preserving aspect ratio.
 * Returns the fitted size and the offset to center it within the container.
 * @param {Object} sourceSize - { width, height }
 * @param {Object} containerSize - { width, height }
 * @returns {{ fittedSize: { width, height }, offset: { x, y } }}
 */
export function fit(sourceSize, containerSize) {
    if (sourceSize.height <= 0 || !isFinite(sourceSize.height) ||
        containerSize.height <= 0 || !isFinite(containerSize.height)) {
        return { fittedSize: { width: 0, height: 0 }, offset: { x: 0, y: 0 } };
    }

    const sourceAspect = sourceSize.width / sourceSize.height;
    const containerAspect = containerSize.width / containerSize.height;

    let fittedSize;
    if (sourceAspect >= containerAspect) {
        fittedSize = {
            width: containerSize.width,
            height: containerSize.width / sourceAspect
        };
    } else {
        fittedSize = {
            width: containerSize.height * sourceAspect,
            height: containerSize.height
        };
    }

    const offset = {
        x: (containerSize.width - fittedSize.width) / 2,
        y: (containerSize.height - fittedSize.height) / 2
    };

    return { fittedSize, offset };
}

/**
 * Computes the centered source rectangle of panelSize aspect ratio
 * that should be cropped from an image of imageSize.
 * @param {Object} imageSize - { width, height }
 * @param {Object} panelSize - { width, height }
 * @returns {{ x, y, width, height }}
 */
export function sourceRect(imageSize, panelSize) {
    if (imageSize.height <= 0 || !isFinite(imageSize.height) ||
        panelSize.height <= 0 || !isFinite(panelSize.height)) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    const imageAspect = imageSize.width / imageSize.height;
    const panelAspect = panelSize.width / panelSize.height;

    let sourceW, sourceH;

    if (imageAspect > panelAspect) {
        sourceH = imageSize.height;
        sourceW = sourceH * panelAspect;
    } else {
        sourceW = imageSize.width;
        sourceH = sourceW / panelAspect;
    }

    const originX = (imageSize.width - sourceW) / 2;
    const originY = (imageSize.height - sourceH) / 2;

    return { x: originX, y: originY, width: sourceW, height: sourceH };
}
