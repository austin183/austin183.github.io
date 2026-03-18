export function getMidiParser(markRawImpl) {
    return {
        parseMidiFile: async function(file, callback) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                this.parseMidiArrayBuffer(arrayBuffer, callback);
            } catch (error) {
                console.error('Error reading MIDI file:', error);
                callback(error, null);
            }
        },

        parseMidiArrayBuffer: async function(arrayBuffer, callback) {
            try {
                const Midi = window.Midi;
                if (!Midi) {
                    const error = new Error('Midi class not found in window');
                    console.error(error.message);
                    callback(error, null);
                    return;
                }
                
                const midi = markRawImpl(new Midi(arrayBuffer));
                if (midi && midi.tracks) {
                    callback(null, midi);
                } else {
                    const error = new Error('MIDI parsed but no tracks found');
                    console.error(error.message);
                    callback(error, null);
                }
            } catch (error) {
                console.error('Error parsing MIDI file:', error);
                callback(error, null);
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
            console.log('[midiParser.setupSongFromMidiResult] midiResult:', midiResult);
            console.log('[midiParser.setupSongFromMidiResult] app received:', app);
            const parsed = this.extractTracks(midiResult);

            console.log('[midiParser.setupSongFromMidiResult] Setting app.availableTracks:', parsed.tracks);
            console.log('[midiParser.setupSongFromMidiResult] Setting app.availableTracks.unshift fullTrack:', parsed.fullTrack);
            console.log('[midiParser.setupSongFromMidiResult] Setting app.selectedTrack:', parsed.fullTrack);
            
            app.availableTracks = parsed.tracks;
            app.availableTracks.unshift(parsed.fullTrack);
            app.selectedTrack = app.availableTracks[0];

            console.log('[midiParser.setupSongFromMidiResult] After setting, app.selectedTrack:', app.selectedTrack);

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
