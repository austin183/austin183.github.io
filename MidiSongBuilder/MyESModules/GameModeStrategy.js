/**
 * GameModeStrategy - Abstract mode-specific behavior using Strategy Pattern
 * 
 * Defines interface for all game modes (2D, 3D, VR, mobile, etc.)
 * Enables easy addition of new modes without modifying createMidiestroApp
 * 
 * Open/Closed Principle: Open for extension, closed for modification
 */

import getGameController from './GameController.js';
import getThreeJSGameController from './ThreeJSGameController.js';
import getThreeJSRenderer from './ThreeJSRenderer.js';

/**
 * Base game mode strategy - defines interface for all modes
 */
class BaseGameMode {
    constructor(modeId) {
        this.modeId = modeId;
    }
    
    /**
     * Lifecycle hook called when Vue app is mounted
     * @param {Object} app - Vue app instance
     * @param {Object} registry - ComponentRegistry for DI
     * @param {Object} dependencies - Additional dependencies passed from HTML
     */
    onMount(app, registry, dependencies) {
        // No-op default - subclasses override as needed
    }
    
    /**
     * Lifecycle hook called before Vue app is unmounted
     * @param {Object} app - Vue app instance
     */
    beforeUnmount(app) {
        // Default cleanup (shared by all modes)
        if (app.inputHandler && app.inputHandler.removeKeyListeners) {
            app.inputHandler.removeKeyListeners();
        }
    }
    
    /**
     * Mode-specific rendering hook called during game loop
     * @param {Array} visibleField - Array of notes to render
     * @param {Object} keyRenderInfo - Key rendering configuration
     * @param {Object} app - Vue app instance
     */
    renderNotesForMode(visibleField, keyRenderInfo, app) {
        // Default: no-op (2D mode handles this in base rendering)
    }
    
    /**
     * Get the game controller factory for this mode
     * @returns {Function} Factory function that creates game controller
     */
    getControllerFactory() {
        throw new Error(`getControllerFactory() must be implemented by ${this.modeId} mode`);
    }
    
    /**
     * Optional: Mode-specific initialization after app creation
     * @param {Object} app - Vue app instance
     * @param {Object} dependencies - Additional dependencies
     */
    postInit(app, dependencies) {
        // No-op default - subclasses override as needed
    }
    
    /**
     * Optional: Mode-specific cleanup before app unmount (in addition to defaults)
     * @param {Object} app - Vue app instance
     */
    customUnmount(app) {
        // No-op default - subclasses override as needed
    }
}

/**
 * 2D game mode - uses HTML5 Canvas for rendering
 */
class TwoDMode extends BaseGameMode {
    constructor() {
        super('2d');
    }
    
    /**
     * 2D mode uses default lifecycle (no special mount)
     */
    onMount(app, registry) {
        console.log('2D mode initialized');
    }
    
    /**
     * 2D mode uses default rendering (handled in shared code)
     */
    renderNotesForMode(visibleField, keyRenderInfo, app) {
        // 2D rendering is done in shared renderSongNotes logic
        // This method exists only to satisfy interface
    }
    
    /**
     * 2D mode returns standard game controller
     */
    getControllerFactory() {
        return getGameController;
    }
}

/**
 * 3D game mode - uses Three.js for rendering
 */
class ThreeDMode extends BaseGameMode {
    constructor() {
        super('3d');
    }
    
    /**
     * 3D mode needs Three.js initialization on mount
     * @param {Object} app - Vue app instance
     * @param {Object} registry - ComponentRegistry for DI
     * @param {Object} dependencies - Must contain THREE, FontLoader, TextGeometry
     */
    onMount(app, registry, dependencies) {
        const THREE = dependencies?.THREE;
        const FontLoader = dependencies?.FontLoader;
        const TextGeometry = dependencies?.TextGeometry;
        
        if (!THREE || !FontLoader || !TextGeometry) {
            throw new Error('Three.js libraries not loaded: THREE, FontLoader, TextGeometry required');
        }
        
        // Create and initialize Three.js renderer
        const threeJSRenderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);
        
        threeJSRenderer.init("threeCanvas");
        app.threeJSRenderer = threeJSRenderer;
        threeJSRenderer.startAnimation();
        
