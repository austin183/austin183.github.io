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

            // Update game state with startTime
            gameState.set('startTime', startTime);

            // Store game state on app for access in the loop
            app.gameState = {
                startTime: startTime,
                earliestNoteIndex: 0,
                visibleField: gameState.get('visibleField'),
                songEnd: gameState.get('songEnd'),
                scoreKeeper: gameState.get('scoreKeeper'),
                songNoteRenderer: gameState.get('songNoteRenderer'),
                highScoreTracker: gameState.get('highScoreTracker'),
                challengeScores: gameState.get('challengeScores'),
                pressedKeys: gameState.get('pressedKeys') || {},
                invertedKeyNoteMap: gameState.get('invertedKeyNoteMap'),
                noteLetterCache: gameState.get('noteLetterCache')
            };

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

            const intervalNow = Tone.now() - gameState.startTime - this.delay;
            const visiblePast = intervalNow - 1;
            const visibleFuture = intervalNow + 9;

            // Check if song has ended
            if (visiblePast > gameState.songEnd) {
                app.vueCanvas.clearRect(0, 0, app.notesCanvas.width, app.notesCanvas.height);
                gameState.songNoteRenderer.renderFinalScore(
                    app.notesCanvas,
                    app.vueCanvas,
                    app.score,
                    app.goodCount,
                    app.okCount,
                    app.badCount,
                    app.missedCount
                );

                // Update high scores if enabled
                if (app.toggleTrackHighScores) {
                    gameState.highScoreTracker.setHighScore(
                        app.selectedMidiSong.filename,
                        app.selectedDifficulty.difficultyKey,
                        app.score
                    );
                    app.highScore = gameState.highScoreTracker.getHighScore(
                        app.selectedMidiSong.filename,
                        app.selectedDifficulty.difficultyKey
                    );
                    app.challengeScore = gameState.challengeScores.getSelectedScore(
                        app.selectedMidiSong.filename,
                        app.selectedDifficulty.difficultyKey
                    );
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
                gameState.pressedKeys,
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
            app.gameState = {
                startTime: gameState.get('startTime'),
                earliestNoteIndex: gameState.get('earliestNoteIndex') || 0,
                visibleField: gameState.get('visibleField') || [],
                songEnd: gameState.get('songEnd') || 0,
                scoreKeeper: gameState.get('scoreKeeper'),
                songNoteRenderer: gameState.get('songNoteRenderer'),
                highScoreTracker: gameState.get('highScoreTracker'),
                challengeScores: gameState.get('challengeScores'),
                pressedKeys: gameState.get('pressedKeys') || {},
                invertedKeyNoteMap: gameState.get('invertedKeyNoteMap') || {},
                noteLetterCache: gameState.get('noteLetterCache') || {}
            };
        }
    };
}
