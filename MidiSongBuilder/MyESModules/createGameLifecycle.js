/**
 * createGameLifecycle - Factory for creating Vue app lifecycle hooks with mode abstraction
 * 
 * Abstracts mode-specific lifecycle callbacks into a unified interface.
 * Handles both 2D and 3D modes with their respective mount/unmount hooks:
 * - mounted(): Initializes canvas, input handler, component registry, then calls mode-specific hook
 * - beforeUnmount(): Calls mode-specific cleanup, ensures input handler is removed
 */

export function createGameLifecycle(mode, { 
    getScoreKeeper,
    getScoringSettings,
    getInputHandler,
    pressedKeys,
    synthMap,
    synthArray,
    playNotes,
    componentRegistry,
    songNoteRenderer,
    keyNoteMapService,
    highScoreTracker,
    challengeScoresObj,
    themeService = null,
    
    // Mode-specific callbacks (optional)
    onMount2D = null,
    onMount3D = null,
    beforeUnmount2D = null,
    beforeUnmount3D = null
} = {}) {
    return {
        // mounted lifecycle hook - runs after Vue app is inserted into DOM
        mounted: function() {
            const appInstance = this;
            
            // Shared canvas initialization (both 2D and 3D modes)
            this.notesCanvas = document.getElementById("notesCanvas");
            if (this.notesCanvas) {
                var ctx = this.notesCanvas.getContext('2d');
                this.vueCanvas = ctx;
                this.vueCanvas.clearRect(0, 0, this.notesCanvas.width, this.notesCanvas.height);
                this.vueCanvas.font = "18px Georgia";
                const currentTheme = themeService ? themeService.getCurrentTheme() : 'light';
                this.vueCanvas.fillStyle = currentTheme === 'dark' ? "#ffffff" : "black";
                this.vueCanvas.fillText("Watch for falling note keys!", 0, 50);
            }
            
            // Shared high score toggle initialization from localStorage
            this.toggleTrackHighScores = localStorage.getItem("TrackScores") == "true";
            if (!this.toggleTrackHighScores) {
                window.domUtils.toggleElementById("SongHighScore");
            }

            // Shared debug logger setup (enabled via URL query param)
            const debugLogger = window.location.search === '?debug' 
                ? { enabled: true, log: console.log.bind(console) }
                : null;

            // Shared score keeper initialization with scoring settings
            const scoreKeeper = getScoreKeeper(getScoringSettings().default, debugLogger);

            // Create KeyMapProvider adapter for DIP compliance
            const keyMapProvider = {
                getCurrentKeyNoteMap: () => this.selectedKeyNoteMap.keyNoteMap
            };

            // Shared input handler setup (keyboard event listeners)
            var inputHandler = getInputHandler(debugLogger);
            inputHandler.setupKeyListeners(keyMapProvider, pressedKeys, synthMap, synthArray, playNotes);
            
            // Store inputHandler on app for later cleanup in beforeUnmount
            this.inputHandler = inputHandler;

            // Shared component registry setup (DIP - Dependency Injection)
            componentRegistry.registerService('scoreKeeper', scoreKeeper);
            componentRegistry.registerService('songNoteRenderer', songNoteRenderer);
            componentRegistry.registerService('keyNoteMapService', keyNoteMapService);
            componentRegistry.registerService('highScoreTracker', highScoreTracker);
            componentRegistry.registerService('challengeScores', challengeScoresObj);
            componentRegistry.registerService('themeService', themeService);

            this.componentRegistry = componentRegistry;
            
            // Mode-specific mount hooks
            if (mode === '3d' && onMount3D) {
                onMount3D(appInstance, componentRegistry);
            } else if (mode === '2d' && onMount2D) {
                onMount2D(appInstance, componentRegistry);
            }
        },
        
        // beforeUnmount lifecycle hook - runs before Vue app is destroyed
        beforeUnmount: function() {
            const appInstance = this;
            
            // Ensure input handler cleanup (critical for both modes)
            if (appInstance.inputHandler) {
                appInstance.inputHandler.removeKeyListeners();
            }
            
            // Mode-specific cleanup hooks
            if (mode === '3d' && beforeUnmount3D) {
                beforeUnmount3D(appInstance);
            } else if (mode === '2d' && beforeUnmount2D) {
                beforeUnmount2D(appInstance);
            }
        }
    };
}
