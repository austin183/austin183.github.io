import getScoringSettings from './scoringSettings.js';

function getScoreKeeper(scoringSettings) {
    var settings = scoringSettings || getScoringSettings().default;
    var goodRange = settings.goodRange; //within 150 milliseconds of the note.time is good
    var okRange = settings.okRange; //within 400 milliseconds of the note.time is ok
    var badRange = settings.badRange; //within 700 milleseconds is bad but still notable
    var goodPoints = settings.goodPoints;
    var okPoints = settings.okPoints;
    var score = {
        total: 0,
        keyScores: {}
    };
    var previousPressedKeys = {};
    return {
        /**
         * Reset the score keeper state for a new game
         */
        reset: function() {
            score.total = 0;
            score.keyScores = {};
            previousPressedKeys = {};
        },

        calculateNewScore: function(visibleField, pressedKeys, now, earliestNoteIndex, visibleFuture){
            if (window.location.search === '?debug') {
                const activeKeys = Object.keys(pressedKeys || {}).filter(k => pressedKeys[k] === true);
                console.log('ScoreKeeper.calculateNewScore called:', {
                    now: now,
                    visibleFieldLength: visibleField?.length,
                    activeKeys: activeKeys,
                    allPressedKeys: pressedKeys || {},
                    previousPressedKeys: previousPressedKeys || {},
                    earliestNoteIndex: earliestNoteIndex,
                    visibleFuture: visibleFuture,
                });
            }

            //For each pressedKey, see if it was previously pressed
            //If it was not previously pressed, calculate its distance
            //to the note in the visibleField with note.time closest to now
            //if the note is within one of the ranges, add points for the range
            //and add the note to keyScores by note.id and points
            var newPressedKeys = {};
            for(var key in pressedKeys){
                if(pressedKeys[key] !== true){
                    continue; //This is not really a pressedKey, so no need to process it further.
                }
                newPressedKeys[key] = true;
                var closestNoteId = "";
                var closestNoteTime = 999;
                if(!previousPressedKeys[key]){
                    for(var i = earliestNoteIndex; i < visibleField.length; i++){
                        var canvasNote = visibleField[i];
                        if(canvasNote.time > visibleFuture){
                            break;
                        }
                        if(canvasNote.letter == key){
                            var distanceToNow = canvasNote.time - now;
                            if(Math.abs(distanceToNow) < Math.abs(closestNoteTime) ){
                                closestNoteTime = distanceToNow;
                                closestNoteId = canvasNote.id;
                            }
                            else{
                                break;
                            }
                        }
                    }
if (window.location.search === '?debug' && closestNoteId) {
                         console.log('Found matching note:', { 
                             key, 
                             closestNoteId, 
                             closestNoteTime,
                             goodRange, 
                             okRange, 
                             badRange,
                             inGoodRange: closestNoteTime <= goodRange,
                             inOkRange: closestNoteTime <= okRange,
                             inBadRange: closestNoteTime <= badRange,
                             alreadyScored: !!score.keyScores[closestNoteId]
                         });
                     }
if(!score.keyScores[closestNoteId]){
                         if(closestNoteTime <= goodRange){
                             if (window.location.search === '?debug') { console.log('SCORING GOOD!', closestNoteTime, '<=', goodRange); }
                             score.total += goodPoints;
                            score.keyScores[closestNoteId] = {
                                points: goodPoints,
                                tag: "good"
                            };
                        }
                        else if(closestNoteTime <= okRange){
                            score.total += okPoints;
                            score.keyScores[closestNoteId] = {
                                points: okPoints,
                                tag: "ok"
                            };
                        }
                        else if(closestNoteTime <= badRange){
                            score.keyScores[closestNoteId] = {
                                points: 0,
                                tag: "bad"
                            };
                        }
                    }
                }
            }

            //Now to figure out which keys have been missed
            for(var i = earliestNoteIndex; i < visibleField.length; i++){
                var canvasNote = visibleField[i];
                var keyDistanceToNow = now - canvasNote.time;
                if(!score.keyScores[canvasNote.id]){
                    if(keyDistanceToNow > badRange){
                        score.keyScores[canvasNote.id] = {
                            points: 0,
                            tag: "missed"
                        };
                    }
                }
                if(canvasNote.time > now){
                    break;
                }
            }


            previousPressedKeys = newPressedKeys;
            return score;
        },
        getCounts: function(){
            var counts = {
                goodCount: 0,
                okCount: 0,
                badCount: 0,
                missedCount: 0
            };
            for(var key in score.keyScores){
                var keyScore = score.keyScores[key];
                switch (keyScore.tag){
                    case 'good':
                        counts.goodCount++;
                        break;
                    case 'ok':
                        counts.okCount++;
                        break;
                    case 'bad':
                        counts.badCount++;
                        break;
                    case 'missed':
                        counts.missedCount++;
                        break;
                }
            }
            return counts;
        }
    };
}

export default getScoreKeeper;