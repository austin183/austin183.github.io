import { expect } from 'chai';
import getInputHandler from './InputHandler.js';

describe('getInputHandler', function() {
    it('should return an object with handler methods', function() {
        const handler = getInputHandler();
        expect(handler).to.be.an('object');
    });

    it('should have noteInputEnabled property initialized to true', function() {
        const handler = getInputHandler();
        expect(handler.noteInputEnabled).to.equal(true);
    });

    it('should have setupKeyListeners method', function() {
        const handler = getInputHandler();
        expect(handler.setupKeyListeners).to.be.a('function');
    });

    it('should have removeKeyListeners method', function() {
        const handler = getInputHandler();
        expect(handler.removeKeyListeners).to.be.a('function');
    });

    it('should have setNoteInputEnabled method', function() {
        const handler = getInputHandler();
        expect(handler.setNoteInputEnabled).to.be.a('function');
    });

    it('should have areCameraControlsActive method', function() {
        const handler = getInputHandler();
        expect(handler.areCameraControlsActive).to.be.a('function');
    });

    it('should have isKeyInMap method', function() {
        const handler = getInputHandler();
        expect(handler.isKeyInMap).to.be.a('function');
    });

    it('should have handleKeyDown method', function() {
        const handler = getInputHandler();
        expect(handler.handleKeyDown).to.be.a('function');
    });

    it('should have handleKeyUp method', function() {
        const handler = getInputHandler();
        expect(handler.handleKeyUp).to.be.a('function');
    });

    it('should set noteInputEnabled to false after calling setNoteInputEnabled(false)', function() {
        const handler = getInputHandler();
        handler.setNoteInputEnabled(false);
        expect(handler.noteInputEnabled).to.equal(false);
    });

    it('should return true for areCameraControlsActive when noteInputEnabled is false', function() {
        const handler = getInputHandler();
        handler.setNoteInputEnabled(false);
        expect(handler.areCameraControlsActive()).to.equal(true);
    });

    it('should return false for areCameraControlsActive when noteInputEnabled is true', function() {
        const handler = getInputHandler();
        expect(handler.areCameraControlsActive()).to.equal(false);
    });

    it('should return true for isKeyInMap when key exists in keyNoteMap', function() {
        const handler = getInputHandler();
        const keyNoteMap = { 'z': 'D3', 'x': 'E3' };
        expect(handler.isKeyInMap('z', keyNoteMap)).to.equal(true);
    });

    it('should return false for isKeyInMap when key does not exist in keyNoteMap', function() {
        const handler = getInputHandler();
        const keyNoteMap = { 'z': 'D3', 'x': 'E3' };
        expect(handler.isKeyInMap('q', keyNoteMap)).to.equal(false);
    });

    it('should handleKeyDown when noteInputEnabled is true', function() {
        const handler = getInputHandler();
        const mockApp = { selectedKeyNoteMap: { keyNoteMap: { 'z': 'D3' } } };
        const pressedKeys = {};
        
        handler.setupKeyListeners(mockApp, pressedKeys, {}, [], () => {});
        handler.handleKeyDown({ key: 'z' });
        
        expect(pressedKeys['z']).to.equal(true);
    });

    it('should NOT update pressedKeys when noteInputEnabled is false', function() {
        const handler = getInputHandler();
        const mockApp = { selectedKeyNoteMap: { keyNoteMap: { 'z': 'D3' } } };
        const pressedKeys = {};
        
        handler.setupKeyListeners(mockApp, pressedKeys, {}, [], () => {});
        handler.setNoteInputEnabled(false);
        handler.handleKeyDown({ key: 'z' });
        
        expect(pressedKeys['z']).to.not.exist;
    });

    it('should handleKeyUp when noteInputEnabled is true and key in synthMap', function() {
        const handler = getInputHandler();
        const mockApp = { selectedKeyNoteMap: { keyNoteMap: { 'z': 'D3' } } };
        const pressedKeys = {};
        const synthMap = { 'z': {} };
        
        handler.setupKeyListeners(mockApp, pressedKeys, synthMap, [], () => {});
        handler.handleKeyDown({ key: 'z' });
        handler.handleKeyUp({ key: 'z' });
        
        expect(pressedKeys['z']).to.equal(false);
    });

    it('should reset state after removeKeyListeners', function() {
        const handler = getInputHandler();
        const pressedKeys = {};
        
        handler.setupKeyListeners({}, pressedKeys, {}, [], () => {});
        handler.removeKeyListeners();
        
        expect(handler.noteInputEnabled).to.equal(true);
    });
});
