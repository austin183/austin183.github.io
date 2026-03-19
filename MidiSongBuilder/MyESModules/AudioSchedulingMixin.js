/**
 * AudioSchedulingMixin - Tone.js audio event scheduling
 * 
 * Used by BaseController to provide audio scheduling functionality.
 * Manages synth lifecycle and schedules MIDI notes with Tone.js.
 */

export function getAudioSchedulingMixin() {
    const synths = [];

    /**
     * Add a synth to the internal tracking array
     */
    function addSynth(synth) {
        synths.push(synth);
    }

    /**
     * Dispose all tracked synths and clear the array
     */
    function disposeAllSynths() {
        while (synths.length) {
            const synth = synths.shift();
            if (synth) {
                synth.disconnect();
                synth.dispose();
            }
        }
    }

    return {
        /**
         * Create synths and schedule audio events for all tracks
         */
        scheduleAudioEvents: function(currentMidi, gameState, trackVolume, Tone) {
            if (!currentMidi || !currentMidi.tracks) return;

            const startTime = gameState.get('startTime');
            const delay = gameState.get('delay');
            const volume = trackVolume !== undefined ? trackVolume : 1.0;

            currentMidi.tracks.forEach(function(track) {
                const synth = new Tone.PolySynth(Tone.Synth, {
                    envelope: {
                        attack: 0.02,
                        decay: 0.1,
                        sustain: 0.3,
                        release: 1,
                    },
                }).toDestination();

                addSynth(synth);

                track.notes.forEach(function(note) {
                    if (note.duration > 0) {
                        synth.triggerAttackRelease(
                            note.name,
                            note.duration,
                            note.time + startTime + delay,
                            note.velocity * volume
                        );
                    }
                });
            }, this);
        },

        /**
         * Dispose all synths (public method for cleanup)
         */
        disposeAllSynths: disposeAllSynths,

        /**
         * Get all synths (for testing)
         */
        getSynths: function() {
            return synths.slice();
        }
    };
}
