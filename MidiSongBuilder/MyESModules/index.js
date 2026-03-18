/**
 * @fileoverview Module barrel exports for Midiestro ES modules.
 * 
 * Provides a single import point for all game modules, organized by category:
 * - Core: Central services and registries
 * - Controllers: Game loop management (2D and 3D)
 * - State & Logic: Game state, scoring, MIDI parsing
 * - Rendering: 2D canvas and 3D scene rendering
 * - Input & Utilities: Keyboard input, DOM helpers, browser utilities
 * - Camera (3D): Three.js camera management and controls
 * - Configuration: Difficulty settings, key mappings, song data
 */

// ===========================================================================
// CORE MODULES
// Central services and registries for dependency injection and shared state
// ===========================================================================

export { default as getComponentRegistry } from './ComponentRegistry.js';
export { default as IGameController } from './IGameController.js';

// ===========================================================================
// CONSTANTS
// Centralized game configuration and constants
// ===========================================================================

export { 
    default as GameConstants, 
    SCORING, 
    RENDERING_3D, 
    RENDERING_2D, 
    GAMEPLAY, 
    UI 
} from './GameConstants.js';

// ===========================================================================
// CONTROLLERS
// Game loop management for 2D and 3D game modes
// ===========================================================================

export { default as getBaseController } from './BaseController.js';
export { default as getGameController } from './GameController.js';
export { default as getThreeJSGameController } from './ThreeJSGameController.js';

// ===========================================================================
// STATE & LOGIC
// Game state management, scoring, and MIDI parsing
// ===========================================================================

export { default as getGameState } from './GameState.js';
export { default as getScoreKeeper } from './ScoreKeeper.js';
export { default as getMidiParser } from './MidiParser.js';
export { default as getHighScoreTracker } from './highScoreTracker.js';
export { default as getChallengeScores } from './challengeScores.js';

// ===========================================================================
// RENDERING
// 2D canvas and 3D Three.js rendering services
// ===========================================================================


export { default as ThreeJSRenderer } from './ThreeJSRenderer.js';

// ===========================================================================
// INPUT & UTILITIES
// Keyboard input handling and utility services
// ===========================================================================

export { default as getInputHandler } from './InputHandler.js';
export { default as getDomUtils } from './DomUtils.js';
export { default as getBrowserUtils } from './BrowserUtils.js';
export { default as getFileDropHandler } from './FileDropHandler.js';

// ===========================================================================
// CAMERA (3D)
// Three.js camera management, controls, and presets
// ===========================================================================

export { default as getCameraControls } from './CameraControls.js';
export { default as getCameraPresets } from './CameraPresets.js';
export { default as getCameraUIManager } from './CameraUIManager.js';

// ===========================================================================
// CALCULATORS & SERVICES
// Specialized calculation and service modules
// ===========================================================================

export { default as getCoordinateCalculator } from './CoordinateCalculator.js';
export { default as getKeyRenderInfo } from './keyRenderInfo.js';
export { default as getKeyNoteMapService } from './KeyNoteMapService.js';
export { default as getHoverInfoService } from './HoverInfoService.js';
export { default as getHoverInfoDisplay } from './HoverInfoDisplay.js';
export { default as getNoteCacheBuilder } from './NoteCacheBuilder.js';

// ===========================================================================
// CONFIGURATION
// Difficulty settings, key mappings, and song data
// ===========================================================================

export { default as getDifficultySettingsCalculator } from './difficultySettingsCalculator.js';
export { default as getScoringSettings } from './scoringSettings.js';
export { default as getKeyNoteMaps } from './keyNoteMaps.js';
export { default as getSongs } from './songs.js';
export { default as getMidiSongList } from './midiSongList.js';

// ===========================================================================
// AUDIO & COMPRESSION
// Tone.js integration and data compression utilities
// ===========================================================================

export { default as getToneHelper } from './ToneHelper.js';
export { default as getSynthKeyPlayer } from './SynthKeyPlayer.js';
export { default as getSongCompression } from './SongCompression.js';

// ===========================================================================
// GAME SESSION & COMPOSITION
// High-level game session management and Vue composition API integration
// ===========================================================================

export { default as getGameSessionManager } from './GameSessionManager.js';
export { default as createMidiestroApp } from './createMidiestroApp.js';

// ===========================================================================
// GAME MODE STRATEGY
// Strategy pattern for game mode abstraction (2D, 3D, VR, etc.)
// ===========================================================================

export { 
    BaseGameMode, 
    TwoDMode, 
    ThreeDMode,
    createTwoDMode,
    createThreeDMode,
    createGameMode 
} from './GameModeStrategy.js';

// ===========================================================================
// BASE INITIALIZATION
// Shared variable declarations and service initialization for 2D/3D modes
// ===========================================================================

export { 
    initializeMidiestroBase, 
    createLocalStorageService,
    getDebugFlag,
    createGameStateTracker,
    setupFileDropHandlers,
    initializeUIVisibility,
    createGlobalExports 
} from './MidiestroBase.js';
export { createSongDisplayManager } from './SongDisplayManager.js';

