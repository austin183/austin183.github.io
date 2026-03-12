/**
 * CameraControls - Provides free camera movement and rotation controls
 * - Mouse movement controls camera rotation (pitch/yaw)
 * - WASD keys control camera position
 * - Only active when game is stopped
 */
function getCameraControls(default_camera_state) {
    var camera = null;
    var scene = null;
    var renderer = null;

    // Camera movement state
    var isDragging = false;
    var previousMousePosition = { x: 0, y: 0 };
    var cameraRotation = { pitch: 0, yaw: 0 };
    var cameraPosition = { x: 0, y: 0, z: 0 };
    var lookAt = { x: 0, y: 0, z: 0 };
    var previousCameraPosition = { x: 0, y: 0, z: 0 };  // Track previous position for WASD movement

    // Event listener storage for cleanup (Issue #2)
    var eventListeners = [];

    // Camera controls enabled state
    var isCameraControlsEnabled = false;

    // Movement speed
    var moveSpeed = 0.2;
    var lookSensitivity = 0.005;

    // Input state
    var keys = {};

    // Element to bind events to
    var canvasElement = null;

    // Helper function to add event listeners (Issue #2 - cleanup tracking)
    function addListener(element, event, handler) {
        element.addEventListener(event, handler);
        eventListeners.push({ element, event, handler });
    }

    // Helper function to remove all registered listeners (Issue #2 - cleanup)
    function removeListeners() {
        eventListeners.forEach(function(listener) {
            listener.element.removeEventListener(listener.event, listener.handler);
        });
        eventListeners = [];
    }

    // Hover info components
    var hoverInfoEnabled = false;
    var hoverInfoService = null;
    var hoverInfoDisplay = null;

    // Objects for raycasting (notes and now line)
    var noteGroup = null;
    var nowLine = null;

    // THREE dependency - injected on init
    var THREE = null;

    var cameraControls = {
        /**
         * Initialize camera controls
         * @param {THREE.Camera} cam - The camera to control
         * @param {THREE.Scene} sceneObj - The scene (for raycasting if needed)
         * @param {THREE.WebGLRenderer} rend - The renderer
         * @param {HTMLElement} canvas - The canvas element for event binding
         * @param {THREE.Group} noteGroupObj - The group containing note meshes
         * @param {THREE.Mesh} nowLineObj - The now line mesh
         * @param {Object} hoverService - The HoverInfoService instance
         * @param {Object} hoverDisplay - The HoverInfoDisplay instance
         * @param {Object} THREEParam - The THREE object (optional, defaults to window.THREE)
         */
        init: function(cam, sceneObj, rend, canvas, noteGroupObj, nowLineObj, hoverService, hoverDisplay, THREEParam) {
            // Inject THREE dependency (allow fallback to global for backwards compatibility)
            THREE = THREEParam || window.THREE;
            // Validate required parameters
            if (!cam) {
                console.error('CameraControls.init: camera is required');
                return;
            }
            if (!canvas) {
                console.error('CameraControls.init: canvas element is required');
                return;
            }
            if (!noteGroupObj) {
                console.error('CameraControls.init: noteGroup is required for raycasting');
                return;
            }

            camera = cam;
            scene = sceneObj;
            renderer = rend;
            canvasElement = canvas;
            noteGroup = noteGroupObj;
            nowLine = nowLineObj;
            hoverInfoService = hoverService;
            hoverInfoDisplay = hoverDisplay;

            cameraControls.setupInputHandlers();
            // Initialize camera from roadView preset (the single source of truth for defaults)
            var roadViewPreset = getCameraPresets().roadView;
            cameraControls.applyDirectTransform(roadViewPreset.position, roadViewPreset.lookAt);
        },

        /**
         * Get the roadView preset (single source of truth for default camera values)
         * @returns {Object} - Default camera preset with position and lookAt
         */
        getDefaultCameraState: function() {
            var roadView = getCameraPresets().roadView;
            return {
                position: { x: roadView.position.x, y: roadView.position.y, z: roadView.position.z },
                lookAt: { x: roadView.lookAt.x, y: roadView.lookAt.y, z: roadView.lookAt.z }
            };
        },

        /**
         * Get the roadView preset formatted for UI display (rounded values)
         * @returns {Object} - Default camera preset with rounded position and lookAt
         */
        getDefaultCameraStateForUI: function() {
            var defaults = this.getDefaultCameraState();
            return {
                position: {
                    x: defaults.position.x.toFixed(2),
                    y: defaults.position.y.toFixed(2),
                    z: defaults.position.z.toFixed(2)
                },
                lookAt: {
                    x: defaults.lookAt.x.toFixed(2),
                    y: defaults.lookAt.y.toFixed(2),
                    z: defaults.lookAt.z.toFixed(2)
                }
            };
        },

        /**
         * Set up input event handlers
         */
        setupInputHandlers: function() {
            // Mouse down - start dragging
            addListener(canvasElement, 'mousedown', function(e) {
                console.log('CameraControls mousedown: offsetX=' + e.offsetX + ', offsetY=' + e.offsetY);
                isDragging = true;
                previousMousePosition = { x: e.offsetX, y: e.offsetY };
            });

            // Mouse up - stop dragging
            addListener(window, 'mouseup', function() {
                isDragging = false;
            });

            // Mouse move - rotate camera or update hover info
            addListener(canvasElement, 'mousemove', function(e) {
                if (isDragging) {
                    var deltaMove = {
                        x: e.offsetX - previousMousePosition.x,
                        y: e.offsetY - previousMousePosition.y
                    };

                    console.log('CameraControls mousemove: deltaMove=('+deltaMove.x+','+deltaMove.y+'), rotation=(yaw:'+cameraRotation.yaw.toFixed(4)+', pitch:'+cameraRotation.pitch.toFixed(4)+')');

                    // Update rotation based on mouse movement
                    cameraRotation.yaw -= deltaMove.x * lookSensitivity;
                    cameraRotation.pitch -= deltaMove.y * lookSensitivity;

                    // Clamp pitch to avoid flipping (limit to roughly -90 to +90 degrees)
                    cameraRotation.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cameraRotation.pitch));

                    previousMousePosition = { x: e.offsetX, y: e.offsetY };

                    cameraControls.updateFromRotation();
                } else if (hoverInfoEnabled && hoverInfoService && hoverInfoDisplay) {
                    cameraControls.updateHoverInfo(e, canvasElement);
                }
            }.bind(this));

            // WASD key handlers
            addListener(document, 'keydown', function(e) {
                if (isCameraControlsEnabled) {
                    keys[e.code] = true;
                    cameraControls.updateCameraMovement();
                }
            }.bind(this));

            addListener(document, 'keyup', function(e) {
                if (isCameraControlsEnabled) {
                    keys[e.code] = false;
                    cameraControls.updateCameraMovement();
                }
            }.bind(this));
        },

        /**
         * Update camera position based on WASD keys
         * Note: Camera position changes in XZ plane, lookAt follows to maintain relative direction
         */
        updateCameraMovement: function() {
            if (!camera) return;

            // Get the current direction the camera is facing (horizontal component only)
            // We use a unit vector in Z direction and rotate by yaw only (ignore pitch for movement)
            var forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
            var right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);

            if (keys['KeyW']) {
                cameraPosition.x += forward.x * moveSpeed;
                cameraPosition.z += forward.z * moveSpeed;
            }
            if (keys['KeyS']) {
                cameraPosition.x -= forward.x * moveSpeed;
                cameraPosition.z -= forward.z * moveSpeed;
            }
            if (keys['KeyA']) {
                cameraPosition.x -= right.x * moveSpeed;
                cameraPosition.z -= right.z * moveSpeed;
            }
            if (keys['KeyD']) {
                cameraPosition.x += right.x * moveSpeed;
                cameraPosition.z += right.z * moveSpeed;
            }
            if (keys['ArrowUp']) {
                cameraPosition.y += moveSpeed;
            }
            if (keys['ArrowDown']) {
                cameraPosition.y -= moveSpeed;
            }

            // Update lookAt to follow camera position while maintaining the same relative offset
            // This ensures the camera direction doesn't change when moving
            lookAt.x += cameraPosition.x - previousCameraPosition.x;
            lookAt.y += cameraPosition.y - previousCameraPosition.y;
            lookAt.z += cameraPosition.z - previousCameraPosition.z;

            // Update camera
            camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
            camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

            // Store current position for next movement calculation
            previousCameraPosition.x = cameraPosition.x;
            previousCameraPosition.y = cameraPosition.y;
            previousCameraPosition.z = cameraPosition.z;
        },

        /**
         * Apply camera rotation and position to the camera (calculates lookAt from rotation)
         * Used for WASD/mouse drag camera rotation
         */
        updateFromRotation: function() {
            if (!camera) return;

            // Note: Don't recalculate lookAt from rotation here!
            // The lookAt value is set directly in applyDirectTransform and preserved.
            // Recalculating from rotation causes errors (especially when yaw=π).
            // Calculate lookAt point based on rotation
            var forward = new THREE.Vector3(0, 0, 1);
            forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
            forward.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraRotation.pitch);
            lookAt.x = cameraPosition.x + forward.x;
            lookAt.y = cameraPosition.y + forward.y;
            lookAt.z = cameraPosition.z + forward.z;
            console.log('CameraControls.updateFromRotation: new lookAt=('+lookAt.x+','+lookAt.y+','+lookAt.z+') from forward=(' + forward.x.toFixed(4) + ',' + forward.y.toFixed(4) + ',' + forward.z.toFixed(4) + ')');

            // Update camera position and lookAt
            camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
            camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
        },

        /**
         * Apply camera transform directly from position/lookAt (no rotation calculation)
         * Used for preset application - sets lookAt directly without recalculation
         * @param {Object} position - New camera position {x, y, z}
         * @param {Object} lookAtPos - New lookAt position {x, y, z}
         */
        applyDirectTransform: function(position, lookAtPos) {
            if (!camera) return;

            cameraPosition.x = position.x;
            cameraPosition.y = position.y;
            cameraPosition.z = position.z;

            lookAt.x = lookAtPos.x;
            lookAt.y = lookAtPos.y;
            lookAt.z = lookAtPos.z;

            camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
            camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

            // Initialize previousCameraPosition to prevent large jumps on first WASD movement
            previousCameraPosition.x = position.x;
            previousCameraPosition.y = position.y;
            previousCameraPosition.z = position.z;

            // Reset rotation to match the direct transform
            // Calculate the direction vector from camera to lookAt
            var dx = lookAt.x - cameraPosition.x;
            var dy = lookAt.y - cameraPosition.y;
            var dz = lookAt.z - cameraPosition.z;

            // Calculate yaw: angle around Y axis (rotation in XZ plane)
            // Standard: 0 = -Z (forward), yaw increases clockwise when viewed from above
            cameraRotation.yaw = Math.atan2(dx, dz);

            // Calculate pitch: angle up/down from the horizontal plane
            // Positive pitch = looking up, negative = looking down
            var horizontalDist = Math.sqrt(dx * dx + dz * dz);
            cameraRotation.pitch = Math.atan2(dy, horizontalDist);
        },

        /**
         * Enable camera controls
         */
        enable: function() {
            isCameraControlsEnabled = true;
            if (canvasElement) {
                canvasElement.style.cursor = 'grab';
            }
        },

        /**
         * Disable camera controls
         */
        disable: function() {
            isCameraControlsEnabled = false;
            isDragging = false;
            // Clear all pressed keys so WASD doesn't affect camera during gameplay
            keys = {};
            // Reset previousCameraPosition to prevent jumps when re-enabling
            previousCameraPosition.x = cameraPosition.x;
            previousCameraPosition.y = cameraPosition.y;
            previousCameraPosition.z = cameraPosition.z;
            if (canvasElement) {
                canvasElement.style.cursor = 'default';
            }
        },

        /**
         * Reset camera to roadView preset
         */
        reset: function() {
            this.applyPreset('roadView');
        },

        // Preset camera configurations (reference CameraPresets for values)
        presets: {
            topDown: getCameraPresets().topDown,
            roadView: getCameraPresets().roadView,
            isometric: getCameraPresets().isometric,
            playerView: getCameraPresets().playerView
        },

        /**
         * Get list of available preset names
         * @returns {Array} - Array of preset keys
         */
        getPresetList: function() {
            return Object.keys(this.presets);
        },

        /**
         * Get preset details
         * @param {string} presetKey - The preset key (e.g., 'topDown')
         * @returns {Object|null} - Preset configuration or null if not found
         */
        getPreset: function(presetKey) {
            return this.presets[presetKey] || null;
        },

        /**
         * Apply a camera preset by name
         * @param {string} presetKey - The preset key to apply
         */
        applyPreset: function(presetKey) {
            var preset = this.getPreset(presetKey);
            if (!preset) {
                console.warn('CameraControls.applyPreset: Unknown preset "' + presetKey + '"');
                return;
            }
            this.setCameraState(preset.position, preset.lookAt);
        },

        /**
         * Get current camera position and lookAt
         * @returns {Object} Camera position and lookAt coordinates
         */
        getCameraState: function() {
            return {
                position: {
                    x: cameraPosition.x,
                    y: cameraPosition.y,
                    z: cameraPosition.z
                },
                lookAt: {
                    x: lookAt.x,
                    y: lookAt.y,
                    z: lookAt.z
                }
            };
        },

        /**
         * Set camera position from external values
         * @param {Object} position - New camera position {x, y, z}
         * @param {Object} lookAtPos - New lookAt position {x, y, z}
         */
        setCameraState: function(position, lookAtPos) {
            if (!camera) {
                console.error('CameraControls.setCameraState: camera not initialized');
                return;
            }

            // Validate input
            if (!position || typeof position.x !== 'number') {
                console.error('CameraControls.setCameraState: position.x must be a number');
                return;
            }
            if (!position || typeof position.y !== 'number') {
                console.error('CameraControls.setCameraState: position.y must be a number');
                return;
            }
            if (!position || typeof position.z !== 'number') {
                console.error('CameraControls.setCameraState: position.z must be a number');
                return;
            }

            // Apply transform directly using the provided lookAt (no rotation calculation)
            this.applyDirectTransform(position, lookAtPos);
        },

        /**
         * Update camera rotation from externally provided values
         * @param {Object} rotation - New rotation {pitch, yaw}
         */
        setCameraRotation: function(rotation) {
            if (!camera) {
                console.error('CameraControls.setCameraRotation: camera not initialized');
                return;
            }

            // Validate input
            if (rotation && rotation.pitch !== undefined && typeof rotation.pitch !== 'number') {
                console.error('CameraControls.setCameraRotation: rotation.pitch must be a number');
                return;
            }
            if (rotation && rotation.yaw !== undefined && typeof rotation.yaw !== 'number') {
                console.error('CameraControls.setCameraRotation: rotation.yaw must be a number');
                return;
            }

            cameraRotation.pitch = rotation ? (rotation.pitch || 0) : 0;
            cameraRotation.yaw = rotation ? (rotation.yaw || 0) : 0;
            cameraControls.updateFromRotation();
        },

        /**
         * Update camera position from externally provided values
         * @param {Object} position - New position {x, y, z}
         */
        setCameraPosition: function(position) {
            if (!camera) {
                console.error('CameraControls.setCameraPosition: camera not initialized');
                return;
            }

            // Calculate the delta from previous position
            var dx = position.x - previousCameraPosition.x;
            var dy = position.y - previousCameraPosition.y;
            var dz = position.z - previousCameraPosition.z;

            cameraPosition.x = position.x;
            cameraPosition.y = position.y;
            cameraPosition.z = position.z;

            // Update lookAt to follow camera position, maintaining relative offset
            lookAt.x += dx;
            lookAt.y += dy;
            lookAt.z += dz;

            // Update camera
            camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
            camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

            // Store current position for next movement calculation
            previousCameraPosition.x = position.x;
            previousCameraPosition.y = position.y;
            previousCameraPosition.z = position.z;
        },

        /**
         * Enable hover info display
         */
        enableHoverInfo: function() {
            hoverInfoEnabled = true;
            if (canvasElement) {
                canvasElement.style.cursor = 'crosshair';
            }
        },

        /**
         * Disable hover info display
         */
        disableHoverInfo: function() {
            hoverInfoEnabled = false;
            if (canvasElement) {
                canvasElement.style.cursor = isDragging ? 'grabbing' : 'grab';
            }
            // Hide hover info when disabled
            if (hoverInfoDisplay) {
                hoverInfoDisplay.hide();
            }
        },

        /**
         * Check if hover info is enabled
         */
        isHoverInfoEnabled: function() {
            return hoverInfoEnabled;
        },

        /**
         * Set the now line reference for raycasting
         */
        setNowLineReference: function(nowLineObj) {
            nowLine = nowLineObj;
        },

        /**
         * Set the hover info service and display for updates
         * @param {Object} service - The HoverInfoService instance
         * @param {Object} display - The HoverInfoDisplay instance
         */
        setHoverInfoComponents: function(service, display) {
            hoverInfoService = service;
            hoverInfoDisplay = display;
        },

        /**
         * Set constants for the hover info service
         * @param {Object} constants - The CONSTANTS from CoordinateCalculator
         */
        setHoverInfoConstants: function(constants) {
            if (hoverInfoService) {
                hoverInfoService.setConstants(constants);
            }
        },

        /**
         * Update hover info based on mouse position
         * @param {MouseEvent} mouseEvent - The mouse move event
         * @param {HTMLElement} canvas - The canvas element
         */
        updateHoverInfo: function(mouseEvent, canvas) {
            if (!scene || !camera || !hoverInfoEnabled || !hoverInfoService) return;

            // Use HoverInfoService to get hover info
            var hoverData = hoverInfoService.getHoverInfo(mouseEvent, canvas, camera, noteGroup, nowLine);

            // Update display with the hover data
            if (hoverInfoDisplay) {
                hoverInfoDisplay.update(hoverData);
            }
        },

        /**
         * Dispose of camera controls and clean up resources (Issue #2)
         * Removes all event listeners and clears references
         */
        dispose: function() {
            // Remove all registered event listeners
            removeListeners();

            // Clear other references
            camera = null;
            scene = null;
            renderer = null;
            canvasElement = null;
            noteGroup = null;
            nowLine = null;
            hoverInfoService = null;
            hoverInfoDisplay = null;
            THREE = null;
        }
    };

    return cameraControls;
}
