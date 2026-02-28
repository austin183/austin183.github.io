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
        synths: [],
        score: 0,
        goodCount: 0,
        okCount: 0,
        badCount: 0,
        missedCount: 0
    };

    return {
        /**
         * Initialize state with config values
         * @param {Object} config - State values to set
         * @returns {Object} - The state instance for chaining
         */
        initialize: function(config) {
            Object.assign(state, config);
            return this;
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
            state.score = 0;
            state.goodCount = 0;
            state.okCount = 0;
            state.badCount = 0;
            state.missedCount = 0;
        },

        /**
         * Get the state object
         * NOTE: This returns a reference to the internal state for performance in the game loop.
         * Use get() and set() methods for individual properties to maintain encapsulation.
         * @returns {Object} - The internal state (use read-only operations when possible)
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
        },

        /**
         * Sync state values to Vue app for reactive binding
         * This allows Vue to track changes without storing state directly on app
         * @param {Object} app - The Vue app instance to sync to
         */
        syncToVue: function(app) {
            if (!app) return;
            
            app.score = state.score;
            app.goodCount = state.goodCount;
            app.okCount = state.okCount;
            app.badCount = state.badCount;
            app.missedCount = state.missedCount;
        },

        /**
         * Get all score-related counts as an object
         * Useful for rendering or syncing to Vue
         * @returns {Object} - Object with all score counts
         */
        getScoreCounts: function() {
            return {
                score: state.score,
                goodCount: state.goodCount,
                okCount: state.okCount,
                badCount: state.badCount,
                missedCount: state.missedCount
            };
        }
    };
}
