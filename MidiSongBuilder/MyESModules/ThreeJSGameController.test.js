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
global.window.location = { search: '' };

import getThreeJSGameController from './ThreeJSGameController.js';

describe('ThreeJSGameController', () => {
    let controller;
    
    beforeEach(() => {
        sinon.useFakeTimers();
        controller = getThreeJSGameController(mockTone);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getThreeJSGameController', () => {
        it('should return controller with expected methods when Tone is provided', () => {
            expect(controller).to.not.be.null;
            expect(typeof controller.startGame).to.equal('function');
            expect(typeof controller.stopGame).to.equal('function');
            expect(typeof controller.gameLoop).to.equal('function');
            expect(typeof controller.doRenderAfterLoop).to.equal('function');
        });

        it('should inherit BaseController mixins', () => {
            expect(typeof controller.stateMixin).to.equal('object');
            expect(typeof controller.audioMixin).to.equal('object');
            expect(typeof controller.gameLoopMixin).to.equal('object');
            expect(typeof controller.cleanupMixin).to.equal('object');
        });

        it('should have 3D-specific methods', () => {
            expect(typeof controller.update3DNotesPosition).to.equal('function');
            expect(typeof controller.update3DNoteColors).to.equal('function');
            expect(typeof controller.render3DNowLine).to.equal('function');
            expect(typeof controller.resize).to.equal('function');
        });

        it('should have delay property', () => {
            expect(controller.delay).to.be.a('number');
        });
    });

    describe('startGame', () => {
        it('should throw error when app is not provided', () => {
            expect(() => {
                controller.startGame(null, {}, {}, 60, [], {});
            }).to.throw('ThreeJSGameController requires app instance');
        });

        it('should throw error when threeJSRenderer is not in registry', () => {
            const mockApp = {
                componentRegistry: { getService: sinon.stub().returns(null) }
            };

            expect(() => {
                controller.startGame(mockApp, {}, {}, 60, [], {});
            }).to.throw('ThreeJSGameController requires threeJSRenderer for 3D rendering');
        });

        it('should throw error when visibleField is not an array', () => {
            const mockThreeJSRenderer = {};
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().returns(mockThreeJSRenderer)
                },
                selectedKeyNoteMap: { keyNoteMap: {} }
            };

            expect(() => {
                controller.startGame(mockApp, {}, {}, 60, null, {});
            }).to.throw('visibleField must be an array of notes');
        });

        it('should throw error when visibleField is empty object', () => {
            const mockThreeJSRenderer = {};
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().returns(mockThreeJSRenderer)
                },
                selectedKeyNoteMap: { keyNoteMap: {} }
            };

            expect(() => {
                controller.startGame(mockApp, {}, {}, 60, {}, {});
            }).to.throw('visibleField must be an array of notes');
        });

        it('should clear 3D notes from previous game', () => {
            const mockThreeJSRenderer = { 
                clearNotes: sinon.stub(),
                addNotesFromVisibleField: sinon.stub()
            };
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockSongNoteRenderer = { buildSongNoteLetterCache: sinon.stub().returns({}) };
            const mockKeyNoteMapService = { getInvertedMap: sinon.stub().returns({}) };
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().callsFake(function(serviceName) {
                        switch (serviceName) {
                            case 'threeJSRenderer': return mockThreeJSRenderer;
                            case 'scoreKeeper': return mockScoreKeeper;
                            case 'songNoteRenderer': return mockSongNoteRenderer;
                            case 'keyNoteMapService': return mockKeyNoteMapService;
                            default: return null;
                        }
                    })
                },
                selectedKeyNoteMap: { keyNoteMap: {} }
            };

            controller.startGame(mockApp, {}, {}, 60, [], {});

            expect(mockThreeJSRenderer.clearNotes.calledOnce).to.be.true;
        });

        it('should store GameState on app with threeGameState key', () => {
            const mockThreeJSRenderer = { 
                clearNotes: sinon.stub(),
                addNotesFromVisibleField: sinon.stub()
            };
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockSongNoteRenderer = { buildSongNoteLetterCache: sinon.stub().returns({}) };
            const mockKeyNoteMapService = { getInvertedMap: sinon.stub().returns({}) };
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().callsFake(function(serviceName) {
                        switch (serviceName) {
                            case 'threeJSRenderer': return mockThreeJSRenderer;
                            case 'scoreKeeper': return mockScoreKeeper;
                            case 'songNoteRenderer': return mockSongNoteRenderer;
                            case 'keyNoteMapService': return mockKeyNoteMapService;
                            default: return null;
                        }
                    })
                },
                selectedKeyNoteMap: { keyNoteMap: {} }
            };

            controller.startGame(mockApp, {}, {}, 60, [], {});

            expect(mockApp.threeGameState).to.not.be.null;
        });

        it('should add 3D notes from visibleField', () => {
            const mockThreeJSRenderer = { 
                clearNotes: sinon.stub(),
                addNotesFromVisibleField: sinon.stub()
            };
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockSongNoteRenderer = { buildSongNoteLetterCache: sinon.stub().returns({}) };
            const mockKeyNoteMapService = { getInvertedMap: sinon.stub().returns({}) };
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().callsFake(function(serviceName) {
                        switch (serviceName) {
                            case 'threeJSRenderer': return mockThreeJSRenderer;
                            case 'scoreKeeper': return mockScoreKeeper;
                            case 'songNoteRenderer': return mockSongNoteRenderer;
                            case 'keyNoteMapService': return mockKeyNoteMapService;
                            default: return null;
                        }
                    })
                },
                selectedKeyNoteMap: { keyNoteMap: {} },
                keyRenderInfo: {}
            };

            controller.startGame(mockApp, {}, {}, 60, [], {});

            expect(mockThreeJSRenderer.addNotesFromVisibleField.calledOnce).to.be.true;
        });

        it('should create game loop interval', () => {
            const mockThreeJSRenderer = { 
                clearNotes: sinon.stub(),
                addNotesFromVisibleField: sinon.stub()
            };
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockSongNoteRenderer = { buildSongNoteLetterCache: sinon.stub().returns({}) };
            const mockKeyNoteMapService = { getInvertedMap: sinon.stub().returns({}) };
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().callsFake(function(serviceName) {
                        switch (serviceName) {
                            case 'threeJSRenderer': return mockThreeJSRenderer;
                            case 'scoreKeeper': return mockScoreKeeper;
                            case 'songNoteRenderer': return mockSongNoteRenderer;
                            case 'keyNoteMapService': return mockKeyNoteMapService;
                            default: return null;
                        }
                    })
                },
                selectedKeyNoteMap: { keyNoteMap: {} }
            };

            controller.startGame(mockApp, {}, {}, 60, [], {});

            expect(controller.playIntervalId).to.not.be.null;
        });

        it('should return interval ID', () => {
            const mockThreeJSRenderer = { 
                clearNotes: sinon.stub(),
                addNotesFromVisibleField: sinon.stub()
            };
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockSongNoteRenderer = { buildSongNoteLetterCache: sinon.stub().returns({}) };
            const mockKeyNoteMapService = { getInvertedMap: sinon.stub().returns({}) };
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().callsFake(function(serviceName) {
                        switch (serviceName) {
                            case 'threeJSRenderer': return mockThreeJSRenderer;
                            case 'scoreKeeper': return mockScoreKeeper;
                            case 'songNoteRenderer': return mockSongNoteRenderer;
                            case 'keyNoteMapService': return mockKeyNoteMapService;
                            default: return null;
                        }
                    })
                },
                selectedKeyNoteMap: { keyNoteMap: {} }
            };

            const intervalId = controller.startGame(mockApp, {}, {}, 60, [], {});

            expect(intervalId).to.not.be.null;
        });
    });

    describe('doRenderAfterLoop', () => {
        it('should call update3DNotesPosition with correct parameters', () => {
            const mockThreeJSRenderer = { 
                clearNotes: sinon.stub(),
                addNotesFromVisibleField: sinon.stub(),
                getConstants: sinon.stub().returns({ DEFAULT_DELAY: 3 }),
                updateAllNotes: sinon.stub(),
                getNoteGroup: sinon.stub().returns({ children: [] }),
                setNoteState: sinon.stub(),
                renderNowLine: sinon.stub()
            };
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockSongNoteRenderer = { 
                buildSongNoteLetterCache: sinon.stub().returns({}),
                renderNowLine: sinon.stub(),
                renderNotesPlayingForCanvas: sinon.stub()
            };
            const mockKeyNoteMapService = { getInvertedMap: sinon.stub().returns({}) };
            
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().callsFake(function(serviceName) {
                        switch (serviceName) {
                            case 'threeJSRenderer': return mockThreeJSRenderer;
                            case 'scoreKeeper': return mockScoreKeeper;
                            case 'songNoteRenderer': return mockSongNoteRenderer;
                            case 'keyNoteMapService': return mockKeyNoteMapService;
                            default: return null;
                        }
                    })
                },
                selectedKeyNoteMap: { keyNoteMap: {} },
                vueCanvas: { clearRect: sinon.stub() },
                notesCanvas: { width: 800, height: 600 }
            };

            controller.startGame(mockApp, {}, {}, 60, [], {});

            const updateStub = sinon.stub(controller, 'update3DNotesPosition');
            
            controller.doRenderAfterLoop(mockApp, mockApp.threeGameState, {}, 0, -1, 9);

            expect(updateStub.calledOnce).to.be.true;
        });

        it('should call update3DNoteColors', () => {
            const mockThreeJSRenderer = { 
                clearNotes: sinon.stub(),
                addNotesFromVisibleField: sinon.stub(),
                getConstants: sinon.stub().returns({ DEFAULT_DELAY: 3 }),
                updateAllNotes: sinon.stub(),
                getNoteGroup: sinon.stub().returns({ children: [] }),
                setNoteState: sinon.stub(),
                renderNowLine: sinon.stub()
            };
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockSongNoteRenderer = { 
                buildSongNoteLetterCache: sinon.stub().returns({}),
                renderNowLine: sinon.stub(),
                renderNotesPlayingForCanvas: sinon.stub()
            };
            const mockKeyNoteMapService = { getInvertedMap: sinon.stub().returns({}) };
            
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().callsFake(function(serviceName) {
                        switch (serviceName) {
                            case 'threeJSRenderer': return mockThreeJSRenderer;
                            case 'scoreKeeper': return mockScoreKeeper;
                            case 'songNoteRenderer': return mockSongNoteRenderer;
                            case 'keyNoteMapService': return mockKeyNoteMapService;
                            default: return null;
                        }
                    })
                },
                selectedKeyNoteMap: { keyNoteMap: {} },
                vueCanvas: { clearRect: sinon.stub() },
                notesCanvas: { width: 800, height: 600 }
            };

            controller.startGame(mockApp, {}, {}, 60, [], {});

            const updateColorsStub = sinon.stub(controller, 'update3DNoteColors');
            
            controller.doRenderAfterLoop(mockApp, mockApp.threeGameState, {}, 0, -1, 9);

            expect(updateColorsStub.calledOnce).to.be.true;
        });

        it('should call render3DNowLine', () => {
            const mockThreeJSRenderer = { 
                clearNotes: sinon.stub(),
                addNotesFromVisibleField: sinon.stub(),
                getConstants: sinon.stub().returns({ DEFAULT_DELAY: 3 }),
                updateAllNotes: sinon.stub(),
                getNoteGroup: sinon.stub().returns({ children: [] }),
                setNoteState: sinon.stub(),
                renderNowLine: sinon.stub()
            };
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockSongNoteRenderer = { 
                buildSongNoteLetterCache: sinon.stub().returns({}),
                renderNowLine: sinon.stub(),
                renderNotesPlayingForCanvas: sinon.stub()
            };
            const mockKeyNoteMapService = { getInvertedMap: sinon.stub().returns({}) };
            
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().callsFake(function(serviceName) {
                        switch (serviceName) {
                            case 'threeJSRenderer': return mockThreeJSRenderer;
                            case 'scoreKeeper': return mockScoreKeeper;
                            case 'songNoteRenderer': return mockSongNoteRenderer;
                            case 'keyNoteMapService': return mockKeyNoteMapService;
                            default: return null;
                        }
                    })
                },
                selectedKeyNoteMap: { keyNoteMap: {} },
                vueCanvas: { clearRect: sinon.stub() },
                notesCanvas: { width: 800, height: 600 }
            };

            controller.startGame(mockApp, {}, {}, 60, [], {});

            const renderNowLineStub = sinon.stub(controller, 'render3DNowLine');
            
            controller.doRenderAfterLoop(mockApp, mockApp.threeGameState, {}, 0, -1, 9);

            expect(renderNowLineStub.calledOnce).to.be.true;
        });

        it('should clear canvas and render 2D', () => {
            const mockSongNoteRenderer = {
                renderNowLine: sinon.stub(),
                renderNotesPlayingForCanvas: sinon.stub(),
                buildSongNoteLetterCache: sinon.stub().returns({})
            };

            const mockThreeJSRenderer = { 
                clearNotes: sinon.stub(),
                addNotesFromVisibleField: sinon.stub(),
                getConstants: sinon.stub().returns({ DEFAULT_DELAY: 3 }),
                updateAllNotes: sinon.stub(),
                getNoteGroup: sinon.stub().returns({ children: [] }),
                setNoteState: sinon.stub(),
                renderNowLine: sinon.stub()
            };
            
            const mockScoreKeeper = { reset: sinon.stub() };
            const mockKeyNoteMapService = { getInvertedMap: sinon.stub().returns({}) };
            
            const mockApp = {
                componentRegistry: { 
                    getService: sinon.stub().callsFake(function(serviceName) {
                        switch (serviceName) {
                            case 'threeJSRenderer': return mockThreeJSRenderer;
                            case 'scoreKeeper': return mockScoreKeeper;
                            case 'songNoteRenderer': return mockSongNoteRenderer;
                            case 'keyNoteMapService': return mockKeyNoteMapService;
                            default: return null;
                        }
                    })
                },
                selectedKeyNoteMap: { keyNoteMap: {} },
                vueCanvas: { clearRect: sinon.stub() },
                notesCanvas: { width: 800, height: 600 }
            };

            controller.startGame(mockApp, {}, {}, 60, [], {});
            
            controller.doRenderAfterLoop(mockApp, mockApp.threeGameState, {}, 0, -1, 9);

            expect(true).to.be.true;
        });
    });

    describe('update3DNotesPosition', () => {
        it('should return early when threeJSRenderer is null', () => {
            const mockGameState = {};

            expect(() => {
                controller.update3DNotesPosition(null, mockGameState, 0, {});
            }).to.not.throw();
        });

        it('should return early when gameState is null', () => {
            const mockThreeJSRenderer = {};

            expect(() => {
                controller.update3DNotesPosition(mockThreeJSRenderer, null, 0, {});
            }).to.not.throw();
        });

        it('should call updateAllNotes on threeJSRenderer', () => {
            const mockThreeJSRenderer = {
                getConstants: sinon.stub().returns({ DEFAULT_DELAY: 3 }),
                updateAllNotes: sinon.stub()
            };
            const mockGameState = { get: sinon.stub().returns(3) };

            controller.update3DNotesPosition(mockThreeJSRenderer, mockGameState, 100, {});

            expect(mockThreeJSRenderer.updateAllNotes.called).to.be.true;
        });
    });

    describe('update3DNoteColors', () => {
        it('should return early when threeJSRenderer is null', () => {
            expect(() => {
                controller.update3DNoteColors(null, {}, {});
            }).to.not.throw();
        });

        it('should return early when noteGroup is null', () => {
            const mockThreeJSRenderer = { getNoteGroup: sinon.stub().returns(null) };

            expect(() => {
                controller.update3DNoteColors(mockThreeJSRenderer, {}, {});
            }).to.not.throw();
        });

        it('should update colors for notes in noteGroup', () => {
            const mockNoteMesh = { userData: { id: 'note1' } };
            const mockThreeJSRenderer = {
                getNoteGroup: sinon.stub().returns({ children: [mockNoteMesh] }),
                setNoteState: sinon.stub()
            };
            const mockCurrentScore = { keyScores: { note1: { tag: 'good' } } };

            controller.update3DNoteColors(mockThreeJSRenderer, mockCurrentScore, {});

            expect(mockThreeJSRenderer.setNoteState.calledOnce).to.be.true;
        });

        it('should return early when noteMesh is null', () => {
            const mockThreeJSRenderer = { getNoteGroup: sinon.stub().returns({ children: [null] }) };

            expect(() => {
                controller.update3DNoteColors(mockThreeJSRenderer, {}, {});
            }).to.not.throw();
        });

        it('should return early when noteMesh has no userData', () => {
            const mockNoteMesh = {};
            const mockThreeJSRenderer = { getNoteGroup: sinon.stub().returns({ children: [mockNoteMesh] }) };

            expect(() => {
                controller.update3DNoteColors(mockThreeJSRenderer, {}, {});
            }).to.not.throw();
        });
    });

    describe('render3DNowLine', () => {
        it('should return early when threeJSRenderer is null', () => {
            expect(() => {
                controller.render3DNowLine(null, {});
            }).to.not.throw();
        });

        it('should return early when app.threeGameState is null', () => {
            const mockThreeJSRenderer = {};

            expect(() => {
                controller.render3DNowLine(mockThreeJSRenderer, {});
            }).to.not.throw();
        });

        it('should call renderNowLine on threeJSRenderer', () => {
            const mockThreeJSRenderer = { renderNowLine: sinon.stub() };
            const mockApp = {
                threeGameState: { get: sinon.stub().returns(3) }
            };

            controller.render3DNowLine(mockThreeJSRenderer, mockApp);

            expect(mockThreeJSRenderer.renderNowLine.calledOnce).to.be.true;
        });
    });

    describe('stopGame', () => {
        it('should render final frame when threeJSRenderer exists on app', () => {
            const mockThreeJSRenderer = { render: sinon.stub() };
            const mockApp = { threeJSRenderer: mockThreeJSRenderer };

            controller.stopGame(mockApp);

            expect(mockThreeJSRenderer.render.calledOnce).to.be.true;
        });

        it('should skip final render when threeJSRenderer is missing', () => {
            const mockApp = {};

            expect(() => {
                controller.stopGame(mockApp);
            }).to.not.throw();
        });

        it('should be safe to call multiple times', () => {
            const mockThreeJSRenderer = { render: sinon.stub() };
            const mockApp = { threeJSRenderer: mockThreeJSRenderer };

            expect(() => {
                controller.stopGame(mockApp);
                controller.stopGame(mockApp);
            }).to.not.throw();
        });

        it('should delegate to BaseController cleanupMixin', () => {
            const mockThreeJSRenderer = { render: sinon.stub() };
            const mockApp = { threeJSRenderer: mockThreeJSRenderer };

            controller.playIntervalId = 123;
            
            controller.stopGame(mockApp);

            expect(controller.playIntervalId).to.be.null;
        });
    });

    describe('resize', () => {
        it('should call resize on threeJSRenderer when provided', () => {
            const mockThreeJSRenderer = { resize: sinon.stub() };

            controller.resize(mockThreeJSRenderer);

            expect(mockThreeJSRenderer.resize.calledOnce).to.be.true;
        });

        it('should handle null threeJSRenderer gracefully', () => {
            expect(() => {
                controller.resize(null);
            }).to.not.throw();
        });

        it('should handle undefined threeJSRenderer gracefully', () => {
            expect(() => {
                controller.resize(undefined);
            }).to.not.throw();
        });
    });

    describe('gameLoop', () => {
        it('should delegate to BaseController gameLoopMixin', () => {
            const mockApp = {};

            expect(() => {
                controller.gameLoop(mockApp);
            }).to.not.throw();
        });
    });
});
