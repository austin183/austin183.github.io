/**
 * createCollageServices - Vue provide/inject setup for dependency injection.
 * Note: backgroundManager and titleManager are initialized in mounted(),
 * so they cannot be provided directly. Components should access them
 * via this.backgroundManager / this.titleManager on the Vue instance.
 */

export function createCollageServices(base) {
    return {
        provide() {
            return {
                componentRegistry: base.componentRegistry,
                assembler: base.assembler
            };
        }
    };
}
