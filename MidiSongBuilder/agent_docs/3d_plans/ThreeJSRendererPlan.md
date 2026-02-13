# Plan: Converting Midiestro3D.html from 2D to 3D

## Context

The user wants to convert `Midiestro3D.html` from a 2D canvas-based rhythm game to a 3D game using Three.js. The existing 2D renderer in `SongNoteRenderer.js` uses HTML5 Canvas API to draw falling notes with letters. The game uses Vue.js for state management, Tone.js for audio synthesis, and has a modular component architecture.

Key findings from code exploration:
1. **SongNoteRenderer.js** - 2D rendering logic using canvas API (drawImage, fillText, rect, path)
2. **GameController.js** - Main game loop using `setInterval` every 10ms, coordinates with Tone.js audio
3. **ScoreKeeper.js** - Scoring logic based on timing windows (good/ok/bad/missed)
4. **keyRenderInfo.js** - Keyboard layout mapping (10 columns x 4 rows)
5. **VisibleFieldFilterer.js** - Filters notes based on difficulty settings

## Number of Phases

The plan consists of **5 phases** that incrementally build the 3D functionality:

| Phase | Focus | Outcome |
|-------|-------|---------|
| 1 | Three.js Setup | Working 3D scene with basic geometry |
| 2 | Note Rendering | Static notes displayed in 3D grid |
| 3 | Dynamic Game Loop | Animated notes with scoring |
| 4 | UI/HUD | Score and controls in 3D |
| 5 | Polish | Materials, camera controls, final touches |

## Phase Breakdown

### Phase 1: Three.js Setup and Scene Foundation
**Goal:** Establish Three.js rendering pipeline without breaking existing functionality

**Changes:**
- Add Three.js scripts to `Midiestro3D.html` (`three.min.js`, `FontLoader.js`, `TextGeometry.js`, `OrbitControls.js`)
- Create `MyComponents/ThreeJSRenderer.js` - New component for Three.js rendering
- Set up WebGLRenderer, Scene, Camera (PerspectiveCamera), and basic lighting
- Add a container div for the 3D canvas (parallel to existing `<canvas id="notesCanvas">`)

**Testing:**
- Page loads without JavaScript errors
- 3D canvas renders a simple scene (e.g., a rotating cube or basic grid)
- Existing 2D canvas still visible and functional
- Vue.js app mounts correctly

### Phase 2: Three.js Note Rendering - Static Notes
**Goal:** Replace 2D note rendering with 3D note primitives

**Changes:**
- Modify `ThreeJSRenderer.js` to create 3D note objects
- Use `TextGeometry` for note letters with `FontLoader`
- Create note geometry: rectangular prisms (boxes) for note borders, text for letters
- Position notes in 3D grid: x = keyboard column, y = row, z = time (depth)
- Create a viewing angle where the 3D grid is tilted for better visibility
- Implement note letter caching equivalent to `buildSongNoteLetterCache()`

**Testing:**
- Notes render in correct horizontal positions (mapped to keyboard layout)
- Notes render at correct depths based on timing
- Note colors work (blue for unplayed, green/yellow/red for good/ok/bad)
- All 10 keyboard columns visible and correctly positioned
- 3D grid is tilted for optimal viewing (isometric/angle view)

### Phase 3: Three.js Dynamic Game Loop
**Goal:** Integrate with existing game loop and audio

**Changes:**
- Create `ThreeJSGameController.js` - extends GameController for 3D updates
- Update game loop to animate notes moving in 3D space (Z-axis = time progression)
- Notes move closer to camera as they approach play time
- Sync with Tone.js timing (`Tone.now()`)
- Handle score updates in 3D (change note colors when hit)
- Implement "now line" as a 3D plane/rod at the player position

**Testing:**
- Notes animate smoothly along the Z-axis toward the camera
- Timing matches audio playback
- Score updates appear in 3D (note color changes on hit)
- "Now line" is visible at the player position
- Audio continues to work correctly

### Phase 4: 3D UI and HUD Elements
**Goal:** Add user interface elements in 3D space

**Changes:**
- Add score display using `TextGeometry` positioned above the grid
- Create 3D score badges for good/ok/bad/missed (small cubes with colors)
- Add "Song End" timer display
- Position UI elements above the 3D grid for visibility
- Implement 3D button overlays for Play/Stop beside the grid

**Testing:**
- Score updates dynamically as notes are hit
- UI elements are legible and don't occlude game action
- Play/Stop buttons functional
- High scores display correctly

### Phase 5: Polish and Features
**Goal:** Add visual enhancements and complete 3D experience

**Changes:**
- Improve note appearance with better materials (Phong for lighting response)
- Add "missed" note indicators (e.g., fade out or change to gray)
- Implement camera controls (OrbitControls for view rotation)
- Add subtle shadows or ambient occlusion for depth perception
- Create "score screen" in 3D with final statistics floating above the grid
- Add camera movement for game intensity (zoom closer during high score moments)

**Testing:**
- Visual polish is consistent with game feel
- Camera controls responsive and intuitive
- Score screen displays all statistics
- Performance is smooth (60fps)
- All existing features work (difficulty settings, track selection)

## Key Files to Create/Modify

| Action | File |
|--------|------|
| Create | `MyComponents/ThreeJSRenderer.js` - Three.js rendering helper |
| Create | `MyComponents/ThreeJSGameController.js` - 3D game loop integration |
| Modify | `Midiestro3D.html` - Add Three.js scripts and 3D canvas container |

## Architecture Decisions

**3D Grid View Design:**
- Notes arranged in a 3D grid with 10 columns (keyboard keys) and variable rows
- Keyboard layout from `keyRenderInfo.js` maps to X and Y positions
- Time progression moves notes along Z-axis toward camera
- Camera positioned at an angle (e.g., 30-45 degrees) for isometric-like view
- This allows players to see multiple notes depth-wise while maintaining key positions

**Component Separation:**
- `SongNoteRenderer.js` and `GameController.js` remain unchanged for backwards compatibility with `Midiestro.html`
- Three.js rendering is completely separate in `ThreeJSRenderer.js` and `ThreeJSGameController.js`
- Two canvases: 2D canvas for existing game, 3D canvas for new 3D game
- Both can coexist; user can choose which to use or toggle between them

## Testing Strategy Per Phase

| Phase | Test Method | Success Criteria |
|-------|-------------|------------------|
| Phase 1 | Open page, check console | No errors, 3D scene renders a simple cube/grid |
| Phase 2 | Load MIDI, check notes | Notes appear in 3D grid at correct X/Y/Z positions |
| Phase 3 | Play song | Notes move along Z-axis, audio in sync, scoring works |
| Phase 4 | View UI elements | Score updates, buttons work in 3D |
| Phase 5 | Play full song | Visual polish, smooth 60fps, all features work |
