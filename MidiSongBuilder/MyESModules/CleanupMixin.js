/**
 * CleanupMixin - Game cleanup and resource disposal
 * 
 * Used by BaseController to provide game stopping and cleanup functionality.
 * Handles interval clearing, Tone.js transport stopping, and synth disposal.
 */

export function getCleanupMixin(audioSchedulingMixin) {
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
         * Stop the game loop and clean up all resources
         * 
         * Usage patterns (all supported for backward compatibility):
         * - stopGame(app, gameStateKey) - called with .call(controller, ...)
         * - stopGame(controller, app, gameStateKey) - static call with explicit controller
         */
        stopGame: function(controllerOrApp, app, gameStateKey, Tone) {
            const controller = this;
            let targetController = controller;
            let targetApp = null;
            let keyToUse = 'gameState';

            if (!controllerOrApp && !controller) {
                return;
            }

            // If called with 3 args: stopGame(controller, app, gameStateKey)
            if (arguments.length === 3) {
                targetController = controllerOrApp;
                targetApp = app;
                keyToUse = gameStateKey || 'gameState';
            }
            // If called with 2 args and first is not string: stopGame(app, gameStateKey)
            else if (arguments.length === 2 && typeof controllerOrApp !== 'string') {
                targetController = controller;
                targetApp = controllerOrApp;
                keyToUse = app || 'gameState';
            }
            // If called with 2 args and first is string: stopGame(app, 'gameState') where app came in as controllerOrApp
            else if (arguments.length === 2 && typeof controllerOrApp === 'string') {
                targetController = controller;
                keyToUse = controllerOrApp;
            }
            // If called with 1 arg: stopGame(app) or from .call(controller, app, key)
            else if (arguments.length === 1 && (!controllerOrApp || !controllerOrApp.playIntervalId)) {
                targetController = controller;
                targetApp = controllerOrApp;
            } else if (arguments.length === 1 && controllerOrApp.playIntervalId) {
                targetController = controllerOrApp;
            }

            // Stop the interval
            if (targetController && targetController.playIntervalId) {
                clearInterval(targetController.playIntervalId);
                targetController.playIntervalId = null;
            }

            // Stop Tone.js transport
            if (Tone && Tone.Transport) {
                Tone.Transport.stop();
                Tone.Transport.position = 0;
                Tone.Transport.cancel();
            }

            // Dispose all synths via audioSchedulingMixin
            if (audioSchedulingMixin && audioSchedulingMixin.disposeAllSynths) {
                audioSchedulingMixin.disposeAllSynths();
            }

            // Cleanup game state from app
            if (targetApp) {
                cleanupAppState(targetApp, keyToUse);
            }
        }
    };
}
