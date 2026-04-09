# Agent Instructions for MidiSongBuilder

## Project Overview
This is a JavaScript rhythm game (Midiestro) that reads MIDI files and creates interactive gameplay. The main codebase is in `MidiSongBuilder/MyESModules/` using ES modules. The project uses Mocha/Chai for testing and Tone.js for audio.

## Build/Lint/Test Commands

### Running Tests
```bash
# From MidiSongBuilder/MyESModules directory
npm test                          # Run all tests
npm test -- --grep "TestName"     # Run single test or filter by name
npm test -- tests/integration/*.test.js  # Run integration tests only
```

### Running the Application
The http server must be started manually via `start-server.sh`. Do NOT attempt to start it yourself - ask the user if needed.

Test URLs after server is running:
- http://localhost:8000/MidiSongBuilder/Midiestro.html (2D mode)
- http://localhost:8000/MidiSongBuilder/Midiestro3D.html (3D mode)

## Code Structure Guidelines

### Module Pattern
- All modules export a factory function prefixed with `get` (e.g., `getScoreKeeper`, `getGameController`)
- Use named exports for classes/constants: `export { GameConstants, SCORING }`
- Default export for the main factory function: `export default getModuleName`
- Barrel exports in `index.js` organize modules by category

### File Naming
- Main modules: PascalCase (e.g., `ScoreKeeper.js`, `GameController.js`)
- Test files: Same name with `.test.js` suffix (e.g., `ScoreKeeper.test.js`)
- Constants/config: lowercase with camelCase (e.g., `gameConstants.js`, `difficultySettings.js`)
- Mocks: Located in `mocks/` directory

### Architecture Patterns
1. **Mixin Pattern**: Base functionality composed from mixins (stateMixin, audioMixin, gameLoopMixin, cleanupMixin)
2. **Strategy Pattern**: Game modes (TwoDMode, ThreeDMode) via `GameModeStrategy.js`
3. **Dependency Injection**: ComponentRegistry provides services to controllers
4. **Template Method**: `baseGameLoop` calls hook `doRenderAfterLoop` for controller-specific rendering

### Imports
```javascript
// Named imports for constants/classes
import { IGameController } from './IGameController.js';
import { GAMEPLAY, RENDERING_2D } from './GameConstants.js';

// Default imports for factory functions
import getScoreKeeper from './ScoreKeeper.js';
import getBaseController from './BaseController.js';

// Mock imports for tests
import { createToneMock } from '../../mocks/Tone.js';
import sinon from 'sinon';
import { expect } from 'chai';
```

### Testing Guidelines

#### Test Structure
```javascript
import { expect } from 'chai';
import sinon from 'sinon';

const mockTone = { /* mock setup */ };
global.window = global.window || {};
global.Tone = mockTone;

import getModule from './Module.js';

describe('ModuleName', () => {
    beforeEach(() => { /* setup */ });
    
    it('should do something', () => {
        expect(result).to.equal(expected);
    });
});
```

#### Creating Tests
1. Mock external dependencies (Tone.js, Three.js, window objects)
2. Use `sinon.stub()` for methods you want to verify were called
3. Test edge cases: null inputs, empty arrays, invalid parameters
4. Integration tests go in `tests/integration/` and use shared helpers from `testHelpers.js`

#### Mock Setup Pattern
```javascript
const mockTone = {
    now: () => 100,
    Transport: {
        schedule: sinon.stub(),
        cancel: sinon.stub(),
        stop: sinon.stub()
    },
    PolySynth: class MockPolySynth { /* ... */ }
};

global.window = global.window || {};
global.Tone = mockTone;
```

## Code Style Guidelines

### Formatting
- 4 spaces for indentation
- Trailing commas in objects/arrays
- Semicolons at end of statements
- Max line length ~120 characters

### Naming Conventions
- Functions: camelCase (`initializeGameState`, `calculateTiming`)
- Variables: camelCase (`gameState`, `currentScore`)
- Constants: UPPERCASE with underscores (`GAME_LOOP_INTERVAL`, `VISIBLE_PAST_OFFSET`)
- Classes: PascalCase (`FMSynth`, `MockPolySynth`)
- Private properties/methods: prefix with `_` (`_self`, `_disposed`)

### Comments & Documentation
- JSDoc style comments for all exported functions/classes
- Include parameter types and return types in comments
- Explain "why" not just "what" for complex logic

### Error Handling
- Gracefully handle null/undefined inputs
- Use early returns instead of deep nesting
- Default values for optional parameters: `param = defaultValue`

## Forbidden Actions

### DO NOT Read
- Files in `MidiSongBuilder/Libraries/` directory (large third-party libraries)
- Only list/glob directories in Libraries, never read file contents

### DO NOT Duplicate
- Methods that already exist in base controllers/mixins
- Variable values from other components - extract to shared constants

### DO THINK About
- How to structure code to avoid duplication
- Whether new functionality is a new concern, existing component concern, or belongs elsewhere

## Required Practices

1. **Read Before Write**: Always read the file before editing
2. **Test Changes**: Run `npm test` after changes and verify in browser
3. **Mixin Composition**: Prefer adding mixins over duplicating logic

## Git Commit Convention
Include `Co-Authored-By: LittleLight <noreply@traveler.dstny>` in commit messages

## Key Directories
- `Styles.css` - Global styles

## Dependencies
- **Mocha/Chai/Sinon**: Testing infrastructure

## Synchronized Code Blocks

The following HTML sections are duplicated between `Midiestro.html` and `Midiestro3D.html`. Any changes must be applied to both files:

| Section | Description | Lines (approx) |
|---------|-------------|----------------|
| `instructions` | File drop and instructions collapsible card | 23-69 |
| `game-config` | Game settings and configuration collapsible card | 70-153 |
| `play-progress` | Score display and progress indicator | 154-172 |

These sections are marked with `<!-- BEGIN_SHARED_SECTION: name -->` and `<!-- END_SHARED_SECTION: name -->` comments for easy identification.

**When modifying synchronized sections**:
1. Make changes in one file first
2. Use your editor's multi-file edit or diff tool to apply the same changes to the other file
3. Verify both files render identically in browser
