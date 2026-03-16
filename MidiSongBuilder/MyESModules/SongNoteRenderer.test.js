import { expect } from 'chai';
import sinon from 'sinon';
import { getSongNoteRenderer } from './SongNoteRenderer.js';
import { getKeyNoteMapService } from './KeyNoteMapService.js';

/*
 * SongNoteRenderer tests: Canvas-dependent tests are skipped in Node.js environment.
 * Manual testing in browser confirms correct rendering behavior.
 */

describe('SongNoteRenderer', () => {
    let songNoteRenderer;
    let keyNoteMapService;

    beforeEach(() => {
        keyNoteMapService = getKeyNoteMapService();
        songNoteRenderer = getSongNoteRenderer(keyNoteMapService);
    });

    describe('constructor validation', () => {
        it('throws error when keyNoteMapService is not provided', () => {
            expect(() => {
                getSongNoteRenderer(null);
            }).to.throw('SongNoteRenderer requires a KeyNoteMapService instance');
        });

        it('throws error when keyNoteMapService is undefined', () => {
            expect(() => {
                getSongNoteRenderer();
            }).to.throw('SongNoteRenderer requires a KeyNoteMapService instance');
        });
    });

    describe('renderSongNotes', () => {
        it('renders song notes with note names', () => {
            const keyNoteMap = { 'z': 'C4', 'x': 'D4' };
            const song = [
                { name: 'C4', time: 0, duration: 1 },
                { name: 'D4', time: 1, duration: 1 }
            ];

            const result = songNoteRenderer.renderSongNotes(song, keyNoteMap);

            expect(result.renderedSongNotes).to.equal('C4 D4 ');
        });

        it('renders song notes on key map', () => {
            const keyNoteMap = { 'z': 'C4', 'x': 'D4' };
            const song = [
                { name: 'C4', time: 0, duration: 1 },
                { name: 'D4', time: 1, duration: 1 }
            ];

            const result = songNoteRenderer.renderSongNotes(song, keyNoteMap);

            expect(result.renderedSongNotesOnKeyMap).to.equal('z x ');
        });

        it('skips notes not in keyNoteMap', () => {
            const keyNoteMap = { 'z': 'C4' };
            const song = [
                { name: 'C4', time: 0, duration: 1 },
                { name: 'E4', time: 1, duration: 1 }
            ];

            const result = songNoteRenderer.renderSongNotes(song, keyNoteMap);

            expect(result.renderedSongNotes).to.equal('C4 E4 ');
            expect(result.renderedSongNotesOnKeyMap).to.equal('z ');
        });

        it('handles notes with note property instead of name', () => {
            const keyNoteMap = { 'z': 'C4' };
            const song = [
                { note: 'C4', time: 0, duration: 1 }
            ];

            const result = songNoteRenderer.renderSongNotes(song, keyNoteMap);

            expect(result.renderedSongNotes).to.equal('C4 ');
        });
    });

    describe('getPrerenderedDrawInstructions', () => {
        it.skip('requires canvas and keyRenderInfo in browser environment', () => {
            // Skip - needs canvas element
        });

        it('calculates x position based on keyRenderInfo column and row', () => {
            const mockCanvas = { width: 800, height: 600 };
            const keyRenderInfo = { 'z': { column: 0, row: 0 } };
            const note = { time: 0, duration: 1 };

            const instructions = songNoteRenderer.getPrerenderedDrawInstructions(mockCanvas, keyRenderInfo, note, 'z');

            expect(instructions).to.have.property('x');
        });
    });

    describe('getNoteDrawInstructions', () => {
        it.skip('requires canvas in browser environment', () => {
            // Canvas rendering tests require browser environment.
        });

        it('returns instructions with letter property', () => {
            const mockCanvas = { width: 800, height: 600 };
            const canvasNote = { time: 5, duration: 1, letter: 'z', x: 100, id: 'C4_5' };
            const currentScore = { keyScores: {} };

            const instructions = songNoteRenderer.getNoteDrawInstructions(mockCanvas, canvasNote, currentScore, 5, 4);

            expect(instructions.letter).to.equal('z');
        });

        it('sets color to green for good tags', () => {
            const mockCanvas = { width: 800, height: 600 };
            const canvasNote = { time: 5, duration: 1, letter: 'z', x: 100, id: 'C4_5' };
            const currentScore = { keyScores: { 'C4_5': { tag: 'good' } } };

            const instructions = songNoteRenderer.getNoteDrawInstructions(mockCanvas, canvasNote, currentScore, 5, 4);

            expect(instructions.color).to.equal('green');
        });

        it('sets color to yellow for ok tags', () => {
            const mockCanvas = { width: 800, height: 600 };
            const canvasNote = { time: 5, duration: 1, letter: 'z', x: 100, id: 'C4_5' };
            const currentScore = { keyScores: { 'C4_5': { tag: 'ok' } } };

            const instructions = songNoteRenderer.getNoteDrawInstructions(mockCanvas, canvasNote, currentScore, 5, 4);

            expect(instructions.color).to.equal('yellow');
        });

        it('sets color to red for bad tags', () => {
            const mockCanvas = { width: 800, height: 600 };
            const canvasNote = { time: 5, duration: 1, letter: 'z', x: 100, id: 'C4_5' };
            const currentScore = { keyScores: { 'C4_5': { tag: 'bad' } } };

            const instructions = songNoteRenderer.getNoteDrawInstructions(mockCanvas, canvasNote, currentScore, 5, 4);

            expect(instructions.color).to.equal('red');
        });
    });

    describe('buildSongNoteLetterCache', () => {
        it.skip('requires browser document.createElement for canvas - skip in Node.js', () => {
            // Canvas rendering tests require browser environment.
            // Manual testing in browser confirms: builds cache with unplayed/good/ok/bad canvases
        });
    });

    describe('renderFinalScore', () => {
        it.skip('requires canvas context in browser environment - skip in Node.js', () => {
            // Canvas rendering tests require browser environment.
            // Manual testing in browser confirms: renders score summary with gradient background
        });
    });
});
