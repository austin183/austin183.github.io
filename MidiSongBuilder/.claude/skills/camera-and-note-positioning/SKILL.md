---
name: camera-and-note-positioning
description: Guide to positioning cameras and 3D notes in Three.js scenes for Midiestro3D. Use when setting up camera views, positioning falling notes, or debugging 3D layout issues.
---

# Camera and Note Positioning for Three.js

This skill provides guidance for positioning cameras and 3D objects in Three.js scenes, specifically for the Midiestro3D rhythm game. It covers camera setup, object placement, and coordinate calculations for note rendering.

## Quick Navigation

| Topic | Reference |
|-------|-----------|
| **Camera setup** | See [CAMERA.md](CAMERA.md) - Perspective camera, FlyControls, OrbitControls |
| **Note positioning** | See [NOTES.md](NOTES.md) - 3D note placement, coordinate mapping, grid layout |
| **Vector math** | See [VECTOR-MATH.md](VECTOR-MATH.md) - Position, rotation, direction vectors |
| **Midiestro3D integration** | See [MIDIESTRO.md](MIDIESTRO.md) - Specific patterns for the rhythm game |

## Overview

When building 3D visualizations in Three.js for games like Midiestro3D, you need to:

1. **Set up the camera** - Position the camera to view the scene, configure controls for user interaction
2. **Position notes in 3D space** - Map MIDI note data to 3D coordinates for falling note visualization
3. **Maintain coordinate consistency** - Ensure camera and note positions use the same coordinate system

This skill draws from extracted documentation about:
- Three.js PerspectiveCamera setup and configuration
- FlyControls and OrbitControls for camera navigation
- Vector math for position and orientation
- Camera controls and update loops

## When to Use This Skill

- Setting up a camera to view falling notes in Midiestro3D
- Positioning 3D note objects at specific coordinates
- Debugging camera movement or note visibility issues
- Configuring camera presets for different viewing angles
- Mapping 2D keyboard coordinates to 3D world space

## Key Concepts

### Coordinate System
Three.js uses a right-handed coordinate system:
- **X**: Right/Left
- **Y**: Up/Down
- **Z**: Forward/Backward

### Camera Position
```javascript
camera.position.set(x, y, z);  // Camera location
camera.lookAt(x, y, z);        // Point camera looks at
```

### Note Position
```javascript
note.position.set(noteX, noteY, noteZ);
```

## Related Files

- `Midiestro3D.html` - Main HTML file with Three.js renderer
- `ThreeJSRenderer.js` - Three.js rendering component
- `CameraControls.js` - Camera control logic
- `CoordinateCalculator.js` - Coordinate mapping utilities
