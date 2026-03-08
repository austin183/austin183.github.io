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

function getKeyRenderInfo() {
    return {
        keys: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
        startOctave: 4,
        endOctave: 5
    };
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
                delay: delay,
                synths: []
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
         */
        scheduleAudioEvents: function(currentMidi, gameState) {
            if (!currentMidi || !currentMidi.tracks) return;
            
            var startTime = gameState.get('startTime');
            var delay = gameState.get('delay');
            
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
                            note.velocity * 1.0 // Default trackVolume
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
            
            if (!gameState) {
                stopGame(app, gameStateKey);
                return;
            }
            
            // Check if dependencies are available
            if (!gameState.get('scoreKeeper') || 
                !gameState.get('songNoteRenderer') || 
                !gameState.get('invertedKeyNoteMap')) {
                stopGame(app, gameStateKey);
                return;
            }
            
            var intervalNow = Tone.now() - gameState.get('startTime') - gameState.get('delay');
            var visiblePast = intervalNow - 1;
            var visibleFuture = intervalNow + 9;
            
            // Check if song has ended
            if (visiblePast > gameState.get('songEnd')) {
                handleSongEnd(app, gameState);
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
            this.doRenderAfterLoop(app, gameState, currentScore, intervalNow, visiblePast, visibleFuture);
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
         */
        stopGame: function(app, gameStateKey) {
            // Stop the interval
            if (this.playIntervalId) {
                clearInterval(this.playIntervalId);
                this.playIntervalId = null;
            }
            
            // Stop Tone.js transport
            Tone.Transport.stop();
            Tone.Transport.position = 0;
            Tone.Transport.cancel();
            
            // Dispose all synths (using BaseController's private storage)
            _disposeAllSynths();
            
            // Cleanup game state from app
            cleanupAppState(app, gameStateKey || 'gameState');
        }
    };
    
    // Helper function for stopGame that doesn't rely on 'this'
    function stopGame(app, gameStateKey) {
        cleanupMixin.stopGame.call(baseController._self, app, gameStateKey);
    }
    
// Helper function for handleSongEnd that doesn't rely on 'this'
    function handleSongEnd(app, gameState) {
        gameLoopMixin.handleSongEnd.call({}, app, gameState);
    }

    
    // Return the composed controller with all mixins and methods
    var baseController = Object.assign(
        {

            
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
                    () => this.gameLoopMixin.baseGameLoop(app, 'gameState'), 
                    10
                );
                
                return this.playIntervalId;
            },
            
            /**
             * Stop the game and clean up resources
             */
            stopGame: function(app) {
                // Call cleanupMixin.stopGame with baseController as 'this' context
                cleanupMixin.stopGame.call(baseController, app, 'gameState');
            }
        },
        stateMixin,
        audioMixin,
        gameLoopMixin,
        cleanupMixin
    );
    
    // Store reference for stopGame helper function
    baseController._self = baseController;
    
    return baseController;
}
