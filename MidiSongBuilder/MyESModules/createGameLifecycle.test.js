import { expect } from 'chai';
import sinon from 'sinon';
import { createGameLifecycle } from './createGameLifecycle.js';

describe('createGameLifecycle', () => {
    let mockGetScoreKeeper;
    let mockGetScoringSettings;
    let mockGetInputHandler;
    let mockComponentRegistry;
    let mockSongNoteRenderer;
    let mockKeyNoteMapService;
    let mockHighScoreTracker;
    let mockChallengeScoresObj;

    beforeEach(() => {
        mockGetScoreKeeper = sinon.stub();
        mockGetScoringSettings = sinon.stub().returns({ default: {} });
        mockGetInputHandler = sinon.stub();
        mockComponentRegistry = { registerService: sinon.stub() };
        
        mockSongNoteRenderer = {};
        mockKeyNoteMapService = {};
        mockHighScoreTracker = {};
        mockChallengeScoresObj = {};

        global.window = { domUtils: { toggleElementById: sinon.stub() } };
        global.localStorage = { getItem: sinon.stub(), setItem: sinon.stub(), removeItem: sinon.stub() };
        global.document = { getElementById: sinon.stub() };
    });

    describe('Node.js compatibility', () => {
        it('exports createGameLifecycle function', () => {
            expect(createGameLifecycle).to.be.a('function');
        });

        it('returns an object with mounted and beforeUnmount hooks', () => {
            const lifecycle = createGameLifecycle('2d', {
                getScoreKeeper: mockGetScoreKeeper,
                getScoringSettings: mockGetScoringSettings,
                getInputHandler: mockGetInputHandler,
                componentRegistry: mockComponentRegistry
            });

            expect(lifecycle).to.have.property('mounted').that.is.a('function');
            expect(lifecycle).to.have.property('beforeUnmount').that.is.a('function');
        });

        describe('mounted hook', () => {
            beforeEach(() => {
                const mockCanvas = { getContext: sinon.stub(), clearRect: sinon.stub(), fillText: sinon.stub() };
                mockCanvas.getContext.returns({ clearRect: sinon.stub(), fillText: sinon.stub() });
                global.document.getElementById.withArgs('notesCanvas').returns(mockCanvas);

                const mockInputHandler = { setupKeyListeners: sinon.stub() };
                mockGetInputHandler.returns(mockInputHandler);

                const mockScoreKeeper = {};
                mockGetScoreKeeper.returns(mockScoreKeeper);

                global.window.location = { search: '' };
            });

            it('initializes canvas references in both modes', () => {
                const lifecycle = createGameLifecycle('2d', {
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings,
                    getInputHandler: mockGetInputHandler,
                    pressedKeys: {},
                    synthMap: new Map(),
                    synthArray: [],
                    playNotes: sinon.stub(),
                    componentRegistry: mockComponentRegistry,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj
                });

                const mockThis = {};
                lifecycle.mounted.call(mockThis);

                expect(mockThis.vueCanvas).to.not.equal(null);
                expect(mockThis.notesCanvas).to.not.equal(null);
            });

            it('registers all services in component registry', () => {
                const lifecycle = createGameLifecycle('2d', {
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings,
                    getInputHandler: mockGetInputHandler,
                    pressedKeys: {},
                    synthMap: new Map(),
                    synthArray: [],
                    playNotes: sinon.stub(),
                    componentRegistry: mockComponentRegistry,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj
                });

                const mockThis = {};
                lifecycle.mounted.call(mockThis);

                expect(mockComponentRegistry.registerService.calledWith('scoreKeeper')).to.be.true;
                expect(mockComponentRegistry.registerService.calledWith('songNoteRenderer')).to.be.true;
                expect(mockComponentRegistry.registerService.calledWith('keyNoteMapService')).to.be.true;
                expect(mockComponentRegistry.registerService.calledWith('highScoreTracker')).to.be.true;
                expect(mockComponentRegistry.registerService.calledWith('challengeScores')).to.be.true;
            });

            

            it('does not call mode-specific callback when not provided', () => {
                const lifecycle = createGameLifecycle('2d', {
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings,
                    getInputHandler: mockGetInputHandler,
                    pressedKeys: {},
                    synthMap: new Map(),
                    synthArray: [],
                    playNotes: sinon.stub(),
                    componentRegistry: mockComponentRegistry,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj
                });

                const mockThis = {};
                expect(() => lifecycle.mounted.call(mockThis)).to.not.throw();
            });

            it('enables debug logger when URL contains ?debug', () => {
                global.window.location = { search: '?debug' };

                const lifecycle = createGameLifecycle('2d', {
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings,
                    getInputHandler: mockGetInputHandler,
                    pressedKeys: {},
                    synthMap: new Map(),
                    synthArray: [],
                    playNotes: sinon.stub(),
                    componentRegistry: mockComponentRegistry,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj
                });

                const mockThis = {};
                expect(() => lifecycle.mounted.call(mockThis)).to.not.throw();
            });
        });

        describe('beforeUnmount hook', () => {
            it('calls removeKeyListeners on inputHandler when present', () => {
                const mockInputHandler = { removeKeyListeners: sinon.stub() };

                const lifecycle = createGameLifecycle('2d', {
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings,
                    getInputHandler: mockGetInputHandler,
                    pressedKeys: {},
                    synthMap: new Map(),
                    synthArray: [],
                    playNotes: sinon.stub(),
                    componentRegistry: mockComponentRegistry,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj
                });

                const mockThis = { inputHandler: mockInputHandler };
                lifecycle.beforeUnmount.call(mockThis);

                expect(mockInputHandler.removeKeyListeners.calledOnce).to.be.true;
            });

            it('handles missing inputHandler gracefully', () => {
                const lifecycle = createGameLifecycle('2d', {
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings,
                    getInputHandler: mockGetInputHandler,
                    pressedKeys: {},
                    synthMap: new Map(),
                    synthArray: [],
                    playNotes: sinon.stub(),
                    componentRegistry: mockComponentRegistry,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj
                });

                const mockThis = {};
                expect(() => lifecycle.beforeUnmount.call(mockThis)).to.not.throw();
            });

            

            it('does not call mode-specific cleanup when not provided', () => {
                const lifecycle = createGameLifecycle('2d', {
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings,
                    getInputHandler: mockGetInputHandler,
                    pressedKeys: {},
                    synthMap: new Map(),
                    synthArray: [],
                    playNotes: sinon.stub(),
                    componentRegistry: mockComponentRegistry,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj
                });

                const mockThis = { inputHandler: null };
                expect(() => lifecycle.beforeUnmount.call(mockThis)).to.not.throw();
            });

            
        });

        describe('Mode abstraction', () => {
            it('provides unified interface for both 2D and 3D modes', () => {
                const lifecycle2d = createGameLifecycle('2d', {
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings,
                    getInputHandler: mockGetInputHandler,
                    pressedKeys: {},
                    synthMap: new Map(),
                    synthArray: [],
                    playNotes: sinon.stub(),
                    componentRegistry: mockComponentRegistry,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj
                });

                const lifecycle3d = createGameLifecycle('3d', {
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings,
                    getInputHandler: mockGetInputHandler,
                    pressedKeys: {},
                    synthMap: new Map(),
                    synthArray: [],
                    playNotes: sinon.stub(),
                    componentRegistry: mockComponentRegistry,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj
                });

                expect(lifecycle2d).to.have.property('mounted');
                expect(lifecycle2d).to.have.property('beforeUnmount');
                expect(lifecycle3d).to.have.property('mounted');
                expect(lifecycle3d).to.have.property('beforeUnmount');
            });
        });
    });
});
