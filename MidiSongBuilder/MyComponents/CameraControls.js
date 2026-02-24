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
    var cameraPosition = null;
    var lookAt = null;

    // Event listener storage for cleanup (Issue #2)
    var eventListeners = [];

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
            cameraPosition = { x: roadViewPreset.position.x, y: roadViewPreset.position.y, z: roadViewPreset.position.z };
            lookAt = { x: roadViewPreset.lookAt.x, y: roadViewPreset.lookAt.y, z: roadViewPreset.lookAt.z };
            cameraControls.applyCameraTransform();
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

                    // Update rotation based on mouse movement
                    cameraRotation.yaw -= deltaMove.x * lookSensitivity;
                    cameraRotation.pitch -= deltaMove.y * lookSensitivity;

                    // Clamp pitch to avoid flipping (limit to roughly -90 to +90 degrees)
                    cameraRotation.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cameraRotation.pitch));

                    previousMousePosition = { x: e.offsetX, y: e.offsetY };

                    cameraControls.applyCameraTransform();
                } else if (hoverInfoEnabled && hoverInfoService && hoverInfoDisplay) {
                    cameraControls.updateHoverInfo(e, canvasElement);
                }
            }.bind(this));

            // WASD key handlers
            addListener(document, 'keydown', function(e) {
                keys[e.code] = true;
                cameraControls.updateCameraMovement();
            }.bind(this));

            addListener(document, 'keyup', function(e) {
                keys[e.code] = false;
                cameraControls.updateCameraMovement();
            }.bind(this));
        },

        /**
         * Update camera position based on WASD keys
         */
        updateCameraMovement: function() {
            if (!camera) return;

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

            cameraControls.applyCameraTransform();
        },

        /**
         * Apply camera rotation and position to the camera
         */
        applyCameraTransform: function() {
            if (!camera) return;

            // Calculate lookAt point based on rotation
            var forward = new THREE.Vector3(0, 0, -1);
            forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
            forward.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraRotation.pitch);

            lookAt.x = cameraPosition.x + forward.x;
            lookAt.y = cameraPosition.y + forward.y;
            lookAt.z = cameraPosition.z + forward.z;

            // Update camera position and lookAt
            camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
            camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
        },

        /**
         * Enable camera controls
         */
        enable: function() {
            if (canvasElement) {
                canvasElement.style.cursor = 'grab';
            }
        },

        /**
         * Disable camera controls
         */
        disable: function() {
            isDragging = false;
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

            cameraPosition.x = position.x;
            cameraPosition.y = position.y;
            cameraPosition.z = position.z;

            // Calculate rotation from lookAt
            var direction = new THREE.Vector3(
                lookAtPos.x - cameraPosition.x,
                lookAtPos.y - cameraPosition.y,
                lookAtPos.z - cameraPosition.z
            ).normalize();

            // Calculate yaw (rotation around Y axis)
            cameraRotation.yaw = Math.atan2(direction.x, direction.z);

            // Calculate pitch (rotation around X axis)
            cameraRotation.pitch = Math.asin(direction.y);

            // Update lookAt directly (will be recalculated by applyCameraTransform)
            lookAt.x = lookAtPos.x;
            lookAt.y = lookAtPos.y;
            lookAt.z = lookAtPos.z;

            cameraControls.applyCameraTransform();
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
            cameraControls.applyCameraTransform();
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

            // Validate input
            if (!position) {
                console.error('CameraControls.setCameraPosition: position object required');
                return;
            }
            if (typeof position.x !== 'number') {
                console.error('CameraControls.setCameraPosition: position.x must be a number');
                return;
            }
            if (typeof position.y !== 'number') {
                console.error('CameraControls.setCameraPosition: position.y must be a number');
                return;
            }
            if (typeof position.z !== 'number') {
                console.error('CameraControls.setCameraPosition: position.z must be a number');
                return;
            }

            cameraPosition.x = position.x;
            cameraPosition.y = position.y;
            cameraPosition.z = position.z;
            cameraControls.applyCameraTransform();
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
