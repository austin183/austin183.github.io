/**
 * ComponentRegistry - Centralized registry for shared component dependencies
 *
 * This module provides a dependency injection pattern for shared state and services
 * that were previously accessed as global variables.
 */
export default function getComponentRegistry() {
    // Shared state
    var pressedKeys = {};

    // Services that can be registered
    var registeredServices = {};

    var registry = {
        /**
         * Get the shared pressedKeys object
         * @returns {Object} The pressedKeys dictionary
         */
        getPressedKeys: function() {
            return pressedKeys;
        },

        /**
         * Set the pressedKeys object (for testing or reinitialization)
         * @param {Object} newPressedKeys - The new pressedKeys object
         */
        setPressedKeys: function(newPressedKeys) {
            if (newPressedKeys && typeof newPressedKeys === 'object') {
                pressedKeys = newPressedKeys;
            }
        },

        /**
         * Register a service for shared access
         * @param {string} name - The service name
         * @param {Object} service - The service instance
         */
        registerService: function(name, service) {
            if (name && service) {
                registeredServices[name] = service;
            }
        },

        /**
         * Get a registered service by name
         * @param {string} name - The service name
         * @returns {Object|null} The service instance or null if not found
         */
        getService: function(name) {
            return registeredServices[name] || null;
        },

        /**
         * Clear all registered services
         */
        clearServices: function() {
            registeredServices = {};
        },

        /**
         * Reset the registry to initial state
         */
        reset: function() {
            pressedKeys = {};
            this.clearServices();
        }
    };

    return registry;
}
