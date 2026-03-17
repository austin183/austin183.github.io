/**
 * createMidiestroApp - Shared Vue.js app factory for 2D and 3D game modes
 * 
 * Creates a Vue.js application with focused configuration objects:
 * - dataConfig: From createGameData() - all reactive state properties
 * - methodsConfig: From createGameMethods() - all instance methods
 * - lifecycleConfig: From createGameLifecycle() - mounted/beforeUnmount hooks
 * - servicesConfig: From createGameServices() - provide/inject for DI
 * 
 * Reduces interface complexity from 28+ properties to ~6 focused objects,
 * improving maintainability and testability via Interface Segregation Principle.
 */

export function createMidiestroApp({ 
    mode, // '2d' | '3d' - determines which lifecycle hooks to use
    createApp, // Vue.createApp reference from window
    
    // Focused configuration objects (from dedicated factories)
    dataConfig, // From createGameData() - reactive state factory function
    methodsConfig, // From createGameMethods() - all app methods
    lifecycleConfig, // From createGameLifecycle() - mounted/beforeUnmount hooks
    servicesConfig // From createGameServices() - provide/inject setup
}) {
    return createApp({
        // Data: reactive state properties (factory function required by Vue)
        data: dataConfig,
        
        // Methods: all instance methods with access to this (Vue context)
        methods: {
            ...methodsConfig,
            
            // 3D-specific methods (only added in 3D mode)
            ...(mode === '3d' ? {
                handleCameraPresets: function() {
                    // To be overridden by caller if needed
                }
            } : {})
        },
        
        // Lifecycle hooks: mounted/beforeUnmount from lifecycleConfig
        ...lifecycleConfig,
        
        // Services: provide/inject for dependency injection
        ...servicesConfig
    });
}
