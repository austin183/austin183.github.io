function getScoreKeeper(){
    var goodRange = .15; //within 150 milliseconds of the note.time is good
    var okRange = .4; //within 400 milliseconds of the note.time is ok
    var badRange = .7; //within 700 milleseconds is bad but still notable
    var goodPoints = 100;
    var okPoints = 50;
    var score = {
        total: 0,
        keyScores: {}
    };
    var previousPressedKeys = {};
    return {
        calculateNewScore: function(visibleField, pressedKeys, now){


            //For each pressedKey, see if it was previously pressed
            //If it was not previously pressed, calculate its distance
            //to the note in the visibleField with note.time closest to now
            //if the note is within one of the ranges, add points for the range
            //and add the note to keyScores by note.id and points
            var newPressedKeys = {};
            for(var key in pressedKeys){
                if(!pressedKeys[key] == true){
                    continue; //This is not really a pressedKey, so no need to process it further.
                }
                newPressedKeys[key] = true;
                var closestNoteId = "";
                var closestNoteTime = 999;
                if(!previousPressedKeys[key]){
                    for(var i = 0; i < visibleField.length; i++){
                        var canvasNote = visibleField[i];
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
                    if(!score.keyScores[closestNoteId]){
                        if(closestNoteTime <= goodRange){
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
            for(var i = 0; i < visibleField.length; i++){
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