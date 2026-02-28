/**
 * ThreeJSGameController - Extends GameController for 3D note animation
 * Handles the dynamic game loop updates for Three.js rendering
 *
 * Relationship with GameController:
 * - GameController: Handles 2D canvas rendering and base game loop
 * - ThreeJSGameController: Handles 3D rendering and animation updates
 * - Both share the same game loop logic (scoring, song progress, input handling)
 * - ThreeJSGameController delegates to threeJSRenderer for 3D display
 *
 * Architecture:
 * - GameController: Base controller with 2D canvas rendering via SongNoteRenderer
 * - ThreeJSGameController: Extension that adds 3D rendering via ThreeJSRenderer
 * - Both use the same game loop pattern and scoring system
 * - ThreeJSGameController calls threeJSRenderer methods for 3D scene updates
 *
 * Usage: Use ThreeJSGameController when 3D rendering is needed.
 *        Use GameController for 2D-only rendering.
 *
 * Uses ComponentRegistry for dependency injection of services.
 * Services are retrieved from the registry during startGame.
 * threeJSRenderer is the only parameter passed directly (required for initialization).
 */
function getThreeJSGameController() {
    return {
        /**
         * Start the 3D game loop with animation
         * Dependencies (scoreKeeper, songNoteRenderer, keyNoteMapService, highScoreTracker, challengeScores)
         * are retrieved from ComponentRegistry. Only pressedKeys and threeJSRenderer are passed directly.
         *
         * @param {Object} app - The Vue.js app instance
         * @param {Object} currentMidi - The parsed MIDI data with tracks
         * @param {Object} difficultySettings - The selected difficulty settings
         * @param {Number} songEnd - The end time of the song in seconds
         * @param {Array} visibleField - The filtered notes ready for rendering
         * @param {Object} threeJSRenderer - The ThreeJSRenderer instance
         * @param {Object} pressedKeys - The pressedKeys object tracking keyboard state
         * @returns {number} - The interval ID for cleanup
         */
        startGame: function(app, currentMidi, difficultySettings, songEnd, visibleField, threeJSRenderer, pressedKeys) {
            // Validate required dependencies
            if (!threeJSRenderer) {
                throw new Error('ThreeJSGameController requires threeJSRenderer for 3D rendering');
            }
            if (!app) {
                throw new Error('ThreeJSGameController requires app instance');
            }
            if (!visibleField || !Array.isArray(visibleField)) {
                throw new Error('visibleField must be an array of notes');
            }

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

            // Get constants from threeJSRenderer
            var CONSTANTS = threeJSRenderer.getConstants();

            // Clear 3D notes from previous game
            threeJSRenderer.clearNotes();

            // Create and initialize GameState - single source of truth for game state
            var gameState = getGameState();
            gameState.initialize({
                startTime: Tone.now(),
                earliestNoteIndex: 0,
                visibleField: visibleField,
                songEnd: songEnd,
                scoreKeeper: scoreKeeper,
                songNoteRenderer: songNoteRenderer,
                threeJSRenderer: threeJSRenderer,
                highScoreTracker: highScoreTracker,
                challengeScores: challengeScores,
                pressedKeys: pressedKeys || {},
                invertedKeyNoteMap: keyNoteMapService ? keyNoteMapService.getInvertedMap(app.selectedKeyNoteMap.keyNoteMap) : null,
                noteLetterCache: songNoteRenderer ? songNoteRenderer.buildSongNoteLetterCache(getKeyRenderInfo()) : null,
                delay: CONSTANTS.DEFAULT_DELAY,
                synths: []
            });

            // Store the GameState instance on app for access in the loop
            app.threeGameState = gameState;

            // Create synths and schedule audio using the GameState startTime
            var startTime = gameState.get('startTime');

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
                    if (!gameState.get('synths')) {
                        gameState.set('synths', []);
                    }
                    gameState.get('synths').push(synth);

                    // Schedule all of the events
                    track.notes.forEach((note) => {
                        if (note.duration > 0) {
                            synth.triggerAttackRelease(
                                note.name,
                                note.duration,
                                note.time + startTime + gameState.get('delay'),
                                note.velocity * app.trackVolume
                            );
                        }
                    });
                });
            }

            // Initialize 3D notes at their starting positions
            if (threeJSRenderer) {
                threeJSRenderer.addNotesFromVisibleField(visibleField, app.keyRenderInfo);
            }

            // Start the game loop (same interval as base controller)
            this.playIntervalId = setInterval(() => this.gameLoop(app), 10);

            return this.playIntervalId;
        },

        /**
         * The main 3D game loop callback with animation
         * @param {Object} app - The Vue.js app instance
         */
        gameLoop: function(app) {
            var gameState = app.threeGameState;
            if (!gameState || !gameState.get('threeJSRenderer')) {
                this.stopGame(app);
                return;
            }

            // Calculate current time relative to song start
            var intervalNow = Tone.now() - gameState.get('startTime') - gameState.get('delay');
            var visiblePast = intervalNow - 1;
            var visibleFuture = intervalNow + 9;

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

            // Update 3D note positions based on animation
            this.update3DNotesPosition(gameState.get('threeJSRenderer'), gameState, intervalNow, app);

            // Update 3D note colors based on score (hit notes change color)
            this.update3DNoteColors(gameState.get('threeJSRenderer'), currentScore, app);

            // Render the 2D canvas
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

            // Render 3D now line
            this.render3DNowLine(gameState.get('threeJSRenderer'), app);

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
         * Update positions of all 3D notes based on current time
         * Delegates to ThreeJSRenderer which handles the positioning logic
         * @param {Object} threeJSRenderer - The ThreeJSRenderer instance
         * @param {Object} gameState - The GameState instance containing game state
         * @param {Number} currentTime - Current time in song
         * @param {Object} app - Vue app instance
         */
        update3DNotesPosition: function(threeJSRenderer, gameState, currentTime, app) {
            if (!threeJSRenderer || !gameState) return;

            // Use the renderer's updateAllNotes method for consistent positioning
            var CONSTANTS = threeJSRenderer.getConstants();
            var delay = gameState.get('delay') || CONSTANTS.DEFAULT_DELAY;
            threeJSRenderer.updateAllNotes(currentTime, delay);
        },

        /**
         * Update colors of 3D notes based on scoring
         * @param {Object} threeJSRenderer - The ThreeJSRenderer instance
         * @param {Object} currentScore - Current score object with keyScores
         * @param {Object} app - Vue app instance
         */
        update3DNoteColors: function(threeJSRenderer, currentScore, app) {
            if (!threeJSRenderer) return;

            var noteGroup = threeJSRenderer.getNoteGroup();
            if (!noteGroup) return;

            var keyScores = currentScore.keyScores;

            // Update colors for notes that have been hit
            noteGroup.children.forEach(function(noteMesh) {
                if (!noteMesh || !noteMesh.userData) return;

                var noteId = noteMesh.userData.id;
                if (keyScores && keyScores[noteId]) {
                    var scoreTag = keyScores[noteId].tag;
                    if (scoreTag) {
                        threeJSRenderer.setNoteState(noteId, scoreTag);
                    }
                }
            });
        },

        /**
         * Render the "now line" in 3D space
         * The now line represents the player's position where notes should be hit
         * Notes move toward the camera and pass through this plane as they're played
         * @param {Object} threeJSRenderer - The ThreeJSRenderer instance
         * @param {Object} app - Vue app instance
         */
        render3DNowLine: function(threeJSRenderer, app) {
            if (!threeJSRenderer || !app.threeGameState) return;

            // Now line is at Z=0 (player position in ThreeJSRenderer's coordinate system)
            // Notes move toward the camera (increasing Z) and pass through this plane
            // Use delay directly; ThreeJSRenderer will convert to Z position using calculateNowLinePosition
            threeJSRenderer.renderNowLine(app.threeGameState.get('delay'));
        },

        /**
         * Stop the 3D game loop and clean up
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
            if (app && app.threeGameState) {
                var synths = app.threeGameState.get('synths') || [];
                synths.forEach(function(synth) {
                    if (synth) {
                        synth.disconnect();
                        synth.dispose();
                    }
                });
                app.threeGameState.set('synths', []);
            }

            // Clean up game state from app
            if (app && app.threeGameState) {
                delete app.threeGameState;
            }
        },

        /**
         * Resize handler for 3D game
         * @param {Object} threeJSRenderer - The ThreeJSRenderer instance
         */
        resize: function(threeJSRenderer) {
            if (threeJSRenderer) {
                threeJSRenderer.resize();
            }
        }
    };
}
