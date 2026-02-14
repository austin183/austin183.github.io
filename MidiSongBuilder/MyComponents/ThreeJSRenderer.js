function getThreeJSRenderer() {
    var renderer = null;
    var scene = null;
    var camera = null;
    var gridHelper = null;
    var animationId = null;

    // Note rendering variables
    var noteGroup = null;
    var noteCache = {};
    var fontLoader = null;
    var loadedFont = null;
    var loadingFont = false;

    // 3D Grid configuration
    var gridWidth = 10;  // 10 keyboard columns
    var gridHeight = 4;  // 4 keyboard rows
    var gridSpacing = 1.2;  // Spacing between notes
    var noteDepth = 1.5;  // Depth of notes (Z-axis)
    var noteThickness = 0.2;  // Thickness of note borders

    // Colors matching 2D renderer
    var noteColors = {
        unplayed: [0.012, 0.125, 0.341],  // RGB for dark blue #031f57
        good: [0.0, 0.502, 0.0],          // Green #008000
        ok: [1.0, 0.843, 0.0],            // Yellow #FFD700
        bad: [1.0, 0.0, 0.0]              // Red #FF0000
    };

    // Constants
    var Z_SCALE = 2;  // Scale time to Z position
    var NOTE_WIDTH_SCALE = 0.7;
    var NOTE_HEIGHT = 1.5;

    var colorCache = {};  // Cache for THREE.Color objects

    var threeJSRenderer = {
        /**
         * Initialize the Three.js renderer
         * @param {string} canvasId - The id of the canvas element to render to
         */
        init: function(canvasId) {
            // Support both window.THREE (standard) and window.__THREE__ (three.core.min.js)
            var THREE = window.THREE || window.__THREE__;
            if (!THREE) {
                console.error('Three.js is not loaded. Please ensure three.min.js is loaded before initializing ThreeJSRenderer.');
                return;
            }

            // Initialize FontLoader
            fontLoader = new THREE.FontLoader();

            // Load the default font
            this.loadFont();

            // Create renderer
            renderer = new THREE.WebGLRenderer({ canvas: document.getElementById(canvasId), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            // Create scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a2e);

            // Create camera with tilted view for 3D grid visibility
            camera = new THREE.PerspectiveCamera(
                60, // Field of view
                window.innerWidth / window.innerHeight, // Aspect ratio
                0.1, // Near clipping plane
                1000 // Far clipping plane
            );
            // Position camera for tilted/angled view
            camera.position.set(0, 12, 28);
            camera.lookAt(0, -2, 0);  // Look downward with less intensity

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7);
            scene.add(directionalLight);

            // Create group for notes (tilted toward player)
            noteGroup = new THREE.Group();
            noteGroup.rotation.x = 0.15;  // Tilt notes downward by ~9 degrees (more subtle)
            scene.add(noteGroup);

            // Add background grid for reference
            gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
            gridHelper.position.y = -3;
            scene.add(gridHelper);
        },

        /**
         * Load the font for TextGeometry
         */
        loadFont: function() {
            if (loadingFont || loadedFont) return;
            loadingFont = true;

            // Use a standard font URL
            const fontUrl = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json';

            fontLoader.load(fontUrl, function(font) {
                loadedFont = font;
                console.log('Font loaded successfully for Three.js text rendering');
                // Re-render with font if notes already exist
                if (noteCache && Object.keys(noteCache).length > 0) {
                    threeJSRenderer.updateAllNotes();
                }
            }, undefined, function(error) {
                console.error('Error loading font:', error);
                loadingFont = false;
            });
        },

        /**
         * Create a note mesh (box with text)
         * @param {string} letter - The note letter
         * @param {number} column - Keyboard column (0-9)
         * @param {number} row - Keyboard row (0-3)
         * @param {number} time - Time position in song (for Z depth)
         * @param {string} state - 'unplayed', 'good', 'ok', 'bad'
         */
        createNote: function(letter, column, row, time, state) {
            if (!loadedFont) {
                console.warn('Font not loaded yet, cannot create note');
                return null;
            }

            var THREE = window.THREE || window.__THREE__;

            // Initialize userData.id for consistency
            var noteId = letter + "_" + time + "_" + column;

            // Calculate 3D position
            // X = column position, Y = row position, Z = time (depth from camera)
            var xPos = (column - (gridWidth / 2) + 0.5) * gridSpacing;
            var yPos = (row - (gridHeight / 2) + 0.5) * gridSpacing;
            var zPos = -time * Z_SCALE;  // Scale time to Z position

            // Use cached color
            var noteColor = threeJSRenderer.getColor(state);

            // Create note group
            var noteMesh = new THREE.Group();

            // Create box for note border using constant
            var boxWidth = gridSpacing * NOTE_WIDTH_SCALE;
            var boxHeight = NOTE_HEIGHT;
            var boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, noteThickness);
            var boxMaterial = new THREE.MeshPhongMaterial({ color: noteColor });
            var box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.set(0, 0, noteThickness / 2);
            noteMesh.add(box);

            // Create text geometry using cached geometry if available
            var textGeometry = threeJSRenderer.createTextGeometry(letter);
            var textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            var text = new THREE.Mesh(textGeometry, textMaterial);
            text.position.set(0, -0.2, noteThickness + 0.01);  // Slightly in front of box
            noteMesh.add(text);

            // Store note metadata
            noteMesh.userData = {
                id: noteId,
                letter: letter,
                column: column,
                row: row,
                time: time,
                state: state,
                xPos: xPos,
                yPos: yPos,
                zPos: zPos
            };

            noteMesh.position.set(xPos, yPos, zPos);
            noteMesh.castShadow = true;

            return noteMesh;
        },

        /**
         * Update note position (for animation)
         * @param {THREE.Mesh} noteMesh - The note to update
         * @param {number} currentTime - Current time in song
         */
        updateNotePosition: function(noteMesh, currentTime) {
            if (!noteMesh || !noteMesh.userData) return;

            var noteTime = noteMesh.userData.time;
            var zPos = -(noteTime - currentTime) * Z_SCALE;

            // Update the stored zPos
            noteMesh.userData.zPos = zPos;
            noteMesh.position.z = zPos;
        },

        /**
         * Update all notes' positions based on current time
         * @param {number} currentTime - Current time in song
         */
        updateAllNotes: function(currentTime) {
            if (!noteGroup) return;

            currentTime = currentTime || 0;

            noteGroup.children.forEach(function(noteMesh) {
                threeJSRenderer.updateNotePosition(noteMesh, currentTime);
            });
        },

        /**
         * Get a cached color for a state
         * @param {string} state - 'unplayed', 'good', 'ok', 'bad'
         * @returns {THREE.Color}
         */
        getColor: function(state) {
            if (!colorCache[state]) {
                var colorArray = noteColors[state] || noteColors.unplayed;
                colorCache[state] = new THREE.Color(colorArray[0], colorArray[1], colorArray[2]);
            }
            return colorCache[state];
        },

        /**
         * Create text geometry for a letter (uses cached geometry if available)
         * @param {string} letter - The letter to create geometry for
         * @returns {THREE.TextGeometry}
         */
        createTextGeometry: function(letter) {
            if (noteCache[letter]) {
                return noteCache[letter].geometry;
            }
            // Fallback if not in cache - create fresh geometry
            var textGeometry = new THREE.TextGeometry(letter, {
                font: loadedFont,
                size: 0.8,
                height: noteThickness,
                curveSegments: 4,
                bevelEnabled: false
            });
            textGeometry.computeBoundingBox();
            var xOffset = -textGeometry.boundingBox.max.x / 2;
            var yOffset = -textGeometry.boundingBox.max.y / 2;
            textGeometry.translate(xOffset, yOffset, 0);
            return textGeometry;
        },

        /**
         * Set the state of a note (changes color)
         * @param {string} noteId - Unique note identifier
         * @param {string} state - 'good', 'ok', 'bad', 'missed'
         */
        setNoteState: function(noteId, state) {
            if (!noteGroup) return;

            noteGroup.children.forEach(function(noteMesh) {
                if (noteMesh.userData && noteMesh.userData.id === noteId) {
                    // Update state
                    noteMesh.userData.state = state;

                    // Update color using cached color
                    var newColor = threeJSRenderer.getColor(state);

                    // Update box color
                    if (noteMesh.children.length > 0) {
                        noteMesh.children[0].material.color = newColor;
                    }
                }
            });
        },

        /**
         * Clear all notes from the scene
         */
        clearNotes: function() {
            if (noteGroup) {
                // Remove all children
                while (noteGroup.children.length > 0) {
                    var child = noteGroup.children.pop();
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            }
            // Also clear the cache
            noteCache = {};
        },

        /**
         * Add notes to the scene from a visible field
         * @param {Array} visibleField - Array of notes from VisibleFieldFilterer
         * @param {Object} keyRenderInfo - Keyboard layout from keyRenderInfo.js
         */
        addNotesFromVisibleField: function(visibleField, keyRenderInfo) {
            if (!noteGroup) return;

            // Clear existing notes
            this.clearNotes();

            // Create cache for letter geometries (similar to buildSongNoteLetterCache)
            this.buildNoteCache(keyRenderInfo);

            // Create notes for visible field
            visibleField.forEach(function(note) {
                var keyInfo = keyRenderInfo[note.letter];
                if (keyInfo) {
                    var noteMesh = threeJSRenderer.createNote(
                        note.letter.toUpperCase(),
                        keyInfo.column,
                        keyInfo.row,
                        note.time,
                        note.state || 'unplayed'
                    );
                    if (noteMesh) {
                        // Use the note.id from the visible field for consistency
                        noteMesh.userData.id = note.id;
                        noteGroup.add(noteMesh);
                    }
                }
            });
        },

        /**
         * Build note cache for letters (similar to SongNoteRenderer.buildSongNoteLetterCache)
         * Pre-renders text geometries for performance
         */
        buildNoteCache: function(keyRenderInfo) {
            if (!loadedFont) return;

            // Clear existing cache
            noteCache = {};

            for (const key in keyRenderInfo) {
                const keyInfo = keyRenderInfo[key];
                const letter = key.toUpperCase();

                // Create text geometry for each letter
                var textGeometry = new THREE.TextGeometry(letter, {
                    font: loadedFont,
                    size: 0.8,
                    height: noteThickness,
                    curveSegments: 4,
                    bevelEnabled: false
                });
                textGeometry.computeBoundingBox();

                // Center the text
                var xOffset = -textGeometry.boundingBox.max.x / 2;
                var yOffset = -textGeometry.boundingBox.max.y / 2;
                textGeometry.translate(xOffset, yOffset, 0);

                // Store the geometry for reuse
                noteCache[key] = {
                    geometry: textGeometry,
                    letter: letter
                };
            }
        },

        /**
         * Resize the renderer to fit the window
         */
        resize: function() {
            if (!renderer || !camera) return;

            const canvas = renderer.domElement;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        },

        /**
         * Render the scene
         */
        render: function() {
            if (!renderer || !scene || !camera) return;

            renderer.render(scene, camera);
        },

        /**
         * Start the animation loop
         */
        startAnimation: function() {
            if (animationId) return;

            const animate = function() {
                animationId = requestAnimationFrame(animate);
                this.render();
            }.bind(this);

            animate();
        },

        /**
         * Stop the animation loop
         */
        stopAnimation: function() {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        },

        /**
         * Get the canvas element
         * @returns {HTMLCanvasElement|null}
         */
        getCanvas: function() {
            return renderer ? renderer.domElement : null;
        },

        /**
         * Clean up resources
         */
        dispose: function() {
            this.stopAnimation();
            this.clearNotes();

            if (renderer) {
                renderer.dispose();
                renderer = null;
            }

            if (gridHelper) {
                gridHelper.geometry.dispose();
                gridHelper.material.dispose();
                gridHelper = null;
            }

            noteGroup = null;
            noteCache = {};
            loadedFont = null;
            fontLoader = null;

            scene = null;
            camera = null;
        },

        /**
         * Get note group for external access
         */
        getNoteGroup: function() {
            return noteGroup;
        },

        /**
         * Update camera position
         */
        updateCamera: function(x, y, z) {
            if (camera) {
                camera.position.set(x, y, z);
                camera.lookAt(0, -0.5, 0);
            }
        }
    };

    return threeJSRenderer;
}
