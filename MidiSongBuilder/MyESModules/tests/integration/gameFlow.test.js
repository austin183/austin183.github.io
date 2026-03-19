import { expect } from 'chai';
import { createMockVueApp, createMockMidiFile, setupComponentRegistry } from './testHelpers.js';
import getComponentRegistry from '../../ComponentRegistry.js';
import getScoreKeeper from '../../ScoreKeeper.js';
import getGameController from '../../GameController.js';

describe('Integration: Basic Game Flow', () => {
    let app;
    let registry;
    let gameController;
    let scoreKeeper;

    beforeEach(() => {
        app = createMockVueApp();
        registry = getComponentRegistry();
        scoreKeeper = getScoreKeeper();
        
        app.componentRegistry = registry;
        setupComponentRegistry(app, { scoreKeeper });
        
        window.Tone = {
            now: () => Date.now() / 1000,
            PolySynth: class MockPolySynth {
                constructor(params = {}) {}
                
                toDestination() { return this; }
                
                disconnect() {}
                
                triggerAttackRelease() {}
                
                dispose() {}
            },
            Synth: class MockSynth {
                constructor(params = {}) {}
                
                toDestination() { return this; }
                
                disconnect() {}
                
                triggerAttackRelease() {}
                
                dispose() {}
            }
        };

        gameController = getGameController(window.Tone);
    });

    it('should complete full game flow: start → play → stop', function(done) {
        this.timeout(5000);

        const midiData = createMockMidiFile();
        const visibleField = [
            { id: 'C4_0', letter: 'A', time: 0, duration: 0.5, state: 'unplayed', x: 0 },
            { id: 'E4_0.5', letter: 'S', time: 0.5, duration: 0.5, state: 'unplayed', x: 1 },
        ];
        const difficultySettings = { goodRange: 0.15, okRange: 0.4, badRange: 0.7 };
        const songEnd = 2.0;
        
        let gameStarted = false;
        let intervalId = null;

        const startTime = Date.now() / 1000;
        
        window.Tone.now = () => startTime + 0.1;

        intervalId = gameController.startGame(
            app, 
            midiData, 
            difficultySettings, 
            songEnd, 
            visibleField,
            { A: true }
        );

        gameStarted = !!intervalId;

        expect(gameStarted).to.be.true;
        expect(intervalId).to.not.be.null;

        setTimeout(() => {
            gameController.stopGame(app);
            
            done();
        }, 500);
    });

    it('should start game and create interval', () => {
        const midiData = createMockMidiFile();
        const visibleField = [
            { id: 'C4_0', letter: 'A', time: 0, duration: 0.5, state: 'unplayed', x: 0 }
        ];
        const difficultySettings = { goodRange: 0.15, okRange: 0.4 };
        const songEnd = 2.0;

        window.Tone.now = () => 0.05;

        const intervalId = gameController.startGame(
            app, midiData, difficultySettings, songEnd, visibleField,
            { A: true }
        );

        expect(intervalId).to.not.be.null;
        
        gameController.stopGame(app);
    });

    it('should handle game lifecycle with missed notes', function(done) {
        this.timeout(2000);

        const midiData = createMockMidiFile();
        const visibleField = [
            { id: 'C4_0', letter: 'A', time: 0, duration: 0.5, state: 'unplayed', x: 0 }
        ];
        const difficultySettings = { goodRange: 0.15, okRange: 0.4, badRange: 0.7 };
        const songEnd = 2.0;

        window.Tone.now = () => 1.0;

        const intervalId = gameController.startGame(
            app, midiData, difficultySettings, songEnd, visibleField,
            {}
        );

        setTimeout(() => {
            gameController.stopGame(app);
            
            done();
        }, 100);
    });
});
