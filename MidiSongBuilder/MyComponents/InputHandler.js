/**
 * InputHandler - Manages keyboard input event listeners for Midiestro
 * Extracts keyboard event listeners from the main script
 */

function getInputHandler() {
    return {
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
        },

        isKeyInMap: function(key, keyNoteMap) {
            // Check if key maps to a note
            return key in keyNoteMap;
        },

        handleKeyDown: function(event) {
            // Process key press - extracted from main listener
            if (this.app && this.isKeyInMap(event.key, this.app.selectedKeyNoteMap.keyNoteMap)) {
                writeLog("Pressed key for " + this.app.selectedKeyNoteMap.keyNoteMap[event.key]);

                this.pressedKeys[event.key] = true;
                this.onNotePlay();
            }
        },

        handleKeyUp: function(event) {
            // Process key release - extracted from main listener
            if (this.app &&
                this.isKeyInMap(event.key, this.app.selectedKeyNoteMap.keyNoteMap) &&
                event.key in this.synthMap) {
                writeLog("Release key for " + this.app.selectedKeyNoteMap.keyNoteMap[event.key]);
                this.pressedKeys[event.key] = false;
                this.onNotePlay();
            }
        }
    };
}
