/**
 * CollageBase - Base initialization for CollageMaker.
 * Sets up shared services and default configuration.
 * Ported concept from Midiestro MidiestroBase.js
 */

import { createCollageState } from '../State/CollageState.js';
import { createLayoutManager } from '../State/LayoutManager.js';
import { createImageLibrary } from '../State/ImageLibrary.js';
import { createCollageAssembler } from '../Rendering/CollageAssembler.js';
import { createCanvasRenderer } from '../Rendering/CanvasRenderer.js';
import { createFileDropHandler } from '../Interaction/FileDropHandler.js';
import { getComponentRegistry } from '../Utils/ComponentRegistry.js';
import { LAYOUT_STYLE_OPTIONS } from '../Models/LayoutStyle.js';

/**
 * Initializes the base services and returns them for app composition.
 * @returns {Object} Base services
 */
export function initializeCollageBase() {
    const componentRegistry = getComponentRegistry();

    // State is created here but will be made reactive by Vue
    const assembler = createCollageAssembler();
    const dropHandler = createFileDropHandler();

    // Placeholder for canvas renderer (initialized in lifecycle)
    let canvasRenderer = null;
    let layoutManager = null;
    let imageLibrary = null;

    return {
        componentRegistry,
        assembler,
        dropHandler,

        // Lazy getters for services that need state
        getCanvasRenderer() {
            return canvasRenderer;
        },
        setCanvasRenderer(renderer) {
            canvasRenderer = renderer;
        },

        getLayoutManager() {
            return layoutManager;
        },
        setLayoutManager(manager) {
            layoutManager = manager;
        },

        getImageLibrary() {
            return imageLibrary;
        },
        setImageLibrary(library) {
            imageLibrary = library;
        },

        // Static data
        layoutStyleOptions: LAYOUT_STYLE_OPTIONS
    };
}
