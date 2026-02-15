/**
 * ThreeJSGameController - Extends GameController for 3D note animation
 * Handles the dynamic game loop updates for Three.js rendering
 */
function getThreeJSGameController() {
    return {
        // Three.js specific animation variables
        //animationSpeed: 1.0,  // Multiplier for animation speed
        //noteSpeed: 15,  // Speed at which notes move toward camera (units per second)

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
         * @returns {number} - The interval ID for cleanup
         */
        startGame: function(app, currentMidi, difficultySettings, songEnd, visibleField, scoreKeeper, songNoteRenderer, keyNoteMapService, highScoreTracker, challengeScores, threeJSRenderer) {
            // Store references for the game loop
            app.threeGameState = {
                startTime: Tone.now(),
                earliestNoteIndex: 0,
                visibleField: visibleField,
                songEnd: songEnd,
                scoreKeeper: scoreKeeper,
                songNoteRenderer: songNoteRenderer,
                threeJSRenderer: threeJSRenderer,
                highScoreTracker: highScoreTracker,
                challengeScores: challengeScores,
                invertedKeyNoteMap: keyNoteMapService.getInvertedMap(app.selectedKeyNoteMap.keyNoteMap),
                noteLetterCache: songNoteRenderer.buildSongNoteLetterCache(getKeyRenderInfo()),
                delay: 3,  // Delay constant - increased to delay when notes cross now line
                // For animation: notes are positioned at z = (noteTime - currentTime + delay) * speed
                baseZOffset: 0  // Starting Z offset for notes
            };

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
                pressedKeys,
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
            this.render3DNowLine(gameState.threeJSRenderer, intervalNow, app);

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
         * @param {Object} threeJSRenderer - The ThreeJSRenderer instance
         * @param {Array} visibleField - Array of visible notes
         * @param {Number} currentTime - Current time in song
         * @param {Object} app - Vue app instance
         */
        update3DNotesPosition: function(threeJSRenderer, visibleField, currentTime, app) {
            if (!threeJSRenderer || !app.threeGameState) return;

            // Get note group and update positions
            const noteGroup = threeJSRenderer.getNoteGroup();
            if (!noteGroup) return;

            noteGroup.children.forEach(function(noteMesh) {
                if (!noteMesh || !noteMesh.userData) return;

                const noteTime = noteMesh.userData.time;
                const noteId = noteMesh.userData.id;

                // Check if this note is in the visible field
                const visibleNote = visibleField.find(n => n.id === noteId);
                if (visibleNote) {
                    // Calculate new Z position: notes start far away and move closer to camera
                    // As currentTime increases, notes should move toward positive Z (camera)
                    // Z = (currentTime - noteTime + delay) * scale
                    const zScale = threeJSRenderer.getZScale();
                    const zPos = (currentTime - noteTime + app.threeGameState.delay) * zScale;
                    noteMesh.position.z = zPos;
                    noteMesh.userData.zPos = zPos;
                }
            });
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
         * The now line should align with the 2D canvas "now line" at the bottom of the view
         * Notes move toward the camera (positive Z) and pass through Z=0 (player position)
         * as they reach the "play line"
         * @param {Object} threeJSRenderer - The ThreeJSRenderer instance
         * @param {Number} currentTime - Current time in song
         * @param {Object} app - Vue app instance
         */
        render3DNowLine: function(threeJSRenderer, currentTime, app) {
            if (!threeJSRenderer) return;

            // Now line stays stationary at Z=0 (player position)
            // Notes move toward the camera and pass through this plane as they're played
            const zScale = threeJSRenderer.getZScale();
            const nowZPos = app.threeGameState.delay * zScale;

            // Store the now line position for reference
            app.threeGameState.nowLineZ = nowZPos;

            // Render the now line in 3D at position 0
            threeJSRenderer.renderNowLine(nowZPos);
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

            // Note: intentionally NOT clearing 3D notes to keep the last frame visible
            // if (app && app.threeJSRenderer) {
            //     app.threeJSRenderer.clearNotes();
            //     app.threeJSRenderer.clearNowLine();
            // }

            // Clean up game state
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
        },

        /**
         * Get the current 3D game state
         * @param {Object} app - Vue app instance
         * @returns {Object} - The 3D game state
         */
        getGameState: function(app) {
            return app ? app.threeGameState : null;
        }
    };
}
