/**
 * File handlers - Handles file input and drag-drop operations.
 */

/**
 * Creates file handlers.
 * @param {Function} getImageLibrary - Function that returns ImageLibrary instance
 * @param {Function} onRegenerate - Callback to trigger layout regeneration and render
 * @param {string} [fileInputId='fileInput'] - DOM ID of the file input element
 * @param {Function} [onImageLoadingProgress] - Optional progress callback(current, total)
 * @returns {Object} File handlers object
 */
export function createFileHandlers(getImageLibrary, onRegenerate, fileInputId = 'fileInput', onImageLoadingProgress = null) {
    let activeCleanup = null;

    return {
        /**
         * Triggers the hidden file input.
         */
        triggerFilePicker() {
            const input = document.getElementById(fileInputId);
            if (input) {
                input.value = '';
                input.click();
            }
        },

        /**
         * Handles file input change.
         * @param {Event} event
         */
        async handleFileInputChange() {
            const input = document.getElementById(fileInputId);
            const files = input ? input.files : null;
            if (files && files.length > 0) {
                const imageLibrary = getImageLibrary();
                const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
                let progressStarted = false;

                try {
                    if (onImageLoadingProgress && imageFiles.length > 0) {
                        onImageLoadingProgress(this, 0, imageFiles.length);
                        progressStarted = true;
                    }

                    await imageLibrary.addImages(files, (current, total) => {
                        if (onImageLoadingProgress) {
                            onImageLoadingProgress(this, current, total);
                        }
                    });
                } finally {
                    if (progressStarted && onImageLoadingProgress) {
                        // Signal completion by passing current === total
                        onImageLoadingProgress(this, imageFiles.length, imageFiles.length);
                    }
                }

                // Use injected callback for DIP compliance
                onRegenerate(this);
                // Reset input so re-selecting the same file works
                if (input) input.value = '';
            }
        },

        /**
         * Sets up global drop handler for files dropped outside Vue-managed elements.
         * @param {Function} onDrop - Callback that receives array of files
         */
        setupGlobalDrop(onDrop) {
            // Clean up previous setup if it exists (prevents listener accumulation)
            if (activeCleanup) {
                activeCleanup();
            }

            const onDragOver = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };
            const onDropHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const files = e.dataTransfer?.files;
                if (files && files.length > 0) {
                    onDrop(Array.from(files));
                }
            };

            document.addEventListener('dragover', onDragOver);
            document.addEventListener('drop', onDropHandler);

            const cleanup = function cleanup() {
                document.removeEventListener('dragover', onDragOver);
                document.removeEventListener('drop', onDropHandler);
                activeCleanup = null;
            };

            activeCleanup = cleanup;
            return cleanup;
        }
    };
}
