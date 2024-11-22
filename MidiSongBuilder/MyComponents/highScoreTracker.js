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
          var key = midiFileName + "_" + difficulty;
          const currentHighScore = localStorage.getItem(key);
          if(currentHighScore == null || parseInt(currentHighScore) < highScore){
            localStorage.setItem(key, highScore.toString());
          }
        },
        exportHighScoresToClipBoardAsJsonString: function(){
          const highScores = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes("_")) { // assuming the key format is "midiFileName_difficulty"
              highScores[key] = localStorage.getItem(key);
            }
          }
          const jsonStr = JSON.stringify(highScores, null, 2); // pretty-print with indentation
          
          navigator.clipboard.writeText(jsonStr).then(() => {
            console.log("High scores copied to clipboard as JSON string");
          }).catch(err => {
            console.error("Failed to copy high scores to clipboard: ", err);
            alert('JSON string was not copied to clipboard.  Please try to copy it by hand here: ```' + jsonStr + '```');
          });
        }
    };
}