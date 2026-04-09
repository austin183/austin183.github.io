import { getKeyNoteMapService } from './KeyNoteMapService.js';
import getNoteCacheBuilder from './NoteCacheBuilder.js';
import { getNowLineRenderer } from './NowLineRenderer.js';
import { getNoteDrawInstructionsCalculator } from './NoteDrawInstructions.js';
import { getThemeService } from './themeService.js';

export function getSongNoteRenderer(keyNoteMapService, themeService = null) {
    if (!keyNoteMapService) {
        throw new Error('SongNoteRenderer requires a KeyNoteMapService instance. Please pass getKeyNoteMapService() to the constructor.');
    }

    const _service = keyNoteMapService;
    const _themeService = themeService || getThemeService();
    const noteCacheBuilder = getNoteCacheBuilder();
    const nowLineRenderer = getNowLineRenderer();
    const noteDrawInstructionsCalculator = getNoteDrawInstructionsCalculator();

    var renderer = {
        drawCacheNote: function(key, fillStyle, keyInfo){
            const tempUnplayedCanvas = document.createElement('canvas');
            tempUnplayedCanvas.width = 28;
            tempUnplayedCanvas.height = 28;
            const tempUnplayedCtx = tempUnplayedCanvas.getContext('2d');
            tempUnplayedCtx.font = "16px Verdana";

            const palette = _themeService.getColorPalette();

            if(fillStyle == "blue"){
                const unplayedColors = palette.unplayed;
                fillStyle = unplayedColors[keyInfo.row] || unplayedColors[0];
            } else if (fillStyle == "green") {
                fillStyle = palette.good;
            } else if (fillStyle == "yellow") {
                fillStyle = palette.ok;
            } else if (fillStyle == "red") {
                fillStyle = palette.bad;
            }

            tempUnplayedCtx.fillStyle = fillStyle;
            tempUnplayedCtx.fillText(key.toUpperCase(), 0,20);
            return {
                canvas: tempUnplayedCanvas,
                fillStyle: fillStyle
            };
        },

        drawNote: function(canvas, ctx, noteDrawInstructions) {
            var x = noteDrawInstructions.x;
            var y = noteDrawInstructions.y;
            var borderWidthHalf = (canvas.width / 20) - 3;
            var borderOffset = x + (borderWidthHalf - (borderWidthHalf / 2) );

            ctx.drawImage(noteDrawInstructions.cachedLetterCanvas.canvas, x, y - 23);

            ctx.strokeStyle = noteDrawInstructions.color;
            ctx.lineWidth = 1;

            var borderHeight = noteDrawInstructions.border;

            var leftBorder = Math.floor(borderOffset - borderWidthHalf);
            var rightBorder = Math.floor(borderOffset + borderWidthHalf);
            ctx.beginPath();
            ctx.setLineDash([]);
            ctx.rect(leftBorder, y - borderHeight, 1, borderHeight);
            ctx.moveTo(leftBorder, y);
            ctx.lineTo(rightBorder, y);
            ctx.stroke();
        }
    };

    return {
        renderSongNotes: function(song, keyNoteMap) {
            var renderedSongNotes = "";
            var renderedSongNotesOnKeyMap = "";
            var invertedKeyNoteMap = _service.getInvertedMap(keyNoteMap);

            song.forEach(function(note){
                if(!note.note && note.name){
                    note.note = note.name;
                }
                renderedSongNotes += note.note + " ";
                var keyNote = invertedKeyNoteMap[note.note];
                if(keyNote){
                    renderedSongNotesOnKeyMap += keyNote + " ";
                }
            });

            return {
                renderedSongNotes: renderedSongNotes,
                renderedSongNotesOnKeyMap: renderedSongNotesOnKeyMap
            };
        },

        renderDebugNotesPlaying: function(canvas, song, currentScore, invertedKeyNoteMap, now, visiblePast){
            var notesToPlay = "";
            for(var i = 0; i < song.length; i++){
                var note = song[i];
                if(now > note.time + note.duration){
                    continue;
                }
                else{
                    break;
                }
            }
            var lookAheadLength = 20;
            var k = i + lookAheadLength < song.length ? i + lookAheadLength: song.length;

            for(var j = i; j < k; j++){
                var note = song[j];
                if(!note.note && note.name){
                    note.note = note.name;
                }
                var keyNote = invertedKeyNoteMap[note.name];
                if(keyNote){
                    var canvasNote = {
                        duration : note.duration,
                        time : note.time,
                        letter : keyNote,
                        id: note.name + "_" + note.time
                    };
                    var noteDrawInstructions = noteDrawInstructionsCalculator.calculate(canvas, canvasNote, currentScore, now, visiblePast);
                    notesToPlay += " " + keyNote + " (time: " + note.time + ") (end: " + (note.time + note.duration) + ") " +
                        "(x: " + noteDrawInstructions.x + ") (y: " + noteDrawInstructions.y + ")";
                }
            }
            return notesToPlay;
        },

        renderNotesPlayingForCanvas: function(canvas, ctx, visibleField, currentScore, now, visiblePast, visibleFuture, earliestNoteIndex, noteLetterCache){
            for(var i = earliestNoteIndex; i < visibleField.length; i++){
                const canvasNote = visibleField[i];
                if(canvasNote.time + canvasNote.duration >= visiblePast && canvasNote.time <= visibleFuture){
                    var noteDrawInstructions = noteDrawInstructionsCalculator.calculate(canvas, canvasNote, currentScore, now, visiblePast, noteLetterCache);
                    renderer.drawNote(canvas, ctx, noteDrawInstructions);
                }
                if(canvasNote.time > visibleFuture){
                    break;
                }
            }
        },

        renderNowLine: function(canvas, ctx){
            nowLineRenderer.draw(canvas, ctx);
        },

        getPrerenderedDrawInstructions: function(canvas, keyRenderInfo, note, letter){
            return noteDrawInstructionsCalculator.getPrerendered(canvas, keyRenderInfo, letter);
        },

        getNoteDrawInstructions: function(canvas, canvasNote, currentScore, now, visiblePast, noteLetterCache){
            return noteDrawInstructionsCalculator.calculate(canvas, canvasNote, currentScore, now, visiblePast, noteLetterCache);
        },

        buildSongNoteLetterCache: function(keyRenderInfo){
            return noteCacheBuilder.buildNoteCache(keyRenderInfo, (key, keyInfo) => {
                return {
                    unplayedNoteCanvas: renderer.drawCacheNote(key, "blue", keyInfo),
                    goodNoteCanvas: renderer.drawCacheNote(key, "green", keyInfo),
                    okNoteCanvas: renderer.drawCacheNote(key, "yellow", keyInfo),
                    badNoteCanvas: renderer.drawCacheNote(key, "red", keyInfo)
                };
            });
        },

        renderFinalScore: function(canvas, ctx, total, goodCount, okCount, badCount, missedCount) {
            var maxHeight = canvas.height;
            var maxWidth = canvas.width;
            var rowHeight = canvas.height / 10;
            var initialXPosition = (canvas.width / 10) * 2;
            var initialYPosition = rowHeight * 2;
            ctx.font = "20px Georgia";

            const palette = _themeService.getColorPalette();
            var gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop("0", palette.scoreGradient[0]);
            gradient.addColorStop("0.5", palette.scoreGradient[1]);
            gradient.addColorStop("1.0", palette.scoreGradient[2]);

            ctx.fillStyle = gradient;
            ctx.fillText("Total: " + total, initialXPosition, initialYPosition);

            ctx.fillStyle = palette.good;
            ctx.fillText("Good: " + goodCount, initialXPosition, initialYPosition + rowHeight + 10);

            ctx.fillStyle = palette.ok;
            ctx.fillText("OK: " + okCount, initialXPosition, initialYPosition + (rowHeight * 2) + 20);

            ctx.fillStyle = palette.bad;
            ctx.fillText("Bad: " + badCount, initialXPosition, initialYPosition + (rowHeight * 3) + 30);

            ctx.fillStyle = palette.missed;
            ctx.fillText("Missed: " + missedCount, initialXPosition, initialYPosition + (rowHeight * 4) + 40);
        }
    };
}
