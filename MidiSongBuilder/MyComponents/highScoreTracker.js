function getHighScoreTracker(){
    return {
        getHighScore: function(midiFileName, difficulty) {
            var key = midiFileName + "_" + difficulty;
            var value = localStorage.getItem(key);
            if(value == null){
              return "";
            }
            return value;            
        },
        setHighScore: function(midiFileName, difficulty, highScore) {
          debugger;
          var key = midiFileName + "_" + difficulty;
          const currentHighScore = localStorage.getItem(key);
          if(currentHighScore == null || parseInt(currentHighScore) < highScore){
            localStorage.setItem(key, highScore.toString());
          }
        }
    };
}