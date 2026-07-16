/**
 * TitleRenderer - Renders formatted title text on canvas.
 * Supports per-run formatting (bold, italic, underline) with proper alignment.
 * Supports configurable box width, position, and opacity.
 */

const MARGIN = 40;
const PADDING = 12;

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

    // Pre-compute font strings and measure each run in a single pass
    const measuredRuns = [];
    let totalWidth = 0;

    for (const run of titleRuns) {
        const fontParts = [];
        if (run.italic) fontParts.push('italic');
        if (run.bold) fontParts.push('bold');
        fontParts.push(fontSize + 'px');
        fontParts.push(fontFamily);
        const fontStr = fontParts.join(' ');
        ctx.font = fontStr;
        const w = ctx.measureText(run.text).width;
        measuredRuns.push({ text: run.text, bold: run.bold, italic: run.italic, underline: run.underline, width: w, font: fontStr });
        totalWidth += w;
    }

    // Compute position
    const baselineY = titleStyle.titleBoxY !== null && titleStyle.titleBoxY !== undefined
        ? titleStyle.titleBoxY
        : height - MARGIN;

    const boxWidth = titleStyle.titleBoxWidth ?? (totalWidth + PADDING * 2);

    // Compute text start offset within box (alignment within width)
    let textOffset;
    switch (alignment) {
        case 'left': textOffset = 0; break;
        case 'right': textOffset = boxWidth - totalWidth; break;
        case 'center': default: textOffset = (boxWidth - totalWidth) / 2; break;
    }
    // Clamp textOffset so text doesn't go negative
    textOffset = Math.max(0, textOffset);

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
                textOffset = 0;
                break;
            case 'right':
                effectiveBoxX = width - MARGIN - totalWidth;
                textOffset = 0;
                break;
            case 'center':
            default:
                effectiveBoxX = (width - totalWidth) / 2;
                textOffset = 0;
                break;
        }
    }

    const boxLeft = effectiveBoxX;
    const textStartX = boxLeft + textOffset;

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
            baselineY - fontSize - PADDING,
            boxWidth,
            fontSize + PADDING * 2
        );
        ctx.restore();
    }

    // Draw each run using pre-computed measurements (with opacity via save/restore)
    ctx.save();
    ctx.globalAlpha = fontOpacity;
    ctx.textBaseline = 'alphabetic';
    let cursorX = textStartX;

    for (const mr of measuredRuns) {
        ctx.font = mr.font;

        // Draw text
        ctx.fillStyle = fontColor;
        ctx.fillText(mr.text, cursorX, baselineY);

        // Draw underline if needed
        if (mr.underline) {
            ctx.fillStyle = fontColor;
            ctx.fillRect(cursorX, baselineY + 2, mr.width, 2);
        }

        cursorX += mr.width;
    }
    ctx.restore();

    // Draw interaction outline (if hovering or dragging)
    if (interactionState && (interactionState.hoverTarget || interactionState.interactionMode)) {
        const outlineX = isLegacyMode ? boxLeft - PADDING : boxLeft;
        drawInteractionOutline(ctx, outlineX, baselineY - fontSize - PADDING, boxWidth, fontSize + PADDING * 2, interactionState);
    }
}