        // Setup camera controls (3D-specific)
        this.setupCameraControls(app);
        
        // Register with DI container for dependency injection
        registry.registerService('threeJSRenderer', threeJSRenderer);
        
        console.log('3D mode initialized with Three.js renderer');
    }
    
    /**
     * 3D-specific rendering (extracted from inline renderSongNotes)
     * @param {Array} visibleField - Array of notes to render in 3D
     * @param {Object} keyRenderInfo - Key rendering configuration
     * @param {Object} app - Vue app instance with threeJSRenderer
     */
    renderNotesForMode(visibleField, keyRenderInfo, app) {
        if (!app.threeJSRenderer || !keyRenderInfo) {
            console.warn('Three.js renderer or keyRenderInfo not available');
            return;
        }
        
        app.threeJSRenderer.addNotesFromVisibleField(visibleField, keyRenderInfo);
    }
    
    /**
     * 3D mode returns game controller with Three.js integration
     */
    getControllerFactory() {
        return getThreeJSGameController;
    }
    
    /**
     * Custom cleanup for 3D mode (in addition to default key listener cleanup)
     * @param {Object} app - Vue app instance
     */
    customUnmount(app) {
        if (app.threeJSRenderer && app.threeJSRenderer.dispose) {
            app.threeJSRenderer.dispose();
        }
        
        if (app.cameraUpdateLoop) {
            clearInterval(app.cameraUpdateLoop);
        }
    }
    
    /**
     * Helper: Setup camera controls (extracted from Midiestro3D.html)
     * @param {Object} app - Vue app instance with threeJSRenderer
     */
    setupCameraControls(app) {
        if (!app.threeJSRenderer) return;
        
        // Setup camera preset dropdown
        const select = document.getElementById('cameraPresetSelect');
        if (!select) return;
        
        const presets = app.threeJSRenderer.getCameraPresetList();
        presets.forEach(function(presetKey) {
            const option = document.createElement('option');
            option.value = presetKey;
            option.textContent = app.threeJSRenderer.getCameraPresetName(presetKey);
            select.appendChild(option);
        });
        
        // Apply preset on change
        const applyPreset = () => {
            const selectedValue = select.value;
            if (selectedValue && app.threeJSRenderer.setCameraPreset) {
                app.threeJSRenderer.setCameraPreset(selectedValue);
            }
        };
        
        select.addEventListener('change', applyPreset);
        
        // Setup camera input defaults
        const defaults = app.threeJSRenderer.getDefaultCameraStateForUI();
        if (defaults) {
            const posX = document.getElementById('cameraPosX');
            const posY = document.getElementById('cameraPosY');
            const posZ = document.getElementById('cameraPosZ');
            const lookAtX = document.getElementById('cameraLookAtX');
            const lookAtY = document.getElementById('cameraLookAtY');
            const lookAtZ = document.getElementById('cameraLookAtZ');
            
            if (posX) posX.value = defaults.position.x;
            if (posY) posY.value = defaults.position.y;
            if (posZ) posZ.value = defaults.position.z;
            if (lookAtX) lookAtX.value = defaults.lookAt.x;
            if (lookAtY) lookAtY.value = defaults.lookAt.y;
            if (lookAtZ) lookAtZ.value = defaults.lookAt.z;
        }
    }
}

/**
 * Factory function to create 2D mode
 * @returns {TwoDMode}
 */
export function createTwoDMode() {
    return new TwoDMode();
}

/**
 * Factory function to create 3D mode
 * @returns {ThreeDMode}
 */
export function createThreeDMode() {
    return new ThreeDMode();
}

/**
 * Factory function to create game mode by type string
 * @param {string} modeType - '2d' | '3d' | future modes
 * @returns {BaseGameMode}
 */
export function createGameMode(modeType) {
    const factories = {
        '2d': createTwoDMode,
        '3d': createThreeDMode
    };
    
    const factory = factories[modeType];
    if (!factory) {
        throw new Error(`Unknown game mode: ${modeType}`);
    }
    
    return factory();
}

// Re-export base class for potential future subclasses
export { BaseGameMode, TwoDMode, ThreeDMode };
