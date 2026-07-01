/**
 * PanelGeometry - Rect/path geometry for panels.
 * Ported from Swift PanelGeometry.swift
 * Uses plain objects: { type: 'rect', rect: {x,y,w,h} } or
 *                     { type: 'path', points: [[x,y],...], boundingRect: {x,y,w,h} }
 */

/**
 * Creates a rect geometry.
 * @param {Object} rect - { x, y, width, height }
 * @returns {Object} PanelGeometry
 */
export function createRectGeometry(rect) {
    return {
        type: 'rect',
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    };
}

/**
 * Creates a path geometry from vertex points.
 * @param {Array} points - Array of [x, y] coordinate pairs
 * @param {Object} boundingRect - { x, y, width, height }
 * @returns {Object} PanelGeometry
 */
export function createPathGeometry(points, boundingRect) {
    return {
        type: 'path',
        points: points.map(p => [p[0], p[1]]),
        boundingRect: { x: boundingRect.x, y: boundingRect.y, width: boundingRect.width, height: boundingRect.height }
    };
}

/**
 * Returns the bounding rect of a geometry.
 * @param {Object} geometry - PanelGeometry
 * @returns {Object} { x, y, width, height }
 */
export function geometryBoundingRect(geometry) {
    if (geometry.type === 'rect') {
        return geometry.rect;
    }
    return geometry.boundingRect;
}

/**
 * Returns true if the geometry is a simple rectangle.
 * @param {Object} geometry
 * @returns {boolean}
 */
export function isRectGeometry(geometry) {
    return geometry.type === 'rect';
}
