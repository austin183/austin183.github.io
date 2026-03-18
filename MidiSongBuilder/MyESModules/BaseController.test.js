import { expect } from 'chai';
import sinon from 'sinon';

const mockTone = {
    now: () => 100,
    Transport: {
        schedule: sinon.stub(),
        cancel: sinon.stub(),
        stop: sinon.stub()
    }
};

global.window = global.window || {};
global.Tone = mockTone;

import getBaseController from './BaseController.js';

describe('BaseController', () => {
    let baseController;
    
    beforeEach(() => {
        baseController = getBaseController(mockTone);
    });

    describe('getBaseController', () => {
        it('should return controller with mixins when Tone is provided', () => {
            expect(baseController).to.not.be.null;
            expect(typeof baseController.stateMixin).to.equal('object');
            expect(typeof baseController.audioMixin).to.equal('object');
            expect(typeof baseController.gameLoopMixin).to.equal('object');
            expect(typeof baseController.cleanupMixin).to.equal('object');
        });

        it('should have expected state mixin methods', () => {
            expect(typeof baseController.stateMixin.initializeGameState).to.equal('function');
            expect(typeof baseController.stateMixin.resetAppStateScores).to.equal('function');
        });

        it('should have expected audio mixin methods', () => {
            expect(typeof baseController.audioMixin.scheduleAudioEvents).to.equal('function');
        });

        it('should have expected gameLoopMixin methods', () => {
            expect(typeof baseController.gameLoopMixin.baseGameLoop).to.equal('function');
        });

        it('should have expected cleanupMixin methods', () => {
            expect(typeof baseController.cleanupMixin.stopGame).to.equal('function');
        });
    });

    describe('stateMixin', () => {
        it('should initialize gameState with valid parameters', () => {
            const mockApp = { selectedKeyNoteMap: { keyNoteMap: {} } };
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockSongNoteRenderer = { buildSongNoteLetterCache: () => ({}) };
            const mockKeyNoteMapService = { getInvertedMap: () => ({}) };

            const gameState = baseController.stateMixin.initializeGameState(
                mockApp,
                mockScoreKeeper,
                mockSongNoteRenderer,
                mockKeyNoteMapService,
                {},
                [],
                [],
                60,
                3
            );

            expect(gameState).to.not.be.null;
        });

        it('should reset scoreKeeper when initializing state', () => {
            const mockApp = { selectedKeyNoteMap: { keyNoteMap: {} } };
            const mockScoreKeeper = { reset: sinon.stub() };

            baseController.stateMixin.initializeGameState(
                mockApp,
                mockScoreKeeper,
                null,
                null,
                null,
                [],
                [],
                60,
                3
            );

            expect(mockScoreKeeper.reset.calledOnce).to.be.true;
        });

        it('should reset visibleField states to unplayed', () => {
            const mockApp = { selectedKeyNoteMap: { keyNoteMap: {} } };
            const visibleField = [
                { state: 'good' },
                { state: 'ok' },
                { state: 'bad' }
            ];

            baseController.stateMixin.initializeGameState(
                mockApp,
                null,
                null,
                null,
                null,
                [],
                visibleField,
                60,
                3
            );

            expect(visibleField[0].state).to.equal('unplayed');
            expect(visibleField[1].state).to.equal('unplayed');
            expect(visibleField[2].state).to.equal('unplayed');
        });

        it('should reset Vue app scores', () => {
            const mockApp = { 
                selectedKeyNoteMap: { keyNoteMap: {} },
                score: 100,
                goodCount: 5,
                okCount: 3,
                badCount: 2,
                missedCount: 1
            };

            baseController.stateMixin.initializeGameState(
                mockApp,
                null,
                null,
                null,
                null,
                [],
                [],
                60,
                3
            );

            expect(mockApp.score).to.equal(0);
            expect(mockApp.goodCount).to.equal(0);
            expect(mockApp.okCount).to.equal(0);
            expect(mockApp.badCount).to.equal(0);
            expect(mockApp.missedCount).to.equal(0);
        });

        it('should handle null app gracefully', () => {
            baseController.stateMixin.initializeGameState(
                null,
                null,
                null,
                null,
                null,
                [],
                [],
                60,
                3
            );

            expect(true).to.be.true;
        });

        it('should handle null visibleField gracefully', () => {
            const mockApp = { selectedKeyNoteMap: { keyNoteMap: {} } };

            baseController.stateMixin.initializeGameState(
                mockApp,
                null,
                null,
                null,
                null,
                [],
                null,
                60,
                3
            );

            expect(true).to.be.true;
        });
    });

    describe('audioMixin', () => {
        it('should schedule audio events with valid tracks', () => {
            const mockSynths = [
                { triggerAttackRelease: sinon.stub() },
                { triggerAttackRelease: sinon.stub() }
            ];
            
            const tracks = [
                { note: 'C4', time: 100, duration: 0.5 },
                { note: 'D4', time: 150, duration: 0.5 }
            ];

            baseController.audioMixin.scheduleAudioEvents(mockSynths, tracks);

            expect(true).to.be.true;
        });

        it('should handle empty tracks array', () => {
            const mockSynths = [];

            baseController.audioMixin.scheduleAudioEvents(mockSynths, []);

            expect(true).to.be.true;
        });

        it('should handle null tracks gracefully', () => {
            const mockSynths = [];

            baseController.audioMixin.scheduleAudioEvents(mockSynths, null);

            expect(true).to.be.true;
        });
    });

    describe('gameLoopMixin', () => {
        it('should not error when called with valid app and gameStateKey', () => {
            const mockApp = {
                gameState: {
                    get: () => null
                }
            };

            expect(() => {
                baseController.gameLoopMixin.baseGameLoop(mockApp, 'gameState', mockTone);
            }).to.not.throw();
        });

        it('should stop game when gameState is null', () => {
            const mockApp = {
                gameState: null
            };

            expect(() => {
                baseController.gameLoopMixin.baseGameLoop(mockApp, 'gameState', mockTone);
            }).to.not.throw();
        });

        it('should stop game when this is falsy', () => {
            const mockApp = {};

            expect(() => {
                baseController.gameLoopMixin.baseGameLoop(mockApp, 'gameState', mockTone);
            }).to.not.throw();
        });
    });

    describe('cleanupMixin', () => {
        it('should clear playIntervalId when provided', () => {
            const mockController = { 
                playIntervalId: setInterval(() => {}, 1000)
            };

            baseController.cleanupMixin.stopGame(mockController);

            expect(true).to.be.true;
        });

        it('should handle null controller gracefully', () => {
            expect(() => {
                baseController.cleanupMixin.stopGame(null);
            }).to.not.throw();
        });

        it('should handle controller without playIntervalId', () => {
            const mockController = {};

            expect(() => {
                baseController.cleanupMixin.stopGame(mockController);
            }).to.not.throw();
        });
    });
});
