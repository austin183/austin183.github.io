import { expect } from 'chai';
import getGameState from './GameState.js';

describe('GameState', function() {
    let gameState;

    beforeEach(function() {
        gameState = getGameState();
    });

    describe('initialize()', function() {
        it('should initialize state with config values', function() {
            const config = {
                startTime: 1000,
                songEnd: 60,
                visibleField: [{ id: 'note1' }],
                scoreKeeper: { reset: () => {} },
                delay: 5
            };

            gameState.initialize(config);

            expect(gameState.get('startTime')).to.equal(1000);
            expect(gameState.get('songEnd')).to.equal(60);
            expect(gameState.get('visibleField')).to.deep.equal([{ id: 'note1' }]);
            expect(gameState.get('delay')).to.equal(5);
        });

        it('should return the state instance for chaining', function() {
            const result = gameState.initialize({ startTime: 100 });

            expect(result).to.equal(gameState);
        });

        it('should initialize with default values when called with empty config', function() {
            gameState.initialize({});

            expect(gameState.get('startTime')).to.be.null;
            expect(gameState.get('earliestNoteIndex')).to.equal(0);
            expect(gameState.get('visibleField')).to.be.an('array');
        });
    });

    describe('reset()', function() {
        it('should reset all state to initial values', function() {
            gameState.initialize({
                startTime: 1000,
                songEnd: 60,
                visibleField: [{ id: 'note1' }],
                scoreKeeper: { reset: () => {} },
                pressedKeys: { 'A': true }
            });

            gameState.reset();

            expect(gameState.get('startTime')).to.be.null;
            expect(gameState.get('earliestNoteIndex')).to.equal(0);
            expect(gameState.get('visibleField')).to.deep.equal([]);
            expect(gameState.get('songEnd')).to.equal(0);
        });

        it('should reset pressedKeys to empty object', function() {
            gameState.initialize({
                pressedKeys: { 'A': true, 'B': false }
            });

            gameState.reset();

            expect(gameState.get('pressedKeys')).to.deep.equal({});
        });

        it('should reset invertedKeyNoteMap to empty object', function() {
            gameState.initialize({
                invertedKeyNoteMap: { 'C4': 'z' }
            });

            gameState.reset();

            expect(gameState.get('invertedKeyNoteMap')).to.deep.equal({});
        });

        it('should reset noteLetterCache to empty object', function() {
            gameState.initialize({
                noteLetterCache: { 'note1': 'A' }
            });

            gameState.reset();

            expect(gameState.get('noteLetterCache')).to.deep.equal({});
        });

        it('should reset delay to default value of 4', function() {
            gameState.initialize({ delay: 10 });

            gameState.reset();

            expect(gameState.get('delay')).to.equal(4);
        });

        it('should reset synths to empty array', function() {
            gameState.initialize({ synths: ['synth1'] });

            gameState.reset();

            expect(gameState.get('synths')).to.deep.equal([]);
        });

        it('should call scoreKeeper.reset() if available', function() {
            const mockScoreKeeper = { reset: () => {} };
            let scoreKeeperResetCalled = false;

            mockScoreKeeper.reset = function() {
                scoreKeeperResetCalled = true;
            };

            gameState.initialize({ scoreKeeper: mockScoreKeeper });
            gameState.reset();

            expect(scoreKeeperResetCalled).to.be.true;
        });

        it('should not throw if scoreKeeper is null', function() {
            gameState.initialize({ scoreKeeper: null });

            expect(() => gameState.reset()).to.not.throw();
        });

        it('should reset all score counts to zero', function() {
            gameState.initialize({
                score: 1000,
                goodCount: 5,
                okCount: 3,
                badCount: 2,
                missedCount: 1
            });

            gameState.reset();

            const counts = gameState.getScoreCounts();
            expect(counts.score).to.equal(0);
            expect(counts.goodCount).to.equal(0);
            expect(counts.okCount).to.equal(0);
            expect(counts.badCount).to.equal(0);
            expect(counts.missedCount).to.equal(0);
        });
    });

    describe('get()', function() {
        it('should return the value for a given key', function() {
            gameState.initialize({ startTime: 1234 });

            expect(gameState.get('startTime')).to.equal(1234);
        });

        it('should return undefined for non-existent keys', function() {
            const result = gameState.get('nonExistentKey');

            expect(result).to.be.undefined;
        });

        it('should return default values before initialization', function() {
            expect(gameState.get('startTime')).to.be.null;
            expect(gameState.get('earliestNoteIndex')).to.equal(0);
            expect(gameState.get('delay')).to.equal(4);
        });
    });

    describe('set()', function() {
        it('should set a value for a given key', function() {
            gameState.set('startTime', 5678);

            expect(gameState.get('startTime')).to.equal(5678);
        });

        it('should set complex objects', function() {
            const pressedKeys = { 'A': true, 'B': false };
            gameState.set('pressedKeys', pressedKeys);

            expect(gameState.get('pressedKeys')).to.deep.equal(pressedKeys);
        });

        it('should overwrite existing values', function() {
            gameState.set('songEnd', 30);
            gameState.set('songEnd', 60);

            expect(gameState.get('songEnd')).to.equal(60);
        });
    });

    describe('getState()', function() {
        it('should return the internal state object', function() {
            gameState.initialize({ startTime: 1000 });

            const state = gameState.getState();
            
            expect(state.startTime).to.equal(1000);
        });

        it('should return a reference, not a copy', function() {
            gameState.initialize({ startTime: 100 });

            const state = gameState.getState();
            state.startTime = 200;

            expect(gameState.get('startTime')).to.equal(200);
        });
    });

    describe('syncToVue()', function() {
        it('should sync score values to Vue app', function() {
            gameState.initialize({
                score: 100,
                goodCount: 5,
                okCount: 3,
                badCount: 2,
                missedCount: 1
            });

            const mockVueApp = {};
            gameState.syncToVue(mockVueApp);

            expect(mockVueApp.score).to.equal(100);
            expect(mockVueApp.goodCount).to.equal(5);
            expect(mockVueApp.okCount).to.equal(3);
            expect(mockVueApp.badCount).to.equal(2);
            expect(mockVueApp.missedCount).to.equal(1);
        });

        it('should not throw if app is null', function() {
            expect(() => gameState.syncToVue(null)).to.not.throw();
        });

        it('should not throw if app is undefined', function() {
            expect(() => gameState.syncToVue(undefined)).to.not.throw();
        });

        it('should use default values when syncing before initialization', function() {
            const mockVueApp = {};
            gameState.syncToVue(mockVueApp);

            expect(mockVueApp.score).to.equal(0);
            expect(mockVueApp.goodCount).to.equal(0);
        });
    });

    describe('getScoreCounts()', function() {
        it('should return all score-related counts', function() {
            gameState.initialize({
                score: 200,
                goodCount: 10,
                okCount: 5,
                badCount: 3,
                missedCount: 2
            });

            const counts = gameState.getScoreCounts();

            expect(counts.score).to.equal(200);
            expect(counts.goodCount).to.equal(10);
            expect(counts.okCount).to.equal(5);
            expect(counts.badCount).to.equal(3);
            expect(counts.missedCount).to.equal(2);
        });

        it('should return default values before initialization', function() {
            const counts = gameState.getScoreCounts();

            expect(counts.score).to.equal(0);
            expect(counts.goodCount).to.equal(0);
            expect(counts.okCount).to.equal(0);
            expect(counts.badCount).to.equal(0);
            expect(counts.missedCount).to.equal(0);
        });

        it('should return a new object each time', function() {
            const counts1 = gameState.getScoreCounts();
            const counts2 = gameState.getScoreCounts();

            expect(counts1).to.not.equal(counts2);
        });
    });

    describe('Integration', function() {
        it('should handle full game lifecycle', function() {
            // Initialize game
            gameState.initialize({
                startTime: 1000,
                songEnd: 60,
                scoreKeeper: { reset: () => {} },
                delay: 4
            });

            expect(gameState.get('startTime')).to.equal(1000);
            expect(gameState.get('songEnd')).to.equal(60);

            // Update state during game
            gameState.set('score', 100);
            gameState.set('goodCount', 3);

            expect(gameState.get('score')).to.equal(100);

            // Sync to Vue
            const vueApp = {};
            gameState.syncToVue(vueApp);

            expect(vueApp.score).to.equal(100);

            // Reset for next game
            gameState.reset();

            expect(gameState.get('startTime')).to.be.null;
            expect(gameState.get('score')).to.equal(0);
        });

        it('should support chaining initialize calls', function() {
            gameState.initialize({ startTime: 100 })
                .initialize({ songEnd: 60 });

            expect(gameState.get('startTime')).to.equal(100);
            expect(gameState.get('songEnd')).to.equal(60);
        });
    });
});
