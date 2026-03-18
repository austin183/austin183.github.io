/**
 * NowLineRenderer - Renders the playhead indicator (now line) on 2D canvas
 */
export function getNowLineRenderer() {
    return {
        /**
         * Draw the now line (playhead indicator) on canvas
         * @param {HTMLCanvasElement} canvas - The canvas to draw on
         * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
         */
        draw: function(canvas, ctx) {
            const maxHeight = canvas.height;
            const maxWidth = canvas.width;
            const maxSecondHeight = maxHeight / 10;
            const nowLineY = maxHeight - maxSecondHeight;

            ctx.beginPath();
            ctx.strokeStyle = "green";
            ctx.lineWidth = 2;
            ctx.setLineDash([15, 15]);
            ctx.moveTo(0, nowLineY);
            ctx.lineTo(maxWidth, nowLineY);
            ctx.stroke();
        }
    };
}
