export function getMidiParser(markRawImpl) {
    return {
        parseMidiFile: async function(file, callback) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                this.parseMidiArrayBuffer(arrayBuffer, callback);
            } catch (error) {
                console.error('Error reading MIDI file:', error);
            }
        },

        parseMidiArrayBuffer: async function(arrayBuffer, callback) {
            try {
                const Midi = window.Midi;
                if (!Midi) {
                    console.error('Midi class not found in window');
                    return;
                }
                
                const midi = markRawImpl(new Midi(arrayBuffer));
                if (midi && midi.tracks) {
                    callback(midi);
                } else {
                    console.error('MIDI parsed but no tracks found:', midi);
                }
            } catch (error) {
                console.error('Error parsing MIDI file:', error);
            }
        },

extractTracks: function(midi) {
            const tracks = [];
            let counter = 0;

            if (!midi.tracks) {
                console.error('No tracks found in midi object');
                return { tracks: [], fullTrack: markRawImpl({ name: 'Full Track', notes: [] }), songEnd: 0 };
            }

            midi.tracks.forEach((track) => {
                counter++;
                if (track.notes.length > 0) {
                    let trackName = track.name;
                    if (trackName === "") {
                        trackName = "Track";
                    }
                    trackName += " " + counter;

                    const trimmedTrack = markRawImpl({
                        name: trackName,
                        notes: track.notes
                    });
                    tracks.push(trimmedTrack);
                }
            });

            const fullNotes = this.combineAllTrackNotes(tracks);
            const fullTrack = markRawImpl({
                name: "Full Track",
                notes: fullNotes
            });

            let songEnd = 0;
            if (fullNotes.length > 0) {
                const lastNote = fullNotes[fullNotes.length - 1];
                songEnd = lastNote.time + lastNote.duration;
            }

            return {
                tracks: markRawImpl(tracks),
                fullTrack: fullTrack,
                songEnd: songEnd
            };
        },

        combineAllTrackNotes: function(tracks) {
            const combinedNotes = [];
            tracks.forEach(track => {
                combinedNotes.push(...track.notes);
            });

            combinedNotes.sort((a, b) => a.time - b.time);

            return combinedNotes;
        },

        filterTracksByNoteCount: function(tracks, minNotes) {
            return tracks.filter(track => track.notes.length >= minNotes);
        },

        setupSongFromMidiResult: function(midiResult, app) {
            const parsed = this.extractTracks(midiResult);

            app.availableTracks = parsed.tracks;
            app.availableTracks.unshift(parsed.fullTrack);
            app.selectedTrack = app.availableTracks[0];

            return {
                songEnd: parsed.songEnd,
                tracks: parsed.tracks
            };
        }
    };
}

export function enablePlayButton(playButtonService) {
    if (playButtonService) {
        playButtonService.enable();
        playButtonService.setInitialText();
    } else {
        console.error('playButtonService is null or undefined!');
    }
}
