/**
 * createGameData - Factory for creating Vue app data configuration
 * 
 * Extracts all data properties from the fat config object into a focused factory.
 * Separates concerns by grouping related state:
 * - Key note map properties
 * - Rendering display properties
 * - Track selection properties
 * - Canvas references (initialized in mounted lifecycle)
 * - Score tracking properties
 * - Difficulty settings
 * - Volume controls
 * - MIDI file properties
 * - High score tracking
 */

export function createGameData({ 
    mode, // '2d' | '3d' - for conditional data properties
    midiSongs,
    defaultKeyNoteMap,
    keyNoteMapCollection,
    difficultySettings,
    highScoreTracker,
    challengeScoresObj,
    defaultNotesPlaying = "",
    defaultSongNotes = "",
    defaultSongNotesOnKeyMap = "",
    keyRenderInfo = null // 3D mode only
}) {
    return () => ({
        // Key note map properties
        selectedKeyNoteMap: defaultKeyNoteMap,
        availableKeyNoteMaps: keyNoteMapCollection,
        
        // Rendering display properties (what the user sees)
        renderedNotesPlaying: defaultNotesPlaying,
        songNotes: defaultSongNotes,
        songNotesOnKeyMap: defaultSongNotesOnKeyMap,
        
        // Track selection properties (populated after MIDI parse)
        selectedTrack: "",
        availableTracks: [],
        
        // Canvas references (initialized in mounted lifecycle)
        vueCanvas: null,
        notesCanvas: null,
        
        // 3D-specific properties (only added in 3D mode)
        ...(mode === '3d' ? {
            threeJSRenderer: null,
            keyRenderInfo: keyRenderInfo
        } : {}),
        
        // Score tracking properties (reset on each song)
        score: 0,
        goodCount: 0,
        okCount: 0,
        badCount: 0,
        missedCount: 0,
        
        // Difficulty properties (initialized from Normal difficulty)
        minDuration: difficultySettings["Normal"].minNoteDuration,
        minNoteDistance: difficultySettings["Normal"].minNoteDistance,
        
        // Volume control properties
        playerVolume: 0.7,
        trackVolume: 1,
        
        // MIDI file properties (selected by user from dropdown)
        midiJson: "",
        midiSongs: midiSongs,
        selectedMidiSong: null,
        songEnd: null,
        
        // Difficulty settings reference
        difficultySettings: difficultySettings,
        selectedDifficulty: difficultySettings["Normal"],
        
        // High score tracking (enabled via localStorage toggle)
        toggleTrackHighScores: false,
        highScore: 0,
        challengeScore: 0
    });
}
