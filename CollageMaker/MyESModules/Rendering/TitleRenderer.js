/**
 * TitleRenderer - Renders formatted title text on canvas.
 * Supports per-run formatting (bold, italic, underline) with proper alignment.
 * Supports configurable box width, position, and opacity.
 */

const MARGIN = 40;
export const PADDING = 12;
const LINE_HEIGHT_MULTIPLIER = 1.2;

/**
 * Computes the bounding box of the title text.
 * Pure function — no side effects on passed context.
 * Accepts an optional canvas context for measurement to avoid
 * creating offscreen canvases in hot paths (e.g., pointermove during drag).
 * @param {Object} titleStyle
 * @param {Array} titleRuns
 * @param {number} width - Canvas width (for right-alignment fallback)
 * @param {number} height - Canvas height
 * @param {CanvasRenderingContext2D} [measureCtx] - Optional context for text measurement
 * @returns {{ x: number, y: number, width: number, height: number, baselineY: number, textWidth: number, contentStartX: number, boxWidth: number }}
 */
export function computeBounds(titleStyle, titleRuns, width, height, measureCtx) {
    const fontSize = titleStyle.fontSize || 36;
    const fontFamily = titleStyle.fontFamily || 'Arial';
    const textHeight = fontSize + PADDING * 2;
    const baselineY = height - MARGIN;

    // Use provided context if available, otherwise create offscreen canvas
    // Callers in hot paths (e.g., pointermove) should pass the render context
    const ctx = measureCtx || (function () {
        const offscreen = document.createElement('canvas');
        return offscreen.getContext('2d');
    })();

    let totalWidth = 0;
    for (const run of titleRuns) {
        const fontParts = [];
        if (run.italic) fontParts.push('italic');
        if (run.bold) fontParts.push('bold');
        fontParts.push(fontSize + 'px');
        fontParts.push(fontFamily);
        ctx.font = fontParts.join(' ');
        totalWidth += ctx.measureText(run.text).width;
    }

    const boxWidth = titleStyle.titleBoxWidth ?? (totalWidth + PADDING * 2);

    // Compute text start offset within box (alignment within width)
    let contentStartX;
    const alignment = titleStyle.alignment || 'center';
    switch (alignment) {
        case 'left':
            contentStartX = 0;
            break;
        case 'right':
            contentStartX = boxWidth - totalWidth;
            break;
        case 'center':
        default:
            contentStartX = (boxWidth - totalWidth) / 2;
            break;
    }

    return {
        x: 0,
        y: baselineY - fontSize - PADDING,
        width: boxWidth,
        height: textHeight,
        baselineY: baselineY,
        textWidth: totalWidth,
        contentStartX: contentStartX,
        boxWidth: boxWidth
    };
}

/**
 * Splits an array of runs into lines by \n characters.
 * Pure function — no side effects.
 * @param {Array} titleRuns - Array of title run objects
 * @returns {Array<Array>} Array of arrays of runs, one per line
 */
export function splitRunsByNewline(titleRuns) {
    if (!titleRuns || titleRuns.length === 0) return [];

    const lines = [[]];
    let currentLineRuns = lines[0];

    for (const run of titleRuns) {
        const parts = run.text.split('\n');
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].length > 0) {
                currentLineRuns.push({
                    text: parts[i],
                    bold: run.bold,
                    italic: run.italic,
                    underline: run.underline
                });
            }
            if (i < parts.length - 1) {
                // Move to next line
                currentLineRuns = [];
                lines.push(currentLineRuns);
            }
        }
    }

    // Remove empty trailing lines
    while (lines.length > 1 && lines[lines.length - 1].length === 0) {
        lines.pop();
    }

    // Remove empty leading lines (e.g., from leading \n)
    while (lines.length > 1 && lines[0].length === 0) {
        lines.shift();
    }

    // Handle case where all content was empty (single empty line)
    if (lines.length === 1 && lines[0].length === 0) {
        return [];
    }

    return lines;
}

