function getChallengeScores(){
    var challengeScores = {
        //Blanked these out for now because all the difficulties and top scores changed.
    };

    return {
        getSelectedScore: function(midiFileName, difficulty) {
            var key = midiFileName + "_" + difficulty;
            if(challengeScores[key]){
                return challengeScores[key];
            }
            return "";
        }
    }
}