/**
 * @fileoverview Interface definition for game controllers managing the rhythm game loop.
 * 
 * This module documents the expected contract for all game controller implementations.
 * Controllers manage the core game loop, audio scheduling, and rendering coordination.
 */

/**
 * Interface for game controllers managing the rhythm game loop.
 * 
 * All controller implementations must provide these methods:
 * - startGame: Initialize and begin game playback
 * - stopGame: Halt gameplay and cleanup resources
 * - resetAppStateScores: Reset score counters in Vue app state
 * - doRenderAfterLoop: Render game state (hook for controller-specific rendering)
 * 
 * @interface IGameController
 */

/**
 * Starts the game with provided configuration.
 * 
 * Initializes game state, schedules audio events, and begins the game loop.
 * Both GameController and ThreeJSGameController use the same signature:
 * - Dependencies retrieved from app.componentRegistry (scoreKeeper, songNoteRenderer, etc.)
 * - ThreeJSGameController retrieves threeJSRenderer from registry internally
 * 
 * @method startGame
 * @memberof IGameController
 * @param {Object} app - Vue app instance with game state and componentRegistry
 * @param {Object} currentMidi - Parsed MIDI data object with tracks array
 * @param {Object} difficultySettings - Settings for current difficulty level
 * @param {number} songEnd - Song end time in seconds
 * @param {Array<Object>} visibleField - Array of note objects ready for rendering
 * @param {Object} pressedKeys - Object tracking keyboard input state
 * @returns {number} Interval ID for the game loop
 */

/**
 * Stops the game and cleans up resources.
 * 
 * Halts the game loop, stops Tone.js transport, disposes audio synths,
 * and removes game state from the Vue app.
 * 
 * @method stopGame
 * @memberof IGameController
 * @param {Object} app - Vue app instance with game state to cleanup
 * @param {string} [gameStateKey='gameState'] - Key used to store game state in app
 */

/**
 * Resets score counters in the application state.
 * 
 * Sets all score-related properties to zero in the Vue app:
 * - score, goodCount, okCount, badCount, missedCount
 * 
 * @method resetAppStateScores
 * @memberof IGameController
 * @param {Object} app - Vue app instance with score properties
 */

/**
 * Renders game state after each loop iteration. Abstract hook for controller-specific rendering.
 * 
 * Called by BaseController's gameLoopMixin after scoring calculations.
 * Subclasses implement this for their specific rendering:
 * - GameController: 2D canvas rendering via SongNoteRenderer
 * - ThreeJSGameController: 3D scene updates via ThreeJSRenderer + 2D overlay
 * 
 * @method doRenderAfterLoop
 * @memberof IGameController
 * @param {Object} app - Vue app instance
 * @param {Object} gameState - Current game state object (GameState instance)
 * @param {Object} currentScore - Score object with total and keyScores properties
 * @param {number} intervalNow - Current timestamp relative to song start (seconds)
 * @param {number} visiblePast - Past boundary time for note visibility (seconds)
 * @param {number} visibleFuture - Future boundary time for note visibility (seconds)
 */

/**
 * @typedef {Object} IGameController
 * @property {function(Object, Object, Object, number, Array<Object>, Object):number} startGame
 * @property {function(Object, string=):void} stopGame
 * @property {function(Object):void} resetAppStateScores
 * @property {function(Object, Object, Object, number, number, number):void} doRenderAfterLoop
 */

// Export empty object to prevent accidental instantiation and document the interface
export const IGameController = {
    startGame: null,
    stopGame: null,
    resetAppStateScores: null,
    doRenderAfterLoop: null
};

// Export default for consistent import pattern with other modules
export default IGameController;
