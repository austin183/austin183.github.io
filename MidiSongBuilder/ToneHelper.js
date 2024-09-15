function getToneHelper(){
    return {
        getDefaultFMSynthParams: function(){
            return {
                harmonicity : 8000 ,
                modulationIndex : 10 ,
                detune : 0 ,
                oscillator : {
                    type : "triangle"
                },
                envelope : {
                    attack : 0.01 ,
                    decay : 0.01 ,
                    sustain : 1 ,
                    release : 0.5
                },
                modulation : {
                    type : "sawtooth"
                },
                modulationEnvelope : {
                    attack : 0.5 ,
                    decay : 0 ,
                    sustain : 1 ,
                    release : 0.5
                }
            }
        },
        //These are copied from - https://tonejs.github.io/docs/r13/FMSynth
        //Also for reference - https://tonejs.github.io/docs/14.9.17/interfaces/FMSynthOptions.html
        getOscillatorTypes: function(){
            return ["sine", "square", "sawtooth", "triangle"];
        },
        getCongaSynth: function(){
            return new Tone.MembraneSynth({ 
                pitchDecay: 0.008,
                octaves: 2,
                envelope: {
                    attack: 0.0006,
                    decay: 0.5,
                    sustain: 0,
                },
            }).toDestination();
        },

        buildSynths: function(params){
            //Clear the synthArray
            if(synthArray.length > 0){
                for (let i = synthArray.length - 1; i >= 0; i--) {
                    writeLog(synthArray[i]);
                    synthArray[i].dispose();
                    //delete i from array
                    synthArray.splice(i,1);
                }
            }            

            //Since people have 10 fingers, they could play 10 notes at once
            //Get synths set up for each possible finger       
            for (let i = 0; i < 10; i++) {
                synthArray.push(
                    new Tone.FMSynth( params ).toDestination()
                );
            }
        }
    }
}