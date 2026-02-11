function getSongNoteRenderer(keyNoteMapService) {
    // Validate required dependency
    if (!keyNoteMapService) {
        throw new Error('SongNoteRenderer requires a KeyNoteMapService instance. Please pass getKeyNoteMapService() to the constructor.');
    }

    // Store service as private variable (closure)
    var _service = keyNoteMapService;

    var renderer = {
        getPrerenderedDrawInstructions: function(canvas, keyRenderInfo, note, letter){
            var maxHeight = canvas.height;
            var maxWidth = canvas.width;
            //We have 10 keys to stretch across the maxWidth
            var maxCharacterWidth = maxWidth / 10;
            var borderWidthHalf = (maxWidth / 20) - 3;

            var prerenderedInstructions = {
                x: Math.floor((keyRenderInfo[letter].column * maxCharacterWidth) + (borderWidthHalf / 2) + (keyRenderInfo[letter].row * ((borderWidthHalf / 5))) )
            };
            return prerenderedInstructions;
        },
        getNoteDrawInstructions: function(canvas, canvasNote, currentScore, now, visiblePast, noteLetterCache){
            /*
            Should draw the character closer to the bottom when the `canvasNote.time`
            is closer to `now`. The character should have a border that stretches above
            it, according to the `canvasNote.duration`.
            If the `canvasNote.time` is less than `now`, but the `canvasNote.time` + `canvasNote.duration`
            is greater than `now`, the character should show at the bottom of the canvas
            with a border that shrinks from the top as `canvasNote.time` + `canvasNote.duration`
            approaches `now`
            */
            var maxHeight = canvas.height;
            //We have to cover 10 seconds with the height
            var maxSecondHeight = maxHeight / 10;
            var color = "blue";
            var cachedLetterCanvas = null;
            var cachedLetterSet = null;
            if(noteLetterCache){
                if(noteLetterCache[canvasNote.letter]){
                    cachedLetterSet = noteLetterCache[canvasNote.letter];
                    cachedLetterCanvas = cachedLetterSet.unplayedNoteCanvas;
                    color = cachedLetterSet.unplayedNoteCanvas.fillStyle;
                }
            }
            if(currentScore.keyScores[canvasNote.id]){
                var tag = currentScore.keyScores[canvasNote.id].tag;
                if(noteLetterCache){
                    if(noteLetterCache[canvasNote.letter]){
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
                //The letter to display
                letter: canvasNote.letter,
                //The height of the border around the letter
                border: canvasNote.time > visiblePast ? canvasNote.duration * maxSecondHeight : (canvasNote.time + canvasNote.duration - visiblePast) * maxSecondHeight,
                //The horizontal position of the letter, based on where the letter is on the keyboard
                x: canvasNote.x,
                //The vertial position of the letter, based on how far away it is from now
                y: Math.floor(maxHeight - ((canvasNote.time - visiblePast > 0 ? canvasNote.time - visiblePast: 0) * (maxSecondHeight + 1))),
                color: color,
                cachedLetterCanvas: cachedLetterCanvas
            };

        },
        drawNote: function(canvas, ctx, noteDrawInstructions) {
            var x = noteDrawInstructions.x;
            var y = noteDrawInstructions.y;
            var borderWidthHalf = (canvas.width / 20) - 3;
            var borderOffset = x + (borderWidthHalf - (borderWidthHalf / 2) );

            // Draw the note letter at the calculated position
            ctx.drawImage(noteDrawInstructions.cachedLetterCanvas.canvas, x, y - 23);
            
            // Set border style and fill color
            ctx.strokeStyle = noteDrawInstructions.color;
            ctx.lineWidth = 1;

            // Calculate border coordinates
            var borderHeight = noteDrawInstructions.border; // The border should be from top to bottom, so we use the border value as height

            // Draw the border above the note
            var leftBorder = Math.floor(borderOffset - borderWidthHalf);
            var rightBorder = Math.floor(borderOffset + borderWidthHalf);
            ctx.beginPath();
            ctx.setLineDash([]);
            ctx.rect(leftBorder, y - borderHeight, 1, borderHeight); // Stroke a vertical line
            ctx.moveTo(leftBorder, y);
            ctx.lineTo(rightBorder, y);
            ctx.stroke();
        },
        drawNowLine: function(canvas, ctx){
            var maxHeight = canvas.height;
            var maxWidth = canvas.width;
            //We have to cover 10 seconds with the height
            var maxSecondHeight = maxHeight / 10;
            var nowLineHeight = maxHeight - maxSecondHeight;
            ctx.beginPath();
            ctx.strokeStyle = "green";
            ctx.lineWidth = 2;
            ctx.setLineDash([15, 15]);
            ctx.moveTo(0, nowLineHeight);
            ctx.lineTo(maxWidth, nowLineHeight);
            ctx.stroke();
        },
        drawCacheNote: function(key, fillStyle, keyInfo){
            const tempUnplayedCanvas = document.createElement('canvas');
            tempUnplayedCanvas.width = 28;
            tempUnplayedCanvas.height = 28;
            const tempUnplayedCtx = tempUnplayedCanvas.getContext('2d');
            tempUnplayedCtx.font = "16px Verdana";
            if(fillStyle == "blue"){
                //Get bluish color based on key.row value, 0 - 3
                //pretty dark rgb(52, 18, 224)
                //darker rgb(17, 21, 105)
                //light rgb(3, 128, 231)
                //midnightish rgb(66, 37, 211)
                switch (keyInfo.row) {
                    case 0: // Dark Blue
                        fillStyle = "#031f57"; // A deep, rich blue
                        break;
                    case 1: // Medium-Blue
                        fillStyle = "#025b97"; // A gentle, soothing blue
                        break;
                    case 2: // Light-Medium Blue
                        fillStyle = "#0077c7"; // A balanced, calming blue
                      
                        break;
                    case 3: // Light Blue
                        fillStyle = "#51bbe6"; // A pale, serene blue
                        break;
                  }

            }
            tempUnplayedCtx.fillStyle = fillStyle;
            tempUnplayedCtx.fillText(key.toUpperCase(), 0,20);
            return {
                canvas: tempUnplayedCanvas,
                fillStyle: fillStyle
            };
        }
    };

    return {
        renderSongNotes: function(song, keyNoteMap) {
            var renderedSongNotes = "";
            var renderedSongNotesOnKeyMap = "";
            // Use the service directly
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
        //Need to rethink this with canvas
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
                    var noteDrawInstructions = renderer.getNoteDrawInstructions(canvas, canvasNote, currentScore, now, visiblePast);
                    notesToPlay += " " + keyNote + " (time: " + note.time + ") (end: " + (note.time + note.duration) + ") " +
                        "(x: " + noteDrawInstructions.x + ") (y: " + noteDrawInstructions.y + ")";
                }
            }
            return notesToPlay;
        },
        renderNotesPlayingForCanvas: function(canvas, ctx, visibleField, currentScore, now, visiblePast, visibleFuture, earliestNoteIndex, noteLetterCache){
            //Render the visibleField to the canvas
            for(var i = earliestNoteIndex; i < visibleField.length; i++){
                const canvasNote = visibleField[i];
                if(canvasNote.time + canvasNote.duration >= visiblePast && canvasNote.time <= visibleFuture){
                    //Create new note and calculate position for it
                    var noteDrawInstructions = renderer.getNoteDrawInstructions(canvas, canvasNote, currentScore, now, visiblePast, noteLetterCache);
                    renderer.drawNote(canvas, ctx, noteDrawInstructions);
                }
                if(canvasNote.time > visibleFuture){
                    break;
                }
            }
        },
        renderNowLine: function(canvas, ctx){
            renderer.drawNowLine(canvas, ctx);
        },
        getPrerenderedDrawInstructions: function(canvas, keyRenderInfo, note, letter){
            return renderer.getPrerenderedDrawInstructions(canvas, keyRenderInfo, note, letter);
        },
        buildSongNoteLetterCache: function(keyRenderInfo){
            var cache = {};
            for(var key in keyRenderInfo){
                const keyInfo = keyRenderInfo[key];
                const tempUnplayedCanvas = renderer.drawCacheNote(key, "blue", keyInfo);
                const tempGoodCanvas = renderer.drawCacheNote(key, "green", keyInfo);
                const tempOkCanvas = renderer.drawCacheNote(key, "yellow", keyInfo);
                const tempBadCanvas = renderer.drawCacheNote(key, "red", keyInfo);

                cache[key] = {
                    unplayedNoteCanvas: tempUnplayedCanvas,
                    goodNoteCanvas: tempGoodCanvas,
                    okNoteCanvas: tempOkCanvas,
                    badNoteCanvas: tempBadCanvas
                };
            }
            return cache;
        },
        renderFinalScore: function(canvas, ctx, total, goodCount, okCount, badCount, missedCount) {
            var maxHeight = canvas.height;
            var maxWidth = canvas.width;
            var rowHeight = canvas.height / 10;
            var initialXPosition = (canvas.width / 10) * 2;
            var initialYPosition = rowHeight * 2;
            ctx.font = "20px Georgia";

            // Create gradient
            var gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop("0", "magenta");
            gradient.addColorStop("0.5", "blue");
            gradient.addColorStop("1.0", "red");

            // Fill with gradient
            ctx.fillStyle = gradient;
            ctx.fillText("Total: " + total, initialXPosition, initialYPosition);

            ctx.fillStyle = "green";
            ctx.fillText("Good: " + goodCount, initialXPosition, initialYPosition + rowHeight + 10);

            ctx.fillStyle = "yellow";
            ctx.fillText("OK: " + okCount, initialXPosition, initialYPosition + (rowHeight * 2) + 20);

            ctx.fillStyle = "red";
            ctx.fillText("Bad: " + badCount, initialXPosition, initialYPosition + (rowHeight * 3) + 30);

            ctx.fillStyle = "blue";
            ctx.fillText("Missed: " + missedCount, initialXPosition, initialYPosition + (rowHeight * 4) + 40);
        }
    };
}