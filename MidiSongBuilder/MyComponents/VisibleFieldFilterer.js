function getVisibleFieldFilterer(){
    return {
        filterToFullVisibleField(song, minNoteDistance, minDuration, invertedKeyNoteMap, keyCount, keyRenderInfo, canvas, songNoteRenderer){
            var visibleField = [];
            var defaultPreviousNote = {
                time: -10,
                duration: 0
            };
            for (var i = 0; i < song.length; i++) {
                var note = song[i];
                var previousNote = defaultPreviousNote;
                if(visibleField.length > 0){
                    previousNote = visibleField[visibleField.length - 1];
                }
                var noteDistance = note.time - (previousNote.time + previousNote.duration);

                if(noteDistance < minNoteDistance){
                    continue; //Skipping notes too close to the previous note.
                }
                if(note.duration < minDuration){
                    continue; //Skipping notes that are too short
                }
                
                //Build dataset for visible field
                else {
                    var keyNote = invertedKeyNoteMap[note.name];
                    if (!keyNote) {
                        continue;
                    }

                    var prerenderedDrawInstructions = null;
                    if(songNoteRenderer && canvas && keyRenderInfo){
                        prerenderedDrawInstructions = songNoteRenderer.getPrerenderedDrawInstructions(canvas, keyRenderInfo, note, keyNote);
                    }                    

                    var canvasNote = {
                        duration: note.duration,
                        time: note.time,
                        letter: keyNote.toUpperCase(),
                        id: note.name + "_" + note.time,
                        x: prerenderedDrawInstructions.x
                    };
                    visibleField.push(canvasNote);
                }
            }

            //Remove overlaps greater than the keyCount
            for (var j = visibleField.length - 1; j >= 0; j--) {
                var canvasNote = visibleField[j];
                var overlap = visibleField.filter(n => n.id !== canvasNote.id && (n.time < canvasNote.time + canvasNote.duration && n.time + n.duration > canvasNote.time));
                if (overlap.length >= keyCount) {
                    //Remove overlapping note
                    visibleField.splice(visibleField.indexOf(canvasNote), 1);
                }
            }
            return visibleField;
        }
    };
}