/**
 * NoteDrawInstructions - Calculates rendering instructions for 2D notes
 */
export function getNoteDrawInstructionsCalculator() {
    return {
        /**
         * Calculate prerendered draw instructions (X position based on keyboard layout)
         * @param {HTMLCanvasElement} canvas - The canvas
         * @param {Object} keyRenderInfo - Keyboard layout info
         * @param {string} letter - The note letter
         * @returns {Object} Draw instructions with x position
         */
        getPrerendered: function(canvas, keyRenderInfo, letter) {
            const maxWidth = canvas.width;
            const maxCharacterWidth = maxWidth / 10;
            const borderWidthHalf = (maxWidth / 20) - 3;

            return {
                x: Math.floor(
                    (keyRenderInfo[letter].column * maxCharacterWidth) +
                    (borderWidthHalf / 2) +
                    (keyRenderInfo[letter].row * (borderWidthHalf / 5))
                )
            };
        },

        /**
         * Calculate full draw instructions for a note
         * @param {HTMLCanvasElement} canvas - The canvas
         * @param {Object} canvasNote - Note object with time, duration, letter
         * @param {Object} currentScore - Score tracking with keyScores
         * @param {number} now - Current time
         * @param {number} visiblePast - Past visibility boundary
         * @param {Object} noteLetterCache - Pre-rendered letter canvases
         * @returns {Object} Complete draw instructions
         */
        calculate: function(canvas, canvasNote, currentScore, now, visiblePast, noteLetterCache) {
            const maxHeight = canvas.height;
            const maxSecondHeight = maxHeight / 10;

            let color = "blue";
            let cachedLetterCanvas = null;
            let cachedLetterSet = null;

            if (noteLetterCache && noteLetterCache[canvasNote.letter]) {
                cachedLetterSet = noteLetterCache[canvasNote.letter];
                cachedLetterCanvas = cachedLetterSet.unplayedNoteCanvas;
                color = cachedLetterSet.unplayedNoteCanvas.fillStyle;
            }

            if (currentScore.keyScores[canvasNote.id]) {
                const tag = currentScore.keyScores[canvasNote.id].tag;
                if (noteLetterCache && noteLetterCache[canvasNote.letter]) {
                    switch (tag) {
                        case "good":
                            cachedLetterCanvas = cachedLetterSet.goodNoteCanvas;
                            break;
                        case "ok":
                            cachedLetterCanvas = cachedLetterSet.okNoteCanvas;
                            break;
                        case "bad":
                            cachedLetterCanvas = cachedLetterSet.badNoteCanvas;
                            break;
                        default:
                            break;
                    }
                }
                switch (tag) {
                    case "good":
                        color = "green";
                        break;
                    case "ok":
                        color = "yellow";
                        break;
                    case "bad":
                        color = "red";
                        break;
                    default:
                        break;
                }
            }

            return {
                letter: canvasNote.letter,
                border: canvasNote.time > visiblePast
                    ? canvasNote.duration * maxSecondHeight
                    : (canvasNote.time + canvasNote.duration - visiblePast) * maxSecondHeight,
                x: canvasNote.x,
                y: Math.floor(maxHeight - ((canvasNote.time - visiblePast > 0 ? canvasNote.time - visiblePast : 0) * (maxSecondHeight + 1))),
                color: color,
                cachedLetterCanvas: cachedLetterCanvas
            };
        }
    };
}
