function getSongNoteRenderer(){
    var renderer = {
        getNoteDrawInstructions: function(canvas, canvasNote, currentScore, now, visiblePast, keyRenderInfo){
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
            var maxWidth = canvas.width;
            //We have 10 keys to stretch across the maxWidth
            var maxCharacterWidth = maxWidth / 10;
            //We have to cover 10 seconds with the height
            var maxSecondHeight = maxHeight / 10;
            var borderWidthHalf = (canvas.width / 20) - 3;
            var color = "blue";
            if(currentScore.keyScores[canvasNote.id]){
                var tag = currentScore.keyScores[canvasNote.id].tag;
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
                x: Math.floor((keyRenderInfo[canvasNote.letter].column * maxCharacterWidth) + borderWidthHalf),
                //The vertial position of the letter, based on how far away it is from now
                y: Math.floor(maxHeight - ((canvasNote.time - visiblePast > 0 ? canvasNote.time - visiblePast: 0) * (maxSecondHeight + 1))),
                color: color
            };

        },
        drawNote: function(canvas, ctx, noteDrawInstructions) {
            var x = noteDrawInstructions.x;
            var y = noteDrawInstructions.y;
            var borderWidthHalf = (canvas.width / 20) - 3;
            var borderOffset = x + (borderWidthHalf - (borderWidthHalf / 2) );

            // Set font style and fill color for the letter
            ctx.font = "18px Georgia";
            ctx.fillStyle = noteDrawInstructions.color;

            // Draw the note letter at the calculated position
            ctx.fillText(noteDrawInstructions.letter.toUpperCase(), x, y - 2); // Assuming the height of the letter is about 20 pixels
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
            ctx.moveTo(leftBorder, y - borderHeight); //Starting at border height and going down
            ctx.lineTo(leftBorder, y); // Starting point a bit left of the letter
            ctx.lineTo(rightBorder, y); // Ending point a bit right of the letter
            ctx.lineTo(leftBorder, y); //Go back to not make a whole thing
            ctx.closePath();
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
        }
    };

    return {
        invertKeyNoteMap: function(keyNoteMap){
            var invertedKeyNoteMap = {};
            for(var key in keyNoteMap){
                invertedKeyNoteMap[keyNoteMap[key]] = key;
            }
            return invertedKeyNoteMap;
        },
        renderSongNotes: function(song, keyNoteMap){
            var renderedSongNotes = "";
            var renderedSongNotesOnKeyMap = "";
            var invertedKeyNoteMap = this.invertKeyNoteMap(keyNoteMap);

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
        renderNotesPlaying: function(canvas, song, currentScore, invertedKeyNoteMap, keyRenderInfo, now, visiblePast){
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
                    var noteDrawInstructions = renderer.getNoteDrawInstructions(canvas, canvasNote, currentScore, now, visiblePast, keyRenderInfo);
                    notesToPlay += " " + keyNote + " (time: " + note.time + ") (end: " + (note.time + note.duration) + ") " +
                        "(x: " + noteDrawInstructions.x + ") (y: " + noteDrawInstructions.y + ")";
                }
            }
            return notesToPlay;
        },
        renderNotesPlayingForCanvas: function(canvas, ctx, visibleField, currentScore, keyRenderInfo, now, visiblePast, visibleFuture, earliestNoteIndex){
            //Render the visibleField to the canvas
            for(var i = earliestNoteIndex; i < visibleField.length; i++){
                const canvasNote = visibleField[i];
                if(canvasNote.time + canvasNote.duration >= visiblePast && canvasNote.time <= visibleFuture){
                    //Create new note and calculate position for it
                    var noteDrawInstructions = renderer.getNoteDrawInstructions(canvas, canvasNote, currentScore, now, visiblePast, keyRenderInfo);
                    renderer.drawNote(canvas, ctx, noteDrawInstructions);
                }                
                if(canvasNote.time > visibleFuture){
                    break;
                }
            }
        },
        renderNowLine: function(canvas, ctx){
            renderer.drawNowLine(canvas, ctx);
        }
    };
}