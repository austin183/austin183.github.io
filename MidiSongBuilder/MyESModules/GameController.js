/**
 * GameController - Base game controller for 2D canvas rendering
 * Handles game loop, audio scheduling, and scoring
 *
 * Uses ComponentRegistry for dependency injection of services.
 * Services are retrieved from the registry during startGame.
 * 
 * @implements {IGameController}
 */

import getBaseController from './BaseController.js';
import { IGameController } from './IGameController.js';

function getGameController(_Tone) {
    // Use passed Tone or fallback to window.Tone
    var Tone = _Tone || window.Tone;

    // Use BaseController as base and add 2D-specific extensions
    var base = getBaseController(Tone);

    var gameController = Object.assign({}, base, {
        // Store reference to keyRenderInfo for use in doRenderAfterLoop
        _keyRenderInfo: base.keyRenderInfo,

        /**
         * Start the game with audio and rendering
         * Uses BaseController's stateMixin, audioMixin, and gameLoopMixin.
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
            // Clear any existing game state
            this.stopGame(app);

            // Retrieve dependencies from ComponentRegistry
            var scoreKeeper = app.componentRegistry ? app.componentRegistry.getService('scoreKeeper') : null;
            var songNoteRenderer = app.componentRegistry ? app.componentRegistry.getService('songNoteRenderer') : null;
            var keyNoteMapService = app.componentRegistry ? app.componentRegistry.getService('keyNoteMapService') : null;
            var highScoreTracker = app.componentRegistry ? app.componentRegistry.getService('highScoreTracker') : null;
            var challengeScores = app.componentRegistry ? app.componentRegistry.getService('challengeScores') : null;

            // Initialize game state using BaseController's stateMixin
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

            // Store the GameState instance on app for access in the loop
            app.gameState = gameState;

            // Set pressedKeys in gameState (stateMixin initializes it as null)
            gameState.set('pressedKeys', pressedKeys || {});

            // Schedule audio events using BaseController's audioMixin
            this.audioMixin.scheduleAudioEvents(currentMidi, gameState, undefined, Tone);

            // Create and start the game loop using BaseController's baseGameLoop
            this.playIntervalId = setInterval(
                () => this.gameLoopMixin.baseGameLoop.call(this, app, 'gameState', Tone),
                10
            );

            return this.playIntervalId;
        },

        /**
         * The main game loop callback - delegates to BaseController's baseGameLoop
         * @param {Object} app - The Vue.js app instance
         */
        gameLoop: function(app) {
            base.gameLoopMixin.baseGameLoop.call(this, app, 'gameState');
        },

        /**
         * 2D-specific rendering hook called by BaseController's baseGameLoop
         * @param {Object} app - The Vue.js app instance
         * @param {Object} gameState - The GameState instance
         * @param {Object} currentScore - Current score object with keyScores
         * @param {Number} intervalNow - Current time relative to song start
         * @param {Number} visiblePast - Past boundary for note visibility
         * @param {Number} visibleFuture - Future boundary for note visibility
         */
        doRenderAfterLoop: function(app, gameState, currentScore, intervalNow, visiblePast, visibleFuture) {
            var earliestNoteIndex = gameState.get('earliestNoteIndex') || 0;

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
                    this._keyRenderInfo,
                    intervalNow,
                    visiblePast
                );
            }
        },

        /**
         * Stop the game and clean up resources - delegates to BaseController's cleanupMixin
         */
        stopGame: function(app) {
            base.cleanupMixin.stopGame(this, app, 'gameState');
        }
    });

    // Reset the stop function reference for GameController's stopGame to use
    window.baseControllerStopFnRef = null;

    return gameController;
}

export default getGameController;
