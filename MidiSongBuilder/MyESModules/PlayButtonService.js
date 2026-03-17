/**
 * PlayButtonService - Handles play button state and text updates
 * 
 * Single responsibility: Manage the DOM button for game play/stop toggle
 * - Updates button text based on playing state
 * - Enables/disables button interaction
 */

export function createPlayButtonService(buttonId) {
    // Gracefully handle Node.js environment (no DOM)
    if (typeof document === 'undefined') {
        return null;
    }
    
    const button = document.getElementById(buttonId);
    
    if (!button) {
        console.error('PlayButtonService: Button with id "' + buttonId + '" not found');
        return null;
    }
    
    return {
        /**
         * Update button text based on playing state
         * @param {boolean} isPlaying - Current playing state
         */
        updateText: function(isPlaying) {
            button.textContent = isPlaying ? 'Stop' : 'Restart';
        },
        
        /**
         * Enable button interaction
         */
        enable: function() {
            button.removeAttribute('disabled');
        },
        
        /**
         * Disable button interaction
         */
        disable: function() {
            button.setAttribute('disabled', 'true');
        },
        
        /**
         * Set initial text when loaded (before game starts)
         */
        setInitialText: function() {
            button.textContent = 'Play';
        }
    };
}
