/**
 * GameController - Base game controller for 2D canvas rendering
 * Handles game loop, audio scheduling, and scoring
 *
 * Uses ComponentRegistry for dependency injection of services.
 * Services are retrieved from the registry during startGame.
 */
function getGameController() {
    // CoordinateCalculator instance for delay constant
    var coordinateCalculator = getCoordinateCalculator();

    return {
        // Synths array managed by the game controller
        synths: [],

        // Interval ID for the game loop
        playIntervalId: null,

        // Delay constant for note timing (referencing CoordinateCalculator.DEFAULT_DELAY)
        get delay() {
            return coordinateCalculator.getConstants().DEFAULT_DELAY;
        },

        /**
         * Start the game with audio and rendering
         * Dependencies (scoreKeeper, songNoteRenderer, keyNoteMapService, highScoreTracker, challengeScores)
         * are retrieved from ComponentRegistry. Only pressedKeys is passed directly.
         *
         * @param {Object} app - The Vue.js app instance
         * @param {Object} currentMidi - The parsed MIDI data with tracks
         * @param {Object} difficultySettings - The selected difficulty settings
         * @param {Number} songEnd - The end time of the song in seconds
         * @param {Array} visibleField - The filtered notes ready for rendering
         * @param {Object} pressedKeys - The pressedKeys object tracking keyboard state
         * @returns {number} - The interval ID for cleanup
         */
        startGame: function(app, currentMidi, difficultySettings, songEnd, visibleField, pressedKeys) {
            // Clear any existing synths
            this.stopGame(app);

            // Retrieve dependencies from ComponentRegistry
            var scoreKeeper = app.componentRegistry ? app.componentRegistry.getService('scoreKeeper') : null;
            var songNoteRenderer = app.componentRegistry ? app.componentRegistry.getService('songNoteRenderer') : null;
            var keyNoteMapService = app.componentRegistry ? app.componentRegistry.getService('keyNoteMapService') : null;
            var highScoreTracker = app.componentRegistry ? app.componentRegistry.getService('highScoreTracker') : null;
            var challengeScores = app.componentRegistry ? app.componentRegistry.getService('challengeScores') : null;

            var startTime = Tone.now();

            // Create a synth for each track
            currentMidi.tracks.forEach((track) => {
                const synth = new Tone.PolySynth(Tone.Synth, {
                    envelope: {
                        attack: 0.02,
                        decay: 0.1,
                        sustain: 0.3,
                        release: 1,
                    },
                }).toDestination();
                this.synths.push(synth);

                // Schedule all of the events
                track.notes.forEach((note) => {
                    if (note.duration > 0) {
                        synth.triggerAttackRelease(
                            note.name,
                            note.duration,
                            note.time + startTime + this.delay,
                            note.velocity * app.trackVolume
                        );
                    }
                });
            });

            // Store game state on app for access in the loop
            app.gameState = {
                startTime: startTime,
                earliestNoteIndex: 0,
                visibleField: visibleField,
                songEnd: songEnd,
                scoreKeeper: scoreKeeper,
                songNoteRenderer: songNoteRenderer,
                highScoreTracker: highScoreTracker,
                challengeScores: challengeScores,
                pressedKeys: pressedKeys || {},  // Use passed pressedKeys, default to empty object
                invertedKeyNoteMap: keyNoteMapService ? keyNoteMapService.getInvertedMap(app.selectedKeyNoteMap.keyNoteMap) : null,
                noteLetterCache: songNoteRenderer ? songNoteRenderer.buildSongNoteLetterCache(getKeyRenderInfo()) : null
            };

            // Create and start the game loop
            this.playIntervalId = setInterval(() => this.gameLoop(app), 10);

            return this.playIntervalId;
        },

        /**
         * The main game loop callback
         * @param {Object} app - The Vue.js app instance
         */
        gameLoop: function(app) {
            const gameState = app.gameState;
            if (!gameState) {
                this.stopGame(app);
                return;
            }

            // Check if dependencies are available
            if (!gameState.scoreKeeper || !gameState.songNoteRenderer || !gameState.invertedKeyNoteMap) {
                this.stopGame(app);
                return;
            }

            const intervalNow = Tone.now() - gameState.startTime - this.delay;
            const visiblePast = intervalNow - 1;
            const visibleFuture = intervalNow + 9;

            // Check if song has ended
            if (visiblePast > gameState.songEnd) {
                app.vueCanvas.clearRect(0, 0, app.notesCanvas.width, app.notesCanvas.height);
                gameState.songNoteRenderer.renderFinalScore(app.notesCanvas, app.vueCanvas, app.score, app.goodCount, app.okCount, app.badCount, app.missedCount);

                // Update high scores if enabled
                if (app.toggleTrackHighScores && gameState.highScoreTracker) {
                    gameState.highScoreTracker.setHighScore(app.selectedMidiSong.filename, app.selectedDifficulty.difficultyKey, app.score);
                    app.highScore = gameState.highScoreTracker.getHighScore(app.selectedMidiSong.filename, app.selectedDifficulty.difficultyKey);
                    app.challengeScore = gameState.challengeScores ? gameState.challengeScores.getSelectedScore(app.selectedMidiSong.filename, app.selectedDifficulty.difficultyKey) : null;
                }

                this.stopGame(app);
                return;
            }

            // Update earliestNoteIndex for notes that have passed
            for (let i = gameState.earliestNoteIndex; i < gameState.visibleField.length; i++) {
                const note = gameState.visibleField[i];
                if (note.time + note.duration < visiblePast) {
                    gameState.earliestNoteIndex = i;
                } else {
                    break;
                }
            }

            // Calculate score
            const currentScore = gameState.scoreKeeper.calculateNewScore(
                gameState.visibleField,
                gameState.pressedKeys,  // Use pressedKeys from game state
                intervalNow,
                gameState.earliestNoteIndex,
                visibleFuture
            );

            app.score = currentScore.total;
            const counts = gameState.scoreKeeper.getCounts();
            app.goodCount = counts.goodCount;
            app.okCount = counts.okCount;
            app.badCount = counts.badCount;
            app.missedCount = counts.missedCount;

            // Clear canvas and render
            app.vueCanvas.clearRect(0, 0, app.notesCanvas.width, app.notesCanvas.height);
            gameState.songNoteRenderer.renderNowLine(app.notesCanvas, app.vueCanvas);
            gameState.songNoteRenderer.renderNotesPlayingForCanvas(
                app.notesCanvas,
                app.vueCanvas,
                gameState.visibleField,
                currentScore,
                intervalNow,
                visiblePast,
                visibleFuture,
                gameState.earliestNoteIndex,
                gameState.noteLetterCache
            );

            // Debug output if enabled
            if (window.location.search == "?debug") {
                app.renderedNotesPlaying = gameState.songNoteRenderer.renderDebugNotesPlaying(
                    app.notesCanvas,
                    app.selectedTrack.notes,
                    currentScore,
                    gameState.invertedKeyNoteMap,
                    getKeyRenderInfo(),
                    intervalNow,
                    visiblePast
                );
            }
        },

        /**
         * Stop the game and clean up resources
         */
        stopGame: function(app) {
            // Stop the interval
            if (this.playIntervalId) {
                clearInterval(this.playIntervalId);
                this.playIntervalId = null;
            }

            // Stop Tone.js transport
            Tone.Transport.stop();
            Tone.Transport.position = 0;
            Tone.Transport.cancel();

            // Dispose all synths
            while (this.synths.length) {
                const synth = this.synths.shift();
                synth.disconnect();
                synth.dispose();
            }

            // Clean up game state from app
            if (app.gameState) {
                delete app.gameState;
            }
        }
    };
}
