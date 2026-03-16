import { expect } from 'chai';
import { getKeyNoteMapService } from './KeyNoteMapService.js';

describe('KeyNoteMapService', () => {
    let keyNoteMapService;

    beforeEach(() => {
        keyNoteMapService = getKeyNoteMapService();
    });

    describe('getInvertedMap', () => {
        it('inverts key-note mapping to note-key mapping', () => {
            const keyNoteMap = { 'z': 'C4', 'x': 'D4' };
            const inverted = keyNoteMapService.getInvertedMap(keyNoteMap);

            expect(inverted['C4']).to.equal('z');
            expect(inverted['D4']).to.equal('x');
        });

        it('caches inverted maps for reuse', () => {
            const keyNoteMap = { 'z': 'C4' };
            
            const firstCall = keyNoteMapService.getInvertedMap(keyNoteMap);
            const secondCall = keyNoteMapService.getInvertedMap(keyNoteMap);

            expect(firstCall).to.equal(secondCall, 'Same object returned from cache');
        });

        it('handles empty keyNoteMap', () => {
            const keyNoteMap = {};
            const inverted = keyNoteMapService.getInvertedMap(keyNoteMap);

            expect(inverted).to.deep.equal({});
            expect(keyNoteMap.__mapId).to.match(/^map_\d+$/);
        });
    });

    describe('getMapId', () => {
        it('assigns unique ID to map without one', () => {
            const keyNoteMap = { 'z': 'C4' };

            const mapId = keyNoteMapService.getMapId(keyNoteMap);

            expect(mapId).to.match(/^map_\d+$/);
            expect(keyNoteMap.__mapId).to.equal(mapId);
        });

        it('returns existing ID for map with one', () => {
            const keyNoteMap = { 'z': 'C4', __mapId: 'existing_id' };

            const mapId = keyNoteMapService.getMapId(keyNoteMap);

            expect(mapId).to.equal('existing_id');
        });
    });

    describe('computeInvertedMap', () => {
        it('computes inverted map without caching', () => {
            const keyNoteMap = { 'a': 'C3', 's': 'D3' };

            const inverted = keyNoteMapService.computeInvertedMap(keyNoteMap);

            expect(inverted['C3']).to.equal('a');
            expect(inverted['D3']).to.equal('s');
        });

        it('handles single key map', () => {
            const inverted = keyNoteMapService.computeInvertedMap({ 'z': 'C4' });

            expect(inverted).to.deep.equal({ 'C4': 'z' });
        });

        it('handles multiple keys mapping to same note', () => {
            const keyNoteMap = { 'z': 'C4', 'a': 'C4' };

            const inverted = keyNoteMapService.computeInvertedMap(keyNoteMap);

            expect(inverted['C4']).to.equal('a', 'Last key wins for duplicate notes');
        });
    });

    describe('getNoteForKey', () => {
        it('returns note for valid key', () => {
            const keyNoteMap = { 'z': 'C4', 'x': 'D4' };

            const note = keyNoteMapService.getNoteForKey(keyNoteMap, 'z');

            expect(note).to.equal('C4');
        });

        it('returns null for invalid key', () => {
            const keyNoteMap = { 'z': 'C4' };

            const note = keyNoteMapService.getNoteForKey(keyNoteMap, 'q');

            expect(note).to.be.null;
        });
    });

    describe('getKeyForNote', () => {
        it('returns key for valid note using cached inverted map', () => {
            const keyNoteMap = { 'z': 'C4', 'x': 'D4' };

            const key = keyNoteMapService.getKeyForNote(keyNoteMap, 'C4');

            expect(key).to.equal('z');
        });

        it('returns null for invalid note', () => {
            const keyNoteMap = { 'z': 'C4' };

            const key = keyNoteMapService.getKeyForNote(keyNoteMap, 'E4');

            expect(key).to.be.null;
        });
    });

    describe('clearCache', () => {
        it('clears inverted map cache', () => {
            const keyNoteMap = { 'z': 'C4' };

            keyNoteMapService.getInvertedMap(keyNoteMap);
            keyNoteMapService.clearCache();

            const newInverted = keyNoteMapService.getInvertedMap(keyNoteMap);
            expect(newInverted).to.not.equal({});
        });
    });

    describe('getProcessedKeyMaps', () => {
        it('returns processed data for all maps in collection', () => {
            const collection = {
                'Horizontal': { keyNoteMap: { 'z': 'C4' }, description: 'H layout' },
                'Vertical': { keyNoteMap: { '1': 'C4' } }
            };

            const processed = keyNoteMapService.getProcessedKeyMaps(collection);

            expect(processed.Horizontal.name).to.equal('Horizontal');
            expect(processed.Horizontal.description).to.equal('H layout');
            expect(processed.Vertical.description).to.equal('');
        });

        it('includes inverted maps in processed data', () => {
            const collection = {
                'Test': { keyNoteMap: { 'z': 'C4' } }
            };

            const processed = keyNoteMapService.getProcessedKeyMaps(collection);

            expect(processed.Test.invertedMap['C4']).to.equal('z');
        });

        it('handles empty collection', () => {
            const processed = keyNoteMapService.getProcessedKeyMaps({});

            expect(processed).to.deep.equal({});
        });
    });

    describe('getOriginalMap', () => {
        it('returns original map by ID after getMapId is called', () => {
            const keyNoteMap = { 'z': 'C4' };

            const mapId = keyNoteMapService.getMapId(keyNoteMap);
            const original = keyNoteMapService.getOriginalMap(mapId);

            expect(original).to.equal(keyNoteMap);
        });

        it('returns null for non-existent map ID', () => {
            const original = keyNoteMapService.getOriginalMap('non_existent');

            expect(original).to.be.null;
        });
    });
});
