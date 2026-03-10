/**
 * ThreeJSGameController - Extends BaseController for 3D note animation
 * Handles the dynamic game loop updates for Three.js rendering
 *
 * Relationship with BaseController:
 * - BaseController: Shared game loop logic (scoring, song progress, input handling)
 * - ThreeJSGameController: Adds 3D rendering via ThreeJSRenderer
 * - Both share the same game loop pattern using BaseController's mixins
 * - ThreeJSGameController implements doRenderAfterLoop hook for 3D-specific rendering
 *
 * Architecture:
 * - BaseController: Base with stateMixin, audioMixin, gameLoopMixin, cleanupMixin
 * - ThreeJSGameController: Extends BaseController and adds 3D rendering hooks
 * - Uses threeGameState key (vs gameState for GameController)
 * - Calls threeJSRenderer methods for 3D scene updates
 *
 * Usage: Use ThreeJSGameController when 3D rendering is needed.
 *        Use GameController for 2D-only rendering.
 *
 * Uses ComponentRegistry for dependency injection of services.
 * Services are retrieved from the registry during startGame.
 * threeJSRenderer is the only parameter passed directly (required for initialization).
 */
function getThreeJSGameController() {
    // Use BaseController as base and add 3D-specific extensions
    var base = getBaseController();

    return Object.assign({}, base, {
        /**
         * Start the 3D game loop with animation
         * Uses BaseController's stateMixin, audioMixin, and gameLoopMixin.
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

            // Clear 3D notes from previous game
            threeJSRenderer.clearNotes();

            // Retrieve dependencies from ComponentRegistry
            var scoreKeeper = app.componentRegistry ? 
                app.componentRegistry.getService('scoreKeeper') : null;
            var songNoteRenderer = app.componentRegistry ? 
                app.componentRegistry.getService('songNoteRenderer') : null;
            var keyNoteMapService = app.componentRegistry ? 
                app.componentRegistry.getService('keyNoteMapService') : null;
            var highScoreTracker = app.componentRegistry ? 
                app.componentRegistry.getService('highScoreTracker') : null;
            var challengeScores = app.componentRegistry ? 
                app.componentRegistry.getService('challengeScores') : null;

            // Initialize game state using BaseController's stateMixin
            // Note: We use threeGameState key instead of gameState
            var gameState = this.stateMixin.initializeGameState(
                app,
                scoreKeeper,
                songNoteRenderer,
                keyNoteMapService,
                highScoreTracker,
                challengeScores,
                visibleField,
                songEnd,
                this.delay
            );

            // Store the GameState instance on app with threeGameState key
            app.threeGameState = gameState;

            // Set pressedKeys in gameState (stateMixin initializes it as null)
            gameState.set('pressedKeys', pressedKeys || {});

            // Add threeJSRenderer to gameState for access in the loop
            gameState.set('threeJSRenderer', threeJSRenderer);

            // Schedule audio events using BaseController's audioMixin with trackVolume
            var trackVolume = app && app.trackVolume ? app.trackVolume : 1.0;
            this.audioMixin.scheduleAudioEvents(currentMidi, gameState, trackVolume);

            // Initialize 3D notes at their starting positions
            if (threeJSRenderer) {
                threeJSRenderer.addNotesFromVisibleField(visibleField, app.keyRenderInfo);
            }

            // Create and start the game loop using BaseController's baseGameLoop
            // Use threeGameState key for 3D mode
            this.playIntervalId = setInterval(
                () => this.gameLoopMixin.baseGameLoop.call(this, app, 'threeGameState'), 
                10
            );

            return this.playIntervalId;
        },

        /**
         * The main 3D game loop callback - delegates to BaseController's baseGameLoop
         * @param {Object} app - The Vue.js app instance
         */
        gameLoop: function(app) {
            this.gameLoopMixin.baseGameLoop.call(this, app, 'threeGameState');
        },

        /**
         * 3D-specific rendering hook called by BaseController's baseGameLoop
         * This is the abstract hook that ThreeJSGameController implements
         * @param {Object} app - The Vue.js app instance
         * @param {Object} gameState - The GameState instance (threeGameState)
         * @param {Object} currentScore - Current score object with keyScores
         * @param {Number} intervalNow - Current time relative to song start
         * @param {Number} visiblePast - Past boundary for note visibility
         * @param {Number} visibleFuture - Future boundary for note visibility
         */
        doRenderAfterLoop: function(app, gameState, currentScore, intervalNow, visiblePast, visibleFuture) {
            var threeJSRenderer = gameState.get('threeJSRenderer');
            var earliestNoteIndex = gameState.get('earliestNoteIndex') || 0;

            // Update 3D note positions based on animation
            this.update3DNotesPosition(threeJSRenderer, gameState, intervalNow, app);

            // Update 3D note colors based on score (hit notes change color)
            this.update3DNoteColors(threeJSRenderer, currentScore, app);

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
            this.render3DNowLine(threeJSRenderer, app);

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
         * Stop the 3D game and clean up resources - delegates to BaseController's cleanupMixin
         * Uses 'threeGameState' key instead of 'gameState' for 3D mode
         */
        stopGame: function(app) {
            // Call BaseController's cleanup with threeGameState key (handles synth disposal via private storage)
            base.cleanupMixin.stopGame(this, app, 'threeGameState');
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
    });
}
