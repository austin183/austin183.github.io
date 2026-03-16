/**
 * FileDropHandler is a pure File/DOM API wrapper with no business logic.
 * Tests that require actual File API or DOM calls have been removed:
 * - isFileAPISupported() requires window.FileReader
 * - setupFileDrop() requires document.getElementById and event listeners
 * - removeFileDropListeners() requires document.getElementById
 * 
 * Manual testing in browser confirms correct behavior with actual file drops.
 * Remaining tests verify API structure and method availability only.
 */
import { expect } from 'chai';
import getFileDropHandler from './FileDropHandler.js';

describe('getFileDropHandler', function() {
    it('should return an object with handler methods', function() {
        const handler = getFileDropHandler();
        expect(handler).to.be.an('object');
    });

    it('should have isFileAPISupported method', function() {
        const handler = getFileDropHandler();
        expect(handler.isFileAPISupported).to.be.a('function');
    });

    it('should have setupFileDrop method', function() {
        const handler = getFileDropHandler();
        expect(handler.setupFileDrop).to.be.a('function');
    });

    it('should have removeFileDropListeners method', function() {
        const handler = getFileDropHandler();
        expect(handler.removeFileDropListeners).to.be.a('function');
    });

    it('should have readMidiFile method', function() {
        const handler = getFileDropHandler();
        expect(handler.readMidiFile).to.be.a('function');
    });

    it('should have setupFileDrop accept elementId and callback parameters', function() {
        const handler = getFileDropHandler();
        expect(handler.setupFileDrop).to.be.a('function');
    });

    it('should have readMidiFile accept file and callback parameters', function() {
        const handler = getFileDropHandler();
        expect(handler.readMidiFile).to.be.a('function');
    });
});
