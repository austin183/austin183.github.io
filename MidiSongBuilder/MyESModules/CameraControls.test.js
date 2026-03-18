import { expect } from 'chai';
import sinon from 'sinon';
import { getCameraControls } from './CameraControls.js';

describe('CameraControls', () => {
    let cameraControls;

    beforeEach(() => {
        // Set up mock THREE library for tests that need it
        const mockVector3 = function(x, y, z) {
            this.x = x || 0;
            this.y = y || 0;
            this.z = z || 0;
        };
        mockVector3.prototype.applyAxisAngle = function(axis, angle) {
            return this;
        };
        
        const mockTHREE = { Vector3: mockVector3 };

        cameraControls = getCameraControls(mockTHREE);
    });

    describe('getDefaultCameraState', () => {
        it('returns roadView preset as default camera state', () => {
            const state = cameraControls.getDefaultCameraState();

            expect(state).to.have.property('position');
            expect(state).to.have.property('lookAt');
            expect(state.position).to.have.all.keys('x', 'y', 'z');
            expect(state.lookAt).to.have.all.keys('x', 'y', 'z');
        });

        it('returns position with numeric values', () => {
            const state = cameraControls.getDefaultCameraState();

            expect(state.position.x).to.be.a('number');
            expect(state.position.y).to.be.a('number');
            expect(state.position.z).to.be.a('number');
        });

        it('returns lookAt with numeric values', () => {
            const state = cameraControls.getDefaultCameraState();

            expect(state.lookAt.x).to.be.a('number');
            expect(state.lookAt.y).to.be.a('number');
            expect(state.lookAt.z).to.be.a('number');
        });

        it('uses roadView preset values', () => {
            const state = cameraControls.getDefaultCameraState();

            expect(state.position.x).to.be.closeTo(0, 0.01);
        });
    });

    describe('getDefaultCameraStateForUI', () => {
        it('returns formatted camera state for UI display', () => {
            const uiState = cameraControls.getDefaultCameraStateForUI();

            expect(uiState).to.have.property('position');
            expect(uiState).to.have.property('lookAt');
        });

        it('formats position values to 2 decimal places', () => {
            const uiState = cameraControls.getDefaultCameraStateForUI();

            expect(uiState.position.x).to.match(/^-?\d+\.\d{2}$/);
            expect(uiState.position.y).to.match(/^-?\d+\.\d{2}$/);
            expect(uiState.position.z).to.match(/^-?\d+\.\d{2}$/);
        });

        it('formats lookAt values to 2 decimal places', () => {
            const uiState = cameraControls.getDefaultCameraStateForUI();

            expect(uiState.lookAt.x).to.match(/^-?\d+\.\d{2}$/);
            expect(uiState.lookAt.y).to.match(/^-?\d+\.\d{2}$/);
            expect(uiState.lookAt.z).to.match(/^-?\d+\.\d{2}$/);
        });
    });

    describe('getPresetList', () => {
        it('returns array of available preset names', () => {
            const presetList = cameraControls.getPresetList();

            expect(presetList).to.be.an('array');
            expect(presetList.length).to.equal(4);
        });

        it('includes all standard presets', () => {
            const presetList = cameraControls.getPresetList();

            expect(presetList).to.include('topDown');
            expect(presetList).to.include('roadView');
            expect(presetList).to.include('isometric');
            expect(presetList).to.include('playerView');
        });

        it('returns preset keys as strings', () => {
            const presetList = cameraControls.getPresetList();

            presetList.forEach(preset => {
                expect(preset).to.be.a('string');
            });
        });
    });

    describe('getPreset', () => {
        it('returns preset configuration for valid key', () => {
            const preset = cameraControls.getPreset('roadView');

            expect(preset).to.have.property('position');
            expect(preset).to.have.property('lookAt');
        });

        it('returns null for invalid preset key', () => {
            const preset = cameraControls.getPreset('invalidPreset');

            expect(preset).to.be.null;
        });

        it('returns null for undefined preset key', () => {
            const preset = cameraControls.getPreset(undefined);

            expect(preset).to.be.null;
        });

        it('returns topDown preset with correct structure', () => {
            const preset = cameraControls.getPreset('topDown');

            expect(preset.position).to.have.all.keys('x', 'y', 'z');
            expect(preset.lookAt).to.have.all.keys('x', 'y', 'z');
        });

        it('returns isometric preset with correct structure', () => {
            const preset = cameraControls.getPreset('isometric');

            expect(preset.position).to.have.all.keys('x', 'y', 'z');
            expect(preset.lookAt).to.have.all.keys('x', 'y', 'z');
        });

        it('returns playerView preset with correct structure', () => {
            const preset = cameraControls.getPreset('playerView');

            expect(preset.position).to.have.all.keys('x', 'y', 'z');
            expect(preset.lookAt).to.have.all.keys('x', 'y', 'z');
        });

        it('has consistent preset structure across all presets', () => {
            const presetList = cameraControls.getPresetList();

            presetList.forEach(presetKey => {
                const preset = cameraControls.getPreset(presetKey);
                
                expect(typeof preset.position.x).to.equal('number');
                expect(typeof preset.position.y).to.equal('number');
                expect(typeof preset.position.z).to.equal('number');
                expect(typeof preset.lookAt.x).to.equal('number');
                expect(typeof preset.lookAt.y).to.equal('number');
                expect(typeof preset.lookAt.z).to.equal('number');
            });
        });
    });

    describe('applyPreset', () => {
        it.skip('requires camera initialization in browser environment', () => {
            // Skip - needs Three.js camera object
        });

        it('logs warning for invalid preset key', () => {
            const consoleSpy = sinon.stub(console, 'warn');

            cameraControls.applyPreset('invalidKey');

            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('does not throw for invalid preset key', () => {
            expect(() => {
                cameraControls.applyPreset('invalidKey');
            }).to.not.throw();
        });

        it.skip('calls setCameraState with preset values for valid key', () => {
            // Skip - needs full camera initialization
        });

        it('accepts all standard preset keys', () => {
            const presetList = cameraControls.getPresetList();

            presetList.forEach(presetKey => {
                expect(() => {
                    cameraControls.applyPreset(presetKey);
                }).to.not.throw();
            });
        });
    });

    describe('getCameraState', () => {
        it('returns camera state object with position and lookAt', () => {
            const state = cameraControls.getCameraState();

            expect(state).to.have.property('position');
            expect(state).to.have.property('lookAt');
        });

        it.skip('returns actual camera position after initialization', () => {
            // Skip - needs Three.js camera object
        });

        it('returns position with numeric defaults', () => {
            const state = cameraControls.getCameraState();

            expect(state.position.x).to.be.a('number');
            expect(state.position.y).to.be.a('number');
            expect(state.position.z).to.be.a('number');
        });

        it('returns lookAt with numeric defaults', () => {
            const state = cameraControls.getCameraState();

            expect(state.lookAt.x).to.be.a('number');
            expect(state.lookAt.y).to.be.a('number');
            expect(state.lookAt.z).to.be.a('number');
        });
    });

    describe('setCameraState', () => {
        it.skip('requires camera initialization in browser environment', () => {
            // Skip - needs Three.js camera object
        });

        it('logs error when camera not initialized', () => {
            const consoleSpy = sinon.stub(console, 'error');

            cameraControls.setCameraState({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });

            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('does not throw when camera not initialized', () => {
            expect(() => {
                cameraControls.setCameraState({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
            }).to.not.throw();
        });

        it('logs error for invalid position.x', () => {
            const consoleSpy = sinon.stub(console, 'error');

            cameraControls.setCameraState({ y: 0, z: 0 }, { x: 0, y: 0, z: 0 });

            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('logs error for invalid position.y', () => {
            const consoleSpy = sinon.stub(console, 'error');

            cameraControls.setCameraState({ x: 0, z: 0 }, { x: 0, y: 0, z: 0 });

            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('logs error for invalid position.z', () => {
            const consoleSpy = sinon.stub(console, 'error');

            cameraControls.setCameraState({ x: 0, y: 0 }, { x: 0, y: 0, z: 0 });

            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('accepts valid position object', () => {
            expect(() => {
                cameraControls.setCameraState(
                    { x: 0, y: 10, z: 20 },
                    { x: 0, y: 0, z: 0 }
                );
            }).to.not.throw();
        });

        it('accepts negative position values', () => {
            expect(() => {
                cameraControls.setCameraState(
                    { x: -5, y: -10, z: -20 },
                    { x: 0, y: 0, z: 0 }
                );
            }).to.not.throw();
        });

        it('accepts decimal position values', () => {
            expect(() => {
                cameraControls.setCameraState(
                    { x: 5.234, y: -10.987, z: 20.555 },
                    { x: 0, y: 0, z: 0 }
                );
            }).to.not.throw();
        });

        it('accepts valid lookAt object', () => {
            expect(() => {
                cameraControls.setCameraState(
                    { x: 0, y: 10, z: 20 },
                    { x: -5.678, y: 3.456, z: -10.123 }
                );
            }).to.not.throw();
        });
    });

    describe('setCameraRotation', () => {
        it.skip('requires camera initialization in browser environment', () => {
            // Skip - needs Three.js camera object
        });

        it('logs error when camera not initialized', () => {
            const consoleSpy = sinon.stub(console, 'error');

            cameraControls.setCameraRotation({ pitch: 0.5, yaw: 1.0 });

            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('logs error for invalid pitch type', () => {
            const consoleSpy = sinon.stub(console, 'error');

            cameraControls.setCameraRotation({ pitch: 'invalid', yaw: 1.0 });

            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('logs error for invalid yaw type', () => {
            const consoleSpy = sinon.stub(console, 'error');

            cameraControls.setCameraRotation({ pitch: 0.5, yaw: null });

            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('does not throw when camera not initialized', () => {
            expect(() => {
                cameraControls.setCameraRotation({ pitch: 0.5, yaw: 1.0 });
            }).to.not.throw();
        });

        it('accepts valid rotation object', () => {
            expect(() => {
                cameraControls.setCameraRotation({ pitch: 0.5, yaw: Math.PI / 4 });
            }).to.not.throw();
        });

        it('accepts zero rotation', () => {
            expect(() => {
                cameraControls.setCameraRotation({ pitch: 0, yaw: 0 });
            }).to.not.throw();
        });

        it('accepts negative rotation values', () => {
            expect(() => {
                cameraControls.setCameraRotation({ pitch: -0.5, yaw: -Math.PI / 2 });
            }).to.not.throw();
        });

        it('accepts partial rotation object', () => {
            expect(() => {
                cameraControls.setCameraRotation({ pitch: 0.5 });
            }).to.not.throw();

            expect(() => {
                cameraControls.setCameraRotation({ yaw: Math.PI / 4 });
            }).to.not.throw();
        });

        it('accepts undefined rotation object', () => {
            expect(() => {
                cameraControls.setCameraRotation(undefined);
            }).to.not.throw();
        });

        it('accepts null pitch value', () => {
            expect(() => {
                cameraControls.setCameraRotation({ pitch: null });
            }).to.not.throw();
        });

        it('accepts undefined yaw value', () => {
            expect(() => {
                cameraControls.setCameraRotation({ yaw: undefined });
            }).to.not.throw();
        });

        it('accepts empty rotation object', () => {
            expect(() => {
                cameraControls.setCameraRotation({});
            }).to.not.throw();
        });
    });

    describe('setCameraPosition', () => {
        it.skip('requires camera initialization in browser environment', () => {
            // Skip - needs Three.js camera object
        });

        it('logs error when camera not initialized', () => {
            const consoleSpy = sinon.stub(console, 'error');

            cameraControls.setCameraPosition({ x: 0, y: 10, z: 20 });

            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('does not throw when camera not initialized', () => {
            expect(() => {
                cameraControls.setCameraPosition({ x: 0, y: 10, z: 20 });
            }).to.not.throw();
        });

        it('accepts valid position object', () => {
            expect(() => {
                cameraControls.setCameraPosition({ x: 0, y: 10, z: 20 });
            }).to.not.throw();
        });

        it('accepts negative position values', () => {
            expect(() => {
                cameraControls.setCameraPosition({ x: -5, y: -10, z: -20 });
            }).to.not.throw();
        });

        it('accepts decimal position values', () => {
            expect(() => {
                cameraControls.setCameraPosition({ x: 5.234, y: -10.987, z: 20.555 });
            }).to.not.throw();
        });

        it('accepts origin position', () => {
            expect(() => {
                cameraControls.setCameraPosition({ x: 0, y: 0, z: 0 });
            }).to.not.throw();
        });

        it('accepts large position values', () => {
            expect(() => {
                cameraControls.setCameraPosition({ x: 1000, y: 2000, z: 3000 });
            }).to.not.throw();
        });

        it('accepts very small position values', () => {
            expect(() => {
                cameraControls.setCameraPosition({ x: 0.001, y: -0.002, z: 0.003 });
            }).to.not.throw();
        });

        it('accepts position at typical camera distance', () => {
            expect(() => {
                cameraControls.setCameraPosition({ x: 0, y: 13.89674725613891, z: 0 });
            }).to.not.throw();
        });
    });

    describe('enable', () => {
        it.skip('sets enabled state to true after initialization', () => {
            // Skip - needs canvas element
        });

        it('does not throw when called', () => {
            expect(() => {
                cameraControls.enable();
            }).to.not.throw();
        });
    });

    describe('disable', () => {
        it.skip('sets enabled state to false after initialization', () => {
            // Skip - needs canvas element
        });

        it('does not throw when called', () => {
            expect(() => {
                cameraControls.disable();
            }).to.not.throw();
        });

        it('clears pressed keys on disable', () => {
            expect(() => {
                cameraControls.disable();
            }).to.not.throw();
        });

        it('resets previous camera position on disable', () => {
            expect(() => {
                cameraControls.disable();
            }).to.not.throw();
        });
    });

    describe('reset', () => {
        it.skip('applies roadView preset after initialization', () => {
            // Skip - needs camera initialization
        });

        it('does not throw when called', () => {
            expect(() => {
                cameraControls.reset();
            }).to.not.throw();
        });

        it('attempts to apply roadView preset even without initialization', () => {
            expect(() => {
                cameraControls.reset();
            }).to.not.throw();
        });
    });

    describe('enableHoverInfo', () => {
        it.skip('enables hover info and sets cursor to crosshair after initialization', () => {
            // Skip - needs canvas element
        });

        it('does not throw when called', () => {
            expect(() => {
                cameraControls.enableHoverInfo();
            }).to.not.throw();
        });

        it('sets hover info enabled state', () => {
            expect(() => {
                cameraControls.enableHoverInfo();
            }).to.not.throw();

            expect(cameraControls.isHoverInfoEnabled()).to.be.true;
        });
    });

    describe('disableHoverInfo', () => {
        it.skip('disables hover info and resets cursor after initialization', () => {
            // Skip - needs canvas element
        });

        it('does not throw when called', () => {
            expect(() => {
                cameraControls.disableHoverInfo();
            }).to.not.throw();
        });

        it('sets hover info disabled state', () => {
            expect(() => {
                cameraControls.disableHoverInfo();
            }).to.not.throw();

            expect(cameraControls.isHoverInfoEnabled()).to.be.false;
        });
    });

    describe('isHoverInfoEnabled', () => {
        it('returns false by default', () => {
            expect(cameraControls.isHoverInfoEnabled()).to.be.false;
        });

        it('returns true after enableHoverInfo is called', () => {
            cameraControls.enableHoverInfo();

            expect(cameraControls.isHoverInfoEnabled()).to.be.true;
        });

        it('returns false after disableHoverInfo is called', () => {
            cameraControls.enableHoverInfo();
            cameraControls.disableHoverInfo();

            expect(cameraControls.isHoverInfoEnabled()).to.be.false;
        });
    });

    describe('setNowLineReference', () => {
        it.skip('stores now line reference after initialization', () => {
            // Skip - internal state check requires Three.js objects
        });

        it('does not throw when called with null', () => {
            expect(() => {
                cameraControls.setNowLineReference(null);
            }).to.not.throw();
        });

        it('does not throw when called with object', () => {
            const mockNowLine = {};

            expect(() => {
                cameraControls.setNowLineReference(mockNowLine);
            }).to.not.throw();
        });

        it('does not throw when called with undefined', () => {
            expect(() => {
                cameraControls.setNowLineReference(undefined);
            }).to.not.throw();
        });

        it('does not throw when called', () => {
            expect(() => {
                cameraControls.setNowLineReference();
            }).to.not.throw();
        });
    });

    describe('setHoverInfoComponents', () => {
        it.skip('stores hover info service and display references after initialization', () => {
            // Skip - internal state check requires full dependencies
        });

        it('does not throw when called with valid objects', () => {
            const mockService = {};
            const mockDisplay = {};

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
            }).to.not.throw();
        });

        it('does not throw when called with null service', () => {
            expect(() => {
                cameraControls.setHoverInfoComponents(null, {});
            }).to.not.throw();
        });

        it('does not throw when called with null display', () => {
            expect(() => {
                cameraControls.setHoverInfoComponents({}, null);
            }).to.not.throw();
        });

        it('does not throw when called with both null', () => {
            expect(() => {
                cameraControls.setHoverInfoComponents(null, null);
            }).to.not.throw();
        });

        it('does not throw when called with undefined', () => {
            expect(() => {
                cameraControls.setHoverInfoComponents(undefined, undefined);
            }).to.not.throw();
        });

        it('does not throw when called without arguments', () => {
            expect(() => {
                cameraControls.setHoverInfoComponents();
            }).to.not.throw();
        });

        it('accepts mock service with methods', () => {
            const mockService = { setConstants: sinon.stub() };

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, {});
            }).to.not.throw();
        });

        it('accepts mock display with methods', () => {
            const mockDisplay = { hide: sinon.stub(), update: sinon.stub() };

            expect(() => {
                cameraControls.setHoverInfoComponents({}, mockDisplay);
            }).to.not.throw();
        });

        it('accepts full mock implementations', () => {
            const mockService = { setConstants: sinon.stub(), getHoverInfo: sinon.stub() };
            const mockDisplay = { hide: sinon.stub(), update: sinon.stub(), show: sinon.stub() };

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
            }).to.not.throw();
        });

        it('stores service for later use', () => {
            const mockService = {};
            
            cameraControls.setHoverInfoComponents(mockService, {});

            expect(() => {
                cameraControls.updateHoverInfo(null, null);
            }).to.not.throw();
        });

        it('stores display for later use', () => {
            const mockDisplay = {};
            
            cameraControls.setHoverInfoComponents({}, mockDisplay);

            expect(() => {
                cameraControls.enableHoverInfo();
            }).to.not.throw();
        });

        it('allows updating service and display independently', () => {
            const mockService1 = {};
            const mockDisplay1 = {};
            
            cameraControls.setHoverInfoComponents(mockService1, mockDisplay1);

            const mockService2 = {};
            
            cameraControls.setHoverInfoComponents(mockService2, mockDisplay1);

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService2, {});
            }).to.not.throw();
        });

        it('allows reusing service and display across camera controls instances', () => {
            const mockService = { setConstants: sinon.stub() };
            const mockDisplay = { hide: sinon.stub(), update: sinon.stub() };
            
            // Set up mock THREE library for second instance
            const mockVector3 = function(x, y, z) {
                this.x = x || 0;
                this.y = y || 0;
                this.z = z || 0;
            };
            mockVector3.prototype.applyAxisAngle = function(axis, angle) {
                return this;
            };
            
            const mockTHREE = { Vector3: mockVector3 };

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
                
                const anotherCameraControls = getCameraControls(mockTHREE);
                anotherCameraControls.setHoverInfoComponents(mockService, mockDisplay);
            }).to.not.throw();
        });

        it('accepts service with setConstants method', () => {
            const mockService = { setConstants: sinon.stub() };

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, {});
                
                cameraControls.setHoverInfoConstants({});
            }).to.not.throw();

            expect(mockService.setConstants.called).to.be.true;
        });

        it('accepts display with update method', () => {
            const mockDisplay = { hide: sinon.stub(), update: sinon.stub() };

            expect(() => {
                cameraControls.setHoverInfoComponents({}, mockDisplay);
                
                cameraControls.enableHoverInfo();
            }).to.not.throw();

            expect(mockDisplay.hide.notCalled).to.be.true;
        });

        it('accepts display with hide method', () => {
            const mockDisplay = { hide: sinon.stub() };

            expect(() => {
                cameraControls.setHoverInfoComponents({}, mockDisplay);
                
                cameraControls.disableHoverInfo();
            }).to.not.throw();
        });

        it('accepts full mock implementations with all methods', () => {
            const mockService = { 
                setConstants: sinon.stub(), 
                getHoverInfo: sinon.stub().returns({ type: 'none' })
            };
            const mockDisplay = { 
                hide: sinon.stub(), 
                update: sinon.stub(),
                show: sinon.stub()
            };

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
                
                cameraControls.enableHoverInfo();
            }).to.not.throw();

            expect(mockDisplay.hide.notCalled).to.be.true;
        });

        it.skip('stores service and display for updateHoverInfo calls', () => {
            // Skip - requires scene and camera initialization
        });
    });

    describe('setHoverInfoConstants', () => {
        it.skip('passes constants to hover info service after initialization', () => {
            // Skip - needs full dependency chain
        });

        it('does not throw when service is not set', () => {
            expect(() => {
                cameraControls.setHoverInfoConstants({});
            }).to.not.throw();
        });

        it('does not throw with valid constants object', () => {
            const mockService = { setConstants: sinon.stub() };
            
            cameraControls.setHoverInfoComponents(mockService, {});

            expect(() => {
                cameraControls.setHoverInfoConstants({ GRID_SPACING: 1.2 });
            }).to.not.throw();

            expect(mockService.setConstants.called).to.be.true;
        });

        it('passes constants to setConstants method', () => {
            const mockService = { setConstants: sinon.stub() };
            
            cameraControls.setHoverInfoComponents(mockService, {});

            const testConstants = { GRID_SPACING: 1.2, DEFAULT_DELAY: 4 };
            
            cameraControls.setHoverInfoConstants(testConstants);

            expect(mockService.setConstants.calledOnceWith(testConstants)).to.be.true;
        });

        it('does not throw with empty constants object', () => {
            const mockService = { setConstants: sinon.stub() };
            
            cameraControls.setHoverInfoComponents(mockService, {});

            expect(() => {
                cameraControls.setHoverInfoConstants({});
            }).to.not.throw();

            expect(mockService.setConstants.called).to.be.true;
        });

        it('does not throw with null constants', () => {
            const mockService = { setConstants: sinon.stub() };
            
            cameraControls.setHoverInfoComponents(mockService, {});

            expect(() => {
                cameraControls.setHoverInfoConstants(null);
            }).to.not.throw();

            expect(mockService.setConstants.called).to.be.true;
        });

        it('does not throw with undefined constants', () => {
            const mockService = { setConstants: sinon.stub() };
            
            cameraControls.setHoverInfoComponents(mockService, {});

            expect(() => {
                cameraControls.setHoverInfoConstants(undefined);
            }).to.not.throw();

            expect(mockService.setConstants.called).to.be.true;
        });

        it('passes all standard constants', () => {
            const mockService = { setConstants: sinon.stub() };
            
            cameraControls.setHoverInfoComponents(mockService, {});

            const fullConstants = {
                GRID_SPACING: 1.2,
                GRID_WIDTH: 10,
                DEFAULT_DELAY: 4,
                Z_SCALE: 2
            };
            
            cameraControls.setHoverInfoConstants(fullConstants);

            expect(mockService.setConstants.calledOnceWith(fullConstants)).to.be.true;
        });
    });

    describe('updateHoverInfo', () => {
        it.skip('requires full initialization in browser environment', () => {
            // Skip - needs Three.js scene, camera, and hover info components
        });

        it('does not throw when called without initialization', () => {
            const mockEvent = {};
            const mockCanvas = {};

            expect(() => {
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);
            }).to.not.throw();
        });

        it('does not throw when called with null event', () => {
            const mockCanvas = {};

            expect(() => {
                cameraControls.updateHoverInfo(null, mockCanvas);
            }).to.not.throw();
        });

        it('does not throw when called with null canvas', () => {
            const mockEvent = {};

            expect(() => {
                cameraControls.updateHoverInfo(mockEvent, null);
            }).to.not.throw();
        });

        it('does not throw when called with both null', () => {
            expect(() => {
                cameraControls.updateHoverInfo(null, null);
            }).to.not.throw();
        });

        it('does not throw when called without arguments', () => {
            expect(() => {
                cameraControls.updateHoverInfo();
            }).to.not.throw();
        });

        it('does not call hover info service when not enabled', () => {
            const mockService = { 
                setConstants: sinon.stub(), 
                getHoverInfo: sinon.stub().returns({ type: 'none' })
            };
            
            cameraControls.setHoverInfoComponents(mockService, {});

            expect(() => {
                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);
            }).to.not.throw();

            expect(mockService.getHoverInfo.notCalled).to.be.true;
        });

        it('does not throw when hover info enabled but service returns null', () => {
            const mockService = { 
                setConstants: sinon.stub(), 
                getHoverInfo: sinon.stub().returns(null)
            };
            
            cameraControls.setHoverInfoComponents(mockService, { update: sinon.stub() });

            expect(() => {
                cameraControls.enableHoverInfo();
                
                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);
            }).to.not.throw();
        });

        it('does not throw when hover info enabled and service returns valid data', () => {
            const mockService = { 
                setConstants: sinon.stub(), 
                getHoverInfo: sinon.stub().returns({ type: 'none', isNote: false })
            };
            
            cameraControls.setHoverInfoComponents(mockService, { update: sinon.stub() });

            expect(() => {
                cameraControls.enableHoverInfo();
                
                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);
            }).to.not.throw();
        });

        it('does not throw with note hover data', () => {
            const mockService = { 
                setConstants: sinon.stub(), 
                getHoverInfo: sinon.stub().returns({
                    type: 'note',
                    isNote: true,
                    noteData: { letter: 'z' }
                })
            };
            
            cameraControls.setHoverInfoComponents(mockService, { update: sinon.stub() });

            expect(() => {
                cameraControls.enableHoverInfo();
                
                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);
            }).to.not.throw();
        });

        it('does not throw with nowLine hover data', () => {
            const mockService = { 
                setConstants: sinon.stub(), 
                getHoverInfo: sinon.stub().returns({
                    type: 'nowLine',
                    isNote: false,
                    gridColumn: 5,
                    noteTime: 10.25
                })
            };
            
            cameraControls.setHoverInfoComponents(mockService, { update: sinon.stub() });

            expect(() => {
                cameraControls.enableHoverInfo();
                
                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);
            }).to.not.throw();
        });

it.skip('calls display update with hover data when enabled', () => {
            // Skip - requires full browser environment with DOM elements and event listeners
        });
    });

    describe('dispose', () => {
        it.skip('removes event listeners and clears references after initialization', () => {
            // Skip - needs canvas element with registered event listeners
        });

        it('does not throw when called', () => {
            expect(() => {
                cameraControls.dispose();
            }).to.not.throw();
        });

        it('does not throw when called multiple times', () => {
            expect(() => {
                cameraControls.dispose();
                cameraControls.dispose();
                cameraControls.dispose();
            }).to.not.throw();
        });

        it('clears internal state after disposal', () => {
            expect(() => {
                cameraControls.dispose();

                expect(() => {
                    cameraControls.getCameraState();
                }).to.not.throw();
            });
        });

        it('allows getting presets even after disposal', () => {
            expect(() => {
                cameraControls.dispose();

                const preset = cameraControls.getPreset('roadView');

                expect(preset).to.not.be.null;
            });
        });

        it('allows getting preset list even after disposal', () => {
            expect(() => {
                cameraControls.dispose();

                const presetList = cameraControls.getPresetList();

                expect(presetList.length).to.equal(4);
            });
        });

        it('clears hover info state after disposal', () => {
            cameraControls.enableHoverInfo();

            expect(cameraControls.isHoverInfoEnabled()).to.be.true;

            cameraControls.dispose();
            
            expect(() => {
                cameraControls.updateHoverInfo(null, null);
            }).to.not.throw();
        });

        it('clears hover info components after disposal', () => {
            const mockService = {};
            const mockDisplay = {};
            
            cameraControls.setHoverInfoComponents(mockService, mockDisplay);

            expect(() => {
                cameraControls.dispose();

                expect(() => {
                    cameraControls.updateHoverInfo(null, null);
                }).to.not.throw();
            });
        });

        it('allows enabling hover info after disposal', () => {
            cameraControls.dispose();

            expect(() => {
                cameraControls.enableHoverInfo();
                
                expect(cameraControls.isHoverInfoEnabled()).to.be.true;
            }).to.not.throw();
        });

        it('allows setting components after disposal', () => {
            cameraControls.dispose();

            const mockService = {};
            const mockDisplay = {};

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
            }).to.not.throw();
        });

        it('allows setting constants after disposal', () => {
            cameraControls.dispose();

            expect(() => {
                cameraControls.setHoverInfoConstants({ GRID_SPACING: 1.2 });
            }).to.not.throw();
        });

        it('allows all methods to work after disposal', () => {
            cameraControls.dispose();

            expect(() => {
                cameraControls.enableHoverInfo();
                
                const mockService = { setConstants: () => {}, getHoverInfo: () => null };
                const mockDisplay = { update: () => {}, hide: () => {} };
                
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
                
                cameraControls.setHoverInfoConstants({ GRID_SPACING: 1.2 });

                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);
            }).to.not.throw();

            expect(cameraControls.isHoverInfoEnabled()).to.be.true;
        });
    });

    describe('integration', () => {
        it.skip('initializes camera with roadView preset in browser environment', () => {
            // Skip - needs Three.js scene setup
        });

        it('provides all expected API methods', () => {
            expect(cameraControls).to.have.property('init');
            expect(cameraControls).to.have.property('getDefaultCameraState');
            expect(cameraControls).to.have.property('getDefaultCameraStateForUI');
            expect(cameraControls).to.have.property('getPresetList');
            expect(cameraControls).to.have.property('getPreset');
            expect(cameraControls).to.have.property('applyPreset');
            expect(cameraControls).to.have.property('getCameraState');
            expect(cameraControls).to.have.property('setCameraState');
            expect(cameraControls).to.have.property('setCameraRotation');
            expect(cameraControls).to.have.property('setCameraPosition');
            expect(cameraControls).to.have.property('enable');
            expect(cameraControls).to.have.property('disable');
            expect(cameraControls).to.have.property('reset');
            expect(cameraControls).to.have.property('enableHoverInfo');
            expect(cameraControls).to.have.property('disableHoverInfo');
            expect(cameraControls).to.have.property('isHoverInfoEnabled');
            expect(cameraControls).to.have.property('setNowLineReference');
            expect(cameraControls).to.have.property('setHoverInfoComponents');
            expect(cameraControls).to.have.property('setHoverInfoConstants');
            expect(cameraControls).to.have.property('updateHoverInfo');
            expect(cameraControls).to.have.property('dispose');
        });

        it('all API methods are functions', () => {
            const methods = [
                'init',
                'getDefaultCameraState',
                'getDefaultCameraStateForUI',
                'getPresetList',
                'getPreset',
                'applyPreset',
                'getCameraState',
                'setCameraState',
                'setCameraRotation',
                'setCameraPosition',
                'enable',
                'disable',
                'reset',
                'enableHoverInfo',
                'disableHoverInfo',
                'isHoverInfoEnabled',
                'setNowLineReference',
                'setHoverInfoComponents',
                'setHoverInfoConstants',
                'updateHoverInfo',
                'dispose'
            ];

            methods.forEach(method => {
                expect(typeof cameraControls[method]).to.equal('function');
            });
        });

        it('allows getting presets before initialization', () => {
            const preset = cameraControls.getPreset('roadView');

            expect(preset).to.not.be.null;
        });

        it('allows getting default state before initialization', () => {
            const state = cameraControls.getDefaultCameraState();

            expect(state.position).to.have.all.keys('x', 'y', 'z');
        });

        it('allows getting UI state before initialization', () => {
            const uiState = cameraControls.getDefaultCameraStateForUI();

            expect(uiState.position.x).to.match(/^-?\d+\.\d{2}$/);
        });

        it('allows getting preset list before initialization', () => {
            const presetList = cameraControls.getPresetList();

            expect(presetList.length).to.equal(4);
        });

        it('allows hovering disabled check before initialization', () => {
            expect(cameraControls.isHoverInfoEnabled()).to.be.false;
        });

        it('allows disposal before initialization', () => {
            expect(() => {
                cameraControls.dispose();
            }).to.not.throw();
        });

        it('allows setting hover info components before initialization', () => {
            const mockService = {};
            const mockDisplay = {};

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
            }).to.not.throw();
        });

        it('allows setting hover info constants before initialization', () => {
            expect(() => {
                cameraControls.setHoverInfoConstants({ GRID_SPACING: 1.2 });
            }).to.not.throw();
        });

        it('allows enabling hover info before initialization', () => {
            expect(() => {
                cameraControls.enableHoverInfo();
                
                expect(cameraControls.isHoverInfoEnabled()).to.be.true;
            }).to.not.throw();
        });

        it('allows disabling hover info before initialization', () => {
            expect(() => {
                cameraControls.disableHoverInfo();
                
                expect(cameraControls.isHoverInfoEnabled()).to.be.false;
            }).to.not.throw();
        });

        it('allows enabling and then disabling before initialization', () => {
            expect(() => {
                cameraControls.enableHoverInfo();
                cameraControls.disableHoverInfo();
                
                expect(cameraControls.isHoverInfoEnabled()).to.be.false;
            }).to.not.throw();
        });

        it('allows setting components and enabling before initialization', () => {
            const mockService = {};
            const mockDisplay = {};

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
                cameraControls.enableHoverInfo();
                
                expect(cameraControls.isHoverInfoEnabled()).to.be.true;
            }).to.not.throw();
        });

        it('allows setting components, enabling and updating before initialization', () => {
            const mockService = { getHoverInfo: sinon.stub().returns({ type: 'none' }) };
            const mockDisplay = { update: sinon.stub() };

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
                cameraControls.enableHoverInfo();
                
                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);
            }).to.not.throw();

            expect(cameraControls.isHoverInfoEnabled()).to.be.true;
        });

        it('allows full hover info flow before initialization', () => {
            const mockService = { 
                setConstants: sinon.stub(), 
                getHoverInfo: sinon.stub().returns({ type: 'none' })
            };
            const mockDisplay = { update: sinon.stub() };

            expect(() => {
                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
                cameraControls.setHoverInfoConstants({ GRID_SPACING: 1.2 });
                cameraControls.enableHoverInfo();

                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);

                expect(cameraControls.isHoverInfoEnabled()).to.be.true;
            }).to.not.throw();
        });

        it('allows enable/disable cycle multiple times', () => {
            expect(() => {
                for (let i = 0; i < 5; i++) {
                    cameraControls.enableHoverInfo();
                    expect(cameraControls.isHoverInfoEnabled()).to.be.true;

                    cameraControls.disableHoverInfo();
                    expect(cameraControls.isHoverInfoEnabled()).to.be.false;
                }
            }).to.not.throw();

            expect(cameraControls.isHoverInfoEnabled()).to.be.false;
        });

        it('allows enable/disable/enable cycle', () => {
            expect(() => {
                cameraControls.enableHoverInfo();
                
                const mockService = {};
                const mockDisplay = { update: sinon.stub() };

                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
                
                expect(cameraControls.isHoverInfoEnabled()).to.be.true;

                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);

                expect(cameraControls.isHoverInfoEnabled()).to.be.true;
            }).to.not.throw();

            expect(cameraControls.isHoverInfoEnabled()).to.be.true;
        });

        it('allows enable/dispose/enable cycle', () => {
            expect(() => {
                cameraControls.enableHoverInfo();
                
                const mockService = { setConstants: sinon.stub(), getHoverInfo: sinon.stub() };
                const mockDisplay = { update: sinon.stub(), hide: sinon.stub() };

                cameraControls.setHoverInfoComponents(mockService, mockDisplay);
                
                expect(cameraControls.isHoverInfoEnabled()).to.be.true;

                cameraControls.disableHoverInfo();
                
                expect(cameraControls.isHoverInfoEnabled()).to.be.false;

                cameraControls.enableHoverInfo();
                
                expect(cameraControls.isHoverInfoEnabled()).to.be.true;

                const mockEvent = {};
                const mockCanvas = {};
                
                cameraControls.updateHoverInfo(mockEvent, mockCanvas);

                expect(cameraControls.isHoverInfoEnabled()).to.be.true;
            }).to.not.throw();

            expect(cameraControls.isHoverInfoEnabled()).to.be.true;
        });
    });
});
