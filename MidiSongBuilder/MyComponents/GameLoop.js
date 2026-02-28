/**
 * GameLoop - Shared game loop logic for both 2D and 3D controllers
 *
 * This class handles the common game loop functionality including:
 * - Audio scheduling with Tone.js
 * - Game timing and state management
 * - Scoring calculation coordination
 * - High score tracking
 * - Game start/stop lifecycle
 *
 * Controllers (GameController and ThreeJSGameController) use this class
 * to avoid duplicating game loop logic.
 */
function getGameLoop() {
    // Synths array managed by the game loop
    var synths = [];

    // Interval ID for the game loop
    var playIntervalId = null;

    // Reference to the current game state
    var currentGameState = null;

    // CoordinateCalculator instance for delay constant
    var coordinateCalculator = getCoordinateCalculator();

    return {
        /**
         * Get the delay constant for note timing
         */
        get delay() {
            return coordinateCalculator.getConstants().DEFAULT_DELAY;
        },

        /**
         * Start the game with audio scheduling
         * @param {Object} app - The Vue.js app instance
         * @param {Object} currentMidi - The parsed MIDI data with tracks
         * @param {Object} gameState - The GameState instance containing game configuration
         * @returns {number} - The interval ID for cleanup
         */
        startGame: function(app, currentMidi, gameState) {
            // Stop any existing game first
            this.stopGame(app);

            // Store reference to game state
            currentGameState = gameState;

            const startTime = Tone.now();

            // Create a synth for each track
            if (currentMidi && currentMidi.tracks) {
                currentMidi.tracks.forEach((track) => {
                    const synth = new Tone.PolySynth(Tone.Synth, {
                        envelope: {
                            attack: 0.02,
                            decay: 0.1,
                            sustain: 0.3,
                            release: 1,
                        },
                    }).toDestination();
                    synths.push(synth);

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
            }

            // Store the GameState instance on app for access in the loop
            app.gameState = gameState;
            gameState.set('startTime', startTime);

            // Start the game loop
            playIntervalId = setInterval(() => this.gameLoop(app), 10);

            return playIntervalId;
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

            const intervalNow = Tone.now() - gameState.get('startTime') - this.delay;
            const visiblePast = intervalNow - 1;
            const visibleFuture = intervalNow + 9;

            // Check if song has ended
            if (visiblePast > gameState.get('songEnd')) {
                app.vueCanvas.clearRect(0, 0, app.notesCanvas.width, app.notesCanvas.height);
                gameState.get('songNoteRenderer').renderFinalScore(
                    app.notesCanvas,
                    app.vueCanvas,
                    gameState.get('score') || 0,
                    gameState.get('goodCount') || 0,
                    gameState.get('okCount') || 0,
                    gameState.get('badCount') || 0,
                    gameState.get('missedCount') || 0
                );

                // Update high scores if enabled
                if (app.toggleTrackHighScores && gameState.get('highScoreTracker')) {
                    gameState.get('highScoreTracker').setHighScore(
                        app.selectedMidiSong.filename,
                        app.selectedDifficulty.difficultyKey,
                        gameState.get('score') || 0
                    );
                    app.highScore = gameState.get('highScoreTracker').getHighScore(
                        app.selectedMidiSong.filename,
                        app.selectedDifficulty.difficultyKey
                    );
                    if (gameState.get('challengeScores')) {
                        app.challengeScore = gameState.get('challengeScores').getSelectedScore(
                            app.selectedMidiSong.filename,
                            app.selectedDifficulty.difficultyKey
                        );
                    }
                }

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

            return {
                intervalNow: intervalNow,
                visiblePast: visiblePast,
                visibleFuture: visibleFuture,
                currentScore: currentScore
            };
        },

        /**
         * Stop the game and clean up resources
         * @param {Object} app - The Vue.js app instance
         */
stopGame: function(app) {
            // Stop the interval
            if (playIntervalId) {
                clearInterval(playIntervalId);
                playIntervalId = null;
            }

            // Stop Tone.js transport
            Tone.Transport.stop();
            Tone.Transport.position = 0;
            Tone.Transport.cancel();

            // Dispose all synths
            while (synths.length) {
                const synth = synths.shift();
                synth.disconnect();
                synth.dispose();
            }

            // Clean up game state from app
            if (app && app.gameState) {
                delete app.gameState;
            }

            // Reset current game state reference
            currentGameState = null;
        }
    };
}

            // Stop Tone.js transport
            Tone.Transport.stop();
            Tone.Transport.position = 0;
            Tone.Transport.cancel();

            // Dispose all synths
            while (synths.length) {
                const synth = synths.shift();
                synth.disconnect();
                synth.dispose();
            }

            // Clean up game state from app
            if (app && app.gameState) {
                delete app.gameState;
            }

            // Clean up ComponentRegistry
            if (app && app.componentRegistry) {
                app.componentRegistry.clearServices();
                delete app.componentRegistry;
            }

            // Reset current game state reference
            currentGameState = null;
        },

        /**
         * Update 2D game state in app from GameState instance
         * @param {Object} app - The Vue.js app instance
         * @param {Object} gameState - The GameState instance
         */
        updateAppState: function(app, gameState) {
            app.gameState = gameState;
        }
    };
}
