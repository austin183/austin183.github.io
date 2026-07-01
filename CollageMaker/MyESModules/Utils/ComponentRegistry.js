/**
 * ComponentRegistry - Simple DI container for shared services.
 * Reused concept from Midiestro ComponentRegistry.js, simplified for CollageMaker.
 */

export function getComponentRegistry() {
    const services = {};

    return {
        registerService(name, service) {
            if (name && service) {
                services[name] = service;
            }
        },

        getService(name) {
            return services[name] || null;
        },

        clearServices() {
            Object.keys(services).forEach(key => delete services[key]);
        },

        reset() {
            this.clearServices();
        }
    };
}
