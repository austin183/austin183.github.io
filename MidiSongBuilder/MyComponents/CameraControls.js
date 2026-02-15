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
    var cameraPosition = { x: 0, y: 10, z: 15 };
    var lookAt = { x: 0, y: 0, z: 0 };

    if(default_camera_state.position){
        cameraPosition = default_camera_state.position;
    }
    if(default_camera_state.lookAt){
        lookAt = default_camera_state.lookAt;
    }

    // Movement speed
    var moveSpeed = 0.2;
    var lookSensitivity = 0.005;

    // Input state
    var keys = {};

    // Element to bind events to
    var canvasElement = null;

    var cameraControls = {
        /**
         * Initialize camera controls
         * @param {THREE.Camera} cam - The camera to control
         * @param {THREE.Scene} sceneObj - The scene (for raycasting if needed)
         * @param {THREE.WebGLRenderer} rend - The renderer
         * @param {HTMLElement} canvas - The canvas element for event binding
         */
        init: function(cam, sceneObj, rend, canvas) {
            camera = cam;
            scene = sceneObj;
            renderer = rend;
            canvasElement = canvas;

            cameraControls.setupInputHandlers();
            cameraControls.applyCameraTransform();
        },

        /**
         * Set up input event handlers
         */
        setupInputHandlers: function() {
            // Mouse down - start dragging
            canvasElement.addEventListener('mousedown', function(e) {
                isDragging = true;
                previousMousePosition = { x: e.offsetX, y: e.offsetY };
            });

            // Mouse up - stop dragging
            window.addEventListener('mouseup', function() {
                isDragging = false;
            });

            // Mouse move - rotate camera
            canvasElement.addEventListener('mousemove', function(e) {
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
                }
            }.bind(this));

            // WASD key handlers
            document.addEventListener('keydown', function(e) {
                keys[e.code] = true;
                cameraControls.updateCameraMovement();
            }.bind(this));

            document.addEventListener('keyup', function(e) {
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
         * Reset camera to default position
         */
        reset: function() {
            cameraRotation = { pitch: 0, yaw: 0 };
            cameraPosition = { x: 0, y: 10, z: 15 };
            lookAt = { x: 0, y: 0, z: 0 };
            cameraControls.applyCameraTransform();
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
            if (!camera) return;

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

            cameraControls.applyCameraTransform();
        },

        /**
         * Update camera rotation from externally provided values
         * @param {Object} rotation - New rotation {pitch, yaw}
         */
        setCameraRotation: function(rotation) {
            cameraRotation.pitch = rotation.pitch || 0;
            cameraRotation.yaw = rotation.yaw || 0;
            cameraControls.applyCameraTransform();
        },

        /**
         * Update camera position from externally provided values
         * @param {Object} position - New position {x, y, z}
         */
        setCameraPosition: function(position) {
            cameraPosition.x = position.x || 0;
            cameraPosition.y = position.y || 10;
            cameraPosition.z = position.z || 15;
            cameraControls.applyCameraTransform();
        }
    };

    return cameraControls;
}
