/**
 * InputHandler - Manages keyboard input event listeners for Midiestro
 * Extracts keyboard event listeners from the main script
 */

export default function getInputHandler() {
    return {
        // noteInputEnabled - when true, keys are processed for note input (gameplay)
        // When false, keys are available for camera controls
        noteInputEnabled: true,

        setupKeyListeners: function(app, pressedKeys, synthMap, synthArray, onNotePlay) {
            // Attach keydown and keyup listeners
            this.app = app;
            this.pressedKeys = pressedKeys;
            this.synthMap = synthMap;
            this.synthArray = synthArray;
            this.onNotePlay = onNotePlay;

            // Create bound methods to ensure proper 'this' context when removing listeners
            this.boundKeydownHandler = this.handleKeyDown.bind(this);
            this.boundKeyupHandler = this.handleKeyUp.bind(this);

            document.addEventListener("keydown", this.boundKeydownHandler);
            document.addEventListener("keyup", this.boundKeyupHandler);
        },

        removeKeyListeners: function() {
            if (this.boundKeydownHandler) {
                document.removeEventListener("keydown", this.boundKeydownHandler);
            }
            if (this.boundKeyupHandler) {
                document.removeEventListener("keyup", this.boundKeyupHandler);
            }
            this.app = null;
            this.pressedKeys = null;
            this.synthMap = null;
            this.synthArray = null;
            this.onNotePlay = null;
            this.noteInputEnabled = true;
        },

        /**
         * Set whether note input is enabled
         * When noteInputEnabled is true, key presses are processed for notes (gameplay)
         * When false, key presses are ignored for notes (camera controls take precedence)
         * @param {boolean} enabled - True to enable note input, false for camera controls
         */
        setNoteInputEnabled: function(enabled) {
            this.noteInputEnabled = enabled;
        },

        /**
         * Check if camera controls are active (inverse of noteInputEnabled)
         * @returns {boolean} - True if camera controls are active (note input disabled)
         */
        areCameraControlsActive: function() {
            return !this.noteInputEnabled;
        },

        isKeyInMap: function(key, keyNoteMap) {
            // Check if key maps to a note
            return key in keyNoteMap;
        },

        handleKeyDown: function(event) {
            // Process key press - only if note input is enabled
            if (window.location.search === '?debug') {
                console.log("handleKeyDown called with key:", event.key, "noteInputEnabled:", this.noteInputEnabled, "app exists:", !!this.app);
            }
            
            if (!this.noteInputEnabled) {
                return;
            }

            if (this.app && this.isKeyInMap(event.key, this.app.selectedKeyNoteMap.keyNoteMap)) {
                if (window.location.search === '?debug') {
                    console.log("Pressed key for " + this.app.selectedKeyNoteMap.keyNoteMap[event.key]);
                }

                this.pressedKeys[event.key] = true;
                this.onNotePlay();
            }
        },

        handleKeyUp: function(event) {
            // Process key release - only if note input is enabled
            if (window.location.search === '?debug') {
                console.log("handleKeyUp called with key:", event.key, "noteInputEnabled:", this.noteInputEnabled);
            }
            
            if (!this.noteInputEnabled) {
                return;
            }

            if (this.app &&
                this.isKeyInMap(event.key, this.app.selectedKeyNoteMap.keyNoteMap) &&
                event.key in this.synthMap) {
                if (window.location.search === '?debug') {
                    console.log("Release key for " + this.app.selectedKeyNoteMap.keyNoteMap[event.key]);
                }
                this.pressedKeys[event.key] = false;
                this.onNotePlay();
            }
        }
    };
}
