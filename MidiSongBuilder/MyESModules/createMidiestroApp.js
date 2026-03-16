/**
 * createMidiestroApp - Shared Vue.js app factory for 2D and 3D game modes
 * 
 * Extracts common Vue.js app setup logic including:
 * - Shared data properties (score tracking, difficulty settings, song selection)
 * - Shared methods (handleMidiSongSelection, setDifficulty, handleToggleTrackHighScores)
 * - Shared mounted() lifecycle setup (canvas initialization, component registry)
 * - Mode-specific extensions via config callbacks and composable pattern
 */

import { useMidiestroGame } from './useMidiestroGame.js';

export function createMidiestroApp(config) {
    const { 
        mode, // '2d' | '3d'
        createApp,
        renderSongNotesFn
    } = config;

    // Get shared game composable
    const gameComposable = useMidiestroGame(config);

    return createApp({
        // Spread shared composable data, methods, and lifecycle hooks
        ...gameComposable,
        
        // Override renderSongNotes with mode-specific implementation
        methods: {
            ...gameComposable.methods,
            renderSongNotes: function() {
                if (renderSongNotesFn) {
                    renderSongNotesFn.call(this);
                }
            },
            
            // 3D-specific methods (only added in 3D mode)
            ...(mode === '3d' ? {
                handleCameraPresets: function() {
                    // To be overridden by caller if needed
                }
            } : {})
        }
    });
}
