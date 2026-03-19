/**
 * Shared utilities for integration tests
 */

import createThreeMock from '../../mocks/Three.js';
import { createToneMock } from '../../mocks/Tone.js';

/**
 * Create a mock Tone.js object for integration tests
 * @returns {Object} Mock Tone.js API
 */
export function getToneMock() {
    return createToneMock();
}

/**
 * Create a mock Three.js object for integration tests  
 * @returns {Object} Mock Three.js API
 */
export function getThreeMock() {
    return createThreeMock();
}

/**
 * Create a mock Vue app with all necessary properties
 * @returns {Object} Mock Vue application object
 */
export function createMockVueApp() {
    return {
        score: 0,
        goodCount: 0,
        okCount: 0,
        badCount: 0,
        missedCount: 0,
        componentRegistry: null,
        notesCanvas: {
            width: 800,
            height: 600,
        },
        vueCanvas: {
            clearRect: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
        },
        selectedTrack: {
            notes: []
        },
        selectedKeyNoteMap: {
            keyNoteMap: {}
        }
    };
}

/**
 * Create a mock MIDI file object
 * @param {Array} notes - Optional array of note objects
 * @returns {Object} Mock MIDI file with tracks
 */
export function createMockMidiFile(notes = []) {
    return {
        tracks: [
            {
                name: 'Test Track',
                notes: notes.length > 0 ? notes : [
                    { name: 'C4', time: 0, duration: 0.5, velocity: 1 },
                    { name: 'E4', time: 0.5, duration: 0.5, velocity: 1 },
                    { name: 'G4', time: 1.0, duration: 0.5, velocity: 1 },
                ]
            }
        ]
    };
}

/**
 * Create a mock visible field from notes
 * @param {Array} notes - Array of note objects
 * @returns {Array} Mock visible field with note data
 */
export function createMockVisibleField(notes = []) {
    return notes.map((note, index) => ({
        id: `${note.note || note.name}_${note.time}`,
        letter: 'A',
        time: note.time,
        duration: note.duration,
        state: 'unplayed',
        x: 0,
    }));
}

/**
 * Set up a ComponentRegistry with all standard services
 * @param {Object} app - Vue app object
 * @param {Object} options - Services to register
 * @param {Object} [options.scoreKeeper] - Score keeper service
 * @param {Object} [options.songNoteRenderer] - Song note renderer service
 * @param {Object} [options.keyNoteMapService] - Key-note mapping service
 * @param {Object} [options.highScoreTracker] - High score tracking service
 * @param {Object} [options.challengeScores] - Challenge scores service
 * @param {Object} [options.threeJSRenderer] - Three.js renderer service
 */
export function setupComponentRegistry(app, { 
    scoreKeeper = null,
    songNoteRenderer = null,
    keyNoteMapService = null,
    highScoreTracker = null,
    challengeScores = null,
    threeJSRenderer = null 
} = {}) {
    const registry = app.componentRegistry;
    
    if (scoreKeeper) registry.registerService('scoreKeeper', scoreKeeper);
    if (songNoteRenderer) registry.registerService('songNoteRenderer', songNoteRenderer);
    if (keyNoteMapService) registry.registerService('keyNoteMapService', keyNoteMapService);
    if (highScoreTracker) registry.registerService('highScoreTracker', highScoreTracker);
    if (challengeScores) registry.registerService('challengeScores', challengeScores);
    if (threeJSRenderer) registry.registerService('threeJSRenderer', threeJSRenderer);
}

/**
 * Wait for a promise or timeout (for async tests)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function waitFor(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
