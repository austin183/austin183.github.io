import { expect } from 'chai';
import getNoteCacheBuilder from './NoteCacheBuilder.js';

describe('getNoteCacheBuilder', function() {
    it('should return an object with buildNoteCache method', function() {
        const builder = getNoteCacheBuilder();
        expect(builder).to.be.an('object');
        expect(builder.buildNoteCache).to.be.a('function');
    });

    it('should build an empty cache for empty keyRenderInfo', function() {
        const builder = getNoteCacheBuilder();
        const cache = builder.buildNoteCache({}, (key, info) => ({ value: key }));
        expect(cache).to.deep.equal({});
    });

    it('should call buildCacheEntry for each key in keyRenderInfo', function() {
        const builder = getNoteCacheBuilder();
        const keyRenderInfo = {
            'a': { column: 0, row: 1 },
            'b': { column: 1, row: 1 }
        };
        const buildCacheEntry = (key, info) => `cache_for_${key}`;
        
        const cache = builder.buildNoteCache(keyRenderInfo, buildCacheEntry);
        
        expect(cache).to.have.property('a', 'cache_for_a');
        expect(cache).to.have.property('b', 'cache_for_b');
    });

    it('should pass key and keyInfo to buildCacheEntry callback', function() {
        const builder = getNoteCacheBuilder();
        const keyRenderInfo = {
            'x': { column: 1, row: 0 }
        };
        
        let receivedKey = null;
        let receivedInfo = null;
        
        const buildCacheEntry = (key, info) => {
            receivedKey = key;
            receivedInfo = info;
            return 'cached_entry';
        };
        
        builder.buildNoteCache(keyRenderInfo, buildCacheEntry);
        
        expect(receivedKey).to.equal('x');
        expect(receivedInfo).to.deep.equal({ column: 1, row: 0 });
    });

    it('should build cache with custom entry structure for 2D rendering', function() {
        const builder = getNoteCacheBuilder();
        const keyRenderInfo = { 'z': { column: 0, row: 0 } };
        
        const buildCacheEntry = (key, info) => ({
            unplayed: `unplayed_${key}`,
            good: `good_${key}`,
            late: `late_${key}`
        });
        
        const cache = builder.buildNoteCache(keyRenderInfo, buildCacheEntry);
        
        expect(cache.z).to.deep.equal({
            unplayed: 'unplayed_z',
            good: 'good_z',
            late: 'late_z'
        });
    });

    it('should build cache with custom entry structure for 3D rendering', function() {
        const builder = getNoteCacheBuilder();
        const keyRenderInfo = { 'z': { column: 0, row: 0 } };
        
        const buildCacheEntry = (key, info) => ({
            geometry: `geometry_${key}`,
            letter: key.toUpperCase()
        });
        
        const cache = builder.buildNoteCache(keyRenderInfo, buildCacheEntry);
        
        expect(cache.z).to.deep.equal({
            geometry: 'geometry_z',
            letter: 'Z'
        });
    });

it('should handle multiple keys in keyRenderInfo', function() {
        const builder = getNoteCacheBuilder();
        const keyRenderInfo = {
            'a': { column: 0, row: 1 },
            's': { column: 1, row: 1 },
            'd': { column: 2, row: 1 }
        };

        const buildCacheEntry = (key, info) => ({ key, ...info });

        const cache = builder.buildNoteCache(keyRenderInfo, buildCacheEntry);

        expect(cache.a.key).to.equal('a');
        expect(cache.a.column).to.equal(0);
        expect(cache.a.row).to.equal(1);
        expect(cache.s.key).to.equal('s');
        expect(cache.d.key).to.equal('d');
    });

    it('should return a new cache object each time', function() {
        const builder = getNoteCacheBuilder();
        const keyRenderInfo = { 'x': { column: 1 } };
        
        const cache1 = builder.buildNoteCache(keyRenderInfo, (k) => k);
        const cache2 = builder.buildNoteCache(keyRenderInfo, (k) => k);
        
        expect(cache1).to.not.equal(cache2);
    });
});