/**
 * Computes the bounding box of multi-line title text.
 * Pure function — no side effects on passed context.
 * Accepts an optional canvas context for measurement to avoid
 * creating offscreen canvases in hot paths.
 * @param {Object} titleStyle
 * @param {Array} titleRuns
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {CanvasRenderingContext2D} [measureCtx] - Optional context for text measurement
 * @returns {{ x: number, y: number, width: number, height: number, baselineY: number, textWidth: number, contentStartX: number, boxWidth: number, lines: Array }}
 */
export function computeMultiLineBounds(titleStyle, titleRuns, width, height, measureCtx) {
    const fontSize = titleStyle.fontSize || 36;
    const fontFamily = titleStyle.fontFamily || 'Arial';
    const lineHeight = fontSize * LINE_HEIGHT_MULTIPLIER;

    // Split runs into lines by \n
    const lines = splitRunsByNewline(titleRuns);

    // Use provided context if available, otherwise create offscreen canvas
    const ctx = measureCtx || (function () {
        const offscreen = document.createElement('canvas');
        return offscreen.getContext('2d');
    })();

    let maxWidth = 0;
    const measuredLines = [];

    for (const lineRuns of lines) {
        let lineWidth = 0;
        const measuredRuns = [];
        for (const run of lineRuns) {
            const fontParts = [];
            if (run.italic) fontParts.push('italic');
            if (run.bold) fontParts.push('bold');
            fontParts.push(fontSize + 'px');
            fontParts.push(fontFamily);
            ctx.font = fontParts.join(' ');
            const w = ctx.measureText(run.text).width;
            measuredRuns.push({
                text: run.text,
                bold: run.bold,
                italic: run.italic,
                underline: run.underline,
                width: w,
                font: fontParts.join(' ')
            });
            lineWidth += w;
        }
        maxWidth = Math.max(maxWidth, lineWidth);
        measuredLines.push({ runs: measuredRuns, width: lineWidth });
    }

    const boxWidth = titleStyle.titleBoxWidth ?? (maxWidth + PADDING * 2);
    const numLines = lines.length;
    const boxHeight = (numLines > 1 ? (numLines - 1) * lineHeight : 0) + fontSize + PADDING * 2;

    // Compute text start offset within box (alignment)
    let contentStartX;
    const alignment = titleStyle.alignment || 'center';
    switch (alignment) {
        case 'left':
            contentStartX = 0;
            break;
        case 'right':
            contentStartX = boxWidth - maxWidth;
            break;
        case 'center':
        default:
            contentStartX = (boxWidth - maxWidth) / 2;
            break;
    }

    const baselineY = titleStyle.titleBoxY !== null && titleStyle.titleBoxY !== undefined
        ? titleStyle.titleBoxY
        : height - MARGIN;

    return {
        x: 0,
        y: baselineY - (numLines > 1 ? (numLines - 1) * lineHeight : 0) - fontSize - PADDING,
        width: boxWidth,
        height: boxHeight,
        baselineY: baselineY, // Baseline of the LAST line
        textWidth: maxWidth,
        contentStartX: contentStartX,
        boxWidth: boxWidth,
        lines: measuredLines
    };
}

/**
 * Draws an interaction outline around the title box.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {Object} state - Interaction state with hoverTarget and interactionMode
 */
function drawInteractionOutline(ctx, x, y, w, h, state) {
    ctx.save();
    ctx.strokeStyle = state.interactionMode ? '#3b82f6' : 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = state.interactionMode ? 2 : 1;
    ctx.setLineDash(state.interactionMode ? [] : [4, 4]);
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    ctx.restore();
}

/**
 * Renders the title onto the canvas context.
 * Supports multi-line text (up to 3 lines via \n characters).
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} titleStyle - Title style configuration
 * @param {Array} titleRuns - Array of title run objects
 * @param {Object} [interactionState] - Optional interaction state for hover/drag outlines
 */
