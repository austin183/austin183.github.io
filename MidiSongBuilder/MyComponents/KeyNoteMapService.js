function getKeyNoteMapService() {
    // Cache for inverted maps: { mapId: { note: key } }
    var invertedMapCache = {};

    // Track the original maps we've seen
    var originalMaps = {};

    // Counter for unique map IDs
    var mapCounter = 0;

    return {
        /**
         * Get the inverted map (note -> key) for a given keyNoteMap
         * Uses caching to avoid redundant computation
         * @param {Object} keyNoteMap - The key -> note mapping
         * @returns {Object} - The note -> key mapping
         */
        getInvertedMap: function(keyNoteMap) {
            // Use a unique identifier for the map
            var mapId = this.getMapId(keyNoteMap);

            if (!invertedMapCache[mapId]) {
                invertedMapCache[mapId] = this.computeInvertedMap(keyNoteMap);
            }

            return invertedMapCache[mapId];
        },

        /**
         * Get a unique identifier for a keyNoteMap
         * Assigns an ID if the map doesn't have one
         */
        getMapId: function(keyNoteMap) {
            // Assign an ID if the map doesn't have one
            if (!keyNoteMap.__mapId) {
                keyNoteMap.__mapId = 'map_' + mapCounter++;
                originalMaps[keyNoteMap.__mapId] = keyNoteMap;
            }
            return keyNoteMap.__mapId;
        },

        /**
         * Compute the inverted map (non-cached)
         */
        computeInvertedMap: function(keyNoteMap) {
            var inverted = {};
            for (var key in keyNoteMap) {
                inverted[keyNoteMap[key]] = key;
            }
            return inverted;
        },

        /**
         * Get note for a given key
         * @param {Object} keyNoteMap - The key -> note mapping
         * @param {string} key - The keyboard key (e.g., 'z', 'x', 'c')
         * @returns {string|null} - The note (e.g., 'D3') or null if not found
         */
        getNoteForKey: function(keyNoteMap, key) {
            return keyNoteMap[key] || null;
        },

        /**
         * Get key for a given note
         * @param {Object} keyNoteMap - The key -> note mapping
         * @param {string} note - The note (e.g., 'D3')
         * @returns {string|null} - The keyboard key or null if not found
         */
        getKeyForNote: function(keyNoteMap, note) {
            var inverted = this.getInvertedMap(keyNoteMap);
            return inverted[note] || null;
        },

        /**
         * Clear the cache (useful when maps are modified or reset)
         */
        clearCache: function() {
            invertedMapCache = {};
        },

        /**
         * Get all available key maps with their processed data
         * @param {Object} keyNoteMapCollection - Collection of all key maps
         * @returns {Object} - Object with map names as keys and processed map data as values
         */
        getProcessedKeyMaps: function(keyNoteMapCollection) {
            var result = {};
            for (var name in keyNoteMapCollection) {
                var map = keyNoteMapCollection[name];
                result[name] = {
                    name: name,
                    keyNoteMap: map.keyNoteMap,
                    invertedMap: this.getInvertedMap(map.keyNoteMap),
                    description: map.description || ''
                };
            }
            return result;
        },

        /**
         * Get the original map by its ID
         * @param {string} mapId - The map ID
         * @returns {Object|null} - The original keyNoteMap or null if not found
         */
        getOriginalMap: function(mapId) {
            return originalMaps[mapId] || null;
        }
    };
}
