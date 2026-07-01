/**
 * PolygonClipper - Sutherland-Hodgman polygon clipping against an axis-aligned rectangle.
 * Direct port from Swift PolygonClipper.swift
 */

export const PolygonClipper = {
    /**
     * Clips a subject polygon to the given clipping rectangle.
     * @param {Array} subject - Array of { x, y } points
     * @param {Object} clipRect - { x, y, width, height }
     * @returns {Array} Clipped polygon vertices, or empty array if fully outside
     */
    clip(subject, clipRect) {
        if (!subject || subject.length === 0) return [];

        let result = subject.slice();
        result = _clipEdge(result, 'left', clipRect.x);
        result = _clipEdge(result, 'right', clipRect.x + clipRect.width);
        result = _clipEdge(result, 'top', clipRect.y);
        result = _clipEdge(result, 'bottom', clipRect.y + clipRect.height);
        return result;
    }
};

function _clipEdge(input, edge, value) {
    if (input.length === 0) return [];

    const output = [];
    let prev = input[input.length - 1];
    let prevInside = _isInside(prev, edge, value);

    for (const curr of input) {
        const currInside = _isInside(curr, edge, value);

        if (currInside) {
            if (!prevInside) {
                const intersect = _intersection(prev, curr, edge, value);
                if (intersect) output.push(intersect);
            }
            output.push(curr);
        } else if (prevInside) {
            const intersect = _intersection(prev, curr, edge, value);
            if (intersect) output.push(intersect);
        }

        prev = curr;
        prevInside = currInside;
    }

    return output;
}

function _isInside(p, edge, value) {
    switch (edge) {
        case 'left':   return p.x >= value;
        case 'right':  return p.x <= value;
        case 'top':    return p.y >= value;
        case 'bottom': return p.y <= value;
        default:       return false;
    }
}

function _intersection(from, to, edge, value) {
    const t = _tValue(from, to, edge, value);
    if (!isFinite(t) || t < 0 || t > 1) return null;

    return {
        x: from.x + t * (to.x - from.x),
        y: from.y + t * (to.y - from.y)
    };
}

function _tValue(from, to, edge, value) {
    switch (edge) {
        case 'left': {
            const dx = to.x - from.x;
            if (dx === 0) return Infinity;
            return (value - from.x) / dx;
        }
        case 'right': {
            const dx = to.x - from.x;
            if (dx === 0) return Infinity;
            return (value - from.x) / dx;
        }
        case 'top': {
            const dy = to.y - from.y;
            if (dy === 0) return Infinity;
            return (value - from.y) / dy;
        }
        case 'bottom': {
            const dy = to.y - from.y;
            if (dy === 0) return Infinity;
            return (value - from.y) / dy;
        }
        default:
            return Infinity;
    }
}
