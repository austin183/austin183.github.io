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

            // Reset the score keeper's internal state
            if (scoreKeeper) {
                scoreKeeper.reset();
            }

            // Reset note states in visibleField to 'unplayed'
            if (visibleField && Array.isArray(visibleField)) {
                for (var i = 0; i < visibleField.length; i++) {
                    visibleField[i].state = 'unplayed';
                }
            }

            // Reset Vue app's score values
            if (app) {
                app.score = 0;
                app.goodCount = 0;
                app.okCount = 0;
                app.badCount = 0;
                app.missedCount = 0;
            }

            // Create and initialize GameState - single source of truth for game state
            var gameState = getGameState();
            gameState.initialize({
                startTime: Tone.now(),
                earliestNoteIndex: 0,
                visibleField: visibleField,
                songEnd: songEnd,
                scoreKeeper: scoreKeeper,
                songNoteRenderer: songNoteRenderer,
                highScoreTracker: highScoreTracker,
                challengeScores: challengeScores,
                pressedKeys: pressedKeys || {},
                invertedKeyNoteMap: keyNoteMapService ? keyNoteMapService.getInvertedMap(app.selectedKeyNoteMap.keyNoteMap) : null,
                noteLetterCache: songNoteRenderer ? songNoteRenderer.buildSongNoteLetterCache(getKeyRenderInfo()) : null,
                delay: this.delay,
                synths: []
            });

            // Store the GameState instance on app for access in the loop
            app.gameState = gameState;

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
                            note.time + gameState.get('startTime') + this.delay,
                            note.velocity * app.trackVolume
                        );
                    }
                });
            });

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
            if (!gameState.get('scoreKeeper') || !gameState.get('songNoteRenderer') || !gameState.get('invertedKeyNoteMap')) {
                this.stopGame(app);
                return;
            }

            const intervalNow = Tone.now() - gameState.get('startTime') - this.delay;
            const visiblePast = intervalNow - 1;
            const visibleFuture = intervalNow + 9;

            // Check if song has ended
            if (visiblePast > gameState.get('songEnd')) {
                app.vueCanvas.clearRect(0, 0, app.notesCanvas.width, app.notesCanvas.height);
                gameState.get('songNoteRenderer').renderFinalScore(app.notesCanvas, app.vueCanvas, 
                    gameState.get('score') || 0,
                    gameState.get('goodCount') || 0,
                    gameState.get('okCount') || 0,
                    gameState.get('badCount') || 0,
                    gameState.get('missedCount') || 0
                );

                // Update high scores if enabled
                if (app.toggleTrackHighScores && gameState.get('highScoreTracker')) {
                    gameState.get('highScoreTracker').setHighScore(app.selectedMidiSong.filename, app.selectedDifficulty.difficultyKey, gameState.get('score') || 0);
                    app.highScore = gameState.get('highScoreTracker').getHighScore(app.selectedMidiSong.filename, app.selectedDifficulty.difficultyKey);
                    if (gameState.get('challengeScores')) {
                        app.challengeScore = gameState.get('challengeScores').getSelectedScore(app.selectedMidiSong.filename, app.selectedDifficulty.difficultyKey);
                    }
                }

                // Sync state to Vue for reactive binding
                gameState.syncToVue(app);

                this.stopGame(app);
                return;
            }

            // Update earliestNoteIndex for notes that have passed
            var earliestNoteIndex = gameState.get('earliestNoteIndex') || 0;
            for (var i = earliestNoteIndex; i < gameState.get('visibleField').length; i++) {
                var note = gameState.get('visibleField')[i];
                if (note.time + note.duration < visiblePast) {
                    earliestNoteIndex = i;
                } else {
                    break;
                }
            }
            gameState.set('earliestNoteIndex', earliestNoteIndex);

            // Calculate score
            var currentScore = gameState.get('scoreKeeper').calculateNewScore(
                gameState.get('visibleField'),
                gameState.get('pressedKeys') || {},
                intervalNow,
                earliestNoteIndex,
                visibleFuture
            );

            gameState.set('score', currentScore.total);
            var counts = gameState.get('scoreKeeper').getCounts();
            gameState.set('goodCount', counts.goodCount);
            gameState.set('okCount', counts.okCount);
            gameState.set('badCount', counts.badCount);
            gameState.set('missedCount', counts.missedCount);

            // Sync state to Vue for reactive binding
            gameState.syncToVue(app);

            // Clear canvas and render
            app.vueCanvas.clearRect(0, 0, app.notesCanvas.width, app.notesCanvas.height);
            gameState.get('songNoteRenderer').renderNowLine(app.notesCanvas, app.vueCanvas);
            gameState.get('songNoteRenderer').renderNotesPlayingForCanvas(
                app.notesCanvas,
                app.vueCanvas,
                gameState.get('visibleField'),
                currentScore,
                intervalNow,
                visiblePast,
                visibleFuture,
                earliestNoteIndex,
                gameState.get('noteLetterCache') || {}
            );

            // Debug output if enabled
            if (window.location.search == "?debug") {
                app.renderedNotesPlaying = gameState.get('songNoteRenderer').renderDebugNotesPlaying(
                    app.notesCanvas,
                    app.selectedTrack.notes,
                    currentScore,
                    gameState.get('invertedKeyNoteMap') || {},
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
            // Handle null app gracefully
            if (!app) {
                return;
            }

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
