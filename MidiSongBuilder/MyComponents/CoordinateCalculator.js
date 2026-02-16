/**
 * CoordinateCalculator - Centralized coordinate calculations for 3D rendering
 *
 * This module provides a single source of truth for all 3D coordinate calculations,
 * including note positions, grid layout, and the now line.
 */
function getCoordinateCalculator() {
    // Constants that define the 3D coordinate system
    const CONSTANTS = {
        // Grid configuration
        GRID_WIDTH: 10,      // Number of keyboard columns
        GRID_HEIGHT: 4,      // Number of keyboard rows
        GRID_SPACING: 1.2,   // Spacing between notes in units

        // Note dimensions
        NOTE_DEPTH: 1.5,     // Depth of notes (Z-axis thickness)
        NOTE_THICKNESS: 0.2, // Thickness of note borders
        NOTE_WIDTH_SCALE: 0.7,  // Scale factor for note width
        NOTE_HEIGHT: 1.5,    // Height of notes

        // Time to Z-axis conversion
        Z_SCALE: 2,          // Scale factor converting time to Z position

        // Default delay for note positioning
        DEFAULT_DELAY: 4     // Seconds before notes reach the now line
    };


    /**
     * Calculate the 3D position of a note based on grid coordinates and time
     * @param {number} column - Keyboard column (0-9)
     * @param {number} time - Time position in song (seconds)
     * @param {number} delay - Delay before note reaches now line (default: DEFAULT_DELAY)
     * @returns {Object} {x, y, z} coordinates for the note
     */
    function calculateNotePosition(column, time, delay) {
        delay = delay !== undefined ? delay : CONSTANTS.DEFAULT_DELAY;

        // Calculate X position: center the keyboard at x=0
        // column 0 -> leftmost, column 9 -> rightmost
        var xPos = (column - (CONSTANTS.GRID_WIDTH / 2) + 0.5) * CONSTANTS.GRID_SPACING;

        // Z position: notes start behind camera and move toward camera
        // When time < delay, note is in the future (positive Z)
        // When time > delay, note is in the past (negative Z, behind camera)
        var zPos = (delay - time) * CONSTANTS.Z_SCALE;
        // Y position is fixed at 0 (all notes on same plane as now line)
        return { x: xPos, y: 0, z: zPos };
    }

    /**
     * Calculate the dynamic position of a note during gameplay
     * This is used to update note positions as time progresses
     * @param {number} noteTime - The time when this note should be played
     * @param {number} currentTime - Current time in the song
     * @param {number} delay - Delay before note reaches now line
     * @returns {Object} {x: null, y: 0, z: newPos} - x stays constant, z changes with time
     */
    function calculateDynamicPosition(noteTime, currentTime, delay) {
        delay = delay !== undefined ? delay : CONSTANTS.DEFAULT_DELAY;

        // Notes move toward camera (positive Z) as time progresses
        // Z = (currentTime - noteTime + delay) * Z_SCALE
        var zPos = (currentTime - noteTime + delay) * CONSTANTS.Z_SCALE;

        return { x: null, y: 0, z: zPos };
    }

    /**
     * Calculate the Z position of the now line
     * The now line is stationary at Z=0 (player position) in game space
     * but needs a Z offset in camera space to align with 2D view
     * @param {number} delay - Delay before notes reach now line
     * @returns {number} Z position for the now line
     */
    function calculateNowLinePosition(delay) {
        delay = delay !== undefined ? delay : CONSTANTS.DEFAULT_DELAY;
        return delay * CONSTANTS.Z_SCALE;
    }

    /**
     * Get all constants in one place for external access
     * @returns {Object} All defined constants
     */
    function getConstants() {
        return CONSTANTS;
    }

    /**
     * Calculate the box dimensions for a note
     * @returns {Object} {width, height, thickness} for note geometry
     */
    function getNoteDimensions() {
        var boxWidth = CONSTANTS.GRID_SPACING * CONSTANTS.NOTE_WIDTH_SCALE;
        return {
            width: boxWidth,
            height: CONSTANTS.NOTE_HEIGHT,
            thickness: CONSTANTS.NOTE_THICKNESS
        };
    }

    return {
        // Position calculation methods
        calculateNotePosition: calculateNotePosition,
        calculateDynamicPosition: calculateDynamicPosition,
        calculateNowLinePosition: calculateNowLinePosition,

        // Dimension helpers
        getNoteDimensions: getNoteDimensions,

        // Constants access
        getConstants: getConstants
    };
}
