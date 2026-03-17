/**
 * CameraCoordinator - Coordinates camera controls with game state for 3D mode
 * 
 * Single responsibility: Manage camera control enable/disable during gameplay
 * - Disables camera controls when game starts (note input takes precedence)
 * - Enables camera controls when game stops
 * - Shows/hides camera control panel UI
 * - Manages hover info display state
 */

export function createCameraCoordinator(threeJSRenderer, inputHandler) {
    if (!threeJSRenderer || !inputHandler) {
        console.error('CameraCoordinator: Both threeJSRenderer and inputHandler are required');
        return null;
    }

    // Gracefully handle Node.js environment (no DOM)
    const hasDOM = typeof document !== 'undefined';
    
    return {
        /**
         * Called when game starts - disable camera controls for gameplay
         */
        onGameStarted: function() {
            this.disableControls();
        },
        
        /**
         * Called when game stops - re-enable camera controls
         */
        onGameStopped: function() {
            this.enableControls();
        },
        
        /**
         * Disable camera controls and show note input
         */
        disableControls: function() {
            this._disableRendererControls();
            this._enableNoteInput();
            this._hideCameraPanel();
        },
        
        /**
         * Enable camera controls and disable note input
         */
        enableControls: function() {
            this._enableRendererControls();
            this._disableNoteInput();
            this._showCameraPanel();
        },
        
        /**
         * Handle game state change event
         * @param {boolean} isPlaying - True if game just started, false if stopped
         */
        handleGameStateChange: function(isPlaying) {
            if (isPlaying) {
                this.onGameStarted();
            } else {
                this.onGameStopped();
            }
        },
        
        // Private methods (underscore prefix convention)
        _disableRendererControls: function() {
            if (this._renderer) {
                this._renderer.disableCameraControls();
                this._renderer.disableHoverInfo();
            }
        },
        
        _enableRendererControls: function() {
            if (this._renderer) {
                this._renderer.enableCameraControls();
                this._renderer.enableHoverInfo();
            }
        },
        
        _enableNoteInput: function() {
            if (this._inputHandler) {
                this._inputHandler.setNoteInputEnabled(true);
            }
        },
        
        _disableNoteInput: function() {
            if (this._inputHandler) {
                this._inputHandler.setNoteInputEnabled(false);
            }
        },
        
        _hideCameraPanel: function() {
            if (!hasDOM) return;
            
            const panel = document.getElementById('cameraControlPanel');
            if (panel) {
                panel.style.display = 'none';
            }
        },
        
        _showCameraPanel: function() {
            if (!hasDOM) return;
            
            const panel = document.getElementById('cameraControlPanel');
            if (panel) {
                panel.style.display = 'block';
            }
            
            const instructions = document.getElementById('cameraInstructions');
            if (instructions) {
                instructions.style.display = 'none';
            }
        },
        
        // Store references
        _renderer: threeJSRenderer,
        _inputHandler: inputHandler
    };
}
