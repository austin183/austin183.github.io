function getVisibleFieldFilterer(){
    return {
        filterToFullVisibleField(song, minNoteDistance, minDuration, invertedKeyNoteMap, keyRenderInfo, canvas, songNoteRenderer){
            if (minNoteDistance < 0 || minDuration < 0) {
                throw new Error('minNoteDistance and minDuration must be non-negative numbers');
            }
            const maxDuration = 2;
            var visibleField = [];
            var defaultPreviousNote = {
                time: -10,
                duration: 0
            };
            for (var i = 0; i < song.length; i++) {
                var currentNote = song[i];
                if (currentNote.duration >= minDuration && currentNote.duration <= maxDuration && invertedKeyNoteMap[currentNote.name] !== undefined) {
                    var previousNote = visibleField[visibleField.length - 1] || defaultPreviousNote;
                    if (currentNote.time - minNoteDistance >= previousNote.time + previousNote.duration) {
                        var prerenderedDrawInstructions = null;
                        var keyNote = invertedKeyNoteMap[currentNote.name];
                        if(songNoteRenderer && canvas && keyRenderInfo){
                            prerenderedDrawInstructions = songNoteRenderer.getPrerenderedDrawInstructions(canvas, keyRenderInfo, currentNote, keyNote);
                        }
                        // Create a new visible field element
                        var visibleFieldElement = {
                            time: currentNote.time,
                            duration: currentNote.duration,
                            letter: keyNote,
                            x: prerenderedDrawInstructions.x,
                            id: currentNote.name + "_" + currentNote.time
                        };

                        visibleField.push(visibleFieldElement);
                    }
                }
            }
            return visibleField;
        }
    };
}