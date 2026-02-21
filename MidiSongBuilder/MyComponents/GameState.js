/**
 * GameState - Manages game state separately from Vue app
 *
 * Provides a dedicated object for game state instead of storing directly on app.
 * This improves separation of concerns and makes state management more predictable.
 */
function getGameState() {
    var state = {
        startTime: null,
        earliestNoteIndex: 0,
        visibleField: [],
        songEnd: 0,
        scoreKeeper: null,
        songNoteRenderer: null,
        threeJSRenderer: null,
        highScoreTracker: null,
        challengeScores: null,
        pressedKeys: {},
        invertedKeyNoteMap: {},
        noteLetterCache: {},
        delay: 4,
        synths: []
    };

    return {
        /**
         * Initialize state with config values
         * @param {Object} config - State values to set
         * @returns {Object} - The state object for chaining
         */
        initialize: function(config) {
            Object.assign(state, config);
            return state;
        },

        /**
         * Reset state to initial values
         */
        reset: function() {
            state.startTime = null;
            state.earliestNoteIndex = 0;
            state.visibleField = [];
            state.songEnd = 0;
            state.scoreKeeper = null;
            state.songNoteRenderer = null;
            state.threeJSRenderer = null;
            state.highScoreTracker = null;
            state.challengeScores = null;
            state.pressedKeys = {};
            state.invertedKeyNoteMap = {};
            state.noteLetterCache = {};
            state.delay = 4;
            state.synths = [];
        },

        /**
         * Get the state object
         * @returns {Object} - The internal state
         */
        getState: function() {
            return state;
        },

        /**
         * Get a specific state property
         * @param {string} key - Property name to get
         * @returns {*} - Property value
         */
        get: function(key) {
            return state[key];
        },

        /**
         * Set a specific state property
         * @param {string} key - Property name to set
         * @param {*} value - Value to set
         */
        set: function(key, value) {
            state[key] = value;
        }
    };
}
