export function getToneHelper(Tone){
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

        buildSynths: function(params, synthArray, maxSynths){
            try {
                if(synthArray.length > 0){
                    for (let i = synthArray.length - 1; i >= 0; i--) {
                        synthArray[i].dispose();
                        synthArray.splice(i,1);
                    }
                }

                for (let i = 0; i < maxSynths; i++) {
                    const synth = new Tone.FMSynth( params ).toDestination();
                    synthArray.push(synth);
                }
            } catch (error) {
                console.error('Error building synths:', error);
                throw error;
            }
        }
    }
}