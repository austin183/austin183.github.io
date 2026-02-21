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
 */
function getThreeJSGameController() {
    // GameState instance for this controller
    var gameState = null;

    // Three.js specific animation variables
    //animationSpeed: 1.0,  // Multiplier for animation speed
    //noteSpeed: 15,  // Speed at which notes move toward camera (units per second)

    return {
        /**
         * Start the 3D game loop with animation
         * @param {Object} app - The Vue.js app instance
         * @param {Object} currentMidi - The parsed MIDI data with tracks
         * @param {Object} difficultySettings - The selected difficulty settings
         * @param {Number} songEnd - The end time of the song in seconds
         * @param {Array} visibleField - The filtered notes ready for rendering
         * @param {Object} scoreKeeper - The ScoreKeeper instance for scoring
         * @param {Object} songNoteRenderer - The SongNoteRenderer instance
         * @param {Object} keyNoteMapService - The KeyNoteMapService instance for inversion
         * @param {Object} highScoreTracker - The high score tracker instance
         * @param {Object} challengeScores - The challenge scores instance
         * @param {Object} threeJSRenderer - The ThreeJSRenderer instance
         * @param {Object} pressedKeys - The pressedKeys object tracking keyboard state
         * @returns {number} - The interval ID for cleanup
         */
        startGame: function(app, currentMidi, difficultySettings, songEnd, visibleField, scoreKeeper, songNoteRenderer, keyNoteMapService, highScoreTracker, challengeScores, threeJSRenderer, pressedKeys) {
            // Validate required dependencies
            if (!threeJSRenderer) {
                throw new Error('ThreeJSGameController requires threeJSRenderer for 3D rendering');
            }
            if (typeof threeJSRenderer.getConstants !== 'function') {
                throw new Error('threeJSRenderer must provide getConstants() method');
            }
            var CONSTANTS = threeJSRenderer.getConstants();
            if (!CONSTANTS || !CONSTANTS.DEFAULT_DELAY) {
                throw new Error('threeJSRenderer CONSTANTS must include DEFAULT_DELAY property');
            }
            if (!app) {
                throw new Error('ThreeJSGameController requires app instance');
            }
            if (!visibleField || !Array.isArray(visibleField)) {
                throw new Error('visibleField must be an array of notes');
            }

            // Create and initialize game state
            gameState = getGameState();
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
                pressedKeys: pressedKeys || {},  // Use passed pressedKeys, default to empty object
                invertedKeyNoteMap: keyNoteMapService.getInvertedMap(app.selectedKeyNoteMap.keyNoteMap),
                noteLetterCache: songNoteRenderer.buildSongNoteLetterCache(getKeyRenderInfo()),
                delay: CONSTANTS.DEFAULT_DELAY,  // Default delay for note positioning
                synths: []
            });

            // Store reference on app for easy access (temporary - for compatibility)
            app.threeGameState = gameState.getState();

            // Create synths and schedule audio
            const startTime = app.threeGameState.startTime;

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
                    app.threeGameState.synths = app.threeGameState.synths || [];
                    app.threeGameState.synths.push(synth);

                    // Schedule all of the events
                    track.notes.forEach((note) => {
                        if (note.duration > 0) {
                            synth.triggerAttackRelease(
                                note.name,
                                note.duration,
                                note.time + startTime + app.threeGameState.delay,
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
            const gameState = app.threeGameState;
            if (!gameState || !gameState.threeJSRenderer) {
                this.stopGame(app);
                return;
            }

            // Calculate current time relative to song start
            const intervalNow = Tone.now() - gameState.startTime - app.threeGameState.delay;
            const visiblePast = intervalNow - 1;
            const visibleFuture = intervalNow + 9;

            // Check if song has ended
            if (visiblePast > gameState.songEnd) {
                app.vueCanvas.clearRect(0, 0, app.notesCanvas.width, app.notesCanvas.height);
                gameState.songNoteRenderer.renderFinalScore(app.notesCanvas, app.vueCanvas, app.score, app.goodCount, app.okCount, app.badCount, app.missedCount);

                // Update high scores if enabled
                if (app.toggleTrackHighScores) {
                    gameState.highScoreTracker.setHighScore(app.selectedMidiSong.filename, app.selectedDifficulty.difficultyKey, app.score);
                    app.highScore = gameState.highScoreTracker.getHighScore(app.selectedMidiSong.filename, app.selectedDifficulty.difficultyKey);
                    app.challengeScore = gameState.challengeScores.getSelectedScore(app.selectedMidiSong.filename, app.selectedDifficulty.difficultyKey);
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

            // Update 3D note positions based on animation
            this.update3DNotesPosition(gameState.threeJSRenderer, gameState.visibleField, intervalNow, app);

            // Update 3D note colors based on score (hit notes change color)
            this.update3DNoteColors(gameState.threeJSRenderer, currentScore, app);

            // Render the 2D canvas
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

            // Render 3D now line
            this.render3DNowLine(gameState.threeJSRenderer, app);

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
         * Update positions of all 3D notes based on current time
         * Delegates to ThreeJSRenderer which handles the positioning logic
         * @param {Object} threeJSRenderer - The ThreeJSRenderer instance
         * @param {Array} visibleField - Array of visible notes (kept for compatibility)
         * @param {Number} currentTime - Current time in song
         * @param {Object} app - Vue app instance
         */
        update3DNotesPosition: function(threeJSRenderer, visibleField, currentTime, app) {
            if (!threeJSRenderer || !app.threeGameState) return;

            // Use the renderer's updateAllNotes method for consistent positioning
            const delay = app.threeGameState.delay || 4;
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

            const noteGroup = threeJSRenderer.getNoteGroup();
            if (!noteGroup) return;

            const keyScores = currentScore.keyScores;

            // Update colors for notes that have been hit
            noteGroup.children.forEach(function(noteMesh) {
                if (!noteMesh || !noteMesh.userData) return;

                const noteId = noteMesh.userData.id;
                if (keyScores && keyScores[noteId]) {
                    const scoreTag = keyScores[noteId].tag;
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
            if (!threeJSRenderer) return;

            // Now line is at Z=0 (player position in ThreeJSRenderer's coordinate system)
            // Notes move toward the camera (increasing Z) and pass through this plane
            // Use delay directly; ThreeJSRenderer will convert to Z position using calculateNowLinePosition
            threeJSRenderer.renderNowLine(app.threeGameState.delay);
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
            if (app && app.threeGameState && app.threeGameState.synths) {
                app.threeGameState.synths.forEach(function(synth) {
                    if (synth) {
                        synth.disconnect();
                        synth.dispose();
                    }
                });
                app.threeGameState.synths = [];
            }

            // Clean up game state
            if (app && app.threeGameState) {
                delete app.threeGameState;
            }

            // Clean up ComponentRegistry
            if (app.componentRegistry) {
                app.componentRegistry.clearServices();
                delete app.componentRegistry;
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
