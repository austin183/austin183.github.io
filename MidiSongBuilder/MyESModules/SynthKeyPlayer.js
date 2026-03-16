export function getSynthKeyPlayer(){
    return {
        getFreeSynth: function(synthMap){
            var values = Object.values(synthMap);
            for (let i = 0; i < 10; i++) {
                if (!(values.includes(i))){
                    return i;
                }
            }
        },
        playNotes: function(app, pressedKeys, synthMap, synthArray){
            app.notesPlaying = "";
            var velocity = 1;
            if(app.playerVolume){
                if(app.playerVolume > 0 && app.playerVolume < 1){
                    velocity = app.playerVolume;
                }
            }
            for(var key in pressedKeys){
                if(pressedKeys[key]){
                    app.notesPlaying += " " + app.selectedKeyNoteMap.keyNoteMap[key];
                    var synthIndex = synthMap[key];
                    if(synthIndex === undefined){
                        var synthIndex = this.getFreeSynth(synthMap);
                    }
                    if(synthMap[key] !== undefined){
                        synthArray[synthIndex].triggerRelease();
                    }
                    synthArray[synthIndex].triggerAttack(app.selectedKeyNoteMap.keyNoteMap[key], ".01", velocity);
                    synthMap[key] = synthIndex;
                } else {
                    if(key in synthMap){
                        var synthIndex = synthMap[key];
                        synthArray[synthIndex].triggerAttackRelease();
                        delete synthMap[key];
                    }
                }
            }
        }
    };
}