/**
 * createGameMethods - Factory for creating Vue app methods configuration
 * 
 * Extracts all method definitions from the fat config object into a focused factory.
 * Each method has a single responsibility:
 * - handleMidiSongSelection: Fetch and parse MIDI file, reset scores
 * - setDifficulty: Update difficulty parameters and refresh high scores
 * - handleToggleTrackHighScores: Toggle localStorage tracking and UI visibility
 * - renderSongNotes: Mode-specific rendering (overridden by caller)
 */

export function createGameMethods({ 
    renderSongNotes,
    setupSongFromMidiResult,
    highScoreTracker,
    challengeScoresObj,
    gameController,
    midiParser
}) {
    return {
        // Handle MIDI song selection from dropdown
        handleMidiSongSelection: function() {
            if (this.selectedMidiSong) {
                var songDifficultySettings;
                if (this.selectedMidiSong.difficultySettings) {
                    songDifficultySettings = this.selectedMidiSong.difficultySettings;                    
                } else {
                    songDifficultySettings = null;
                }
                
                if (this.toggleTrackHighScores) {
                    this.highScore = highScoreTracker.getHighScore(
                        this.selectedMidiSong.filename, 
                        this.selectedDifficulty.difficultyKey
                    );
                    this.challengeScore = challengeScoresObj.getSelectedScore(
                        this.selectedMidiSong.filename, 
                        this.selectedDifficulty.difficultyKey
                    );
                }
                
                this.availableTracks = [];
                gameController.resetAppStateScores(this);

                const midiFilename = this.selectedMidiSong.filename;
                fetch(`PublicDomainSongs/midi/${midiFilename}`)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => {
                        return midiParser.parseMidiArrayBuffer(arrayBuffer, setupSongFromMidiResult);
                    })
                    .catch(error => {
                        console.error('Error fetching MIDI file:', error);
                    });
            }            
        },
        
        // Set difficulty and update high scores if tracking enabled
        setDifficulty: function() {
            this.minNoteDistance = this.selectedDifficulty.minNoteDistance;
            this.minDuration = this.selectedDifficulty.minNoteDuration;
            
            if (this.toggleTrackHighScores && this.selectedMidiSong) {
                gameController.resetAppStateScores(this);
                this.highScore = highScoreTracker.getHighScore(
                    this.selectedMidiSong.filename, 
                    this.selectedDifficulty.difficultyKey
                );
                this.challengeScore = challengeScoresObj.getSelectedScore(
                    this.selectedMidiSong.filename, 
                    this.selectedDifficulty.difficultyKey
                );
            }
        },
        
        // Toggle high score tracking in localStorage and UI
        handleToggleTrackHighScores: function() {
            window.domUtils.toggleElementById("SongHighScore");
            
            if (this.toggleTrackHighScores) {
                localStorage.setItem("TrackScores", "true");
            } else {
                localStorage.removeItem("TrackScores");
            }
        },
        
        // Mode-specific rendering (2D canvas or 3D Three.js)
        renderSongNotes: function() {
            if (renderSongNotes) {
                renderSongNotes.call(this);
            }
        }
    };
}
