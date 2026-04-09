import getNoteCacheBuilder from './NoteCacheBuilder.js';
import getCoordinateCalculator from './CoordinateCalculator.js';
import { getHoverInfoService } from './HoverInfoService.js';
import { getHoverInfoDisplay } from './HoverInfoDisplay.js';
import { getCameraControls } from './CameraControls.js';

function createThreeJSRenderer(THREE, FontLoader, TextGeometry) {
    if (!THREE) {
        console.error('ThreeJSRenderer: THREE library is required');
        return null;
    }

    const hoverInfoService = getHoverInfoService(THREE);
    const cameraControls = getCameraControls(THREE);

    let renderer = null;
    let scene = null;
    let camera = null;
    let gridHelper = null;
    let animationId = null;

    let noteGroup = null;
    let scoreGroup = null;
    let noteCache = {};
    let fontLoader = null;
    let loadedFont = null;
    let loadingFont = false;
    let fontLoadError = null;

    let fontLoadPromise = null;
    let isCameraControlsEnabled = false;

    const noteCacheBuilder = getNoteCacheBuilder();
    const coordinateCalculator = getCoordinateCalculator();
    const CONSTANTS = coordinateCalculator.getConstants();

    const noteColors = {
        unplayed: [0.012, 0.125, 0.341],
        good: [0.0, 0.502, 0.0],
        ok: [1.0, 0.843, 0.0],
        bad: [1.0, 0.0, 0.0]
    };

    let colorCache = {};

    let nowLine = null;
    let hoverInfoDisplay = null;

    /**
     * Validate note creation parameters
     */
    function validateNoteParams(letter, column, state) {
        if (typeof letter !== 'string' || !letter) {
            console.error('createNote: letter must be a non-empty string');
            return false;
        }
        if (typeof column !== 'number' || column < 0) {
            console.error('createNote: column must be a non-negative number');
            return false;
        }
        if (typeof state !== 'string') {
            console.error('createNote: state must be a string');
            return false;
        }
        return true;
    }

    /**
     * Create the note box mesh (border)
     */
    function createNoteBox(noteColor) {
        const noteDims = coordinateCalculator.getNoteDimensions();
        const boxGeometry = new THREE.BoxGeometry(
            noteDims.width, 
            noteDims.height, 
            CONSTANTS.NOTE_THICKNESS
        );
        const boxMaterial = new THREE.MeshPhongMaterial({ color: noteColor });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(0, 0, CONSTANTS.NOTE_THICKNESS / 2);
        return box;
    }

    /**
     * Create the text mesh for a note letter
     */
    function createNoteTextMesh(letter) {
        const textGeometry = threeJSRenderer.createTextGeometry(letter);
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const text = new THREE.Mesh(textGeometry, textMaterial);
        text.position.set(0, -0.2, 0);
        return text;
    }

    /**
     * Create note metadata for userData
     */
    function createNoteUserData(letter, column, row, time, state, xPos, yPos, zPos, delay) {
        const noteId = letter + "_" + time + "_" + column;
        return {
            id: noteId,
            letter: letter,
            column: column,
            row: row,
            time: time,
            state: state,
            xPos: xPos,
            yPos: yPos,
            zPos: zPos,
            delay: delay
        };
    }

    /**
     * Create text geometry configuration object
     * @param {string} letter - The letter to create geometry for
     * @returns {THREE.TextGeometry}
     */
    function createTextGeometryConfig(letter) {
        return new TextGeometry(letter, {
            font: loadedFont,
            size: 0.8,
            depth: .3,
            height: CONSTANTS.NOTE_THICKNESS,
            curveSegments: 4,
            bevelEnabled: false
        });
    }

    /**
     * Center text geometry by computing bounding box and translating
     * @param {THREE.TextGeometry} textGeometry - The geometry to center
     */
    function centerTextGeometry(textGeometry) {
        textGeometry.computeBoundingBox();
        const xOffset = -textGeometry.boundingBox.max.x / 2;
        const yOffset = -textGeometry.boundingBox.max.y / 2;
        textGeometry.translate(xOffset, yOffset, 0);
    }

    let threeJSRenderer = {
        /**
         * Initialize the Three.js renderer
         * @param {string} canvasId - The id of the canvas element to render to
         */
        init: function(canvasId) {
            // Initialize FontLoader
            fontLoader = new FontLoader();

            // Load the default font
            this.loadFont();

            // Create renderer
            const canvas = document.getElementById(canvasId);
            const container = canvas.parentElement;
            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight || (containerWidth * 0.75);
            renderer.setSize(containerWidth, containerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            // Create scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a2e);

            // Create camera with tilted view for 3D grid visibility
            // Camera positioned for "road effect" - looking down at notes from ~27 degree angle
            camera = new THREE.PerspectiveCamera(
                60, // Field of view
                containerWidth / containerHeight, // Aspect ratio
                0.1, // Near clipping plane
                1000 // Far clipping plane
            );

            // Initialize hover info service and display
            hoverInfoService.setConstants(CONSTANTS);
            hoverInfoDisplay = getHoverInfoDisplay();

            // Initialize camera controls first to get defaults (CameraControls is source of truth)
            const defaultCameraState = cameraControls.getDefaultCameraState();

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
            cameraControls.init(camera, scene, renderer, renderer.domElement, noteGroup, null, hoverInfoService, hoverInfoDisplay);
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
                        const errorMessage = 'Failed to load font from ' + fontUrl + ': ' + (error ? error.message : 'Unknown error');
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
            if (!validateNoteParams(letter, column, state)) {
                return null;
            }

            if (!loadedFont) {
                let errorMessage = 'Font not loaded. Call loadFont() first and wait for it to complete.';
                if (fontLoadError) {
                    errorMessage += ' Previous font load error: ' + fontLoadError.message;
                }
                console.error('ThreeJSRenderer.createNote: ' + errorMessage);
                return null;
            }

            delay = delay !== undefined ? delay : CONSTANTS.DEFAULT_DELAY;
            const pos = coordinateCalculator.calculateNotePosition(column, time, delay);

            const noteColor = threeJSRenderer.getColor(state);
            const noteMesh = new THREE.Group();
            noteMesh.add(createNoteBox(noteColor));
            noteMesh.add(createNoteTextMesh(letter));

            noteMesh.userData = createNoteUserData(
                letter, column, row, time, state, 
                pos.x, pos.y, pos.z, delay
            );
            noteMesh.position.set(pos.x, pos.y, pos.z);
            noteMesh.castShadow = true;

            return noteMesh;
        },

        /**
         * Update a note's Z position based on current game time for animation.
         * 
         * Notes move toward the camera along Z-axis as time progresses.
         * Updates both noteMesh.position.z and noteMesh.userData.zPos for consistency.
         * 
         * @param {THREE.Group} noteMesh - The note mesh group to update. Must have userData with time property.
         * @param {number} currentTime - Current time in song playback (seconds).
         * @param {number} [delay] - Optional delay offset. Defaults to userData.delay or 3 seconds if not set.
         * @returns {void} This method modifies noteMesh in place and returns nothing.
         */
        updateNotePosition: function(noteMesh, currentTime, delay) {
            if (!noteMesh || !noteMesh.userData) return;

            const noteTime = noteMesh.userData.time;
            delay = delay !== undefined ? delay : (noteMesh.userData.delay !== undefined ? noteMesh.userData.delay : CONSTANTS.DEFAULT_DELAY);
            const pos = coordinateCalculator.calculateDynamicPosition(noteTime, currentTime, delay);
            const zPos = pos.z;

            noteMesh.userData.zPos = zPos;
            noteMesh.position.z = zPos;
        },

        /**
         * Update all notes' Z positions based on current game time.
         * 
         * Iterates through all note meshes in the scene and updates their positions.
         * Called during animation loop to create falling notes effect.
         * 
         * @param {number} currentTime - Current time in song playback (seconds).
         * @param {number} [delay] - Optional delay offset. Defaults to 3 seconds if not set.
         * @returns {void} This method modifies all notes in place and returns nothing.
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
                const colorArray = noteColors[state] || noteColors.unplayed;
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
            const textGeometry = createTextGeometryConfig(letter);
            centerTextGeometry(textGeometry);
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
                    noteMesh.userData.state = state;

                    const newColor = threeJSRenderer.getColor(state);

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
                while (noteGroup.children.length > 0) {
                    const child = noteGroup.children.pop();
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            }
            noteCache = {};
        },

        /**
         * Add notes to the scene from a visible field
         * @param {Array} visibleField - Array of notes from VisibleFieldFilterer
         * @param {Object} keyRenderInfo - Keyboard layout from keyRenderInfo.js
         */
        addNotesFromVisibleField: function(visibleField, keyRenderInfo) {
            if (window.location.search === '?debug') {
                console.log('addNotesFromVisibleField called, noteGroup:', noteGroup, 'children:', noteGroup ? noteGroup.children.length : 0);
            }
            if (!noteGroup) return;

            this.clearNotes();
            this.buildNoteCache(keyRenderInfo);

            visibleField.forEach(function(note) {
                const keyInfo = keyRenderInfo[note.letter];
                if (keyInfo) {
                    const noteMesh = threeJSRenderer.createNote(
                        note.letter.toUpperCase(),
                        keyInfo.column,
                        keyInfo.row,
                        note.time,
                        note.state || 'unplayed',
                        CONSTANTS.DEFAULT_DELAY
                    );
                    if (noteMesh) {
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

            noteCache = {};

            noteCache = noteCacheBuilder.buildNoteCache(keyRenderInfo, function(key, keyInfo) {
                const letter = key.toUpperCase();

                const textGeometry = createTextGeometryConfig(letter);
                centerTextGeometry(textGeometry);

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
            const container = canvas.parentElement;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight || (containerWidth * 0.75);
            
            camera.aspect = containerWidth / containerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(containerWidth, containerHeight);
        },

        /**
         * Render the scene
         */
        render: function() {
            if (!renderer || !scene || !camera) return;

            // Update note rotation for billboarding effect when camera controls are active
            this.updateNoteRotation();

            // Update score rotation for world-space orientation (reserved for future billboarding)
            this.updateScoreRotation();

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

            if (!nowLine) {
                const boxGeometry = new THREE.BoxGeometry(14, 1, 0.2);

                const material = new THREE.MeshPhongMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.3,
                    depthWrite: false
                });

                nowLine = new THREE.Mesh(boxGeometry, material);
                nowLine.userData.type = 'nowLine';

                nowLine.position.y = 0;
                nowLine.position.z = coordinateCalculator.calculateNowLinePosition(zPos);
                scene.add(nowLine);

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

            const cameraPosition = camera.position;

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
                const state = cameraControls.getCameraState();
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
                const preset = cameraControls.getPreset(presetKey);
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
        },

        /**
          * Show final score display in 3D space when song ends
          * Creates a scoreboard with Total and breakdown lines (Good, OK, Bad, Missed)
          * Positioned at the now line depth (where notes end up after passing through)
          * @param {number} total - Total score value
          * @param {number} goodCount - Number of "good" hits
          * @param {number} okCount - Number of "ok" hits
          * @param {number} badCount - Number of "bad" hits
          * @param {number} missedCount - Number of missed notes
          * @param {number} zPos - Z position for scoreboard (delay value to convert to now line depth)
          * @param {function} onComplete - Optional callback when camera animation completes (for stopping game)
          */
        showFinalScore: function(total, goodCount, okCount, badCount, missedCount, zPos, onComplete) {
            if (!loadedFont || !scene) return;

            const scoreData = [
                { text: 'Total: ' + total, y: 5.0, size: 1.2, color: 0xffd700, emissive: 0xffa500 }
            ];

            scoreGroup = new THREE.Group();
            const nowLineZ = coordinateCalculator.calculateNowLinePosition(zPos);
            scoreGroup.position.set(0, 0, nowLineZ);

            const breakdown = [
                { text: 'Good: ' + goodCount, y: 4.0, size: 0.9, color: 0x00ff00 },
                { text: 'OK: ' + okCount, y: 3.0, size: 0.9, color: 0xffff00 },
                { text: 'Bad: ' + badCount, y: 2.0, size: 0.9, color: 0xff0000 },
                { text: 'Missed: ' + missedCount, y: 1.0, size: 0.9, color: 0x0080ff }
            ];

            scoreData.push(...breakdown);

            scoreData.forEach(function(item) {
                const textGeometry = new TextGeometry(item.text, {
                    font: loadedFont,
                    size: item.size,
                    depth: 0.5,
                    curveSegments: 6,
                    bevelEnabled: true,
                    bevelThickness: 0.05,
                    bevelSize: 0.03,
                    bevelOffset: 0,
                    bevelSegments: 3
                });

                textGeometry.computeBoundingBox();
                const xOffset = -textGeometry.boundingBox.max.x / 2;
                textGeometry.translate(xOffset, 0, 0);

                let material;
                if (item.emissive) {
                    material = new THREE.MeshStandardMaterial({
                        color: item.color,
                        emissive: item.emissive,
                        emissiveIntensity: 0.5
                    });
                } else {
                    material = new THREE.MeshPhongMaterial({ color: item.color });
                }

                const textMesh = new THREE.Mesh(textGeometry, material);
                textMesh.position.set(0, item.y, 0);
                scoreGroup.add(textMesh);
            });

            scene.add(scoreGroup);

            // Animate camera to a good viewing position for the scoreboard
            this.animateCameraToScoreboard(zPos, onComplete);
        },

        /**
          * Animate camera smoothly to a position that shows the scoreboard well
          * @param {number} zPos - Z position (delay value) to calculate scoreboard depth
          * @param {function} onComplete - Optional callback when animation completes
          */
        animateCameraToScoreboard: function(zPos, onComplete) {
            if (!camera || !scoreGroup) return;

            const nowLineZ = coordinateCalculator.calculateNowLinePosition(zPos);
            
            // Target camera position: higher and further back to see the full scoreboard
            const targetPosition = new THREE.Vector3(0, 8, nowLineZ + 12);
            const targetLookAt = new THREE.Vector3(0, 4, nowLineZ);

            const startPos = camera.position.clone();
            const startLookAt = new THREE.Vector3(
                camera.getWorldDirection(new THREE.Vector3()).add(camera.position).sub(camera.position),
                0, 
                nowLineZ - 5
            );

            // Get current lookAt by calculating direction from camera
            const dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            startLookAt.copy(camera.position).add(dir);

            const duration = 2000; // 2 seconds animation
            const startTime = Date.now();

            const animateCamera = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic for smooth deceleration
                const eased = 1 - Math.pow(1 - progress, 3);

                // Interpolate camera position
                camera.position.lerpVectors(startPos, targetPosition, eased);

                // Interpolate lookAt (clone startLookAt first to avoid modifying it, then lerp toward target)
                const currentLookAt = startLookAt.clone().lerp(targetLookAt, eased);
                camera.lookAt(currentLookAt);

                if (progress < 1) {
                    requestAnimationFrame(animateCamera);
                } else {
                    // Enable camera controls when animation completes
                    this.enableCameraControls();
                    
                    // Call completion callback if provided (for stopping the game)
                    if (typeof onComplete === 'function') {
                        onComplete();
                    }
                }
            };

            animateCamera();
        },

        /**
          * Hide and dispose the final score display
          */
        hideFinalScore: function() {
            if (!scoreGroup) return;

            while (scoreGroup.children.length > 0) {
                const child = scoreGroup.children.pop();
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }

            scene.remove(scoreGroup);
            scoreGroup = null;
        },

        /**
          * Update score rotation (reserved for future billboarding)
          * Currently keeps scoreboard fixed in world space (no billboarding)
          */
        updateScoreRotation: function() {
            if (!scoreGroup || !camera) return;
        }
    };

    return threeJSRenderer;
}

export default createThreeJSRenderer;
