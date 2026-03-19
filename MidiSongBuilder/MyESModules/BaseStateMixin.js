/**
 * BaseStateMixin - GameState initialization and cleanup logic
 * 
 * Used by BaseController to provide state management functionality.
 * Can be composed into other controllers needing similar state management.
 */

export function getBaseStateMixin(Tone, getGameState, getKeyRenderInfo) {
    /**
     * Cleanup game state from app object
     */
    function cleanupAppState(app, gameStateKey) {
        if (app && Object.prototype.hasOwnProperty.call(app, gameStateKey)) {
            app[gameStateKey] = undefined;
            delete app[gameStateKey];
        }
    }

    return {
        /**
         * Initialize gameState with common parameters
         */
        initializeGameState: function(app, scoreKeeper, songNoteRenderer, keyNoteMapService, 
                                     highScoreTracker, challengeScores, visibleField, songEnd, delay) {
            // Reset the score keeper's internal state
            if (scoreKeeper) {
                scoreKeeper.reset();
            }

            // Reset note states in visibleField to 'unplayed'
            this.resetVisibleFieldStates(visibleField);

            // Reset Vue app's score values
            this.resetAppStateScores(app);

            // Create and initialize GameState - single source of truth for game state
            const gameState = getGameState();
            gameState.initialize({
                startTime: Tone.now(),
                earliestNoteIndex: 0,
                visibleField: visibleField,
                songEnd: songEnd,
                scoreKeeper: scoreKeeper,
                songNoteRenderer: songNoteRenderer,
                highScoreTracker: highScoreTracker,
                challengeScores: challengeScores,
                pressedKeys: null,
                invertedKeyNoteMap: keyNoteMapService ? 
                    keyNoteMapService.getInvertedMap(app.selectedKeyNoteMap.keyNoteMap) : null,
                noteLetterCache: songNoteRenderer ? 
                    songNoteRenderer.buildSongNoteLetterCache(getKeyRenderInfo()) : null,
                delay: delay
            });

            return gameState;
        },

        /**
         * Reset Vue app score values
         */
        resetAppStateScores: function(app) {
            if (app) {
                app.score = 0;
                app.goodCount = 0;
                app.okCount = 0;
                app.badCount = 0;
                app.missedCount = 0;
            }
        },

        /**
         * Reset note states in visibleField to 'unplayed'
         */
        resetVisibleFieldStates: function(visibleField) {
            if (visibleField && Array.isArray(visibleField)) {
                for (let i = 0; i < visibleField.length; i++) {
                    visibleField[i].state = 'unplayed';
                }
            }
        },

        /**
         * Cleanup game state from app
         */
        cleanupAppState: function(app, gameStateKey) {
            cleanupAppState(app, gameStateKey);
        }
    };
}
