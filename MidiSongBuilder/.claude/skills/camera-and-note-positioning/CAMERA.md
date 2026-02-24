# Camera Setup for Three.js

## Quick Reference

| Camera Type | Use Case | Controls |
|-------------|----------|----------|
| PerspectiveCamera | Standard 3D view with depth | FlyControls, OrbitControls |
| OrthographicCamera | Isometric/side view | OrbitControls |

## PerspectiveCamera Setup

```javascript
import * as THREE from 'three';

// Create camera
const camera = new THREE.PerspectiveCamera(
  75,                                 // Field of View (FOV)
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1,                                // Near plane (closest visible)
  1000                                // Far plane (farthest visible)
);

// Position the camera
camera.position.set(x, y, z);

// Point camera at a target
camera.lookAt(targetX, targetY, targetZ);

// Update projection matrix if aspect ratio changes
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
```

## Camera Controls

### FlyControls (Free Movement)

Use FlyControls for first-person style camera movement with WASD keys:

```javascript
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';

const controls = new FlyControls(camera, renderer.domElement);
controls.movementSpeed = 100;    // Speed of translation
controls.rollSpeed = Math.PI / 24; // Speed of rotation
controls.autoForward = false;
controls.dragToLook = true;

// IMPORTANT: Update controls each frame
function animate() {
  requestAnimationFrame(animate);
  controls.update(0.01); // delta time in seconds
  renderer.render(scene, camera);
}
```

### OrbitControls (Look Around)

Use OrbitControls to let users rotate around a target point:

```javascript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth motion
controls.dampingFactor = 0.05;

// Set camera position and look at target
camera.position.set(0, 10, 15);
controls.target.set(0, 0, 0);
```

## Getting Camera Vectors

Useful for debugging or calculating relative positions:

```javascript
// Get camera position
const position = camera.position;
console.log(position.x, position.y, position.z);

// Get the direction camera is facing
const direction = new THREE.Vector3();
camera.getWorldDirection(direction);
console.log(direction.x, direction.y, direction.z);

// Calculate lookAt point from position + direction
const lookAt = new THREE.Vector3()
  .copy(camera.position)
  .add(direction);
```

## Common Camera Positions for Games

```javascript
// Top-down view (overhead)
camera.position.set(0, 20, 0);
camera.lookAt(0, 0, 0);

// Third-person behind
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// First-person (eye level)
camera.position.set(0, 5, 0);
camera.lookAt(0, 0, -10);

// Isometric angle
camera.position.set(10, 10, 10);
camera.lookAt(0, 0, 0);
```

## Camera Presets for Midiestro3D

Based on the Midiestro3D implementation, configure these camera presets:

```javascript
const cameraPresets = {
  'front-view': {
    position: { x: 0, y: 10, z: 20 },
    lookAt: { x: 0, y: 0, z: 0 }
  },
  'side-view': {
    position: { x: 20, y: 10, z: 0 },
    lookAt: { x: 0, y: 0, z: 0 }
  },
  'overhead': {
    position: { x: 0, y: 30, z: 0 },
    lookAt: { x: 0, y: 0, z: 0 }
  },
  'diagonal': {
    position: { x: 15, y: 15, z: 15 },
    lookAt: { x: 0, y: 0, z: 0 }
  }
};
```

## Troubleshooting

**Problem**: Camera doesn't move when keys are pressed.

**Solution**:
1. Verify `controls.update(delta)` is called in the animation loop
2. Ensure `controls.movementSpeed` is non-zero
3. Check that `renderer.domElement` is correctly passed to controls

**Problem**: Scene appears black or camera is inside objects.

**Solution**:
1. Verify camera `position` is not inside geometry
2. Ensure `camera.lookAt()` points to valid coordinates
3. Check near/far planes: objects outside this range won't render

**Problem**: Camera orientation is unexpected.

**Solution**:
1. Use `camera.getWorldDirection()` to verify facing direction
2. Check if controls need `controls.update()` each frame
3. Verify coordinate system: Y is up in Three.js

## Tips

- Use `controls.enableDamping = true` for smoother camera motion
- Call `controls.update()` with consistent delta time (e.g., `0.01`) for predictable movement
- For games, keep the camera outside the main gameplay area to avoid clipping
- Use `camera.far` to control how far objects are visible; set based on your scene size
