/**
 * CollageBase - Base initialization for CollageMaker.
 * Sets up shared services and default configuration.
 * Ported concept from Midiestro MidiestroBase.js
 */

import { createCollageAssembler } from '../Rendering/CollageAssembler.js';
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

    // Placeholder for services that need state (initialized in lifecycle)
    let canvasRenderer = null;
    let layoutManager = null;
    let imageLibrary = null;
    let backgroundManager = null;
    let titleManager = null;

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

        getBackgroundManager() {
            return backgroundManager;
        },
        setBackgroundManager(manager) {
            backgroundManager = manager;
        },

        getTitleManager() {
            return titleManager;
        },
        setTitleManager(manager) {
            titleManager = manager;
        },

        // Static data
        layoutStyleOptions: LAYOUT_STYLE_OPTIONS
    };
}
