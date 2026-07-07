/**
  * ImageLibrary - Image collection management.
  * Ported from Swift ViewModel/ImageLibraryManager.swift
  */

import { createImageItem, generateThumbnail, disposeImageItem } from '../Models/ImageItem.js';

/**
 * Creates an image library manager.
 * @param {Object} state - The reactive CollageState
 * @param {Function} onImagesChanged - Callback when images change
 * @returns {Object} ImageLibrary
 */
export function createImageLibrary(state, onImagesChanged) {
    return {
        /**
         * Adds images from an array of File objects.
         * @param {File[]} files
         * @returns {Promise<void>}
         */
        async addImages(files) {
            const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (imageFiles.length === 0) return;

            const newItems = await Promise.all(
                imageFiles.map(file => this._loadImage(file))
            );

            const validItems = newItems.filter(item => item !== null);
            const failedCount = newItems.length - validItems.length;
            if (failedCount > 0) {
                console.warn(`ImageLibrary: ${failedCount} of ${newItems.length} image(s) failed to load`);
            }
            if (validItems.length === 0) return;

            state.images.push(...validItems);
            onImagesChanged();
        },

        /**
          * Disposes and removes an image at the given index.
          * Properly nulls out image references to allow garbage collection.
          * @param {number} index
          */
        disposeImage(index) {
            if (index < 0 || index >= state.images.length) return;

            const imageItem = state.images[index];
            disposeImageItem(imageItem); // Centralized disposal logic

            // Remove from array
            state.images.splice(index, 1);
            onImagesChanged();
        },

        /**
          * Removes an image at the given index (legacy, no cleanup).
          * @param {number} index
          * @deprecated Use disposeImage instead for proper cleanup
          */
        removeImage(index) {
            console.warn('ImageLibrary.removeImage() is deprecated. Use disposeImage() for proper memory cleanup.');
            if (index < 0 || index >= state.images.length) return;
            state.images.splice(index, 1);
            onImagesChanged();
        },

        /**
          * Clears all images, disposing their references.
          */
        clearAll() {
            // Dispose each image first to release HTMLImageElement references
            for (let i = 0; i < state.images.length; i++) {
                disposeImageItem(state.images[i]);
            }

            // Remove all items from the array in-place to maintain reactive reference
            state.images.splice(0, state.images.length);
            onImagesChanged();
        },

        /**
         * Loads a single image file into an ImageItem.
         * @param {File} file
         * @returns {Promise<Object|null>}
         */
        _loadImage(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const thumbnail = generateThumbnail(img);
                        const item = createImageItem({
                            image: img,
                            filename: file.name,
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                            thumbnail
                        });
                        resolve(item);
                    };
                    img.onerror = () => resolve(null);
                    img.src = e.target.result;
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        }
    };
}
