/**
 * createMidiestroApp - Shared Vue.js app factory for 2D and 3D game modes
 * 
 * Extracts common Vue.js app setup logic including:
 * - Shared data properties (score tracking, difficulty settings, song selection)
 * - Shared methods (handleMidiSongSelection, setDifficulty, handleToggleTrackHighScores)
 * - Shared mounted() lifecycle setup (canvas initialization, component registry)
 * - Mode-specific extensions via config callbacks
 */

export function createMidiestroApp(config) {
    const { 
        mode, // '2d' | '3d'
        createApp,
        midiSongs,
        defaultKeyNoteMap,
        keyNoteMapCollection,
        difficultySettingsObj,
        highScoreTracker,
        challengeScoresObj,
        midiParser,
        songNoteRenderer,
        keyNoteMapService,
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
        renderSongNotesFn,
        setupSongFromMidiResultFn,
        onMount2D,
        onMount3D,
        beforeUnmount2D,
        beforeUnmount3D
    } = config;

    return createApp({
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
        
        mounted() {
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

            // Shared input handler setup
            var inputHandler = getInputHandler(debugLogger);
            inputHandler.setupKeyListeners(this, pressedKeys, synthMap, synthArray, playNotesFn);
            
            // Store inputHandler on app for later access
            this.inputHandler = inputHandler;

            // Shared component registry setup
            componentRegistry.registerService('scoreKeeper', scoreKeeper);
            componentRegistry.registerService('songNoteRenderer', songNoteRenderer);
            componentRegistry.registerService('keyNoteMapService', keyNoteMapService);
            componentRegistry.registerService('highScoreTracker', highScoreTracker);
            componentRegistry.registerService('challengeScores', challengeScoresObj);

            this.componentRegistry = componentRegistry;
            
            // Mode-specific mount hooks
            if (mode === '3d' && onMount3D) {
                onMount3D(this, componentRegistry);
            } else if (mode === '2d' && onMount2D) {
                onMount2D(this, componentRegistry);
            }
        },
        
        beforeUnmount() {
            // Mode-specific cleanup
            if (mode === '3d' && beforeUnmount3D) {
                beforeUnmount3D(this);
            } else if (mode === '2d' && beforeUnmount2D) {
                beforeUnmount2D(this);
            }
        },
        
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
                if (renderSongNotesFn) {
                    renderSongNotesFn.call(this);
                }
            },
            
            // 3D-specific methods (only added in 3D mode)
            ...(mode === '3d' ? {
                handleCameraPresets: function() {
                    // To be overridden by caller if needed
                }
            } : {})
        }
    });
}
