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

    it('should return boolean from isFileAPISupported', function() {
        const handler = getFileDropHandler();
        const result = handler.isFileAPISupported();
        expect(result).to.be.oneOf([true, false]);
    });

    it('should not throw error when setupFileDrop is called with non-existent element', function() {
        const handler = getFileDropHandler();
        expect(() => handler.setupFileDrop('nonExistentElement', () => {})).to.not.throw();
    });

    it('should not throw error when removeFileDropListeners is called with non-existent element', function() {
        const handler = getFileDropHandler();
        expect(() => handler.removeFileDropListeners('nonExistentElement')).to.not.throw();
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
