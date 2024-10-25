function getVisibleFieldFilterer(){
    return {
        filterToVisibleField: function(song, minNoteDistance, minDuration, pastLimit, bufferFutureLimit, futureLimit, now, invertedKeyNoteMap, keyCount) {
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
                var noteEnd = note.time + note.duration;
                //Fast Forward to the section of song playing
                if (pastLimit > noteEnd) {
                    continue;
                }

                //Build dataset for visible field
                else if (bufferFutureLimit >= noteEnd) {
                    var keyNote = invertedKeyNoteMap[note.name];
                    if (!keyNote) {
                        continue;
                    }

                    var canvasNote = {
                        duration: note.duration,
                        time: note.time,
                        letter: keyNote,
                        id: note.name + "_" + note.time
                    };
                    visibleField.push(canvasNote);
                }
                else {
                    break;
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

            //Remove notes that ended before now
            visibleField = visibleField.filter(function(note) {
                return note.time + note.duration >= now && note.time + note.duration <= futureLimit;
            });  

            return visibleField;
        }
    };
}