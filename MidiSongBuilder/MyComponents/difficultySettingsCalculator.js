function getDifficultySettingsCalculator(){
var statCalculators = {
    gatherNoteDistributions: function(song, invertedKeyNoteMap){
        var noteDistanceStats = {};
        var noteDurationStats = {};
        var defaultPreviousNote = {
            time: 0,
            duration: 0
        };
        var totalNotes = 0;
        var previousNote = defaultPreviousNote;
        for (var i = 0; i < song.length; i++) {
            var currentNote = song[i];                
            var currentNoteDistance = (currentNote.time - (previousNote.time + previousNote.duration)).toFixed(2);
            if(invertedKeyNoteMap[currentNote.name] !== undefined && currentNoteDistance >= 0){
                var currentNoteDuration = currentNote.duration.toFixed(2);
                
                if(noteDurationStats[currentNoteDuration]){
                    noteDurationStats[currentNoteDuration]++;
                }
                else{
                    noteDurationStats[currentNoteDuration] = 1;
                }
                if(noteDistanceStats[currentNoteDistance]){
                    noteDistanceStats[currentNoteDistance]++;
                }
                else{
                    noteDistanceStats[currentNoteDistance] = 1;
                }
                totalNotes++;
                previousNote = currentNote;
            }                
        }
        const sortedNoteDistanceStats = Object.keys(noteDistanceStats).sort().reduce((acc, key) => {
            acc[key] = noteDistanceStats[key];
            return acc;
        }, {});
        noteDistanceStats = sortedNoteDistanceStats;

        const sortedNoteDurationStats = Object.keys(noteDurationStats).sort().reduce((acc, key) => {
            acc[key] = noteDurationStats[key];
            return acc;
        }, {});
        noteDurationStats = sortedNoteDurationStats;

        return {
            noteDistanceStats: noteDistanceStats,
            noteDurationStats: noteDurationStats,
            totalNote: totalNotes
        };
    }
};

return {
    getSongStats: function(song, invertedKeyNoteMap){
        return statCalculators.gatherNoteDistributions(song, invertedKeyNoteMap);
    },
    getTargetVisibleField: function(targetNotesPerMinute, song, invertedKeyNoteMap, visibleFieldFilterer, keyRenderInfo, notesCanvas, songNoteRenderer, songEnd){
        const noteDistribution = statCalculators.gatherNoteDistributions(song, invertedKeyNoteMap);
        
        // Initialize best result
        let allCombinationsWithin10NotesPerMinute = [];
        let bestResult = null;
    
        // Iterate over all combinations of distances and durations
        Object.keys(noteDistribution.noteDistanceStats).sort((a, b) => parseFloat(b) - parseFloat(a)).forEach(distance => {
            if (parseFloat(distance) <= 0.6) {
                Object.keys(noteDistribution.noteDurationStats).forEach(duration => {                    
                    if (parseFloat(duration) <= 0.6) {
                        // Calculate visible field
                        const visibleField = visibleFieldFilterer.filterToFullVisibleField(song, parseFloat(distance), parseFloat(duration), invertedKeyNoteMap, keyRenderInfo, notesCanvas, songNoteRenderer);
                        const currentNotesPerMinute = Math.floor((visibleField.length / songEnd) * 60);
                        const currentDistanceToTarget = Math.abs(currentNotesPerMinute - targetNotesPerMinute);
                        if(currentDistanceToTarget < 10){
                            allCombinationsWithin10NotesPerMinute.push({
                                notesPerMinute: currentNotesPerMinute,
                                minNoteDistance: parseFloat(distance),
                                minNoteDuration: parseFloat(duration),
                                visibleField: visibleField
                            });
                        }
                        if (bestResult === null || currentDistanceToTarget < Math.abs(bestResult.notesPerMinute - targetNotesPerMinute)) {
                            bestResult = {
                                notesPerMinute: currentNotesPerMinute,
                                minNoteDistance: distance,
                                minNoteDuration: duration,
                                visibleField: visibleField
                            };
                        }
                    }
                });
            }
        });
    
        //return arrayElement with greatest minNoteDistance
        if (allCombinationsWithin10NotesPerMinute.length > 0) {
            debugger;
            return allCombinationsWithin10NotesPerMinute.reduce((maxMinNoteDistanceObject, currentObject) => {
                if (currentObject.minNoteDistance > maxMinNoteDistanceObject.minNoteDistance) {
                    return currentObject;
                }
                return maxMinNoteDistanceObject;
            }, allCombinationsWithin10NotesPerMinute[0]);
        } else {
            // handle the case when the array is empty
            return bestResult; // or any other value that makes sense for your application
        }
    }
};
}