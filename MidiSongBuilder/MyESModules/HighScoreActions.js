/**
 * HighScoreActions - Handles high score-related operations
 * 
 * Encapsulates localStorage access and DOM manipulation for high score actions.
 * Provides clean separation between UI layer and data persistence.
 */

export function createHighScoreActions(highScoreTracker, elementManager) {
    return {
        async clearAllHighScores(app) {
            try {
                const exported = await highScoreTracker.exportHighScoresToClipBoardAsJsonString();
                
                if (exported) {
                    console.log('High scores exported to clipboard');
                }
                
                localStorage.clear();
                
                if (app.toggleTrackHighScores) {
                    app.toggleTrackHighScores = false;
                    app.trackHighScores = null;
                }
                
                elementManager.hideElement('SongHighScore');
            } catch (error) {
                console.error('Failed to clear high scores:', error);
                alert('Failed to clear high scores. Check console for details.');
            }
        },
        
        async exportHighScores(highScoreTracker) {
            try {
                await highScoreTracker.exportHighScoresToClipBoardAsJsonString();
                console.log('High scores copied to clipboard');
            } catch (error) {
                console.error('Failed to export high scores:', error);
            }
        }
    };
}

export function createElementManager() {
    return {
        hideElement(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = 'none';
            }
        },
        
        showElement(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = '';
            }
        },
        
        toggleElement(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                const currentDisplay = window.getComputedStyle(element).display;
                element.style.display = currentDisplay === 'none' ? '' : 'none';
            }
        }
    };
}
