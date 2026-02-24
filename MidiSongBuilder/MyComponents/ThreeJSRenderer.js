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
    var fontLoadError = null;

    // Font loading promise for graceful async handling
    var fontLoadPromise = null;

    // Camera controls
    var cameraControls = null;
    var isCameraControlsEnabled = false;

    // Hover info components
    var hoverInfoService = null;
    var hoverInfoDisplay = null;

    // Note cache builder utility
    var noteCacheBuilder = getNoteCacheBuilder();

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
            // Camera positioned for "road effect" - looking down at notes from ~27 degree angle
            camera = new THREE.PerspectiveCamera(
                60, // Field of view
                window.innerWidth / window.innerHeight, // Aspect ratio
                0.1, // Near clipping plane
                1000 // Far clipping plane
            );

            // Initialize hover info service and display
            hoverInfoService = getHoverInfoService();
            hoverInfoService.setConstants(CONSTANTS);
            hoverInfoDisplay = getHoverInfoDisplay();

            // Initialize camera controls first to get defaults (CameraControls is source of truth)
            cameraControls = getCameraControls();
            var defaultCameraState = cameraControls.getDefaultCameraState();

            // Position camera using CameraControls defaults
            camera.position.set(defaultCameraState.position.x, defaultCameraState.position.y, defaultCameraState.position.z);
            camera.lookAt(defaultCameraState.lookAt.x, defaultCameraState.lookAt.y, defaultCameraState.lookAt.z);

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7);
            scene.add(directionalLight);

            // Create group for notes - tilted to face camera
            // The tilt makes notes face the camera for better text readability
            noteGroup = new THREE.Group();
            scene.add(noteGroup);

            // Initialize camera controls (no longer passes defaults - CameraControls is source of truth)
            cameraControls.init(camera, scene, renderer, renderer.domElement, noteGroup, null, hoverInfoService, hoverInfoDisplay, THREE);
            isCameraControlsEnabled = false;
            noteGroup.rotation.x = 0;  // Tilt notes to face the camera from the new higher angle

            // Add background grid for reference - positioned at note depth
            gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
            gridHelper.position.y = 0;
            scene.add(gridHelper);
        },

        /**
         * Load the font for TextGeometry
         * @returns {Promise} - Resolves when font is loaded, rejects on error
         */
        loadFont: function() {
            if (loadingFont || loadedFont) return fontLoadPromise;

            loadingFont = true;
            fontLoadError = null;

            // Create a promise that wraps the font loading
            fontLoadPromise = new Promise(function(resolve, reject) {
                // Use a standard font URL
                const fontUrl = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json';

                fontLoader.load(
                    fontUrl,
                    function(font) {
                        loadedFont = font;
                        fontLoadError = null;
                        loadingFont = false;
                        // Font loaded log - only visible when ?debug query parameter is present (Issue #8)
                        if (window.location.search === '?debug') {
                            console.log('Font loaded successfully for Three.js text rendering');
                        }
                        resolve(font);
                        // Re-render with font if notes already exist (use default delay of 3)
                        if (noteCache && Object.keys(noteCache).length > 0) {
                            threeJSRenderer.updateAllNotes(0, 3);
                        }
                    }.bind(threeJSRenderer),
                    undefined,
                    function(error) {
                        fontLoadError = error;
                        loadingFont = false;
                        var errorMessage = 'Failed to load font from ' + fontUrl + ': ' + (error ? error.message : 'Unknown error');
                        console.error(errorMessage);
                        reject(new Error(errorMessage));
                    }
                );
            });

            return fontLoadPromise;
        },

        /**
         * Create a note mesh (box with text)
         * @param {string} letter - The note letter
         * @param {number} column - Keyboard column (0-9)
         * @param {number} row - Keyboard row (0-3)
         * @param {number} time - Time position in song (for Z depth)
         * @param {string} state - 'unplayed', 'good', 'ok', 'bad'
         * @param {number} delay - Optional delay to add to note positioning (default: 3)
         * @returns {THREE.Mesh|null} - The note mesh or null if font not loaded
         */
        createNote: function(letter, column, row, time, state, delay) {
            // Validate required parameters
            if (typeof letter !== 'string' || !letter) {
                console.error('createNote: letter must be a non-empty string');
                return null;
            }
            if (typeof column !== 'number' || column < 0) {
                console.error('createNote: column must be a non-negative number');
                return null;
            }
            if (typeof state !== 'string') {
                console.error('createNote: state must be a string');
                return null;
            }

            if (!loadedFont) {
                var errorMessage = 'Font not loaded. Call loadFont() first and wait for it to complete.';
                if (fontLoadError) {
                    errorMessage += ' Previous font load error: ' + fontLoadError.message;
                }
                console.error('ThreeJSRenderer.createNote: ' + errorMessage);
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
            // Debug log - only visible when ?debug query parameter is present
            if (window.location.search === '?debug') {
                console.log('addNotesFromVisibleField called, noteGroup:', noteGroup, 'children:', noteGroup ? noteGroup.children.length : 0);
            }
            if (!noteGroup) return;

            // Clear existing notes
            this.clearNotes();

            // Create cache for letter geometries using NoteCacheBuilder utility
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
            // Debug logs - only visible when ?debug query parameter is present (Issue #8)
            if (window.location.search === '?debug') {
                console.log('After adding notes, noteGroup children:', noteGroup ? noteGroup.children.length : 0);
                // Log detailed structure
                if (noteGroup && noteGroup.children && noteGroup.children.length > 0) {
                    console.log('noteGroup children structure:');
                    noteGroup.children.forEach(function(child, i) {
                        console.log('  Child', i, ':', child.type, 'userData:', child.userData, 'parent:', child.parent === noteGroup ? 'noteGroup' : 'NOT noteGroup (parent is ' + child.parent.type + ')');
                        if (child.children && child.children.length > 0) {
                            console.log('    Has', child.children.length, 'children:');
                            child.children.forEach(function(grandchild) {
                                console.log('      Grandchild:', grandchild.type, 'userData:', grandchild.userData, 'parent:', grandchild.parent === child ? 'child' : 'NOT child (parent is ' + grandchild.parent.type + ')');
                            });
                        }
                    });
                }
            }
        },

        /**
         * Build note cache for letters (uses NoteCacheBuilder utility)
         * Pre-renders text geometries for performance
         */
        buildNoteCache: function(keyRenderInfo) {
            if (!loadedFont) return;

            // Clear existing cache
            noteCache = {};

            // Use NoteCacheBuilder utility with a custom builder for 3D text geometries
            noteCache = noteCacheBuilder.buildNoteCache(keyRenderInfo, function(key, keyInfo) {
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
                return {
                    geometry: textGeometry,
                    letter: letter
                };
            });
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

            // Update note rotation for billboarding effect when camera controls are active
            this.updateNoteRotation();

            renderer.render(scene, camera);
        },

        /**
         * Start the animation loop
         */
        startAnimation: function() {
            if (animationId) return;

            const animate = () => {
                animationId = requestAnimationFrame(animate);
                this.render();
            };

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

            // Dispose camera controls (Issue #2 - cleanup event listeners)
            if (cameraControls) {
                cameraControls.dispose();
                cameraControls = null;
            }

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

            // Dispose hover info components
            if (hoverInfoService) {
                hoverInfoService = null;
            }
            if (hoverInfoDisplay) {
                hoverInfoDisplay = null;
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
        renderNowLine: function(zPos) {
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
                nowLine.userData.type = 'nowLine';  // Add type identifier for raycasting (Issue #3)

                // Initial position - aligned with 2D "now line" at bottom of view
                nowLine.position.y = 0;
                // Use calculateNowLinePosition for consistent now line positioning
                nowLine.position.z = coordinateCalculator.calculateNowLinePosition(zPos);
                scene.add(nowLine);

                // Update camera controls with nowLine reference
                if (cameraControls) {
                    cameraControls.setNowLineReference(nowLine);
                }
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
                // Update camera controls to clear nowLine reference
                if (cameraControls) {
                    cameraControls.setNowLineReference(null);
                }
            }
        },

        /**
         * Update note rotation to face camera (billboarding)
         * Only active when camera controls are enabled
         * During gameplay, notes keep their last rotation but move straight along Z-axis
         */
        updateNoteRotation: function() {
            if (!noteGroup || !camera || !isCameraControlsEnabled) return;

            // Get camera position
            var cameraPosition = camera.position;

            // For each note, make it look at the camera's position
            // This makes notes face the camera from any angle (full 3D billboarding)
            noteGroup.children.forEach(function(noteMesh) {
                if (!noteMesh) return;
                noteMesh.lookAt(cameraPosition);
            });
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
            // Return CameraControls' default state instead of local copy
            return cameraControls.getDefaultCameraState();
        },

        /**
         * Get the default camera state formatted for UI display (rounded values)
         * @returns {Object} - Default camera state with rounded position and lookAt
         */
        getDefaultCameraStateForUI: function() {
            if (cameraControls) {
                return cameraControls.getDefaultCameraStateForUI();
            }
            return null;
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
        },

        /**
         * Apply a camera preset by name
         * @param {string} presetKey - The preset key to apply
         */
        applyCameraPreset: function(presetKey) {
            if (cameraControls) {
                cameraControls.applyPreset(presetKey);
            }
        },

        /**
         * Get list of available camera presets
         * @returns {Array} - Array of preset keys
         */
        getCameraPresetList: function() {
            if (cameraControls) {
                return cameraControls.getPresetList();
            }
            return [];
        },

        /**
         * Get preset name for display
         * @param {string} presetKey - The preset key
         * @returns {string} - Human-readable preset name
         */
        getCameraPresetName: function(presetKey) {
            if (cameraControls) {
                var preset = cameraControls.getPreset(presetKey);
                return preset ? preset.name : presetKey;
            }
            return presetKey;
        },

        /**
         * Get the now line mesh for hover info raycasting
         */
        getNowLine: function() {
            return nowLine;
        },

        /**
         * Enable hover info display
         */
        enableHoverInfo: function() {
            if (cameraControls) {
                cameraControls.enableHoverInfo();
            }
        },

        /**
         * Disable hover info display
         */
        disableHoverInfo: function() {
            if (cameraControls) {
                cameraControls.disableHoverInfo();
            }
        },

        /**
         * Set the hover info DOM element
         * @param {HTMLElement} element - The hover info container element
         */
        setHoverInfoElement: function(element) {
            if (hoverInfoDisplay) {
                hoverInfoDisplay.init('hoverInfo');
            }
            if (hoverInfoService) {
                hoverInfoService.setConstants(CONSTANTS);
            }
            if (cameraControls) {
                cameraControls.setHoverInfoConstants(CONSTANTS);
            }
        }
    };

    return threeJSRenderer;
}
