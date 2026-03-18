/**
 * @fileoverview Centralized game constants and configuration values for Midiestro.
 * 
 * All magic numbers and configuration values should be defined here to provide:
 * - Single source of truth for thresholds and settings
 * - Easier tuning without scattered changes
 * - Clear documentation of game parameters
 */

// ===========================================================================
// SCORING CONSTANTS
 // Thresholds (in seconds) and point values for hit detection
// ===========================================================================

/**
 * Scoring configuration for different difficulty levels.
 * @type {Object}
 */
export const SCORING = {
    default: {
        goodRange: 0.15,     // within 150ms is "good"
        okRange: 0.4,        // within 400ms is "ok"
        badRange: 0.7,       // within 700ms is "bad"
        goodPoints: 100,     // points for "good" hit
        okPoints: 50         // points for "ok" hit
    },
    easy: {
        goodRange: 0.2,      // more forgiving: 200ms for good
        okRange: 0.6,        // more forgiving: 600ms for ok
        badRange: 1.0,       // more forgiving: 1000ms for bad
        goodPoints: 100,
        okPoints: 50
    },
    hard: {
        goodRange: 0.1,      // stricter: 100ms for good
        okRange: 0.3,        // stricter: 300ms for ok
        badRange: 0.5,       // stricter: 500ms for bad
        goodPoints: 100,
        okPoints: 50
    },
    // Scoring tags for note states
    TAGS: {
        GOOD: 'good',
        OK: 'ok',
        BAD: 'bad',
        MISSED: 'missed',
        UNPLAYED: 'unplayed'
    }
};

// ===========================================================================
// RENDERING CONSTANTS (3D)
 // Three.js rendering configuration and grid layout
// ===========================================================================

/**
 * 3D rendering constants for Three.js scene configuration.
 * @type {Object}
 */
export const RENDERING_3D = {
    // Grid configuration
    GRID_WIDTH: 10,          // Number of keyboard columns
    GRID_HEIGHT: 4,          // Number of keyboard rows  
    GRID_SPACING: 1.2,       // Spacing between notes in world units
    
    // Note dimensions
    NOTE_THICKNESS: 0.2,     // Thickness of note mesh borders
    NOTE_WIDTH_SCALE: 0.7,   // Scale factor for note width relative to grid spacing
    NOTE_HEIGHT: 1.5,        // Height of note meshes
    
    // Time to Z-axis conversion
    Z_SCALE: 2,              // Multiplier for converting time (sec) to Z position
    
    // Default delay for note positioning
    DEFAULT_DELAY: 4,        // Seconds before notes reach the now line (Z=0)
    
    // Note fall speed for animation
    NOTE_FALL_SPEED: 10      // World units per second that notes move toward camera
};

// ===========================================================================
// RENDERING CONSTANTS (2D)
 // 2D canvas rendering configuration
// ===========================================================================

/**
 * 2D canvas rendering constants.
 * @type {Object}
 */
export const RENDERING_2D = {
    // Time window for visible notes (in seconds)
    VISIBLE_PAST_OFFSET: 1,   // Past boundary = currentTime - 1 second
    VISIBLE_FUTURE_OFFSET: 9, // Future boundary = currentTime + 9 seconds
    
    // Canvas layout (calculated dynamically based on canvas size)
    KEYS_PER_ROW: 10,         // Number of keys across the canvas width
    
    // Score tag colors
    COLORS: {
        UNPLAYED: 'blue',
        GOOD: 'green',
        OK: 'yellow',
        BAD: 'red'
    }
};

// ===========================================================================
// GAMEPLAY CONSTANTS
 // Core gameplay configuration and defaults
// ===========================================================================

/**
 * Gameplay constants for core game mechanics.
 * @type {Object}
 */
export const GAMEPLAY = {
    DEFAULT_DIFFICULTY: 'Beginner',  // Default difficulty level
    
    // Game loop timing
    GAME_LOOP_INTERVAL: 10,  // Milliseconds between game loop iterations (100 FPS target)
    
    // Note state management
    NOTE_STATES: {
        UNPLAYED: 'unplayed',
        PLAYED: 'played'
    }
};

// ===========================================================================
// CAMERA CONSTANTS
 // Camera controls configuration for 3D view manipulation
// ===========================================================================

/**
 * Camera control constants for Three.js camera manipulation.
 * @type {Object}
 */
export const CAMERA = {
    MOVE_SPEED: 0.2,           // World units per key press (WASD movement)
    LOOK_SENSITIVITY: 0.005,   // Rotation sensitivity for mouse drag
    PITCH_CLAMP_FACTOR: 2.5    // Divisor for Math.PI to clamp pitch (-90/+90 degrees)
};

// ===========================================================================
// DIFFICULTY CALCULATION CONSTANTS  
 // Thresholds for automatic difficulty settings calculation
// ===========================================================================

/**
 * Difficulty calculation constants used by difficultySettingsCalculator.
 * @type {Object}
 */
export const DIFFICULTY = {
    MAX_DISTANCE_DURATION: 0.6, // Maximum note distance/duration to consider (seconds)
    NOTES_PER_MINUTE_TOLERANCE: 10 // Tolerance range when matching target BPM
};

// ===========================================================================
// UI CONSTANTS
 // User interface and debugging configuration
// ===========================================================================

/**
 * UI and debug-related constants.
 * @type {Object}
 */
export const UI = {
    // Debug mode check (reads from URL query string)
    DEBUG_QUERY_PARAM: 'debug',  // ?debug in URL enables debug mode
    
    // Animation frame target
    ANIMATION_FPS: 60,          // Target frames per second
    ANIMATION_FRAME_MS: 16.67   // Milliseconds per frame at 60 FPS
};

// ===========================================================================
// CONVENIENCE EXPORT
 // Combined constants object for easy access (optional)
// ===========================================================================

/**
 * Combined game constants object.
 * Use individual exports (SCORING, RENDERING_3D, etc.) for better tree-shaking.
 * @type {Object}
 */
export const GameConstants = {
    SCORING,
    RENDERING_3D,
    RENDERING_2D,
    GAMEPLAY,
    CAMERA,
    DIFFICULTY,
    UI
};

// Default export for compatibility
export default GameConstants;