export function render(ctx, width, height, titleStyle, titleRuns, interactionState) {
    if (!titleRuns || titleRuns.length === 0) return;

    const fontSize = titleStyle.fontSize || 36;
    const fontFamily = titleStyle.fontFamily || 'Arial';
    const fontColor = titleStyle.fontColor || '#FFFFFF';
    const fontOpacity = titleStyle.fontOpacity ?? 1.0;
    const alignment = titleStyle.alignment || 'center';
    const showBackground = titleStyle.showBackground ?? false;
    const backgroundColor = titleStyle.backgroundColor || '#000000';
    const bgOpacity = titleStyle.bgOpacity ?? 1.0;
    const lineHeight = fontSize * LINE_HEIGHT_MULTIPLIER;

    // Compute multi-line bounds (uses provided ctx for measurement)
    const bounds = computeMultiLineBounds(titleStyle, titleRuns, width, height, ctx);
    const { lines, boxWidth, contentStartX, textWidth } = bounds;
    const numLines = lines.length;

    // Compute box X position
    let effectiveBoxX;
    if (titleStyle.titleBoxX !== null && titleStyle.titleBoxX !== undefined) {
        // Custom position: box starts at titleBoxX
        effectiveBoxX = titleStyle.titleBoxX;
    } else if (titleStyle.titleBoxWidth !== null && titleStyle.titleBoxWidth !== undefined) {
        // Custom width but no custom position: center the box in the canvas
        effectiveBoxX = (width - boxWidth) / 2;
    } else {
        // Legacy mode: no custom width or position
        // Align text within canvas (backward compatible behavior)
        switch (alignment) {
            case 'left':
                effectiveBoxX = MARGIN;
                break;
            case 'right':
                effectiveBoxX = width - MARGIN - bounds.textWidth;
                break;
            case 'center':
            default:
                effectiveBoxX = (width - bounds.textWidth) / 2;
                break;
        }
    }

    const boxLeft = effectiveBoxX;

    // Determine if we're in legacy mode (no custom width or position)
    const isLegacyMode = (titleStyle.titleBoxWidth === null || titleStyle.titleBoxWidth === undefined)
        && (titleStyle.titleBoxX === null || titleStyle.titleBoxX === undefined);

    // Draw background if enabled (with opacity via save/restore)
    if (showBackground) {
        ctx.save();
        ctx.globalAlpha = bgOpacity;
        ctx.fillStyle = backgroundColor;
        // In legacy mode, boxLeft is at text start; background needs padding offset
        // In box mode, boxLeft is the box left edge; background starts at boxLeft
        const bgX = isLegacyMode ? boxLeft - PADDING : boxLeft;
        ctx.fillRect(
            bgX,
            bounds.y,
            boxWidth,
            bounds.height
        );
        ctx.restore();
    }

    // Draw each line
    ctx.save();
    ctx.globalAlpha = fontOpacity;
    ctx.textBaseline = 'alphabetic';

    for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
        const lineBaselineY = bounds.baselineY - (numLines - 1 - lineIdx) * lineHeight;
        const lineRuns = lines[lineIdx].runs;

        // Compute per-line text offset (alignment within box)
        // In legacy mode, alignment is already baked into boxLeft, so offset is 0
        let lineTextOffset = isLegacyMode ? 0 : contentStartX;
        // For right-aligned in box mode, offset is based on this line's width
        if (!isLegacyMode && alignment === 'right') {
            lineTextOffset = contentStartX + (textWidth - lines[lineIdx].width);
        }
        lineTextOffset = Math.max(0, lineTextOffset);

        let cursorX = boxLeft + lineTextOffset;
        for (const mr of lineRuns) {
            ctx.font = mr.font;
            ctx.fillStyle = fontColor;
            ctx.fillText(mr.text, cursorX, lineBaselineY);
            if (mr.underline) {
                ctx.fillStyle = fontColor;
                ctx.fillRect(cursorX, lineBaselineY + 2, mr.width, 2);
            }
            cursorX += mr.width;
        }
    }
    ctx.restore();

    // Draw interaction outline (if hovering or dragging)
    if (interactionState && (interactionState.hoverTarget || interactionState.interactionMode)) {
        const outlineX = isLegacyMode ? boxLeft - PADDING : boxLeft;
        drawInteractionOutline(ctx, outlineX, bounds.y, boxWidth, bounds.height, interactionState);
    }
}
