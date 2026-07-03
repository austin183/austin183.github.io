/**
 * TitleRenderer - Renders formatted title text on canvas.
 * Supports per-run formatting (bold, italic, underline) with proper alignment.
 */

const MARGIN = 40;
const PADDING = 12;

/**
 * Renders the title onto the canvas context.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} titleStyle - Title style configuration
 * @param {Array} titleRuns - Array of title run objects
 */
export function render(ctx, width, height, titleStyle, titleRuns) {
    if (!titleRuns || titleRuns.length === 0) return;

    const fontSize = titleStyle.fontSize || 36;
    const fontFamily = titleStyle.fontFamily || 'Arial';
    const fontColor = titleStyle.fontColor || '#FFFFFF';
    const alignment = titleStyle.alignment || 'center';
    const showBackground = titleStyle.showBackground ?? false;
    const backgroundColor = titleStyle.backgroundColor || '#000000';

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

    // Determine Y position (bottom area of canvas)
    const y = height - MARGIN;

    // Determine start X based on alignment
    let startX;
    switch (alignment) {
        case 'left':
            startX = MARGIN;
            break;
        case 'right':
            startX = width - MARGIN - totalWidth;
            break;
        case 'center':
        default:
            startX = (width - totalWidth) / 2;
            break;
    }

    // Draw background if enabled
    if (showBackground) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(
            startX - PADDING,
            y - fontSize - PADDING,
            totalWidth + PADDING * 2,
            fontSize + PADDING * 2
        );
    }

    // Draw each run using pre-computed measurements
    ctx.textBaseline = 'alphabetic';
    let cursorX = startX;

    for (const mr of measuredRuns) {
        ctx.font = mr.font;

        // Draw text
        ctx.fillStyle = fontColor;
        ctx.fillText(mr.text, cursorX, y);

        // Draw underline if needed
        if (mr.underline) {
            ctx.fillStyle = fontColor;
            ctx.fillRect(cursorX, y + 2, mr.width, 2);
        }

        cursorX += mr.width;
    }
}
