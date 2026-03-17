import { expect } from 'chai';
import sinon from 'sinon';
import { 
    BaseGameMode, 
    TwoDMode, 
    ThreeDMode,
    createTwoDMode,
    createThreeDMode,
    createGameMode 
} from './GameModeStrategy.js';

describe('GameModeStrategy', function() {
    describe('BaseGameMode', function() {
        it('should have a modeId property after construction', function() {
            const baseMode = new BaseGameMode('test');
            expect(baseMode.modeId).to.equal('test');
        });

        it('should have onMount method that does nothing by default', function() {
            const baseMode = new BaseGameMode('test');
            expect(baseMode.onMount).to.be.a('function');
            
            const result = baseMode.onMount({}, {}, {});
            expect(result).to.be.undefined;
        });

        it('should have beforeUnmount method that handles missing inputHandler gracefully', function() {
            const baseMode = new BaseGameMode('test');
            
            expect(() => baseMode.beforeUnmount({})).to.not.throw();
        });

        it('should call removeKeyListeners on inputHandler if present', function() {
            const baseMode = new BaseGameMode('test');
            const mockInputHandler = { removeKeyListeners: sinon.stub() };

            baseMode.beforeUnmount({ inputHandler: mockInputHandler });

            expect(mockInputHandler.removeKeyListeners.calledOnce).to.be.true;
        });

        it('should have renderNotesForMode method that does nothing by default', function() {
            const baseMode = new BaseGameMode('test');
            
            expect(baseMode.renderNotesForMode).to.be.a('function');
            const result = baseMode.renderNotesForMode([], {}, {});
            expect(result).to.be.undefined;
        });

        it('should throw error when getControllerFactory is called on base class', function() {
            const baseMode = new BaseGameMode('test');
            
            expect(() => baseMode.getControllerFactory()).to.throw(
                'getControllerFactory() must be implemented by test mode'
            );
        });

        it('should have postInit method that does nothing by default', function() {
            const baseMode = new BaseGameMode('test');
            
            expect(baseMode.postInit).to.be.a('function');
            const result = baseMode.postInit({}, {});
            expect(result).to.be.undefined;
        });

        it('should have customUnmount method that does nothing by default', function() {
            const baseMode = new BaseGameMode('test');
            
            expect(baseMode.customUnmount).to.be.a('function');
            const result = baseMode.customUnmount({});
            expect(result).to.be.undefined;
        });
    });

    describe('TwoDMode', function() {
        let twoDMode;

        beforeEach(function() {
            twoDMode = new TwoDMode();
        });

        it('should have modeId set to "2d"', function() {
            expect(twoDMode.modeId).to.equal('2d');
        });

        it('should call onMount without throwing', function() {
            expect(() => twoDMode.onMount({}, {})).to.not.throw();
        });

        it('should call renderNotesForMode without throwing', function() {
            expect(() => twoDMode.renderNotesForMode([], {}, {})).to.not.throw();
        });

        it('should return a controller factory function from getControllerFactory', function() {
            const factory = twoDMode.getControllerFactory();
            expect(factory).to.be.a('function');
        });

        it('should call customUnmount without throwing', function() {
            expect(() => twoDMode.customUnmount({})).to.not.throw();
        });

        it('should call postInit without throwing', function() {
            expect(() => twoDMode.postInit({}, {})).to.not.throw();
        });
    });

    describe('ThreeDMode', function() {
        let threeDMode;
        let mockTHREE;
        let mockFontLoader;
        let mockTextGeometry;

        beforeEach(function() {
            threeDMode = new ThreeDMode();
            
            mockTHREE = {};
            mockFontLoader = function() {};
            mockTextGeometry = function() {};
        });

        it('should have modeId set to "3d"', function() {
            expect(threeDMode.modeId).to.equal('3d');
        });

        it('should throw error when onMount called without THREE dependency', function() {
            expect(() => threeDMode.onMount({}, {}, {})).to.throw(
                'Three.js libraries not loaded: THREE, FontLoader, TextGeometry required'
            );
        });

        it('should throw error when onMount called without FontLoader dependency', function() {
            expect(() => threeDMode.onMount({}, {}, { THREE: mockTHREE })).to.throw(
                'Three.js libraries not loaded: THREE, FontLoader, TextGeometry required'
            );
        });

        it('should throw error when onMount called without TextGeometry dependency', function() {
            expect(() => threeDMode.onMount({}, {}, { 
                THREE: mockTHREE,
                FontLoader: mockFontLoader 
            })).to.throw(
                'Three.js libraries not loaded: THREE, FontLoader, TextGeometry required'
            );
        });

        it('should return a controller factory function from getControllerFactory', function() {
            const factory = threeDMode.getControllerFactory();
            expect(factory).to.be.a('function');
        });

        it('should call customUnmount without throwing when threeJSRenderer is missing', function() {
            expect(() => threeDMode.customUnmount({})).to.not.throw();
        });

        it('should call dispose on threeJSRenderer if present', function() {
            const mockThreeJSRenderer = { dispose: sinon.stub() };
            
            threeDMode.customUnmount({ threeJSRenderer: mockThreeJSRenderer });

            expect(mockThreeJSRenderer.dispose.calledOnce).to.be.true;
        });

        it('should call clearInterval on cameraUpdateLoop if present', function() {
            const mockClearInterval = sinon.stub();
            
            // Stub clearInterval at both global levels (Node.js vs browser)
            const originalGlobalClearInterval = global.clearInterval;
            
            if (typeof window !== 'undefined') {
                const originalWindowClearInterval = window.clearInterval;
                
                global.clearInterval = mockClearInterval;
                window.clearInterval = mockClearInterval;

                threeDMode.customUnmount({ 
                    cameraUpdateLoop: 123
                });

                expect(mockClearInterval.calledWith(123)).to.be.true;

                window.clearInterval = originalWindowClearInterval;
            } else {
                global.clearInterval = mockClearInterval;

                threeDMode.customUnmount({ 
                    cameraUpdateLoop: 123
                });

                expect(mockClearInterval.calledWith(123)).to.be.true;
            }

            global.clearInterval = originalGlobalClearInterval;
        });

        it('should call renderNotesForMode without throwing when threeJSRenderer is missing', function() {
            expect(() => threeDMode.renderNotesForMode([], {}, {})).to.not.throw();
        });

        it('should call renderNotesForMode without throwing when keyRenderInfo is missing', function() {
            const mockThreeJSRenderer = {};
            
            expect(() => threeDMode.renderNotesForMode([], null, { 
                threeJSRenderer: mockThreeJSRenderer 
            })).to.not.throw();
        });

        it('should call addNotesFromVisibleField on threeJSRenderer when both are present', function() {
            const mockThreeJSRenderer = { 
                addNotesFromVisibleField: sinon.stub() 
            };
            const visibleField = [{ id: 'C4_0' }];
            const keyRenderInfo = { width: 800 };

            threeDMode.renderNotesForMode(visibleField, keyRenderInfo, { 
                threeJSRenderer: mockThreeJSRenderer 
            });

            expect(mockThreeJSRenderer.addNotesFromVisibleField.calledOnce).to.be.true;
            expect(mockThreeJSRenderer.addNotesFromVisibleField.calledWith(visibleField, keyRenderInfo)).to.be.true;
        });
    });

    describe('createTwoDMode factory', function() {
        it('should return a TwoDMode instance', function() {
            const mode = createTwoDMode();
            
            expect(mode).to.be.an.instanceOf(TwoDMode);
            expect(mode.modeId).to.equal('2d');
        });

        it('should return a new instance each time', function() {
            const mode1 = createTwoDMode();
            const mode2 = createTwoDMode();

            expect(mode1).to.not.equal(mode2);
        });
    });

    describe('createThreeDMode factory', function() {
        it('should return a ThreeDMode instance', function() {
            const mode = createThreeDMode();
            
            expect(mode).to.be.an.instanceOf(ThreeDMode);
            expect(mode.modeId).to.equal('3d');
        });

        it('should return a new instance each time', function() {
            const mode1 = createThreeDMode();
            const mode2 = createThreeDMode();

            expect(mode1).to.not.equal(mode2);
        });
    });

    describe('createGameMode factory', function() {
        it('should create TwoDMode when passed "2d"', function() {
            const mode = createGameMode('2d');
            
            expect(mode).to.be.an.instanceOf(TwoDMode);
            expect(mode.modeId).to.equal('2d');
        });

        it('should create ThreeDMode when passed "3d"', function() {
            const mode = createGameMode('3d');
            
            expect(mode).to.be.an.instanceOf(ThreeDMode);
            expect(mode.modeId).to.equal('3d');
        });

        it('should throw error for unknown mode type', function() {
            expect(() => createGameMode('vr')).to.throw('Unknown game mode: vr');
        });

        it('should throw error for empty string mode type', function() {
            expect(() => createGameMode('')).to.throw('Unknown game mode:');
        });

        it('should throw error for null mode type', function() {
            expect(() => createGameMode(null)).to.throw('Unknown game mode: null');
        });

        it('should throw error for undefined mode type', function() {
            expect(() => createGameMode(undefined)).to.throw('Unknown game mode: undefined');
        });
    });

    describe('Mode extensibility', function() {
        it('should allow creating custom mode by extending BaseGameMode', function() {
            class CustomTestMode extends BaseGameMode {
                constructor() {
                    super('custom');
                }

                getControllerFactory() {
                    return function() { return 'custom controller'; };
                }

                onMount(app, registry) {
                    app.customInitialized = true;
                }
            }

            const customMode = new CustomTestMode();

            expect(customMode.modeId).to.equal('custom');
            expect(customMode.getControllerFactory()).to.be.a('function');

            const mockApp = {};
            customMode.onMount(mockApp, {});
            
            expect(mockApp.customInitialized).to.be.true;
        });

        it('should allow custom mode to override beforeUnmount', function() {
            let cleanupCalled = false;

            class CustomCleanupMode extends BaseGameMode {
                constructor() {
                    super('cleanup');
                }

                getControllerFactory() {
                    return function() { return 'controller'; };
                }

                customUnmount(app) {
                    cleanupCalled = true;
                }
            }

            const customMode = new CustomCleanupMode();
            customMode.customUnmount({});

            expect(cleanupCalled).to.be.true;
        });
    });
});
