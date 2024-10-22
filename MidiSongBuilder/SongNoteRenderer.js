function getSongNoteRenderer(){
    var renderer = {
        getNoteDrawInstructions: function(canvas, canvasNote, now, keyRenderInfo){
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
            var maxCharacterWidth = canvas.width / 10;
            //We have to cover 10 seconds with the height
            var maxSecondHeight = canvas.height / 10;

            return {
                letter: canvasNote.letter,
                border: canvasNote.time > now ? canvasNote.duration * maxSecondHeight : (canvasNote.time + canvasNote.duration - now) * maxSecondHeight,
                //(canvasNote.time + canvasNote.duration - now) * maxSecondHeight,
                x: (keyRenderInfo[canvasNote.letter].column * (maxCharacterWidth + 1)),
                y: maxHeight - ((canvasNote.time - now > 0 ? canvasNote.time - now: 0) * (maxSecondHeight + 1))
            };

        },
        drawNote: function(ctx, noteDrawInstructions) {
            var x = noteDrawInstructions.x;
            var y = noteDrawInstructions.y;
        
            // Set font style and fill color for the letter
            ctx.font = "18px Georgia";
            ctx.fillStyle = "blue";
        
            // Draw the note letter at the calculated position
            ctx.fillText(noteDrawInstructions.letter, x, y); // Assuming the height of the letter is about 20 pixels
        
            // Set border style and fill color
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 1;
        
            // Calculate border coordinates
            var borderHeight = noteDrawInstructions.border; // The border should be from top to bottom, so we use the border value as height
        
            // Draw the border above the note
            ctx.beginPath();
            ctx.moveTo(x - 10, y); // Starting point a bit left of the letter
            ctx.lineTo(x + 10, y); // Ending point a bit right of the letter
            ctx.lineTo(x + 10, y - borderHeight); // Move up to form the border
            ctx.lineTo(x - 10, y - borderHeight); // Move back down
            ctx.closePath();
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
        renderNotesPlaying: function(song, invertedKeyNoteMap, keyRenderInfo, now){
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
                    notesToPlay += " " + keyNote;
                }
            }
            return notesToPlay;
        },
        renderNotesPlayingForCanvas: function(canvas, ctx, song, invertedKeyNoteMap, keyRenderInfo, now){
            //Set the visible field to the next 10 seconds of the song
            var futureLimit = now + 10;
            var visibleField = [];            
            for(var i = 0; i < song.length; i++){
                var note = song[i];
                var noteEnd = note.time + note.duration;
                //Fast Forward to the section of song playing
                if(now > noteEnd){
                    continue;                    
                }
                //Build dataset for visible field
                else if(futureLimit >= noteEnd){
                    if(invertedKeyNoteMap[note.name] == null){
                        continue;
                    }
                    var canvasNote = {
                        duration : note.duration,
                        time : note.time,
                        letter : invertedKeyNoteMap[note.name],
                        id: note.name + "_" + note.time
                    };
                    visibleField.push(canvasNote);
                }
                else{
                    break;
                }
            }
            //Render the visibleField to the canvas
            visibleField.forEach(canvasNote => {                
                //Create new note and calculate position for it
                var noteDrawInstructions = renderer.getNoteDrawInstructions(canvas, canvasNote, now, keyRenderInfo);
                renderer.drawNote(ctx, noteDrawInstructions);                
            });
        }
    };
    
}