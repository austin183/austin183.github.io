/**
 * MidiestroBase - Shared variable declarations and service initialization
 * 
 * Consolidates duplicated code between Midiestro.html and Midiestro3D.html:
 * - localStorage service wrapper
 * - Service instantiations (midiSongs, synthKeyPlayer, etc.)
 * - Mutable state initialization
 * - Debug flag detection
 * - File drop handler setup
 * - Game state tracking
 */

import getMidiSongList from './midiSongList.js';

/**
 * Check if running in browser environment (for test compatibility)
 * @returns {boolean} True if document.createElement is available
 */
function isBrowserEnvironment() {
    return typeof document !== 'undefined' && typeof document.createElement === 'function';
}
import { getSynthKeyPlayer } from './SynthKeyPlayer.js';
import getDifficultySettings from './difficultySettings.js';
import { getKeyNoteMapService } from './KeyNoteMapService.js';
import getHighScoreTracker from './highScoreTracker.js';
import { getMidiParser } from './MidiParser.js';
import { getSongNoteRenderer } from './SongNoteRenderer.js';
import getComponentRegistry from './ComponentRegistry.js';
import getKeyRenderInfo from './keyRenderInfo.js';
import { getDifficultySettingsCalculator } from './difficultySettingsCalculator.js';
import getKeyNoteMaps from './keyNoteMaps.js';
import { getToneHelper } from './ToneHelper.js';
import { getVisibleFieldFilterer } from './VisibleFieldFilterer.js';
import getFileDropHandler from './FileDropHandler.js';
import getDomUtils from './DomUtils.js';

/**
 * Create localStorage service wrapper (injected for testability)
 * @param {Storage} localStorageImpl - localStorage instance (defaults to window.localStorage)
 * @returns {Object} Service wrapper with bound methods or null if not available
 */
export function createLocalStorageService(localStorageImpl) {
    if (!localStorageImpl) {
        return null;
    }
    return {
        getItem: localStorageImpl.getItem.bind(localStorageImpl),
        setItem: localStorageImpl.setItem.bind(localStorageImpl),
        key: localStorageImpl.key.bind(localStorageImpl),
        get length() { return localStorageImpl.length; }
    };
}

/**
 * Initialize shared services and state for Midiestro game
 * @param {Object} Tone - Tone.js global (for 3D mode)
 * @param {Storage} localStorageImpl - localStorage instance (defaults to window.localStorage in browser)
 * @returns {Object} Initialized base state and services
 */
export function initializeMidiestroBase(Tone, localStorageImpl = typeof window !== 'undefined' ? window.localStorage : undefined) {
    const localStorageService = createLocalStorageService(localStorageImpl);
    
    // Song data and settings
    let midiSongs = getMidiSongList();
    const sortedMidiSongs = Object.fromEntries(Object.keys(midiSongs).sort().map(key => [key, midiSongs[key]]));
    midiSongs = sortedMidiSongs;
    
    const difficultySettings = getDifficultySettings();
    const difficultySettingsCalculator = getDifficultySettingsCalculator();
    
    // Services
    const highScoreTracker = localStorageService ? getHighScoreTracker(localStorageService) : null;
    const keyNoteMapService = getKeyNoteMapService();
    const midiParserFactory = getMidiParser;
    const songNoteRenderer = getSongNoteRenderer(keyNoteMapService);
    const componentRegistry = getComponentRegistry();
    const keyRenderInfo = getKeyRenderInfo();
    
    // Audio player
    const synthKeyPlayer = getSynthKeyPlayer();
    
    // Key note map collection
    const keyNoteMapCollection = getKeyNoteMaps();
    const keyNoteMapKeys = Object.keys(keyNoteMapCollection);
    const defaultKeyNoteMap = keyNoteMapCollection[keyNoteMapKeys[0]];
    
    // Tone helper and synths (only if Tone is provided and in browser)
    let toneHelper = null;
    const synthArray = [];
    
    if (Tone && isBrowserEnvironment()) {
        toneHelper = getToneHelper(Tone);
        const defaultFMSynthParams = toneHelper.getDefaultFMSynthParams();
        toneHelper.buildSynths(defaultFMSynthParams, synthArray, 10);
    }
    
    // Mutable state (initialized to defaults)
    let songDifficultySettings = null;
    let noteLetterCache = {};
    
    // Only build cache in browser environment (requires document.createElement)
    if (localStorageService && isBrowserEnvironment()) {
        noteLetterCache = songNoteRenderer.buildSongNoteLetterCache(keyRenderInfo);
    }
    
    return {
        // Services (read-only references)
        localStorageService,
        midiSongs,
        difficultySettings,
        highScoreTracker,
        keyNoteMapService,
        midiParserFactory,
        songNoteRenderer,
        componentRegistry,
        synthKeyPlayer,
        keyRenderInfo,
        difficultySettingsCalculator,
        toneHelper,
        
        // Key note map data
        keyNoteMapCollection,
        keyNoteMapKeys,
        defaultKeyNoteMap,
        
        // Mutable state (for consumption by caller)
        songDifficultySettings: {
            get() { return songDifficultySettings; },
            set(value) { songDifficultySettings = value; }
        },
        noteLetterCache: {
            get() { return noteLetterCache; },
            set(value) { noteLetterCache = value; }
        },
        
        // Collections (mutable contents)
        synthArray,
        
        // Default values
        defaultNotesPlaying: "",
        defaultSongNotes: "",
        defaultSongNotesOnKeyMap: ""
    };
}

