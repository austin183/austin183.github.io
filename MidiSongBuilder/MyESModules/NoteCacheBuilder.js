/**
 * NoteCacheBuilder - Shared utility for building note caches
 *
 * Provides a generic caching mechanism for note rendering data.
 * Different rendering systems (2D canvas, 3D Three.js) can use their own
 * cache entry builders.
 */
export default function getNoteCacheBuilder() {
    return {
        /**
         * Build a cache for note rendering data
         * @param {Object} keyRenderInfo - Keyboard layout info from keyRenderInfo.js
         * @param {Function} buildCacheEntry - Function that creates a cache entry for a given key
         * @returns {Object} - Cache object mapping keys to their cached entries
         *
         * Example for 2D (SongNoteRenderer):
         *   const cache = buildNoteCache(keyRenderInfo, (key, keyInfo) => {
         *       return {
         *           unplayed: createCanvas(key, keyInfo, 'unplayed'),
         *           good: createCanvas(key, keyInfo, 'good'),
         *           // ...
         *       };
         *   });
         *
         * Example for 3D (ThreeJSRenderer):
         *   const cache = buildNoteCache(keyRenderInfo, (key, keyInfo) => {
         *       return {
         *           geometry: createTextGeometry(key, keyInfo),
         *           letter: key.toUpperCase()
         *       };
         *   });
         */
        buildNoteCache: function(keyRenderInfo, buildCacheEntry) {
            var cache = {};
            for (var key in keyRenderInfo) {
                const keyInfo = keyRenderInfo[key];
                const cacheEntry = buildCacheEntry(key, keyInfo);
                cache[key] = cacheEntry;
            }
            return cache;
        }
    };
}
