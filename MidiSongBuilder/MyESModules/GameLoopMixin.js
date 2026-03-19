/**
 * GameLoopMixin - Core game loop logic with abstract rendering hooks
 * 
 * Used by BaseController to provide the main game loop functionality.
 * Implements template method pattern with doRenderAfterLoop hook for controller-specific rendering.
 */

import { GAMEPLAY, RENDERING_2D } from './GameConstants.js';

export function getGameLoopMixin(cleanupMixin) {
    /**
     * Handle song end - render final score and update high scores
     */
    function handleSongEnd(app, gameState) {
        if (gameState.get('songNoteRenderer') && app.notesCanvas && app.vueCanvas) {
            gameState.get('songNoteRenderer').renderFinalScore(
                app.notesCanvas, 
                app.vueCanvas, 
                gameState.get('score') || 0,
                gameState.get('goodCount') || 0,
                gameState.get('okCount') || 0,
                gameState.get('badCount') || 0,
                gameState.get('missedCount') || 0
            );
        }

        // Update high scores if enabled
        if (app.toggleTrackHighScores && gameState.get('highScoreTracker')) {
            gameState.get('highScoreTracker').setHighScore(
                app.selectedMidiSong.filename, 
                app.selectedDifficulty.difficultyKey, 
                gameState.get('score') || 0
            );
            app.highScore = gameState.get('highScoreTracker').getHighScore(
                app.selectedMidiSong.filename, 
                app.selectedDifficulty.difficultyKey
            );
            if (gameState.get('challengeScores')) {
                app.challengeScore = gameState.get('challengeScores').getSelectedScore(
                    app.selectedMidiSong.filename, 
                    app.selectedDifficulty.difficultyKey
                );
            }
        }

        // Sync state to Vue for reactive binding
        gameState.syncToVue(app);
    }

    /**
     * Validate that game loop can proceed
     */
    function validateLoopPrerequisites(gameState, controller, app, gameStateKey) {
        if (!gameState || !controller) {
            cleanupMixin.stopGame(controller, app, gameStateKey);
            return false;
        }

        if (!gameState.get('scoreKeeper') ||
            !gameState.get('songNoteRenderer') ||
            !gameState.get('invertedKeyNoteMap')) {
            cleanupMixin.stopGame(controller, app, gameStateKey);
            return false;
        }

        return true;
    }

    /**
     * Calculate current timing values from game state
     */
    function calculateTiming(gameState, Tone) {
        const now = Tone.now() - gameState.get('startTime') - gameState.get('delay');
        const visiblePast = now - RENDERING_2D.VISIBLE_PAST_OFFSET;
        const visibleFuture = now + RENDERING_2D.VISIBLE_FUTURE_OFFSET;

        return { now, visiblePast, visibleFuture };
    }

    /**
     * Update earliestNoteIndex for notes that have passed
     */
    function updateEarliestNoteIndex(gameState, visiblePast) {
        let earliestNoteIndex = gameState.get('earliestNoteIndex') || 0;
        const visibleField = gameState.get('visibleField');

        for (let i = earliestNoteIndex; i < visibleField.length; i++) {
            const note = visibleField[i];
            if (note.time + note.duration < visiblePast) {
                earliestNoteIndex = i;
            } else {
                break;
            }
        }

        gameState.set('earliestNoteIndex', earliestNoteIndex);
        return earliestNoteIndex;
    }

    /**
     * Update score and counts in game state
     */
    function updateScore(gameState, earliestNoteIndex, visibleFuture, now, app) {
        const currentScore = gameState.get('scoreKeeper').calculateNewScore(
            gameState.get('visibleField'),
            gameState.get('pressedKeys') || {},
            now,
            earliestNoteIndex,
            visibleFuture
        );

        gameState.set('score', currentScore.total);
        const counts = gameState.get('scoreKeeper').getCounts();
        gameState.set('goodCount', counts.goodCount);
        gameState.set('okCount', counts.okCount);
        gameState.set('badCount', counts.badCount);
        gameState.set('missedCount', counts.missedCount);

        // Sync state to Vue for reactive binding
        gameState.syncToVue(app);

        return currentScore;
    }

    /**
     * Check if song has ended based on timing
     */
    function shouldStopGame(gameState, visiblePast) {
        return visiblePast > gameState.get('songEnd');
    }

    return {
        /**
         * Base game loop - shared logic for both 2D and 3D controllers
         */
        baseGameLoop: function(app, gameStateKey, _Tone) {
            const controller = this;
            const gameState = app[gameStateKey];

            // Validate prerequisites
            if (!validateLoopPrerequisites(gameState, controller, app, gameStateKey)) {
                return;
            }

            // Calculate timing
            const ToneLib = _Tone || window.Tone;
            const timing = calculateTiming(gameState, ToneLib);

            // Check if song has ended
            if (shouldStopGame(gameState, timing.visiblePast)) {
                handleSongEnd(app, gameState);
                cleanupMixin.stopGame(controller, app, gameStateKey);
                return;
            }

            // Update earliestNoteIndex for notes that have passed
            const earliestNoteIndex = updateEarliestNoteIndex(gameState, timing.visiblePast);

            // Calculate score
            const currentScore = updateScore(gameState, earliestNoteIndex, timing.visibleFuture, timing.now, app);

            // Hook for controller-specific rendering after loop (must be implemented by subclasses)
            if (typeof this.doRenderAfterLoop === 'function') {
                this.doRenderAfterLoop(
                    app, gameState, currentScore, 
                    timing.now, timing.visiblePast, timing.visibleFuture
                );
            }
        },

        /**
         * Handle song end - render final score and update high scores
         */
        handleSongEnd: handleSongEnd,

        /**
         * Abstract hook for controller-specific rendering after loop
         * Must be implemented by subclasses (GameController, ThreeJSGameController)
         */
        doRenderAfterLoop: function() {
            // Default implementation does nothing - must be overridden by subclasses
        }
    };
}
