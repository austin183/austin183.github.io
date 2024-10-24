function getSynthKeyPlayer(){
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
            //Reset Note Playing field on the page
            app.notesPlaying = "";
            //Evaluate each key in pressedKeys
            for(var key in pressedKeys){
                if(pressedKeys[key]){
                    //Add the note to the Notes Playing field
                    app.notesPlaying += " " + app.selectedKeyNoteMap.keyNoteMap[key];
                    //If the key is already mapped to a synth, get which synth it is
                    var synthIndex = synthMap[key];
                    if(synthIndex === undefined){
                        //If no synth already mapped, get a free one from the array
                        var synthIndex = this.getFreeSynth(synthMap);
                    }
                    //Start playing the note for the key through the synth
                    //based on the pressed key's not in the selected keyNoteMap
                    synthArray[synthIndex].triggerAttack(app.selectedKeyNoteMap.keyNoteMap[key]);
                    //Save which synth goes with the key right now
                    synthMap[key] = synthIndex;
                } else {
                    if(key in synthMap){
                        //If there was a synth playing the note for a key that was release
                        //Stop playing the note and free up the synth for a new key in the synthMap
                        var synthIndex = synthMap[key];
                        synthArray[synthIndex].triggerAttackRelease();
                        delete synthMap[key];
                    }                    
                }
            }
        }
    };
}