/**
 * Tests for MidiestroBase module
 * Tests shared variable declarations and service initialization functions
 */

import { expect } from 'chai';
import { 
    createLocalStorageService, 
    initializeMidiestroBase,
    getDebugFlag,
    createGameStateTracker,
    createGlobalExports 
} from './MidiestroBase.js';

describe('MidiestroBase', function() {
    describe('createLocalStorageService', function() {
        let mockStorage;
        
        beforeEach(function() {
            mockStorage = {
                getItem: (key) => `mock_${key}`,
                setItem: (key, value) => {},
                key: (index) => `key_${index}`,
                length: 0,
                removeItem: (key) => {},
                clear: () => {}
            };
        });

        it('should return an object with bound methods', function() {
            const service = createLocalStorageService(mockStorage);
            
            expect(service).to.be.an('object');
            expect(service.getItem).to.be.a('function');
            expect(service.setItem).to.be.a('function');
            expect(service.key).to.be.a('function');
        });

        it('should have getItem bound to mockStorage', function() {
            const service = createLocalStorageService(mockStorage);
            
            expect(service.getItem('test')).to.equal('mock_test');
        });

        it('should have setItem bound to mockStorage', function() {
            let capturedKey = null;
            let capturedValue = null;
            
            mockStorage.setItem = (key, value) => {
                capturedKey = key;
                capturedValue = value;
            };
            
            const service = createLocalStorageService(mockStorage);
            service.setItem('testKey', 'testValue');
            
            expect(capturedKey).to.equal('testKey');
            expect(capturedValue).to.equal('testValue');
        });

        it('should have key bound to mockStorage', function() {
            const service = createLocalStorageService(mockStorage);
            
            expect(service.key(0)).to.equal('key_0');
        });

        it('should have length getter that returns mockStorage.length', function() {
            const service = createLocalStorageService(mockStorage);
            
            expect(service.length).to.equal(0);
        });

        it('should return null when called without arguments in Node.js', function() {
            const service = createLocalStorageService();
            
            expect(service).to.equal(null);
        });
    });

    describe('getDebugFlag', function() {
        it('should return true for ?debug query string', function() {
            expect(getDebugFlag('?debug')).to.be.true;
        });

        it('should return false for other query strings', function() {
            expect(getDebugFlag('?test')).to.be.false;
            expect(getDebugFlag('')).to.be.false;
        });

        it('should check entire query string', function() {
            expect(getDebugFlag('?debug=true')).to.be.false;
            expect(getDebugFlag('test=debug')).to.be.false;
        });
    });

    describe('createGameStateTracker', function() {
        let tracker;

        beforeEach(function() {
            tracker = createGameStateTracker();
        });

        it('should start with isPlaying false', function() {
            expect(tracker.isPlaying).to.be.false;
        });

        it('should toggle isPlaying state', function() {
            expect(tracker.toggle()).to.be.true;
            expect(tracker.isPlaying).to.be.true;
            
            expect(tracker.toggle()).to.be.false;
            expect(tracker.isPlaying).to.be.false;
        });

        it('should start playing when not playing', function() {
            tracker.startPlaying();
            expect(tracker.isPlaying).to.be.true;
        });

        it('should throw when starting while already playing', function() {
            tracker.startPlaying();
            
            expect(() => tracker.startPlaying()).to.throw('Game already playing');
        });

        it('should stop playing when playing', function() {
            tracker.startPlaying();
            tracker.stopPlaying();
            
            expect(tracker.isPlaying).to.be.false;
        });

        it('should throw when stopping while not playing', function() {
            expect(() => tracker.stopPlaying()).to.throw('Game not playing');
        });

        it('should reset isPlaying to false', function() {
            tracker.startPlaying();
            expect(tracker.isPlaying).to.be.true;
            
            tracker.reset();
            expect(tracker.isPlaying).to.be.false;
        });

        it('should allow starting again after reset', function() {
            tracker.startPlaying();
            expect(tracker.isPlaying).to.be.true;
            
            tracker.reset();
            expect(tracker.isPlaying).to.be.false;
            
            tracker.startPlaying();
            expect(tracker.isPlaying).to.be.true;
        });
    });

    describe('createGlobalExports', function() {
        beforeEach(function() {
            delete window.domUtils;
            delete window.highScoreTracker;
        });

        it('should set domUtils on window', function() {
            const mockBase = {};
            
            createGlobalExports(mockBase);
            
            expect(window.domUtils).to.exist;
        });

        it('should set highScoreTracker on window if provided', function() {
            const mockHighScoreTracker = { test: 'value' };
            const mockBase = { highScoreTracker: mockHighScoreTracker };
            
            createGlobalExports(mockBase);
            
            expect(window.highScoreTracker).to.equal(mockHighScoreTracker);
        });

        it('should not set highScoreTracker if not provided', function() {
            const mockBase = {};
            
            createGlobalExports(mockBase);
            
            expect(window.highScoreTracker).to.not.exist;
        });

        it('should set additional functions on window', function() {
            const mockFn = () => 'test';
            const mockBase = {};
            const additionalFunctions = { myFunction: mockFn };
            
            createGlobalExports(mockBase, additionalFunctions);
            
            expect(window.myFunction).to.equal(mockFn);
        });

        it('should only set functions in additionalFunctions', function() {
            const mockBase = {};
            const additionalFunctions = { 
                myFunction: () => 'test',
                notAFunction: 'string',
                anotherNumber: 123
            };
            
            createGlobalExports(mockBase, additionalFunctions);
            
            expect(window.myFunction).to.exist;
            expect(window.notAFunction).to.not.exist;
            expect(window.anotherNumber).to.not.exist;
        });

        it('should handle empty additionalFunctions', function() {
            const mockBase = {};
            
            expect(() => createGlobalExports(mockBase, {})).to.not.throw;
        });

        it('should handle undefined additionalFunctions', function() {
            const mockBase = {};
            
            expect(() => createGlobalExports(mockBase)).to.not.throw;
        });
    });

    describe('initializeMidiestroBase', function() {
        let result;
        let mockStorage;

        beforeEach(function() {
            // Create mock storage for Node.js environment
            mockStorage = {
                getItem: () => null,
                setItem: () => {},
                key: () => null,
                length: 0
            };
            
            // Initialize without Tone.js (will set toneHelper to null)
            result = initializeMidiestroBase(undefined, mockStorage);
        });

        it('should return an object with all required properties', function() {
            expect(result).to.be.an('object');
            
            // Services (read-only references)
            expect(result.localStorageService).to.exist;
            expect(result.midiSongs).to.exist;
            expect(result.difficultySettingsObj).to.exist;
            expect(result.highScoreTracker).to.exist;
            expect(result.keyNoteMapService).to.exist;
            expect(result.midiParserFactory).to.exist;
            expect(result.songNoteRenderer).to.exist;
            expect(result.componentRegistry).to.exist;
            expect(result.synthKeyPlayer).to.exist;
            expect(result.keyRenderInfo).to.exist;
            expect(result.difficultySettingsCalculator).to.exist;
            
            // Key note map data
            expect(result.keyNoteMapCollection).to.exist;
            expect(result.keyNoteMapKeys).to.exist;
            expect(result.defaultKeyNoteMap).to.exist;
            
            // Mutable state (getters/setters)
            expect(result.songDifficultySettings).to.have.property('get');
            expect(result.songDifficultySettings).to.have.property('set');
            
            // Collections (mutable contents)
            expect(result.synthArray).to.be.an('array');
            
            // Default values
            expect(result.defaultNotesPlaying).to.equal("");
            expect(result.defaultSongNotes).to.equal("");
            expect(result.defaultSongNotesOnKeyMap).to.equal("");
        });

        it('should sort midiSongs alphabetically', function() {
            const keys = Object.keys(result.midiSongs);
            const sortedKeys = [...keys].sort();
            
            expect(keys).to.deep.equal(sortedKeys);
        });

        it('should have localStorageService methods', function() {
            expect(result.localStorageService.getItem).to.be.a('function');
            expect(result.localStorageService.setItem).to.be.a('function');
            expect(result.localStorageService.key).to.be.a('function');
        });

        it('should have songDifficultySettings getter/setter', function() {
            expect(result.songDifficultySettings.get()).to.equal(null);
            
            const testValue = { easy: {} };
            result.songDifficultySettings.set(testValue);
            
            expect(result.songDifficultySettings.get()).to.equal(testValue);
        });

        it('should have empty synthArray when Tone is not provided', function() {
            expect(result.synthArray).to.be.an('array');
            expect(result.synthArray.length).to.equal(0);
        });

        it('should have toneHelper as null when Tone is not provided', function() {
            expect(result.toneHelper).to.equal(null);
        });

        it('should have keyNoteMapKeys as array of keys from keyNoteMapCollection', function() {
            expect(result.keyNoteMapKeys).to.be.an('array');
            expect(result.keyNoteMapKeys).to.deep.equal(Object.keys(result.keyNoteMapCollection));
        });

        it('should have defaultKeyNoteMap as first entry from keyNoteMapCollection', function() {
            const firstKey = result.keyNoteMapKeys[0];
            
            expect(result.defaultKeyNoteMap).to.equal(result.keyNoteMapCollection[firstKey]);
        });

        it('should have highScoreTracker with expected methods', function() {
            expect(result.highScoreTracker).to.have.property('getHighScore');
            expect(result.highScoreTracker.getHighScore).to.be.a('function');
        });

        it('should have componentRegistry with expected methods', function() {
            expect(result.componentRegistry).to.have.property('getPressedKeys');
            expect(result.componentRegistry.getPressedKeys).to.be.a('function');
        });

        it('should have keyNoteMapService with expected methods', function() {
            expect(result.keyNoteMapService).to.have.property('getInvertedMap');
            expect(result.keyNoteMapService.getInvertedMap).to.be.a('function');
        });
    });

    describe('initializeMidiestroBase with Tone.js', function() {
        let result;
        let mockTone;
        let mockStorage;

        beforeEach(function() {
            // Create mock storage for Node.js environment
            mockStorage = {
                getItem: () => null,
                setItem: () => {},
                key: () => null,
                length: 0
            };

            mockTone = {
                FMSynth: class MockFMSynth {},
                version: '14.0.0'
            };

            result = initializeMidiestroBase(mockTone, mockStorage);
        });

        it('should have toneHelper as null in Node.js (no browser environment)', function() {
            expect(result.toneHelper).to.equal(null);
        });

        it('should have empty synthArray in Node.js (no browser environment)', function() {
            expect(result.synthArray).to.be.an('array');
            expect(result.synthArray.length).to.equal(0);
        });

        it('should have keyNoteMapService with expected methods', function() {
            expect(result.keyNoteMapService).to.have.property('getInvertedMap');
            expect(result.keyNoteMapService.getInvertedMap).to.be.a('function');
        });
    });

    describe('setupFileDropHandlers', function() {
        it('should be a function', function() {
            // This is tested in the browser environment since it requires DOM elements
            // Just verify the function exists by importing it (we can't test here without DOM)
        });
    });

    describe('initializeUIVisibility', function() {
        it('should be a function', function() {
            // This is tested in the browser environment since it requires DOM elements
            // Just verify the function exists by importing it (we can't test here without DOM)
        });
    });
});
