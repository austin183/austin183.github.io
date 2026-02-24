# Note Positioning in 3D Space

## Quick Reference

| Coordinate | Range | Purpose |
|------       |------ |------   |
| X (horizontal) | -10 to 10 | Keyboard column position |
| Y (vertical) | 0 to 20 | Falling note height |
| Z (depth) | -20 to 10 | Note depth/layer |

## Note Positioning Basics

Position each note as a 3D object using coordinates:

```javascript
import * as THREE from 'three';

// Create a note mesh (e.g., a box)
const geometry = new THREE.BoxGeometry(1, 0.2, 0.5);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const note = new THREE.Mesh(geometry, material);

// Position the note in 3D space
// X: keyboard column (-5 to 5 for standard keyboard)
// Y: vertical position (falling from top to bottom)
// Z: depth offset (for multi-layer notes)
note.position.set(noteX, noteY, noteZ);

// Add to scene
scene.add(note);
```

## Coordinate Mapping for Midiestro3D

Map MIDI note data to 3D coordinates:

```javascript
// MIDI note to X coordinate mapping
function midiNoteToX(midiNote, keyWidth = 1.2) {
  // MIDI notes 60-72 map to C4-C5 (white keys)
  // Adjust based on your keyboard layout
  const keyboardStart = 60; // C4
  const keyIndex = midiNote - keyboardStart;
  return keyIndex * keyWidth - (totalKeys * keyWidth) / 2;
}

// Y position based on time (falling notes)
function getYPosition(time, totalTime, viewHeight = 20) {
  // Notes start high (Y = viewHeight) and fall to Y = 0
  const progress = time / totalTime;
  return viewHeight * (1 - progress);
}

// Create a note at a specific time position
function createNote(midiNote, time, duration) {
  const noteX = midiNoteToX(midiNote);
  const noteY = 15; // Start near top
  const noteZ = 0;  // Main layer

  const note = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.15, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  );

  note.position.set(noteX, noteY, noteZ);
  note.userData = { midiNote, time, duration }; // Store metadata

  return note;
}
```

## Grid-Based Note Layout

Organize notes in a grid pattern:

```javascript
// Define grid parameters
const gridConfig = {
  rows: 10,           // Number of visible rows
  columns: 12,        // Number of keyboard keys
  rowHeight: 1.5,     // Vertical space per row
  keyWidth: 1.0,      // Horizontal space per key
  noteSpeed: 2.0      // Units per second
};

// Calculate note position in grid
function getNotePosition(keyIndex, rowIndex) {
  const x = (keyIndex - gridConfig.columns / 2) * gridConfig.keyWidth;
  const y = (gridConfig.rows - rowIndex) * gridConfig.rowHeight;
  const z = 0;
  return { x, y, z };
}

// Position notes in a visible field
function positionVisibleNotes(visibleNotes) {
  return visibleNotes.map((note, index) => {
    const position = getNotePosition(note.keyIndex, index);
    note.position.set(position.x, position.y, position.z);
    return note;
  });
}
```

## Camera-Aware Note Positioning

Position notes relative to camera for consistent visibility:

```javascript
// Position notes in camera's view frustum
function positionNotesInView(camera, notes, distance = 5) {
  const noteY = 10; // Vertical position
  const noteZ = -distance; // In front of camera

  notes.forEach((note, index) => {
    // Spread notes horizontally based on index
    const noteX = (index - notes.length / 2) * 1.5;
    note.position.set(noteX, noteY, noteZ);
  });
}

// Adjust note position based on camera orientation
function adjustNotesForCamera(notes, camera) {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  notes.forEach(note => {
    // Offset notes based on camera direction
    note.position.x += direction.x * 5;
    note.position.z -= direction.z * 5;
  });
}
```

## Key Column Positioning

Map keyboard columns to 3D positions:

```javascript
// Standard keyboard columns mapped to X coordinates
const keyColumns = {
  'A': -5,  'S': -4,  'D': -3,  'F': -2,  'G': -1,  'H': 0,
  'J': 1,   'K': 2,   'L': 3,   ';': 4,
  'W': -4.5, 'E': -3.5, 'T': -2.5, 'Y': -1.5, 'U': -0.5,
  'O': 0.5, 'P': 1.5
};

function getKeyColumnPosition(key) {
  const xOffset = keyColumns[key.toUpperCase()];
  return xOffset !== undefined ? xOffset : 0;
}

// Position a note at a specific key column
function positionNoteAtKey(note, key, yPosition = 10) {
  const x = getKeyColumnPosition(key);
  note.position.set(x, yPosition, 0);
}
```

## Note Animation Positions

Calculate note positions during animation:

```javascript
// Update note position each frame
function updateNotePositions(notes, currentTime, startTime, speed = 5) {
  notes.forEach(note => {
    const noteTime = note.userData.time;
    const timeDifference = currentTime - noteTime;

    if (timeDifference >= 0) {
      // Calculate how far the note should have fallen
      const distanceFallen = timeDifference * speed;

      // New Y position (falling from top)
      note.position.y = Math.max(0, 15 - distanceFallen);
    }
  });
}

// Get target position for note (where it should be when playable)
function getTargetPosition(note, baseY = 2) {
  return new THREE.Vector3(note.position.x, baseY, note.position.z);
}
```

## Troubleshooting

**Problem**: Notes appear stretched or distorted.

**Solution**:
1. Check aspect ratio: `camera.aspect = canvas.width / canvas.height`
2. Verify geometry dimensions match intended size
3. Ensure uniform scale: `note.scale.set(1, 1, 1)` before any other scaling

**Problem**: Notes are invisible or clipped.

**Solution**:
1. Verify note position is within camera's near/far planes
2. Check that notes are not inside the camera (position.z > 0 when camera looks at -Z)
3. Ensure material is visible (check color, lighting)

**Problem**: Notes don't align with keyboard layout.

**Solution**:
1. Verify key-to-coordinate mapping is consistent
2. Check if notes need rotation: `note.rotation.y = Math.PI / 2` for vertical notes
3. Confirm coordinate system matches camera view

## Tips

- Store MIDI note data in `note.userData` for easy access during gameplay
- Use a consistent coordinate system: Y increases upward, notes fall from positive Y to 0
- Keep notes within the camera's view frustum by adjusting Z position
- Group notes in a `THREE.Group` for easier positioning and manipulation
- Use `note.lookAt(camera.position)` to always face the camera if needed
