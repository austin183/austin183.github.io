/**
 * State actions — Pure functions for mutating state.
 * Used by CropManager, LayoutManager, and other state managers
 * to provide testable, decoupled state mutation logic.
 *
 * Future: Additional managers (ImageLibrary, etc.) should migrate
 * to use action functions for full DIP compliance.
 */

/**
 * Adds images to the state's images array.
 * @param {Object} state - The reactive state object
 * @param {Array<HTMLImageElement>} images - Array of image elements
 */
export function addImagesAction(state, images) {
    if (Array.isArray(images)) {
        state.images.push(...images);
    }
}

/**
 * Removes an image at the given index.
 * @param {Object} state - The reactive state object
 * @param {number} index - Index of image to remove
 */
export function removeImageAction(state, index) {
    if (index >= 0 && index < state.images.length) {
        state.images.splice(index, 1);
    }
}

/**
 * Disposes and removes an image at the given index.
 * This clears the image reference before removal for memory management.
 * @param {Object} state - The reactive state object
 * @param {number} index - Index of image to remove
 */
export function disposeImageAction(state, index) {
    if (index >= 0 && index < state.images.length) {
        const imageItem = state.images[index];
        if (imageItem && imageItem.image) {
            imageItem.image = null;
        }
        state.images.splice(index, 1);
    }
}

/**
 * Clears all images from state.
 * Disposes of each image first for memory management.
 * @param {Object} state - The reactive state object
 */
export function clearImagesAction(state) {
    state.images.forEach(img => {
        if (img && img.image) {
            img.image = null;
        }
    });
    state.images = [];
}

/**
 * Regenerates layout, panels, crops, and panel assignments.
 * @param {Object} state - The reactive state object
 * @param {Array} panels - Array of panel objects
 * @param {Map} crops - Map of crop info
 * @param {Map} panelAssignments - Map of panel to image index
 * @param {Function} computeDefaultCrops - Function to compute default crops (from assembler)
 */
export function regenerateLayoutAction(state, panels, crops, panelAssignments, computeDefaultCrops) {
    state.panels = panels;
    state.crops = crops;
    state.panelAssignments = panelAssignments;
    state.layoutVersion += 1;

    // If computeDefaultCrops is provided, use it to set default crops
    if (computeDefaultCrops && panels.length > 0) {
        state.crops = computeDefaultCrops(panels, state.images, panelAssignments);
    }
}

/**
 * Sets a crop for a specific panel.
 * @param {Object} state - The reactive state object
 * @param {string} panelId - Panel ID
 * @param {Object} crop - Crop info object
 */
export function setCropAction(state, panelId, crop) {
    state.crops.set(panelId, crop);
}

/**
 * Resets a crop to default for a specific panel.
 * @param {Object} state - The reactive state object
 * @param {string} panelId - Panel ID
 * @param {Object} panel - Panel object
 * @param {Array} images - Array of images
 * @param {Map} panelAssignments - Map of panel to image index
 * @param {Function} createDefaultCrop - Function to create default crop
 */
export function resetCropAction(state, panelId, panel, images, panelAssignments, createDefaultCrop) {
    if (!panel) return;

    const imageIndex = panelAssignments.get(panelId);
    if (imageIndex === undefined || imageIndex >= images.length) return;

    const image = images[imageIndex];
    const panelSize = panel.geometry.type === 'rect'
        ? panel.geometry.rect
        : panel.geometry.boundingRect;

    const defaultCrop = createDefaultCrop({
        panelId: panelId,
        imageSize: { width: image.width, height: image.height },
        panelSize: panelSize
    });

    state.crops.set(panelId, defaultCrop);
}
