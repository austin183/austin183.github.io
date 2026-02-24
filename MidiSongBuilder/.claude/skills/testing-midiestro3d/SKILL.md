---
name: testing-midiestro3d
description: Take screenshots of Midiestro3D.html to verify 2D and 3D canvases show aligned game states. Use when testing or debugging the 3D rendering alignment with the 2D canvas. Includes checklists for screenshot review, key parameters to verify, and common adjustment scenarios.
---

# Midiestro3D Screenshot Analysis

Analyze screenshots of the Midiestro3D.html page to verify the 2D and 3D canvases show notes at aligned positions relative to the "now line" (where notes should be hit).

## When to Use This Skill

- When debugging timing alignment between 2D and 3D canvas views
- When adjusting camera, delay, or scale parameters in ThreeJSRenderer.js
- When verifying that notes cross the now line at the same time in both views
- After making changes to 3D rendering parameters to verify alignment

## Key Issue: Timing Alignment

The core challenge is ensuring notes cross the now line at the same time in both views:

- **2D Canvas**: Notes fall vertically; now line is horizontal at the bottom
- **3D Canvas**: Notes move toward camera (Z-axis) through a tilted plane

**Goal**: Notes should intersect the now line at the same song time in both views.

## Things to Not Do
- DO NOT LOOK FOR AN EXISTING IMAGE. You are supposed to take one.

## Screenshot Review Checklist

Use this checklist when analyzing screenshots to verify 2D/3D alignment:

### Now Line & Positioning
- [ ] Now line visible and in correct position in both views
- [ ] Notes cross now line at same time in both views
- [ ] Now line appears as distinct horizontal plane/line in 3D view

### Visual Elements
- [ ] Background grid aligned with note columns
- [ ] Notes readable (facing camera, properly lit)
- [ ] Color consistency between views (same states: unplayed, good, ok, bad)

### 3D-Specific Elements
- [ ] Notes facing camera with readable lettering
- [ ] Shadow directions consistent with lighting position
- [ ] Perspective cues help judge note positions in 3D space
- [ ] Canvas boundaries aligned between views

### Timing Reference
- [ ] Song time indicator visible (progress bar or elapsed time)
- [ ] Timing synchronization between views verified

## Key Parameters to Verify

When reviewing screenshots or adjusting rendering, verify these key parameters in ThreeJSRenderer.js:

| Parameter | Purpose |
|-----------|---------|
| Camera position (x, y, z) | Determines viewpoint and depth perception |
| Camera lookAt target | Sets the direction the camera faces |
| Note group rotation | Must match camera angle for note readability |
| Z_SCALE factor | Controls note depth position relative to camera |
| Delay value | Offsets note timing for alignment with now line |

## Common Adjustment Scenarios

Use this table to diagnose alignment issues:

| Symptom | Likely Cause | Adjustment Strategy |
|---------|--------------|---------------------|
| Camera too close/far | Incorrect z-position | Adjust camera z-value; check depth perception |
| Notes not facing camera | Wrong rotation angle | Match note rotation to camera lookAt angle |
| Now line misaligned | Delay or Z_SCALE issue | Adjust delay for timing; Z_SCALE for depth |
| Notes at wrong depth | Z_SCALE mismatch | Calibrate using now line position in 3D space |
| Notes not crossing simultaneously | Timing offset | Adjust delay value until sync verified |

## Analysis Process

### Single Screenshot (Quick Check)

The script `testing-midiestro/scripts/takeMidiestro3DScreenshot.js` captures a single screenshot:

1. Run `testing-midiestro/scripts/takeMidiestro3DScreenshot.js` to capture a new screenshot
2. Review the saved screenshot against the checklist below
3. Identify any misalignment issues
4. Compare 2D and 3D view timing

### Sequence of Screenshots (Note Movement Analysis)

**Use this when testing the note rotation feature from the note rotation plan.**

The script `testing-midiestro/scripts/takeMidiestro3DScreenshotSequence.js` captures multiple frames over time:

1. Run `testing-midiestro/scripts/takeMidiestro3DScreenshotSequence.js`
2. Review the sequence to verify:
   - Notes rotate smoothly to face camera (billboarding effect)
   - Notes move in straight lines along Z-axis when game starts
   - Rotation and movement are decoupled (rotation stops, movement continues)

Screenshots are saved with timestamps (e.g., `midiestro3d-sequence-1250ms.png`).

---

## Testing Note Rotation Feature

When testing the billboarding rotation implementation from the note rotation plan:

### What to Verify in Screenshot Sequences:

1. **Camera Control Mode (Game Paused)**
   - Notes dynamically rotate each frame to face camera
   - Full 3D rotation works from any camera angle
   - Notes remain readable when moving WASD or Arrow keys

2. **Gameplay Mode (Game Running)**
   - Notes freeze at their last rotation when game starts
   - Notes move in straight lines along Z-axis (no curving)
   - Rotation doesn't affect movement trajectory

3. **State Transitions**
   - Stop game → Notes resume facing camera from current angle
   - Camera moves during rotation → Notes track camera smoothly

### Configuration Options

Environment variables to customize the sequence:

| Variable | Default | Description |
|----------|---------|-------------|
| `SCREENSHOT_DURATION` | 5000 | Total gameplay duration in ms |
| `numScreenshots` | 10 | Number of screenshots to capture |
| `interval` | 500 | ms between screenshots |

Example:
```bash
SCREENSHOT_DURATION=3000 node takeMidiestro3DScreenshotSequence.js
```