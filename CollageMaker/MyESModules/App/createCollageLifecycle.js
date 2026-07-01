/**
 * createCollageLifecycle - Vue lifecycle hooks for CollageMaker.
 * Handles canvas initialization, render scheduling, and cleanup.
 */

import { createCanvasRenderer } from '../Rendering/CanvasRenderer.js';
import { createLayoutManager } from '../State/LayoutManager.js';
import { createImageLibrary } from '../State/ImageLibrary.js';
import { SIZE_CONSTANTS } from '../Models/SizeConstants.js';

export function createCollageLifecycle(base) {
    return {
        mounted() {
            // Initialize canvas renderer
            const renderer = createCanvasRenderer('previewCanvas');
            renderer.init({
                width: SIZE_CONSTANTS.defaultPreviewWidth,
                height: SIZE_CONSTANTS.defaultPreviewHeight
            });
            base.setCanvasRenderer(renderer);
            this.canvasRenderer = renderer;

            // Store assembler reference for render function
            this._assembler = base.assembler;

            // Initialize layout manager
            const layoutManager = createLayoutManager(this, base.assembler);
            base.setLayoutManager(layoutManager);
            this.layoutManager = layoutManager;

            // Initialize image library
            const onImagesChanged = () => {
                // Hook point for future use
            };
            const imageLibrary = createImageLibrary(this, onImagesChanged);
            base.setImageLibrary(imageLibrary);
            this.imageLibrary = imageLibrary;

            // Set up global file drop handler for drops outside Vue-managed elements
            // (the element-level @drop handlers in the template handle drops on canvas/library)
            base.dropHandler.setupGlobalDrop(async (files) => {
                await imageLibrary.addImages(files);
                layoutManager.regenerate();
                this._scheduleRender();
            });

            // Handle window resize
            window.addEventListener('resize', this._handleResize);
        },

        beforeUnmount() {
            window.removeEventListener('resize', this._handleResize);
            if (this.canvasRenderer) {
                this.canvasRenderer.dispose();
            }
        },

        /**
         * Handles window resize.
         * @private
         */
        _handleResize() {
            // In the future, we might want to resize the preview canvas
            // For now, the fixed preview size works
        }
    };
}
