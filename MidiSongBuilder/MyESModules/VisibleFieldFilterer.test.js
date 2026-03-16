import { expect } from 'chai';
import { getVisibleFieldFilterer } from './VisibleFieldFilterer.js';

describe('VisibleFieldFilterer', () => {
    let visibleFieldFilterer;

    beforeEach(() => {
        visibleFieldFilterer = getVisibleFieldFilterer();
    });

    describe('filterToFullVisibleField', () => {
        it('throws error for negative minNoteDistance', () => {
            const song = [{ time: 0, duration: 1, name: 'C4' }];
            const invertedKeyNoteMap = { 'C4': 'z' };

            expect(() => {
                visibleFieldFilterer.filterToFullVisibleField(song, -1, 0.5, invertedKeyNoteMap);
            }).to.throw('minNoteDistance and minDuration must be non-negative numbers');
        });

        it('throws error for negative minDuration', () => {
            const song = [{ time: 0, duration: 1, name: 'C4' }];
            const invertedKeyNoteMap = { 'C4': 'z' };

            expect(() => {
                visibleFieldFilterer.filterToFullVisibleField(song, 0.5, -1, invertedKeyNoteMap);
            }).to.throw('minNoteDistance and minDuration must be non-negative numbers');
        });

        it('returns empty array for song with no matching notes', () => {
            const song = [{ time: 0, duration: 1, name: 'C4' }];
            const invertedKeyNoteMap = { 'D4': 'x' };

            const visibleField = visibleFieldFilterer.filterToFullVisibleField(song, 0.2, 0.5, invertedKeyNoteMap);

            expect(visibleField).to.deep.equal([]);
        });

        it('filters notes by minimum duration', () => {
            const song = [
                { time: 0, duration: 0.3, name: 'C4' },
                { time: 1, duration: 0.6, name: 'D4' }
            ];
            const invertedKeyNoteMap = { 'C4': 'z', 'D4': 'x' };
            const mockCanvas = { width: 800, height: 600 };
            const mockKeyRenderInfo = { 'z': { column: 0, row: 1 }, 'x': { column: 1, row: 1 } };
            const mockSongNoteRenderer = {
                getPrerenderedDrawInstructions: (canvas, keyRenderInfo, note, letter) => ({ x: 10 })
            };

            const visibleField = visibleFieldFilterer.filterToFullVisibleField(song, 0.2, 0.5, invertedKeyNoteMap, mockKeyRenderInfo, mockCanvas, mockSongNoteRenderer);

            expect(visibleField.length).to.equal(1);
            expect(visibleField[0].duration).to.equal(0.6);
        });

        it('filters notes by maximum duration (2 seconds)', () => {
            const song = [
                { time: 0, duration: 1, name: 'C4' },
                { time: 2, duration: 3, name: 'D4' }
            ];
            const invertedKeyNoteMap = { 'C4': 'z', 'D4': 'x' };
            const mockCanvas = { width: 800, height: 600 };
            const mockKeyRenderInfo = { 'z': { column: 0, row: 1 }, 'x': { column: 1, row: 1 } };
            const mockSongNoteRenderer = {
                getPrerenderedDrawInstructions: (canvas, keyRenderInfo, note, letter) => ({ x: 10 })
            };

            const visibleField = visibleFieldFilterer.filterToFullVisibleField(song, 0.2, 0.3, invertedKeyNoteMap, mockKeyRenderInfo, mockCanvas, mockSongNoteRenderer);

            expect(visibleField.length).to.equal(1);
            expect(visibleField[0].duration).to.equal(1);
        });

        it('filters notes by minimum note distance', () => {
            const song = [
                { time: 0, duration: 0.5, name: 'C4' },
                { time: 0.6, duration: 0.5, name: 'D4' }
            ];
            const invertedKeyNoteMap = { 'C4': 'z', 'D4': 'x' };
            const mockCanvas = { width: 800, height: 600 };
            const mockKeyRenderInfo = { 'z': { column: 0, row: 1 }, 'x': { column: 1, row: 1 } };
            const mockSongNoteRenderer = {
                getPrerenderedDrawInstructions: (canvas, keyRenderInfo, note, letter) => ({ x: 10 })
            };

            const visibleField = visibleFieldFilterer.filterToFullVisibleField(song, 0.5, 0.3, invertedKeyNoteMap, mockKeyRenderInfo, mockCanvas, mockSongNoteRenderer);

            expect(visibleField.length).to.equal(1);
            expect(visibleField[0].time).to.equal(0);
        });

        it('includes notes that meet all criteria', () => {
            const song = [
                { time: 0, duration: 0.5, name: 'C4' },
                { time: 1, duration: 0.5, name: 'D4' },
                { time: 2, duration: 0.5, name: 'E4' }
            ];
            const invertedKeyNoteMap = { 'C4': 'z', 'D4': 'x', 'E4': 'c' };
            const mockCanvas = { width: 800, height: 600 };
            const mockKeyRenderInfo = { 'z': { column: 0, row: 1 }, 'x': { column: 1, row: 1 }, 'c': { column: 2, row: 1 } };
            const mockSongNoteRenderer = {
                getPrerenderedDrawInstructions: (canvas, keyRenderInfo, note, letter) => ({ x: 10 })
            };

            const visibleField = visibleFieldFilterer.filterToFullVisibleField(song, 0.2, 0.3, invertedKeyNoteMap, mockKeyRenderInfo, mockCanvas, mockSongNoteRenderer);

            expect(visibleField.length).to.equal(3);
        });

        it('creates visible field elements with correct properties', () => {
            const song = [{ time: 0, duration: 0.5, name: 'C4' }];
            const invertedKeyNoteMap = { 'C4': 'z' };
            const mockCanvas = { width: 800, height: 600 };
            const mockKeyRenderInfo = { 'z': { column: 0, row: 1 } };
            const mockSongNoteRenderer = {
                getPrerenderedDrawInstructions: (canvas, keyRenderInfo, note, letter) => ({ x: 10 })
            };

            const visibleField = visibleFieldFilterer.filterToFullVisibleField(song, 0.2, 0.3, invertedKeyNoteMap, mockKeyRenderInfo, mockCanvas, mockSongNoteRenderer);

            expect(visibleField[0]).to.have.property('time', 0);
            expect(visibleField[0]).to.have.property('duration', 0.5);
            expect(visibleField[0]).to.have.property('letter', 'z');
            expect(visibleField[0]).to.have.property('id', 'C4_0');
        });

        it('handles empty song array', () => {
            const visibleField = visibleFieldFilterer.filterToFullVisibleField([], 0.2, 0.3, {});

            expect(visibleField).to.deep.equal([]);
        });
    });
});
