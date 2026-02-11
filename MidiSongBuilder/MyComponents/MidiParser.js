/**
 * MIDI Parser Component
 * Handles parsing of MIDI files and extraction of track data
 */

function getMidiParser() {
    return {
        /**
         * Parse a MIDI file and return the result
         * @param {File} file - The MIDI file to parse
         * @param {Function} callback - Callback function to receive the parsed MIDI object
         */
        parseMidiFile: function(file, callback) {
            // Read the file as ArrayBuffer
            const reader = new FileReader();
            reader.onload = function(e) {
                const midiResult = this.parseMidiArrayBuffer(e.target.result);
                callback(midiResult);
            }.bind(this);
            reader.readAsArrayBuffer(file);
        },

        /**
         * Parse an ArrayBuffer containing MIDI data
         * @param {ArrayBuffer} arrayBuffer - The MIDI data as ArrayBuffer
         * @returns {Object} The parsed MIDI object from ToneMidi
         */
        parseMidiArrayBuffer: function(arrayBuffer) {
            // Uses new Midi() from ToneMidi.js
            return new Midi(arrayBuffer);
        },

        /**
         * Extract tracks from a parsed MIDI object
         * @param {Object} midi - The parsed MIDI object
         * @returns {Object} Object containing tracks and fullTrack
         */
        extractTracks: function(midi) {
            const tracks = [];
            let counter = 0;

            midi.tracks.forEach((track) => {
                counter++;
                if (track.notes.length > 0) {
                    let trackName = track.name;
                    if (trackName === "") {
                        trackName = "Track";
                    }
                    trackName += " " + counter;

                    const trimmedTrack = {
                        name: trackName,
                        notes: track.notes
                    };
                    tracks.push(trimmedTrack);
                }
            });

            const fullNotes = this.combineAllTrackNotes(tracks);
            const fullTrack = {
                name: "Full Track",
                notes: fullNotes
            };

            // Get song duration from the last note in full track
            let songEnd = 0;
            if (fullNotes.length > 0) {
                const lastNote = fullNotes[fullNotes.length - 1];
                songEnd = lastNote.time + lastNote.duration;
            }

            return {
                tracks: tracks,
                fullTrack: fullTrack,
                songEnd: songEnd
            };
        },

        /**
         * Combine all track notes into one sorted array
         * @param {Array} tracks - Array of track objects with notes
         * @returns {Array} Combined and sorted notes array
         */
        combineAllTrackNotes: function(tracks) {
            const combinedNotes = [];
            tracks.forEach(track => {
                combinedNotes.push(...track.notes);
            });

            // Sort by time
            combinedNotes.sort((a, b) => a.time - b.time);

            return combinedNotes;
        },

        /**
         * Filter tracks by minimum note count
         * @param {Array} tracks - Array of track objects
         * @param {Number} minNotes - Minimum number of notes required
         * @returns {Array} Filtered tracks
         */
        filterTracksByNoteCount: function(tracks, minNotes) {
            return tracks.filter(track => track.notes.length >= minNotes);
        }
    };
}
