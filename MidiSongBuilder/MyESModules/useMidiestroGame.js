/**
 * useMidiestroGame - Vue composable for shared Midiestro game state and logic
 * 
 * Extracts common data, methods, and lifecycle hooks for both 2D and 3D modes:
 * - Game state (score tracking, difficulty settings, song selection)
 * - Shared methods (handleMidiSongSelection, setDifficulty, handleToggleTrackHighScores)
 * - Canvas initialization logic
 * - Component registry setup
 * 
 * Usage:
 *   const composable = useMidiestroGame(config);
 *   return Vue.createApp({ ...composable, ...modeSpecific });
 */

export function useMidiestroGame(config) {
    const { 
        mode, // '2d' | '3d'
        midiSongs,
        defaultKeyNoteMap,
        keyNoteMapCollection,
        difficultySettingsObj,
        highScoreTracker,
        challengeScoresObj,
        midiParser,
        componentRegistry,
        pressedKeys,
        synthMap,
        synthArray,
        playNotesFn,
        defaultNotesPlaying,
        defaultSongNotes,
        defaultSongNotesOnKeyMap,
        keyRenderInfo,
        getScoreKeeper,
        getScoringSettings,
        getInputHandler,
        gameController,
        setupSongFromMidiResultFn
    } = config;

    return {
        data: () => ({
            // Shared key note map properties
            selectedKeyNoteMap: defaultKeyNoteMap,
            availableKeyNoteMaps: keyNoteMapCollection,
            
            // Shared rendering properties
            renderedNotesPlaying: defaultNotesPlaying,
            songNotes: defaultSongNotes,
            songNotesOnKeyMap: defaultSongNotesOnKeyMap,
            
            // Shared track properties
            selectedTrack: "",
            availableTracks: [],
            
            // Shared canvas properties
            vueCanvas: null,
            notesCanvas: null,
            
            // 3D-specific properties (only added in 3D mode)
            ...(mode === '3d' ? {
                threeJSRenderer: null,
                keyRenderInfo: keyRenderInfo
            } : {}),
            
            // Shared score tracking properties
            score: 0,
            goodCount: 0,
            okCount: 0,
            badCount: 0,
            missedCount: 0,
            
            // Shared difficulty properties
            minDuration: difficultySettingsObj["Normal"].minNoteDuration,
            minNoteDistance: difficultySettingsObj["Normal"].minNoteDistance,
            
            // Shared volume properties
            playerVolume: .7,
            trackVolume: 1,
            
            // Shared MIDI properties
            midiJson: "",
            midiSongs: midiSongs,
            selectedMidiSong: null,
            songEnd: null,
            
            // Shared difficulty settings
            difficultySettings: difficultySettingsObj,
            selectedDifficulty: difficultySettingsObj["Normal"],
            
            // Shared high score tracking
            toggleTrackHighScores: false,
            highScore: 0,
            challengeScore: 0
        }),
        
        methods: {
            // Shared method: Handle MIDI song selection
            handleMidiSongSelection: function() {
                if(this.selectedMidiSong){
                    var songDifficultySettings;
                    if(this.selectedMidiSong.difficultySettings){
                        songDifficultySettings = this.selectedMidiSong.difficultySettings;                    
                    } else {
                        songDifficultySettings = null;
                    }
                    
                    if(this.toggleTrackHighScores){
                        this.highScore = highScoreTracker.getHighScore(this.selectedMidiSong.filename, this.selectedDifficulty.difficultyKey);
                        this.challengeScore = challengeScoresObj.getSelectedScore(this.selectedMidiSong.filename, this.selectedDifficulty.difficultyKey);
                    }
                    
                    this.availableTracks = [];
                    gameController.resetAppStateScores(this);

                    const midiFilename = this.selectedMidiSong.filename;
                    fetch(`PublicDomainSongs/midi/${midiFilename}`)
                        .then(response => response.arrayBuffer())
                        .then(arrayBuffer => {
                            return midiParser.parseMidiArrayBuffer(arrayBuffer, setupSongFromMidiResultFn);
                        })
                        .catch(error => {
                            console.error('Error fetching MIDI file:', error);
                        });
                }            
            },
            
            // Shared method: Set difficulty
            setDifficulty: function() {
                this.minNoteDistance = this.selectedDifficulty.minNoteDistance;
                this.minDuration = this.selectedDifficulty.minNoteDuration;
                
                if(this.toggleTrackHighScores && this.selectedMidiSong){
                    gameController.resetAppStateScores(this);
                    this.highScore = highScoreTracker.getHighScore(this.selectedMidiSong.filename, this.selectedDifficulty.difficultyKey);
                    this.challengeScore = challengeScoresObj.getSelectedScore(this.selectedMidiSong.filename, this.selectedDifficulty.difficultyKey);
                }
            },
            
            // Shared method: Toggle high score tracking
            handleToggleTrackHighScores: function() {
                window.domUtils.toggleElementById("SongHighScore");
                
                if(this.toggleTrackHighScores){
                    localStorage.setItem("TrackScores", "true");
                } else {
                    localStorage.removeItem("TrackScores");
                }
            },
            
            // Mode-specific method: Render song notes (base implementation for 2D)
            renderSongNotes: function() {
                // Base implementation - can be overridden by mode-specific code
            }
        },
        
        // Lifecycle hooks attached directly to returned object for spread operator compatibility
        mounted: function() {
            // Shared canvas initialization
            this.notesCanvas = document.getElementById("notesCanvas");
            var ctx = this.notesCanvas.getContext('2d');
            this.vueCanvas = ctx;
            this.vueCanvas.clearRect(0, 0, this.notesCanvas.width, this.notesCanvas.height);
            this.vueCanvas.font = "18px Georgia";
            this.vueCanvas.fillStyle = "black";
            this.vueCanvas.fillText("Watch for falling note keys!", 0, 50);
            
            // Shared high score toggle initialization
            this.toggleTrackHighScores = localStorage.getItem("TrackScores") == "true";
            if(!this.toggleTrackHighScores){
                window.domUtils.toggleElementById("SongHighScore");
            }

            // Shared debug logger setup
            const debugLogger = window.location.search === '?debug' 
                ? { enabled: true, log: console.log.bind(console) }
                : null;

            // Shared score keeper initialization
            const scoreKeeper = getScoreKeeper(getScoringSettings().default, debugLogger);

            // Create KeyMapProvider adapter for DIP compliance
            const keyMapProvider = {
                getCurrentKeyNoteMap: () => this.selectedKeyNoteMap.keyNoteMap
            };

            // Shared input handler setup
            var inputHandler = getInputHandler(debugLogger);
            inputHandler.setupKeyListeners(keyMapProvider, pressedKeys, synthMap, synthArray, playNotesFn);
            
            // Store inputHandler on app for later access
            this.inputHandler = inputHandler;

            // Shared component registry setup
            componentRegistry.registerService('scoreKeeper', scoreKeeper);
            componentRegistry.registerService('songNoteRenderer', config.songNoteRenderer);
            componentRegistry.registerService('keyNoteMapService', config.keyNoteMapService);
            componentRegistry.registerService('highScoreTracker', highScoreTracker);
            componentRegistry.registerService('challengeScores', challengeScoresObj);

            this.componentRegistry = componentRegistry;
            
            // Mode-specific mount hooks
            if (mode === '3d' && config.onMount3D) {
                config.onMount3D(this, componentRegistry);
            } else if (mode === '2d' && config.onMount2D) {
                config.onMount2D(this, componentRegistry);
            }
        },
        
        beforeUnmount: function() {
            // Mode-specific cleanup hooks
            if (mode === '3d' && config.beforeUnmount3D) {
                config.beforeUnmount3D(this);
            } else if (mode === '2d' && config.beforeUnmount2D) {
                config.beforeUnmount2D(this);
            }
        }
    };
}
