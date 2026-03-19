# Integration Tests

These tests verify complete game flows work correctly.

## Test Scenarios

1. **Basic Game Flow** - start → play notes → stop
2. **Score Calculation Flow** - input key → score updated → display updated  
3. **Note Rendering Flow** - MIDI loaded → notes filtered → rendered to canvas
4. **Audio Scheduling Flow** - game start → synths created → notes scheduled → cleanup
5. **3D Rendering Flow** - game start in 3D mode → renderer initialized → notes rendered
6. **Camera Controls Flow** - enable controls → WASD input → camera moves → disable
7. **Difficulty Selection Flow** - select difficulty → settings applied → BPM calculated
8. **File Drop Flow** - drag MIDI file → parse → song loaded → ready to play

## Running Tests

```bash
npm test
```

## Test Files

- `gameFlow.test.js` - Basic game start/play/stop flow
- `scoreCalculation.test.js` - Score calculation end-to-end
- `testHelpers.js` - Shared utilities for integration tests
