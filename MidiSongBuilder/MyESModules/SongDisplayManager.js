export function createSongDisplayManager(songNoteRenderer, keyNoteMapService) {
    let debugMode = false;

    const logger = {
        log: () => {},
        error: () => {},
        warn: (msg) => console.warn(msg)
    };

    return {
        setDebugMode: function(mode) {
            debugMode = mode;
        },

        getDebugMode: function() {
            return debugMode;
        },

        renderSongNotesForDisplay: function(currentMidi, app) {
            if (!currentMidi || !app.selectedTrack || app.selectedTrack === "") {
                return null;
            }

            const invertedKeyNoteMap = keyNoteMapService.getInvertedMap(app.selectedKeyNoteMap.keyNoteMap);
            const song = app.selectedTrack.notes;

            if (debugMode) {
                console.log(`Rendering ${song.length} notes for display`, JSON.stringify(song));
            }

            const renderedNotes = songNoteRenderer.renderSongNotes(song, app.selectedKeyNoteMap.keyNoteMap);

            return {
                songNotes: renderedNotes.renderedSongNotes,
                songNotesOnKeyMap: renderedNotes.renderedSongNotesOnKeyMap,
                invertedKeyNoteMap
            };
        },

        renderDebugNotesPlaying: function(canvas, song, currentScore, invertedKeyNoteMap, now, visiblePast) {
            return songNoteRenderer.renderDebugNotesPlaying(canvas, song, currentScore, invertedKeyNoteMap, now, visiblePast);
        },

        create3DVisibleField: function(song, invertedKeyNoteMap) {
            return song.map(function(note) {
                const keyNote = invertedKeyNoteMap[note.name];
                if (keyNote) {
                    return {
                        id: note.name + "_" + note.time,
                        letter: keyNote,
                        time: note.time,
                        duration: note.duration,
                        state: 'unplayed'
                    };
                }
                return null;
            }).filter(function(n) { return n !== null; });
        },

        renderNotesForMode: function(mode, visibleField, keyRenderInfo, app) {
            if (mode && typeof mode.renderNotesForMode === 'function') {
                mode.renderNotesForMode(visibleField, keyRenderInfo, app);
            } else {
                logger.warn('No mode-specific rendering available');
            }
        }
    };
}