/**
 * Initialize debug flag from query string
 * @param {string} queryString - Query string (defaults to window.location.search)
 * @returns {boolean} True if debug mode is enabled
 */
export function getDebugFlag(queryString = window.location.search) {
    return queryString === '?debug';
}

/**
 * Create game state tracker for playing/paused state
 * @returns {Object} Game state tracker with methods to manage playing state
 */
export function createGameStateTracker() {
    let isPlaying = false;
    
    return {
        get isPlaying() { return isPlaying; },
        
        startPlaying() {
            if (isPlaying) {
                throw new Error('Game already playing');
            }
            isPlaying = true;
        },
        
        stopPlaying() {
            if (!isPlaying) {
                throw new Error('Game not playing');
            }
            isPlaying = false;
        },
        
        toggle() {
            isPlaying = !isPlaying;
            return isPlaying;
        },
        
        reset() {
            isPlaying = false;
        }
    };
}

/**
 * Setup file drop handlers (shared between 2D and 3D)
 * @param {string} elementId - ID of the file drop zone element
 * @param {Function} parseFileCallback - Callback function to handle parsed MIDI file
 * @param {boolean} debugPage - Whether debug mode is enabled
 * @returns {Object} File drop handler instance or null if not supported
 */
export function setupFileDropHandlers(elementId, parseFileCallback, debugPage = false) {
    const fileDropHandler = getFileDropHandler();
    
    if (!fileDropHandler.isFileAPISupported()) {
        if (debugPage) console.error('The File API is not supported by your browser.');
        const fileDrop = document.getElementById(elementId);
        if (fileDrop) {
            const textElement = fileDrop.querySelector('#Text');
            if (textElement) {
                textElement.textContent = 'Reading files not supported by this browser';
            }
        }
        return null;
    }
    
    fileDropHandler.setupFileDrop(elementId, function(file) {
        const fileDrop = document.getElementById(elementId);
        if (fileDrop) {
            const textElement = fileDrop.querySelector('#Text');
            if (textElement) {
                textElement.textContent = file.name;
            }
        }
        parseFileCallback(file);
    });
    
    return fileDropHandler;
}

/**
 * Initialize UI visibility based on debug mode
 * @param {boolean} debugPage - Whether debug mode is enabled
 */
export function initializeUIVisibility(debugPage) {
    const domUtils = getDomUtils();
    
    domUtils.toggleElementById('Instructions');
    domUtils.toggleElementById('gameConfig');
    
    if (!debugPage) {
        domUtils.toggleElementById('songNoteKeys');
        domUtils.toggleElementById('notesPlaying');
        domUtils.toggleElementById('exportHighScores');
    }
}

/**
 * Create global exports for inline onclick handlers (deprecated in P2-01)
 * Keep for backward compatibility until all inline onclick handlers are removed.
 * @param {Object} base - Base services from initializeMidiestroBase()
 * @param {Object} additionalFunctions - Additional functions to expose globally
 */
export function createGlobalExports(base, additionalFunctions = {}) {
    window.domUtils = getDomUtils();
    
    if (base.highScoreTracker) {
        window.highScoreTracker = base.highScoreTracker;
    }
    
    Object.entries(additionalFunctions).forEach(([name, fn]) => {
        if (typeof fn === 'function') {
            window[name] = fn;
        }
    });
}


