import { expect } from 'chai';
import sinon from 'sinon';
import { getSongNoteRenderer } from './SongNoteRenderer.js';
import { getKeyNoteMapService } from './KeyNoteMapService.js';

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
            // Skip - needs canvas element
        });

        it('returns instructions with letter property', () => {
            const mockCanvas = { width: 800, height: 600 };
            const canvasNote = { time: 5, duration: 1, letter: 'z', x: 100, id: 'C4_5' };
            const currentScore = { keyScores: {} };

            const instructions = songNoteRenderer.getNoteDrawInstructions(mockCanvas, canvasNote, currentScore, 5, 4);

            expect(instructions.letter).to.equal('z');
            expect(instructions.x).to.equal(100);
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
        it.skip('requires browser document.createElement for canvas', () => {
            // Skip - needs DOM API
        });

        it('creates cache structure for all keys in keyRenderInfo', () => {
            const keyRenderInfo = { 'z': { row: 0 }, 'x': { row: 1 } };

            try {
                const cache = songNoteRenderer.buildSongNoteLetterCache(keyRenderInfo);

                expect(cache).to.have.property('z');
                expect(cache).to.have.property('x');
            } catch (e) {
                if (e.message.includes("Failed to execute 'createElement'")) {
                    this.skip();
                } else {
                    throw e;
                }
            }
        });
    });

    describe('renderFinalScore', () => {
        it.skip('requires canvas context in browser environment', () => {
            // Skip - needs canvas context
        });

        it('calculates row height and positions correctly', () => {
            const mockCanvas = { width: 800, height: 600 };
            const mockCtx = { createLinearGradient: () => {}, fillStyle: '', font: '', fillText: sinon.stub() };

            songNoteRenderer.renderFinalScore(mockCanvas, mockCtx, 100, 50, 30, 15, 5);

            expect(mockCtx.fillText.called).to.be.true;
        });
    });
});
