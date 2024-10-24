function getScoreKeeper(){
    var goodRange = .1; //within 10 milliseconds of the note.time is good
    var okRange = .2; //within 20 milliseconds of the note.time is ok
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
                if(previousPressedKeys[key]){
                    for(var i = 0; i < visibleField.length; i++){
                        var canvasNote = visibleField[i];
                        if(canvasNote.letter == key){
                            var distanceToNow = canvasNote.time > now ? canvasNote.time - now : now - canvasNote.time;
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
                            score.keyScores[closestNoteId] = goodPoints;
                        }
                        else if(closestNoteTime <= okRange){
                            score.total += okPoints;
                            score.keyScores[closestNoteId] = okPoints;
                        }
                    }
                }
            }
            previousPressedKeys = newPressedKeys;
            return score;
        }
    };
}