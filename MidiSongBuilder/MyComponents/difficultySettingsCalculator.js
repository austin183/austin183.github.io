function getDifficultySettingsCalculator(){
var statCalculators = {
    calculateMedian: function(arr) {
        const sortedArr = arr.slice().sort((a, b) => a - b);
        const midIndex = Math.floor(sortedArr.length / 2);
        return sortedArr[midIndex];
    },
    calculateWeightedAverage: function (keys, values) {
        const totalValue = keys.reduce((acc, key) => acc + values[key], 0);
        const weightedSum = keys.reduce((acc, key) => acc + values[key] * parseFloat(key), 0);
        return weightedSum / totalValue;
    },
    getQuantile: function(quantile, stats) {
        var keys = Object.keys(stats);
        var expandedArray = [];
      
        // Expand the object into an array
        keys.forEach(function(key) {
          for (var i = 0; i < stats[key]; i++) {
            expandedArray.push(parseFloat(key));
          }
        });
      
        // Sort the array in ascending order
        expandedArray.sort((a, b) => a - b);
      
        // Calculate the index of the desired quantile
        var index = Math.floor(quantile * expandedArray.length);
      
        // Return the value at that index
        return expandedArray[index];
    },
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
        return {
            noteDistanceStats: noteDistanceStats,
            noteDurationStats: noteDurationStats,
            totalNote: totalNotes
        };
    }
};

return {
    getDifficultiesForSongByQuantiles: function(song, invertedKeyNoteMap){
        const noteDistribution = statCalculators.gatherNoteDistributions(song, invertedKeyNoteMap);
        const distanceQuantiles = [0.65, 0.50, 0.40, .25];
        const durationQuantiles = [0.35, 0.30, 0.15, .15];
        const absoluteMinimumDistance = .17; //This is to keep the game from becoming overwhelming for some songs.
        
        const distanceQuantileValues = distanceQuantiles.map(q => statCalculators.getQuantile(q, noteDistribution.noteDistanceStats));
        const durationQuantileValues = durationQuantiles.map(q => statCalculators.getQuantile(q, noteDistribution.noteDurationStats));
        return {
          "easy": {
            difficultyKey: "easy",
            minNoteDistance: distanceQuantileValues[0] < absoluteMinimumDistance ? absoluteMinimumDistance : distanceQuantileValues[0],
            minNoteDuration: durationQuantileValues[0]
          },
          "normal": {
            difficultyKey: "normal",
            minNoteDistance: distanceQuantileValues[1] < absoluteMinimumDistance ? absoluteMinimumDistance : distanceQuantileValues[1],
            minNoteDuration: durationQuantileValues[1]
          },
          "hard": {
            difficultyKey: "hard",
            minNoteDistance: distanceQuantileValues[2] < absoluteMinimumDistance ? absoluteMinimumDistance : distanceQuantileValues[2],
            minNoteDuration: durationQuantileValues[2]
          },
          "crazy": {
            difficultyKey: "crazy",
            minNoteDistance: distanceQuantileValues[3] < absoluteMinimumDistance ? absoluteMinimumDistance : distanceQuantileValues[3],
            minNoteDuration: durationQuantileValues[3]
          }
        };
    },
    getDifficultiesForSongByMedianDistanceAndWeightedAverage: function(song, invertedKeyNoteMap){
        const noteDistribution = statCalculators.gatherNoteDistributions(song, invertedKeyNoteMap);
        const absoluteMinimumDistance = .17; //This is to keep the game from becoming overwhelming for some songs.

        // Calculate median note distance
        const noteDistances = Object.keys(noteDistribution.noteDistanceStats).map(key => parseFloat(key));
        const medianNoteDistance = statCalculators.calculateMedian(noteDistances);

        // Calculate weighted average note duration
        const noteDurations = Object.keys(noteDistribution.noteDurationStats);
        const weightedAverageDuration = statCalculators.calculateWeightedAverage(noteDurations, noteDistribution.noteDurationStats);

        return {
            "easy": {
                difficultyKey: "easy",
                minNoteDistance: (medianNoteDistance * 1.1) < absoluteMinimumDistance ? absoluteMinimumDistance : (medianNoteDistance * 1.1),
                minNoteDuration: weightedAverageDuration / 3.3
            },
            "normal": {
                difficultyKey: "normal",
                minNoteDistance: (medianNoteDistance * 1) <  absoluteMinimumDistance ? absoluteMinimumDistance : (medianNoteDistance * 1),
                minNoteDuration: weightedAverageDuration / 4
            },
            "hard": {
                difficultyKey: "hard",
                minNoteDistance: (medianNoteDistance * .9) <  absoluteMinimumDistance ? absoluteMinimumDistance : (medianNoteDistance * .9),
                minNoteDuration: weightedAverageDuration / 4
            },
            "crazy": {
                difficultyKey: "crazy",
                minNoteDistance: (medianNoteDistance * .7)  <  absoluteMinimumDistance ? absoluteMinimumDistance : (medianNoteDistance * .7),
                minNoteDuration: weightedAverageDuration / 5
            }
        };
    }
};
}