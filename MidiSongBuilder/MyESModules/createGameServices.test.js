import { expect } from 'chai';
import sinon from 'sinon';
import { createGameServices } from './createGameServices.js';

describe('createGameServices', () => {
    let mockMidiParser;
    let mockSongNoteRenderer;
    let mockKeyNoteMapService;
    let mockComponentRegistry;
    let mockGetScoreKeeper;
    let mockGetScoringSettings;

    beforeEach(() => {
        mockMidiParser = { parseMidiArrayBuffer: sinon.stub() };
        mockSongNoteRenderer = {};
        mockKeyNoteMapService = {};
        mockComponentRegistry = { registerService: sinon.stub() };
        mockGetScoreKeeper = sinon.stub();
        mockGetScoringSettings = sinon.stub();
    });

    describe('Node.js compatibility', () => {
        it('exports createGameServices function', () => {
            expect(createGameServices).to.be.a('function');
        });

        it('returns an object with provide method', () => {
            const services = createGameServices({
                midiParser: mockMidiParser,
                songNoteRenderer: mockSongNoteRenderer,
                keyNoteMapService: mockKeyNoteMapService,
                componentRegistry: mockComponentRegistry,
                getScoreKeeper: mockGetScoreKeeper,
                getScoringSettings: mockGetScoringSettings
            });

            expect(services).to.have.property('provide').that.is.a('function');
        });

        describe('provide method', () => {
            it('provides all required services for dependency injection', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided).to.have.property('$midiParser');
                expect(provided).to.have.property('$songNoteRenderer');
                expect(provided).to.have.property('$keyNoteMapService');
                expect(provided).to.have.property('$registry');
                expect(provided).to.have.property('$getScoreKeeper');
                expect(provided).to.have.property('$getScoringSettings');
            });

            it('provides correct midiParser instance', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided.$midiParser).to.equal(mockMidiParser);
            });

            it('provides correct songNoteRenderer instance', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided.$songNoteRenderer).to.equal(mockSongNoteRenderer);
            });

            it('provides correct keyNoteMapService instance', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided.$keyNoteMapService).to.equal(mockKeyNoteMapService);
            });

            it('provides componentRegistry as $registry', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided.$registry).to.equal(mockComponentRegistry);
            });

            it('provides getScoreKeeper factory function', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided.$getScoreKeeper).to.equal(mockGetScoreKeeper);
                expect(provided.$getScoreKeeper).to.be.a('function');
            });

            it('provides getScoringSettings function', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided.$getScoringSettings).to.equal(mockGetScoringSettings);
                expect(provided.$getScoringSettings).to.be.a('function');
            });

            it('returns consistent object on multiple provide calls', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided1 = services.provide();
                const provided2 = services.provide();

                expect(provided1.$midiParser).to.equal(provided2.$midiParser);
                expect(provided1.$songNoteRenderer).to.equal(provided2.$songNoteRenderer);
                expect(provided1.$keyNoteMapService).to.equal(provided2.$keyNoteMapService);
                expect(provided1.$registry).to.equal(provided2.$registry);
            });
        });

        describe('Service contract verification', () => {
            it('$midiParser has required parseMidiArrayBuffer method', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided.$midiParser).to.have.property('parseMidiArrayBuffer').that.is.a('function');
            });

            it('$registry has required registerService method', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided.$registry).to.have.property('registerService').that.is.a('function');
            });

            it('$getScoreKeeper and $getScoringSettings are callable', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(() => {
                    provided.$getScoreKeeper('some', 'args');
                    provided.$getScoringSettings();
                }).to.not.throw();
            });

            it('mocks are correctly called when services invoke them', () => {
                const mockScoreKeeperResult = { score: 0 };
                const mockScoringSettingsResult = { good: 10, ok: 5 };
                mockGetScoreKeeper.returns(mockScoreKeeperResult);
                mockGetScoringSettings.returns(mockScoringSettingsResult);

                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                expect(provided.$getScoreKeeper('test')).to.deep.equal({ score: 0 });
                expect(mockGetScoreKeeper.calledWith('test')).to.be.true;

                expect(provided.$getScoringSettings()).to.deep.equal({ good: 10, ok: 5 });
                expect(mockGetScoringSettings.calledOnce).to.be.true;
            });
        });

        describe('Vue provide/inject pattern compatibility', () => {
            it('returns object suitable for Vue 3 provide()', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                // Vue 3 provide() should return a plain object
                const provided = services.provide();

                expect(typeof provided).to.equal('object');
                expect(Array.isArray(provided)).to.be.false;
            });

            it('uses $ prefix convention for injected services', () => {
                const services = createGameServices({
                    midiParser: mockMidiParser,
                    songNoteRenderer: mockSongNoteRenderer,
                    keyNoteMapService: mockKeyNoteMapService,
                    componentRegistry: mockComponentRegistry,
                    getScoreKeeper: mockGetScoreKeeper,
                    getScoringSettings: mockGetScoringSettings
                });

                const provided = services.provide();

                Object.keys(provided).forEach(key => {
                    expect(key.startsWith('$')).to.be.true;
                });
            });
        });
    });
});
