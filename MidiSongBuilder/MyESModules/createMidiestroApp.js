/**
 * createMidiestroApp - Shared Vue.js app factory for 2D and 3D game modes
 * 
 * Creates a Vue.js application with focused configuration objects:
 * - mode: GameMode instance (BaseGameMode subclass) for strategy pattern
 * - dataConfig: From createGameData() - all reactive state properties
 * - methodsConfig: From createGameMethods() - all instance methods
 * - lifecycleConfig: From createGameLifecycle() - mounted/beforeUnmount hooks
 * - servicesConfig: From createGameServices() - provide/inject for DI
 * 
 * Uses Strategy Pattern via GameMode instance instead of mode string,
 * enabling easy addition of new modes (VR, AR, mobile) without modifying this code.
 */

import { BaseGameMode } from './GameModeStrategy.js';

export function createMidiestroApp({ 
    mode, // GameMode instance (BaseGameMode subclass)
    createApp, // Vue.createApp reference from window
    
    // Focused configuration objects (from dedicated factories)
    dataConfig, // From createGameData() - reactive state factory function
    methodsConfig, // From createGameMethods() - all app methods
    lifecycleConfig, // From createGameLifecycle() - mounted/beforeUnmount hooks
    servicesConfig, // From createGameServices() - provide/inject setup
    
    // Dependencies for mode to use during initialization
    dependencies = {} // Passed to mode.onMount() and mode.postInit()
}) {
    // Validate mode is a GameMode instance
    if (!(mode instanceof BaseGameMode)) {
        throw new Error('createMidiestroApp requires a GameMode instance (BaseGameMode or subclass)');
    }
    
    return createApp({
        // Data: reactive state properties (factory function required by Vue)
        data: dataConfig,
        
        // Methods: all instance methods with access to this (Vue context)
        methods: {
            ...methodsConfig,
            
            // Mode-specific methods (if any)
            ...(mode.modeId === '3d' ? {
                handleCameraPresets: function() {
                    // To be overridden by caller if needed
                }
            } : {})
        },
        
        // Lifecycle hooks: mounted/beforeUnmount from lifecycleConfig,
        // with mode-specific hooks called appropriately
        ...lifecycleConfig,
        
        mounted() {
            // Call lifecycleConfig.mounted first (shared initialization)
            if (lifecycleConfig && lifecycleConfig.mounted) {
                lifecycleConfig.mounted.call(this);
            }
            
            // Then call mode-specific mount hook
            const registry = this.componentRegistry || {};
            mode.onMount(this, registry, dependencies);
            
            // Post-initialization hook (if needed by mode)
            mode.postInit(this, dependencies);
        },
        
        beforeUnmount() {
            // Call mode-specific cleanup first
            mode.beforeUnmount(this);
            if (mode.customUnmount) {
                mode.customUnmount(this);
            }
            
            // Then call lifecycleConfig.beforeUnmount (if any additional cleanup)
            if (lifecycleConfig && lifecycleConfig.beforeUnmount) {
                lifecycleConfig.beforeUnmount.call(this);
            }
        },
        
        // Services: provide/inject for dependency injection
        ...servicesConfig
    });
}
