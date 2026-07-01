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
            }
        },

        // Methods: all instance methods with access to this (Vue context)
        methods: methodsConfig,

        // Lifecycle hooks
        ...lifecycleConfig,

        // Services: provide/inject for dependency injection
        ...servicesConfig
    });
}
