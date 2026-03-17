import { expect } from 'chai';
import sinon from 'sinon';
import { createCameraCoordinator } from './CameraCoordinator.js';

describe('CameraCoordinator', () => {
    let mockRenderer;
    let mockInputHandler;

    beforeEach(() => {
        // Create mock ThreeJSRenderer
        mockRenderer = {
            disableCameraControls: sinon.spy(),
            enableCameraControls: sinon.spy(),
            disableHoverInfo: sinon.spy(),
            enableHoverInfo: sinon.spy()
        };

        // Create mock InputHandler
        mockInputHandler = {
            setNoteInputEnabled: sinon.spy()
        };
    });

    describe('Node.js compatibility', () => {
        it('exports createCameraCoordinator function', () => {
            expect(createCameraCoordinator).to.be.a('function');
        });

        it('returns null when renderer is missing', () => {
            const result = createCameraCoordinator(null, mockInputHandler);
            expect(result).to.be.null;
        });

        it('returns null when inputHandler is missing', () => {
            const result = createCameraCoordinator(mockRenderer, null);
            expect(result).to.be.null;
        });

        it('returns coordinator object when both dependencies provided', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            expect(coordinator).to.not.be.null;
            expect(coordinator.onGameStarted).to.be.a('function');
            expect(coordinator.onGameStopped).to.be.a('function');
            expect(coordinator.handleGameStateChange).to.be.a('function');
        });

        it('calls disableControls when onGameStarted is called', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            // Spy on the disableControls method before calling
            sinon.spy(coordinator, 'disableControls');
            coordinator.onGameStarted();
            
            expect(coordinator.disableControls.calledOnce).to.be.true;
        });

        it('calls enableControls when onGameStopped is called', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            // Spy on the enableControls method before calling
            sinon.spy(coordinator, 'enableControls');
            coordinator.onGameStopped();
            
            expect(coordinator.enableControls.calledOnce).to.be.true;
        });

        it('handles handleGameStateChange when isPlaying is true', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            // Spy on the disableControls method before calling
            sinon.spy(coordinator, 'disableControls');
            coordinator.handleGameStateChange(true);
            
            expect(coordinator.disableControls.calledOnce).to.be.true;
        });

        it('handles handleGameStateChange when isPlaying is false', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            // Spy on the enableControls method before calling
            sinon.spy(coordinator, 'enableControls');
            coordinator.handleGameStateChange(false);
            
            expect(coordinator.enableControls.calledOnce).to.be.true;
        });

        it('disables renderer controls when disableControls is called', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            coordinator.disableControls();
            
            expect(mockRenderer.disableCameraControls.calledOnce).to.be.true;
        });

        it('disables hover info when disableControls is called', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            coordinator.disableControls();
            
            expect(mockRenderer.disableHoverInfo.calledOnce).to.be.true;
        });

        it('enables note input when disableControls is called', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            coordinator.disableControls();
            
            expect(mockInputHandler.setNoteInputEnabled.calledWith(true)).to.be.true;
        });

        it('enables renderer controls when enableControls is called', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            coordinator.enableControls();
            
            expect(mockRenderer.enableCameraControls.calledOnce).to.be.true;
        });

        it('enables hover info when enableControls is called', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            coordinator.enableControls();
            
            expect(mockRenderer.enableHoverInfo.calledOnce).to.be.true;
        });

        it('disables note input when enableControls is called', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            coordinator.enableControls();
            
            expect(mockInputHandler.setNoteInputEnabled.calledWith(false)).to.be.true;
        });

        it('simulates full game start/stop cycle', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);

            // Initial state - camera controls enabled
            coordinator.onGameStopped();
            
            expect(mockRenderer.enableCameraControls.calledOnce).to.be.true;
            expect(mockInputHandler.setNoteInputEnabled.calledWith(false)).to.be.true;

            // Game starts
            coordinator.onGameStarted();
            
            expect(mockRenderer.disableCameraControls.calledOnce).to.be.true;
            expect(mockInputHandler.setNoteInputEnabled.calledWith(true)).to.be.true;

            // Game stops again
            coordinator.onGameStopped();
            
            expect(mockRenderer.enableCameraControls.callCount).to.equal(2);
        });

        it('handles rapid state changes gracefully', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            expect(() => {
                coordinator.handleGameStateChange(true);
                coordinator.handleGameStateChange(false);
                coordinator.handleGameStateChange(true);
                coordinator.handleGameStateChange(false);
            }).to.not.throw();
        });

        it('logs error when renderer is null', () => {
            const consoleSpy = sinon.spy(console, 'error');
            
            createCameraCoordinator(null, mockInputHandler);
            
            expect(consoleSpy.called).to.be.true;
            consoleSpy.restore();
        });

        it('logs error when inputHandler is null', () => {
            const consoleSpy2 = sinon.spy(console, 'error');
            
            createCameraCoordinator(mockRenderer, null);
            
            expect(consoleSpy2.called).to.be.true;
            consoleSpy2.restore();
        });
    });

    describe('Browser environment', () => {
        beforeEach(() => {
            // Skip in Node.js - requires browser DOM
            if (typeof document === 'undefined') {
                return;
            }

            // Set up test DOM elements
            document.body.innerHTML = `
                <div id="cameraControlPanel" style="display: block;"></div>
                <div id="cameraInstructions" style="display: none;"></div>
            `;
        });

        afterEach(() => {
            // Skip in Node.js - requires browser DOM  
            if (typeof document === 'undefined') {
                return;
            }

            document.body.innerHTML = '';
        });

        it.skip('hides camera control panel when game starts - requires browser environment', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            coordinator.onGameStarted();
            
            const panel = document.getElementById('cameraControlPanel');
            expect(panel.style.display).to.equal('none');
        });

        it.skip('shows camera control panel when game stops - requires browser environment', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            coordinator.onGameStopped();
            
            const panel = document.getElementById('cameraControlPanel');
            expect(panel.style.display).to.equal('block');
        });

        it.skip('hides camera instructions when game stops - requires browser environment', () => {
            const coordinator = createCameraCoordinator(mockRenderer, mockInputHandler);
            
            coordinator.onGameStopped();
            
            const instructions = document.getElementById('cameraInstructions');
            expect(instructions.style.display).to.equal('none');
        });
    });
});
