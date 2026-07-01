/**
 * createCollageServices - Vue provide/inject setup for dependency injection.
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
