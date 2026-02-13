function getThreeJSRenderer() {
    var renderer = null;
    var scene = null;
    var camera = null;
    var cube = null;
    var gridHelper = null;
    var animationId = null;

    var threeJSRenderer = {
        /**
         * Initialize the Three.js renderer
         * @param {string} canvasId - The id of the canvas element to render to
         */
        init: function(canvasId) {
            // Support both window.THREE (standard) and window.__THREE__ (three.core.min.js)
            var THREE = window.THREE || window.__THREE__;
            if (!THREE) {
                console.error('Three.js is not loaded. Please ensure three.core.min.js is loaded before initializing ThreeJSRenderer.');
                return;
            }

            // Create renderer
            renderer = new THREE.WebGLRenderer({ canvas: document.getElementById(canvasId), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            // Create scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a2e);

            // Create camera
            camera = new THREE.PerspectiveCamera(
                75, // Field of view
                window.innerWidth / window.innerHeight, // Aspect ratio
                0.1, // Near clipping plane
                1000 // Far clipping plane
            );
            camera.position.z = 5;

            // Create a simple cube
            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshPhongMaterial({ color: 0x4a90e2, flatShading: true });
            cube = new THREE.Mesh(geometry, material);
            scene.add(cube);

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7);
            scene.add(directionalLight);

            // Add grid helper
            gridHelper = new THREE.GridHelper(10, 10);
            scene.add(gridHelper);
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

            // Rotate the cube
            if (cube) {
                cube.rotation.x += 0.01;
                cube.rotation.y += 0.01;
            }

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

            if (renderer) {
                renderer.dispose();
                renderer = null;
            }

            if (cube) {
                cube.geometry.dispose();
                cube.material.dispose();
                cube = null;
            }

            if (gridHelper) {
                gridHelper.geometry.dispose();
                gridHelper.material.dispose();
                gridHelper = null;
            }

            scene = null;
            camera = null;
        }
    };

    return threeJSRenderer;
}
