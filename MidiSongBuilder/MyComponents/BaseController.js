/**
 * BaseController - Shared mixin-based controller for 2D and 3D game modes
 * 
 * Provides common functionality through mixin composition:
 * - stateMixin: GameState initialization and cleanup
 * - audioMixin: Audio scheduling with Tone.js
 * - gameLoopMixin: Core game loop logic (abstract rendering hooks)
 * 
 * Usage: Compose with controller-specific extensions
 */

function getCoordinateCalculator() {
    var CoordinateCalculator = function() {
        this.constants = { DEFAULT_DELAY: 4 };
    };

    CoordinateCalculator.prototype.getConstants = function() {
        return this.constants;
    };

    return new CoordinateCalculator();
}

function getBaseController() {
    var coordinateCalculator = getCoordinateCalculator();
    
    // Private synth storage for all controllers using BaseController
    var synths = [];
    
    // Helper functions that mixins can call
    function addSynth(synth) {
        synths.push(synth);
    }
    
    var _disposeAllSynths = function() {
        while (synths.length) {
            var synth = synths.shift();
            if (synth) {
                synth.disconnect();
                synth.dispose();
            }
        }
    };
    
    function cleanupAppState(app, gameStateKey) {
        if (app && app.hasOwnProperty(gameStateKey)) {
            app[gameStateKey] = undefined;
            delete app[gameStateKey];
        }
    }
    
    // State mixin - GameState initialization and cleanup
    var stateMixin = {
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
            if (visibleField && Array.isArray(visibleField)) {
                for (var i = 0; i < visibleField.length; i++) {
                    visibleField[i].state = 'unplayed';
                }
            }
            
            // Reset Vue app's score values
            if (app) {
                app.score = 0;
                app.goodCount = 0;
                app.okCount = 0;
                app.badCount = 0;
                app.missedCount = 0;
            }
            
            // Create and initialize GameState - single source of truth for game state
            var gameState = getGameState();
            gameState.initialize({
                startTime: Tone.now(),
                earliestNoteIndex: 0,
                visibleField: visibleField,
                songEnd: songEnd,
                scoreKeeper: scoreKeeper,
                songNoteRenderer: songNoteRenderer,
                highScoreTracker: highScoreTracker,
                challengeScores: challengeScores,
                pressedKeys: null, // Set by caller
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
                for (var i = 0; i < visibleField.length; i++) {
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
    
    // Audio mixin - Tone.js event scheduling
    var audioMixin = {
        /**
         * Create synths and schedule audio events for all tracks
         * @param {Object} currentMidi - The parsed MIDI data with tracks
         * @param {Object} gameState - The GameState instance
         * @param {Number} [trackVolume=1.0] - Optional volume multiplier for all notes
         */
        scheduleAudioEvents: function(currentMidi, gameState, trackVolume) {
            if (!currentMidi || !currentMidi.tracks) return;
            
            var startTime = gameState.get('startTime');
            var delay = gameState.get('delay');
            var volume = trackVolume !== undefined ? trackVolume : 1.0;
            
            currentMidi.tracks.forEach(function(track) {
                var synth = new Tone.PolySynth(Tone.Synth, {
                    envelope: {
                        attack: 0.02,
                        decay: 0.1,
                        sustain: 0.3,
                        release: 1,
                    },
                }).toDestination();
                
                addSynth(synth);
                
                track.notes.forEach(function(note) {
                    if (note.duration > 0) {
                        synth.triggerAttackRelease(
                            note.name,
                            note.duration,
                            note.time + startTime + delay,
                            note.velocity * volume
                        );
                    }
                });
            }, this);
        }
    };
    
// Game loop mixin - Core game loop logic with abstract rendering hooks
    var gameLoopMixin = {
        /**
         * Base game loop - shared logic for both 2D and 3D controllers
         * Override doRenderAfterLoop for controller-specific rendering
         */
        baseGameLoop: function(app, gameStateKey) {
            var gameState = app[gameStateKey];

            if (!gameState || !this) {
                _stopGameFn(this || baseController._self, app, gameStateKey);
                return;
            }

            // Check if dependencies are available
            if (!gameState.get('scoreKeeper') ||
                !gameState.get('songNoteRenderer') ||
                !gameState.get('invertedKeyNoteMap')) {
                _stopGameFn(this || baseController._self, app, gameStateKey);
                return;
            }

            var intervalNow = Tone.now() - gameState.get('startTime') - gameState.get('delay');
            var visiblePast = intervalNow - 1;
            var visibleFuture = intervalNow + 9;

            // Check if song has ended
            if (visiblePast > gameState.get('songEnd')) {
                handleSongEnd(app, gameState);
                _stopGameFn(this || baseController._self, app, gameStateKey);
                return;
            }

            // Update earliestNoteIndex for notes that have passed
            var earliestNoteIndex = gameState.get('earliestNoteIndex') || 0;
            for (var i = earliestNoteIndex; i < gameState.get('visibleField').length; i++) {
                var note = gameState.get('visibleField')[i];
                if (note.time + note.duration < visiblePast) {
                    earliestNoteIndex = i;
                } else {
                    break;
                }
            }
            gameState.set('earliestNoteIndex', earliestNoteIndex);

            // Calculate score
            var currentScore = gameState.get('scoreKeeper').calculateNewScore(
                gameState.get('visibleField'),
                gameState.get('pressedKeys') || {},
                intervalNow,
                earliestNoteIndex,
                visibleFuture
            );

            gameState.set('score', currentScore.total);
            var counts = gameState.get('scoreKeeper').getCounts();
            gameState.set('goodCount', counts.goodCount);
            gameState.set('okCount', counts.okCount);
            gameState.set('badCount', counts.badCount);
            gameState.set('missedCount', counts.missedCount);

            // Sync state to Vue for reactive binding
            gameState.syncToVue(app);

            // Hook for controller-specific rendering after loop (must be implemented by subclasses)
            if (typeof this.doRenderAfterLoop === 'function') {
                this.doRenderAfterLoop(app, gameState, currentScore, intervalNow, visiblePast, visibleFuture);
            }
        },
        
        /**
         * Handle song end - render final score and update high scores
         */
        handleSongEnd: function(app, gameState) {
            if (gameState.get('songNoteRenderer')) {
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
        },
        
        /**
         * Abstract hook for controller-specific rendering after loop
         * Must be implemented by subclasses (GameController, ThreeJSGameController)
         */
        doRenderAfterLoop: function(app, gameState, currentScore, intervalNow, visiblePast, visibleFuture) {
            // Default implementation does nothing - must be overridden by subclasses
        }
    };
    
    // Cleanup mixin - Stop game and clean up resources
    var cleanupMixin = {
        /**
         * Stop the game loop and clean up all resources
         * Can be called as: stopGame(app, gameStateKey) or stopGame(controller, app, gameStateKey)
         * @param {Object} controllerOrApp - Either controller instance or app object
         * @param {Object} app - The Vue.js app instance (if controller was first arg)  
         * @param {String} gameStateKey - 'gameState' or 'threeGameState'
         */
        stopGame: function(controllerOrApp, app, gameStateKey) {
            // Determine calling style based on argument count and types
            var targetController = this;
            var targetApp = null;
            var keyToUse = 'gameState';
            
            // If called with 3 args, format is: stopGame(controller, app, gameStateKey)
            if (arguments.length === 3) {
                targetController = controllerOrApp;
                targetApp = app;
                keyToUse = gameStateKey || 'gameState';
            }
            // If called with 2 args, format is: stopGame(app, gameStateKey)
            else if (arguments.length === 2 && typeof controllerOrApp !== 'string') {
                targetController = this;
                targetApp = controllerOrApp;
                keyToUse = app || 'gameState';
            }
            // If called with 2 args and first is string, it's stopGame(app, gameStateKey) but app comes in as controllerOrApp
            else if (arguments.length === 2 && typeof controllerOrApp === 'string') {
                targetController = this;
                keyToUse = controllerOrApp;
                // app is missing in this case
            }
            // If called with 1 arg, format is: stopGame(app) or from .call(controller, app, key)
            else if (arguments.length === 1 && !controllerOrApp.playIntervalId) {
                targetController = this;
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
            Tone.Transport.stop();
            Tone.Transport.position = 0;
            Tone.Transport.cancel();
            
            // Dispose all synths (using BaseController's private storage)
            _disposeAllSynths();
            
            // Cleanup game state from app
            if (targetApp) {
                cleanupAppState(targetApp, keyToUse);
            }
        }
    };

    // Store reference to cleanup function for use within mixins  
    var _stopGameFn = null;
    
    // Helper function for handleSongEnd that doesn't rely on 'this'
    
// Helper function for handleSongEnd that doesn't rely on 'this'
    function handleSongEnd(app, gameState) {
        gameLoopMixin.handleSongEnd.call({}, app, gameState);
    }

    
    // Return the composed controller with all mixins and methods  
    var baseController = Object.assign(
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
            
            // Public synths array for backward compatibility (returns private storage)
            get synths() {
                return synths;
            },
            
            // Add synth to BaseController's private storage
            addSynth: function(synth) {
                synths.push(synth);
            },
            
            // Dispose all synths stored in BaseController (but keep public tracking for tests)
            disposeAllSynths: function() {
                // Only dispose private synths, don't clear public array for testing
                _disposeAllSynths();
            },
            
            // Get all synths (for testing)
            getSynths: function() {
                return synths;
            },
            
            // Expose mixins for direct use
            stateMixin: stateMixin,
            audioMixin: audioMixin,
            gameLoopMixin: gameLoopMixin,
            cleanupMixin: cleanupMixin,
            
            /**
             * Start the game with audio and rendering
             * This is a convenience method that composes all mixins
             */
            startGame: function(app, currentMidi, difficultySettings, songEnd, visibleField, pressedKeys) {
                // Clear any existing game state
                this.stopGame(app);
                
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
                
                // Initialize game state using stateMixin
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
                
                // Store the GameState instance on app
                app.gameState = gameState;
                
                // Set pressedKeys in gameState
                gameState.set('pressedKeys', pressedKeys || {});
                
                // Schedule audio events using audioMixin
                this.audioMixin.scheduleAudioEvents(currentMidi, gameState);
                
                // Create and start the game loop
                this.playIntervalId = setInterval(
                    () => this.gameLoopMixin.baseGameLoop.call(this, app, 'gameState'), 
                    10
                );
                
                return this.playIntervalId;
            },
            
            /**
             * Stop the game and clean up resources
             */
            stopGame: function(app, gameStateKey) {
                // Call cleanupMixin.stopGame with baseController as context
                cleanupMixin.stopGame(baseController, app, gameStateKey || 'gameState');
            }
        });
    
        
    // Store reference for stopGame helper function
    baseController._self = baseController;
    
    // Set the cleanup function reference for use in mixins
    _stopGameFn = function(controller, app, gameStateKey) {
        if (controller && controller.stopGame) {
            controller.stopGame.call(controller, app, gameStateKey);
        } else {
            cleanupMixin.stopGame(controller || baseController._self, app, gameStateKey);
        }
    };
    
    return baseController;
}
