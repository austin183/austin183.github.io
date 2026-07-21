/**
 * createCollageApp - Vue app factory for CollageMaker.
 * Follows Midiestro createMidiestroApp.js pattern.
 */

export function createCollageApp({
    createApp,
    dataConfig,
    methodsConfig,
    lifecycleConfig,
    servicesConfig
}) {
    // Merge methods from lifecycleConfig if it has a methods property
    const allMethods = {
        ...methodsConfig,
        ...(lifecycleConfig.methods || {})
    };

    return createApp({
        // Data: reactive state properties (factory function required by Vue)
        data: dataConfig,

        // Computed properties
        computed: {
            filteredImages() {
                if (!this.searchQuery || this.searchQuery.trim() === '') {
                    return this.images;
                }
                const query = this.searchQuery.toLowerCase().trim();
                return this.images.filter(img =>
                    img.filename.toLowerCase().includes(query)
                );
            },

            selectedCropInfo() {
                if (!this.selectedPanelId) return null;
                return this.crops.get(this.selectedPanelId) || null;
            }
        },

        // Methods: all instance methods with access to this (Vue context)
        methods: allMethods,

        // Lifecycle hooks
        mounted: lifecycleConfig.mounted,
        beforeUnmount: lifecycleConfig.beforeUnmount,

        // Services: provide/inject for dependency injection
        ...servicesConfig
    });
}
