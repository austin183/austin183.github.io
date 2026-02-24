# Midiestro3D Integration Guide

## Overview

This guide covers integrating camera and note positioning specifically for Midiestro3D.html. It assumes you're working with the existing Three.js renderer and Vue.js component structure.

## Current Architecture

### ThreeJSRenderer Component

The `ThreeJSRenderer` manages:
- Three.js scene, camera, and renderer
- Note meshes and their positions
- Camera controls (FlyControls/OrbitControls)
- Animation loop

### Key Files

| File | Purpose |
|------ |------- |
| `ThreeJSRenderer.js` | Main renderer class |
| `CameraControls.js` | Camera control logic |
| `CoordinateCalculator.js` | Coordinate mapping utilities |
| `Midiestro3D.html` | HTML page with canvas elements |

## Note Positioning in ThreeJSRenderer

### Current Implementation Pattern

```javascript
// From ThreeJSRenderer.js
class ThreeJSRenderer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasElement });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addNotesFromVisibleField(visibleField, keyRenderInfo) {
    visibleField.forEach(noteData => {
      const note = this.createNoteMesh(noteData.letter);
      const position = this.calculateNotePosition(noteData, keyRenderInfo);
      note.position.copy(position);
      this.scene.add(note);
    });
  }

  calculateNotePosition(noteData, keyRenderInfo) {
    // Calculate X from key column
    const keyIndex = keyRenderInfo.getKeyIndex(noteData.letter);
    const x = keyIndex * keyRenderInfo.keyWidth - keyRenderInfo.offsetX;

    // Calculate Y from time position
    const y = this.calculateYPosition(noteData.time, noteData.duration);

    // Z is typically 0 for main note layer
    const z = 0;

    return new THREE.Vector3(x, y, z);
  }
}
```

## Camera Control Integration

### Camera Presets

```javascript
// From Midiestro3D.html
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
  }
};

// Apply preset
function applyCameraPreset(presetKey) {
  const preset = cameraPresets[presetKey];
  camera.position.set(
    preset.position.x,
    preset.position.y,
    preset.position.z
  );
  camera.lookAt(
    preset.lookAt.x,
    preset.lookAt.y,
    preset.lookAt.z
  );
}
```

### Camera Update Loop

```javascript
// In animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update camera controls
  if (controls) {
    controls.update(0.01); // delta time
  }

  // Update note positions
  updateNotePositions();

  // Render
  renderer.render(scene, camera);
}
```

## Coordinate Calculation

### Key-to-X Mapping

```javascript
// From CoordinateCalculator.js
class CoordinateCalculator {
  constructor(keyRenderInfo) {
    this.keyWidth = keyRenderInfo.keyWidth;
    this.offsetX = keyRenderInfo.offsetX;
    this.baseY = keyRenderInfo.baseY;
  }

  // Convert keyboard key to X coordinate
  keyToX(key) {
    const keyIndex = this.keyRenderInfo.getKeyIndex(key);
    return keyIndex * this.keyWidth - this.offsetX;
  }

  // Convert time to Y coordinate (falling notes)
  timeToY(time, totalTime, viewHeight = 20) {
    const progress = time / totalTime;
    return viewHeight * (1 - progress);
  }

  // Calculate full 3D position
  calculatePosition(key, time, totalTime) {
    return new THREE.Vector3(
      this.keyToX(key),
      this.timeToY(time, totalTime),
      0
    );
  }
}
```

## Note Position Updates During Gameplay

### Animation Frame Updates

```javascript
// Update notes each frame based on elapsed time
function updateNotePositions(gameTime, startTime, noteSpeed) {
  notes.forEach(note => {
    const noteTime = note.userData.time;
    const timeDifference = gameTime - noteTime - startTime;

    if (timeDifference >= 0) {
      // Calculate how far the note should have fallen
      const distanceFallen = timeDifference * noteSpeed;

      // Update Y position (falling from top)
      note.position.y = Math.max(0, startNoteY - distanceFallen);
    }
  });
}

// Get the "hit zone" Y position
function getHitZoneY() {
  return hitZoneY; // Typically around 2-3 units from bottom
}
```

## Camera Position Display

### Update UI from Camera State

```javascript
// From Midiestro3D.html
function updateCameraDisplay() {
  const position = camera.position;
  const lookAt = getCameraLookAt();

  // Update UI inputs
  document.getElementById('cameraPosX').value = position.x.toFixed(2);
  document.getElementById('cameraPosY').value = position.y.toFixed(2);
  document.getElementById('cameraPosZ').value = position.z.toFixed(2);

  document.getElementById('cameraLookAtX').value = lookAt.x.toFixed(2);
  document.getElementById('cameraLookAtY').value = lookAt.y.toFixed(2);
  document.getElementById('cameraLookAtZ').value = lookAt.z.toFixed(2);
}

function getCameraLookAt() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return new THREE.Vector3()
    .copy(camera.position)
    .add(direction);
}
```

## Integration Checklist

When integrating new note or camera positioning:

- [ ] Verify coordinate system matches existing renderer
- [ ] Test camera controls with new note positions
- [ ] Ensure notes are within camera's near/far planes
- [ ] Check that key-to-X mapping is consistent
- [ ] Verify note falling speed matches expected timing
- [ ] Test camera preset transitions
- [ ] Confirm UI displays accurate camera state

## Troubleshooting

**Problem**: Notes appear outside camera view.

**Solution**:
1. Adjust camera Z position to increase view depth
2. Scale note positions to fit within view
3. Adjust camera FOV: `camera.fov = newFOV; camera.updateProjectionMatrix();`

**Problem**: Notes don't fall at expected speed.

**Solution**:
1. Verify `noteSpeed` value in update loop
2. Check `deltaTime` calculation in animation loop
3. Confirm Y position decreases (falls) each frame

**Problem**: Camera controls unresponsive after note changes.

**Solution**:
1. Ensure `controls.update(delta)` is called each frame
2. Verify renderer is not blocking main thread
3. Check for errors in browser console

## Tips

- Use `note.userData` to store MIDI information with each note
- Cache calculated positions to avoid redundant math
- Group notes by layer for easier visibility toggling
- Use `THREE.Object3D` child relationships for hierarchical positioning
- Consider frustum culling for performance with many notes
