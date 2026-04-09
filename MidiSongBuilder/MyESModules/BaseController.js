/**
 * BaseController - Shared mixin-based controller for 2D and 3D game modes
 * 
 * Provides common functionality through mixin composition:
 * - stateMixin: GameState initialization and cleanup (from BaseStateMixin.js)
 * - audioMixin: Audio scheduling with Tone.js (from AudioSchedulingMixin.js)
 * - gameLoopMixin: Core game loop logic (from GameLoopMixin.js)
 * - cleanupMixin: Game stopping and resource disposal (from CleanupMixin.js)
 * 
 * Usage: Compose with controller-specific extensions (GameController, ThreeJSGameController)
 * 
 * @implements {IGameController}
 */

import { IGameController } from './IGameController.js';
import { GAMEPLAY } from './GameConstants.js';

import getGameState from './GameState.js';
import getKeyRenderInfo from './keyRenderInfo.js';
import getCoordinateCalculator from './CoordinateCalculator.js';

// Import mixin factories
import { getBaseStateMixin } from './BaseStateMixin.js';
import { getAudioSchedulingMixin } from './AudioSchedulingMixin.js';
import { getGameLoopMixin } from './GameLoopMixin.js';
import { getCleanupMixin } from './CleanupMixin.js';

function getBaseController(_Tone) {
    const coordinateCalculator = getCoordinateCalculator();
    const Tone = _Tone || window.Tone;

    // Compose mixins from separate modules
    const audioMixin = getAudioSchedulingMixin();
    const cleanupMixin = getCleanupMixin(audioMixin);
    const gameLoopMixin = getGameLoopMixin(cleanupMixin);
    const stateMixin = getBaseStateMixin(Tone, getGameState, getKeyRenderInfo);

    // Store reference for internal use
    let baseController = null;

    // Helper function for stopGame calls within mixins
    const _stopGameFn = function(controller, app, gameStateKey) {
        if (controller && controller.stopGame) {
            controller.stopGame.call(controller, app, gameStateKey);
        } else {
            cleanupMixin.stopGame(controller || baseController._self, app, gameStateKey);
        }
    };

    // Helper function to retrieve game dependencies from ComponentRegistry
    function retrieveGameDependencies(app) {
        return {
            scoreKeeper: app.componentRegistry ? 
                app.componentRegistry.getService('scoreKeeper') : null,
            songNoteRenderer: app.componentRegistry ? 
                app.componentRegistry.getService('songNoteRenderer') : null,
            keyNoteMapService: app.componentRegistry ? 
                app.componentRegistry.getService('keyNoteMapService') : null,
            highScoreTracker: app.componentRegistry ? 
                app.componentRegistry.getService('highScoreTracker') : null,
            challengeScores: app.componentRegistry ? 
                app.componentRegistry.getService('challengeScores') : null,
            themeService: app.componentRegistry ? 
                app.componentRegistry.getService('themeService') : null
        };
    }

    // Build the composed controller
    baseController = Object.assign(
        stateMixin,
        audioMixin,
        gameLoopMixin,
        cleanupMixin,
        {
            // Key render info for debug rendering (exposed for GameController)
            keyRenderInfo: getKeyRenderInfo(),

            // Interval ID for the game loop
            get playIntervalId() {
                return this._playIntervalId || null;
            },
            set playIntervalId(value) {
                this._playIntervalId = value;
            },

            // Delay constant from CoordinateCalculator
            get delay() {
                return coordinateCalculator.getConstants().DEFAULT_DELAY;
            },

            // Public synths array for backward compatibility (delegates to audioMixin)
            get synths() {
                return audioMixin.getSynths();
            },

            // Add synth to BaseController's storage (delegates to audioMixin)
            addSynth: function(synth) {
                // AudioSchedulingMixin handles this internally now
            },

            // Dispose all synths (delegates to audioMixin)
            disposeAllSynths: function() {
                audioMixin.disposeAllSynths();
            },

            // Get all synths (for testing) - delegates to audioMixin
            getSynths: function() {
                return audioMixin.getSynths();
            },

            // Expose mixins for direct use (for testing and extension)
            stateMixin: stateMixin,
            audioMixin: audioMixin,
            gameLoopMixin: gameLoopMixin,
            cleanupMixin: cleanupMixin,

            /**
             * Start the game with audio and rendering
             */
            startGame: function(app, currentMidi, difficultySettings, songEnd, visibleField, pressedKeys, _Tone) {
                // Clear any existing game state
                this.stopGame(app);

                // Retrieve all dependencies from ComponentRegistry
                const deps = retrieveGameDependencies(app);

                // Initialize game state using stateMixin
                var gameState = this.stateMixin.initializeGameState(
                    app,
                    deps.scoreKeeper,
                    deps.songNoteRenderer,
                    deps.keyNoteMapService,
                    deps.highScoreTracker,
                    deps.challengeScores,
                    visibleField,
                    songEnd,
                    this.delay
                );

                // Store the GameState instance on app
                app.gameState = gameState;

                // Set pressedKeys in gameState
                gameState.set('pressedKeys', pressedKeys || {});

                // Schedule audio events using audioMixin
                this.audioMixin.scheduleAudioEvents(currentMidi, gameState, undefined, _Tone || Tone);

                // Create and start the game loop
                this.playIntervalId = setInterval(
                    () => this.gameLoopMixin.baseGameLoop.call(this, app, 'gameState', _Tone || Tone), 
                    GAMEPLAY.GAME_LOOP_INTERVAL
                );

                return this.playIntervalId;
            },

            /**
             * Stop the game and clean up resources
             */
            stopGame: function(app, gameStateKey) {
                const _Tone = this._Tone || Tone;
                cleanupMixin.stopGame(baseController, app, gameStateKey || 'gameState', _Tone);
            }
        });

    // Store reference for stopGame helper function
    baseController._self = baseController;

    return baseController;
}

export default getBaseController;
