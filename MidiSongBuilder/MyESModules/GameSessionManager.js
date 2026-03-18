/**
 * GameSessionManager - Handles game session lifecycle and orchestration
 * 
 * Extracts common logic from togglePlay() in both 2D and 3D versions:
 * - UI button text updates
 * - Input handler enable/disable
 * - Focus/blur management
 * - DOM scrolling operations
 * - Visible field calculation orchestration
 * - Cache building
 * - Game controller lifecycle management
 */

import getComponentRegistry from './ComponentRegistry.js';
import { getVisibleFieldFactory } from './VisibleFieldFactory.js';

export function getGameSessionManager() {
    const registry = getComponentRegistry();
    
    return {
        /**
         * Update play button text based on playing state
         * @param {Boolean} isPlaying - Current playing state
         */
        updatePlayButtonText: function(isPlaying) {
            var playButton = document.getElementById('tonePlayToggle');
            if (playButton) {
                playButton.textContent = isPlaying ? 'Stop' : 'Restart';
            }
        },
        
        /**
         * Prepare input handlers for gameplay
         */
        prepareForInput: function() {
            if (window.inputHandler) {
                window.inputHandler.setNoteInputEnabled(true);
            }
        },
        
        /**
         * Prepare app state for playback
         * - Blur active element to prevent keyboard interference
         * - Scroll to canvas container
         * @param {Object} app - Vue.js app instance
         */
        prepareForPlayback: function(app) {
            if (document.activeElement) {
                document.activeElement.blur();
            }

            const containerElement = document.getElementById("canvasContainer");
            if (containerElement) {
                containerElement.scrollIntoView({ behavior: "smooth" });
            }
        },
        
        /**
         * Calculate visible field based on difficulty settings using Strategy pattern
         * @param {Object} app - Vue.js app instance
         * @param {Object} songDifficultySettings - Song-specific difficulty overrides
         * @param {Array} notes - Array of notes from selected track
         * @param {Number} songEnd - Song end time in seconds
         * @param {Object} visibleFieldFilterer - Service for filtering notes
         * @param {Object} keyRenderInfo - Key render information
         * @param {Canvas} notesCanvas - Notes canvas element
         * @param {Object} songNoteRenderer - Song note renderer service
         * @param {Function} getInvertedMapFn - Function to get inverted key note map
         * @param {Object} difficultySettingsCalculator - Service for calculating target-based filtering (optional)
         * @returns {Object} Result with visibleField array and cache
         */
        calculateVisibleField: function(app, songDifficultySettings, notes, songEnd, 
                                        visibleFieldFilterer, keyRenderInfo, notesCanvas, 
                                        songNoteRenderer, getInvertedMapFn, difficultySettingsCalculator) {
            const invertedKeyNoteMap = getInvertedMapFn(app.selectedKeyNoteMap.keyNoteMap);
            
            const factoryConfig = {
                songDifficultySettings: songDifficultySettings,
                visibleFieldFilterer: visibleFieldFilterer,
                difficultySettingsCalculator: difficultySettingsCalculator || visibleFieldFilterer,
                songNoteRenderer: songNoteRenderer
            };
            
            const visibleFieldFactory = getVisibleFieldFactory(factoryConfig);
            
            var visibleField = [];
            
            if (songDifficultySettings) {
                const songDifficulty = songDifficultySettings[app.selectedDifficulty.difficultyKey];
                visibleField = visibleFieldFactory.build(
                    notes, 
                    songDifficulty.minNoteDistance, 
                    songDifficulty.minDuration, 
                    invertedKeyNoteMap, 
                    keyRenderInfo, 
                    notesCanvas
                );
            } else {
                const targetNotesPerMinute = app.selectedDifficulty.targetNotesPerMinute;
                const result = visibleFieldFactory.build(
                    targetNotesPerMinute, 
                    notes, 
                    invertedKeyNoteMap, 
                    keyRenderInfo, 
                    notesCanvas, 
                    songEnd
                );
                visibleField = result.visibleField;
            }
            
            return {
                visibleField: visibleField,
                invertedKeyNoteMap: invertedKeyNoteMap
            };
        },
        
        /**
         * Build and set note letter cache on app
         * @param {Object} app - Vue.js app instance
         * @param {Object} songNoteRenderer - Song note renderer service
         * @param {Object} keyRenderInfo - Key render information
         */
        buildAndSetNoteCache: function(app, songNoteRenderer, keyRenderInfo) {
            app.noteLetterCache = songNoteRenderer.buildSongNoteLetterCache(keyRenderInfo);
        },
        
        /**
         * Start the game loop with prepared parameters
         * @param {Object} gameController - GameController or ThreeJSGameController instance
         * @param {Array} args - Arguments to pass to gameController.startGame()
         * @returns {*} Result from startGame call
         */
        startGameLoop: function(gameController, ...args) {
            return gameController.startGame.apply(gameController, args);
        },
        
        /**
         * Stop the game loop and cleanup
         * @param {Object} gameController - GameController or ThreeJSGameController instance  
         * @param {Object} app - Vue.js app instance
         */
        stopGameLoop: function(gameController, app) {
            gameController.stopGame(app);
        },
        
        /**
         * Prepare and start the game with all necessary setup
         * @param {Object} app - Vue.js app instance (with componentRegistry for DI)
         * @param {Object} songDifficultySettings - Song-specific difficulty overrides
         * @param {Object} visibleFieldFilterer - Service for filtering notes
         * @param {Object} keyRenderInfo - Key render information
         * @param {Object} gameController - GameController or ThreeJSGameController instance
         * @param {Object} currentMidi - Current MIDI data
         * @param {Number} songEnd - Song end time in seconds
         * @param {Object} songNoteRenderer - Song note renderer service
         * @param {Function} getInvertedMapFn - Function to get inverted key note map
         * @param {Object} difficultySettingsCalculator - Service for calculating target-based filtering (optional)
         * @param {Object} pressedKeys - Pressed keys state
         * @returns {*} Result from startGameLoop call
         */
        prepareAndStartGame: function(app, songDifficultySettings, visibleFieldFilterer, keyRenderInfo, gameController, currentMidi, songEnd, songNoteRenderer, getInvertedMapFn, difficultySettingsCalculator, pressedKeys) {
            this.prepareForPlayback(app);
            
            if (!app.selectedTrack || !app.selectedTrack.notes) {
                console.error('No track selected or track has no notes');
                return;
            }
            
            const result = this.calculateVisibleField(
                app, 
                songDifficultySettings, 
                app.selectedTrack.notes, 
                songEnd || 0,
                visibleFieldFilterer, 
                keyRenderInfo, 
                app.notesCanvas, 
                songNoteRenderer,
                getInvertedMapFn,
                difficultySettingsCalculator
            );
            
            const visibleField = result.visibleField;
            
            this.buildAndSetNoteCache(app, songNoteRenderer, keyRenderInfo);
            
            return this.startGameLoop(gameController, app, currentMidi, songDifficultySettings, songEnd, visibleField, pressedKeys);
        },
        
        /**
         * Stop the game and perform cleanup
         * @param {Object} gameController - GameController or ThreeJSGameController instance  
         * @param {Object} app - Vue.js app instance
         */
        stopGame: function(gameController, app) {
            return this.stopGameLoop(gameController, app);
        }
    };
}
