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

    // Camera controls
    var cameraControls = null;
    var isCameraControlsEnabled = false;

    // Coordinate calculator for consistent position calculations
    var coordinateCalculator = getCoordinateCalculator();
    var CONSTANTS = coordinateCalculator.getConstants();

    // Colors matching 2D renderer
    var noteColors = {
        unplayed: [0.012, 0.125, 0.341],  // RGB for dark blue #031f57
        good: [0.0, 0.502, 0.0],          // Green #008000
        ok: [1.0, 0.843, 0.0],            // Yellow #FFD700
        bad: [1.0, 0.0, 0.0]              // Red #FF0000
    };

    var DEFAULT_CAMERA_STATE = {
        position: { x: 0, y: 4.5, z: 18 },
        lookAt: { x: 0, y: 4.5, z: 17 }
    };

    var colorCache = {};  // Cache for THREE.Color objects

    // Now line visualization (3D plane at player position)
    var nowLine = null;

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
            // Camera positioned to align 3D notes with 2D "now line" at bottom of canvas
            camera = new THREE.PerspectiveCamera(
                60, // Field of view
                window.innerWidth / window.innerHeight, // Aspect ratio
                0.1, // Near clipping plane
                1000 // Far clipping plane
            );
            // Position camera lower and closer to align with 2D view
            // The goal is to have notes intersect the now line at the same vertical position in both views
            // Adjusted to look slightly from the side for better depth perception
            // NOTE: Camera positioned for side view with tilted note plane
            //       To switch to straight-on view (for Y-constrained notes):
            //       camera.position.set(0, 0, 15); camera.lookAt(0, 0, 0);
            // Camera positioned higher above the notes, looking down at an angle
            // This aligns with the 2D view where notes fall from top to bottom
            camera.position.set(DEFAULT_CAMERA_STATE.position.x, DEFAULT_CAMERA_STATE.position.y, DEFAULT_CAMERA_STATE.position.z);
            camera.lookAt(DEFAULT_CAMERA_STATE.lookAt.x, DEFAULT_CAMERA_STATE.lookAt.y, DEFAULT_CAMERA_STATE.lookAt.z);

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7);
            scene.add(directionalLight);

            // Initialize camera controls
            cameraControls = getCameraControls(DEFAULT_CAMERA_STATE);
            cameraControls.init(camera, scene, renderer, renderer.domElement);
            isCameraControlsEnabled = false;

            // Create group for notes - tilted to face camera
            // The tilt makes notes face the camera for better text readability
            noteGroup = new THREE.Group();
            noteGroup.rotation.x = 0.5;  // Tilt notes to face the camera from the new higher angle
            scene.add(noteGroup);

            // Add background grid for reference - positioned at note depth
            gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
            gridHelper.position.y = -1;
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
                // Re-render with font if notes already exist (use default delay of 3)
                if (noteCache && Object.keys(noteCache).length > 0) {
                    threeJSRenderer.updateAllNotes(0, 3);
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
         * @param {number} delay - Optional delay to add to note positioning (default: 3)
         */
        createNote: function(letter, column, row, time, state, delay) {
            if (!loadedFont) {
                console.warn('Font not loaded yet, cannot create note');
                return null;
            }

            var THREE = window.THREE || window.__THREE__;

            // Use CoordinateCalculator for position
            delay = delay !== undefined ? delay : CONSTANTS.DEFAULT_DELAY;

            // Initialize userData.id for consistency
            var noteId = letter + "_" + time + "_" + column;

            // Calculate 3D position using the coordinate calculator
            var pos = coordinateCalculator.calculateNotePosition(column, time, delay);
            var xPos = pos.x;
            var yPos = pos.y;
            var zPos = pos.z;

            // Use cached color
            var noteColor = threeJSRenderer.getColor(state);

            // Create note group
            var noteMesh = new THREE.Group();

            // Create box for note border using CoordinateCalculator
            var noteDims = coordinateCalculator.getNoteDimensions();
            var boxWidth = noteDims.width;
            var boxHeight = noteDims.height;
            var boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, CONSTANTS.NOTE_THICKNESS);
            var boxMaterial = new THREE.MeshPhongMaterial({ color: noteColor });
            var box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.set(0, 0, CONSTANTS.NOTE_THICKNESS / 2);
            noteMesh.add(box);

            // Create text geometry using cached geometry if available
            var textGeometry = threeJSRenderer.createTextGeometry(letter);
            var textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            var text = new THREE.Mesh(textGeometry, textMaterial);
            text.position.set(0, -0.2, CONSTANTS.NOTE_THICKNESS + 0.01);  // Slightly in front of box
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
                zPos: zPos,
                delay: delay  // Store delay for position updates
            };

            noteMesh.position.set(xPos, yPos, zPos);
            noteMesh.castShadow = true;

            return noteMesh;
        },

        /**
         * Update note position (for animation)
         * @param {THREE.Mesh} noteMesh - The note to update
         * @param {number} currentTime - Current time in song
         * @param {number} delay - Optional delay (defaults to userData.delay or 3)
         */
        updateNotePosition: function(noteMesh, currentTime, delay) {
            if (!noteMesh || !noteMesh.userData) return;

            var noteTime = noteMesh.userData.time;
            // Default delay from coordinate calculator
            delay = delay !== undefined ? delay : (noteMesh.userData.delay !== undefined ? noteMesh.userData.delay : CONSTANTS.DEFAULT_DELAY);
            // Notes move toward camera (positive Z) as time progresses
            // Use CoordinateCalculator for dynamic position
            var pos = coordinateCalculator.calculateDynamicPosition(noteTime, currentTime, delay);
            var zPos = pos.z;

            // Update the stored zPos (keep Y position fixed)
            noteMesh.userData.zPos = zPos;
            noteMesh.position.z = zPos;
            // Note: Y position remains fixed at 0 (set in createNote)
        },

        /**
         * Update all notes' positions based on current time
         * @param {number} currentTime - Current time in song
         * @param {number} delay - Optional delay (defaults to 3)
         */
        updateAllNotes: function(currentTime, delay) {
            if (!noteGroup) return;

            currentTime = currentTime || 0;

            noteGroup.children.forEach(function(noteMesh) {
                threeJSRenderer.updateNotePosition(noteMesh, currentTime, delay);
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
                height: CONSTANTS.NOTE_THICKNESS,
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
            // Use a default delay of 4 seconds to match ThreeJSGameController
            visibleField.forEach(function(note) {
                var keyInfo = keyRenderInfo[note.letter];
                if (keyInfo) {
                    var noteMesh = threeJSRenderer.createNote(
                        note.letter.toUpperCase(),
                        keyInfo.column,
                        keyInfo.row,
                        note.time,
                        note.state || 'unplayed',
                        CONSTANTS.DEFAULT_DELAY
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
                    height: CONSTANTS.NOTE_THICKNESS,
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
         * Get the Z_SCALE constant for external access
         */
        getZScale: function() {
            return CONSTANTS.Z_SCALE;
        },

        /**
         * Get all constants from CoordinateCalculator for external access
         */
        getConstants: function() {
            return CONSTANTS;
        },

        /**
         * Create or update the now line visualization
         * The now line should align with the 2D canvas "play line" at the bottom
         * @param {Number} zPos - Z position for the now line
         * @param {String} state - Color state ('good', 'ok', 'bad', 'missed')
         */
        renderNowLine: function(zPos, state) {
            if (!scene) return;

            var THREE = window.THREE;

            // Create or update now line - now using a translucent cuboid for better visibility
            if (!nowLine) {
                // Use a box geometry with a translucent green material
                // Width matches keyboard span (~12 units for 10 keys with 1.2 spacing)
                // Height represents the note height, thickness is minimal
                var boxGeometry = new THREE.BoxGeometry(14, 1, 0.2);

                // Create a translucent green material
                var material = new THREE.MeshPhongMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.3,
                    depthWrite: false
                });

                nowLine = new THREE.Mesh(boxGeometry, material);

                // Initial position - aligned with 2D "now line" at bottom of view
                nowLine.position.y = 0;
                nowLine.position.z = zPos;
                scene.add(nowLine);
            } else {
                // Update existing nowLine position
                nowLine.position.z = zPos;
            }
        },

        /**
         * Clear the now line
         */
        clearNowLine: function() {
            if (nowLine) {
                scene.remove(nowLine);
                if (nowLine.geometry) nowLine.geometry.dispose();
                if (nowLine.material) nowLine.material.dispose();
                nowLine = null;
            }
        },

        /**
         * Enable camera controls
         */
        enableCameraControls: function() {
            isCameraControlsEnabled = true;
            if (cameraControls) {
                cameraControls.enable();
            }
        },

        /**
         * Disable camera controls
         */
        disableCameraControls: function() {
            isCameraControlsEnabled = false;
            if (cameraControls) {
                cameraControls.disable();
            }
        },

        /**
         * Update camera from camera controls
         */
        updateCameraFromControls: function() {
            if (cameraControls && isCameraControlsEnabled) {
                var state = cameraControls.getCameraState();
                camera.position.set(state.position.x, state.position.y, state.position.z);
                camera.lookAt(state.lookAt.x, state.lookAt.y, state.lookAt.z);
            }
        },

        /**
         * Get camera position and lookAt for display
         */
        getCameraDisplayState: function() {
            if (cameraControls && isCameraControlsEnabled) {
                return cameraControls.getCameraState();
            }
            // Return default camera state when controls are disabled
            return DEFAULT_CAMERA_STATE;
        },

        /**
         * Set camera position from UI input
         * @param {Object} position - New position {x, y, z}
         * @param {Object} lookAt - New lookAt {x, y, z}
         */
        setCameraFromUI: function(position, lookAt) {
            if (cameraControls) {
                cameraControls.setCameraState(position, lookAt);
            }
        },

        /**
         * Reset camera to default position
         */
        resetCamera: function() {
            if (cameraControls) {
                cameraControls.reset();
            }
        }
    };

    return threeJSRenderer;
}
