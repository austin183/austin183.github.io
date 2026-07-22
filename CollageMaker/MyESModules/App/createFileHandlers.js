/**
 * File handlers - Handles file input and drag-drop operations.
 */

/**
 * Creates file handlers.
 * @param {Function} getImageLibrary - Function that returns ImageLibrary instance
 * @param {Function} onRegenerate - Callback to trigger layout regeneration and render
 * @param {string} [fileInputId='fileInput'] - DOM ID of the file input element
 * @param {Function} [onImageLoadingProgress] - Optional progress callback(current, total)
 * @param {Function} [onImageFailures] - Optional callback(vm, failedCount, totalCount) when images fail to load
 * @param {Function} [onUndoCommand] - Optional callback(vm, cmd) to push undo commands
 * @returns {Object} File handlers object
 */
export function createFileHandlers(getImageLibrary, onRegenerate, fileInputId = 'fileInput', onImageLoadingProgress = null, onImageFailures = null, onUndoCommand = null) {
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

                // Snapshot pre-state for undo
                const preImagesCount = this.images.length;
                const preCrops = JSON.parse(JSON.stringify(this.crops || []));

                try {
                    if (onImageLoadingProgress && imageFiles.length > 0) {
                        onImageLoadingProgress(this, 0, imageFiles.length);
                        progressStarted = true;
                    }

                    await imageLibrary.addImages(files,
                        (current, total) => {
                            if (onImageLoadingProgress) {
                                onImageLoadingProgress(this, current, total);
                            }
                        },
                        (failedCount, totalCount) => {
                            if (typeof onImageFailures === 'function') {
                                onImageFailures(this, failedCount, totalCount);
                            }
                        }
                    );
                } finally {
                    if (progressStarted && onImageLoadingProgress) {
                        // Signal completion by passing current === total
                        onImageLoadingProgress(this, imageFiles.length, imageFiles.length);
                    }
                }

                // Push undo command if images were added
                if (onUndoCommand && this.images.length > preImagesCount) {
                    const addedItems = this.images.slice(preImagesCount);
                    const addedImageIds = addedItems.map(item => item.id);
                    // Snapshot post-state crops (after images added, before regenerate)
                    const postCrops = JSON.parse(JSON.stringify(this.crops || []));
                    onUndoCommand(this, {
                        label: 'Add Images',
                        undoFn: (vm) => {
                            // Remove added images by filtering — dispose image references
                            const remaining = [];
                            for (const item of vm.images) {
                                if (addedImageIds.includes(item.id)) {
                                    if (item.image) {
                                        item.image.src = '';
                                        item.image = null;
                                    }
                                } else {
                                    remaining.push(item);
                                }
                            }
                            vm.images.length = 0;
                            vm.images.push(...remaining);
                            // Restore pre-state crops
                            if (vm.crops) {
                                vm.crops.length = 0;
                                vm.crops.push(...JSON.parse(JSON.stringify(preCrops)));
                            }
                            if (vm._regenerateAndRender) vm._regenerateAndRender();
                        },
                        redoFn: (vm) => {
                            // Re-adding images is not possible (File objects are gone)
                            // Restore to post-state crops
                            if (vm.crops) {
                                vm.crops.length = 0;
                                vm.crops.push(...JSON.parse(JSON.stringify(postCrops)));
                            }
                            if (vm._regenerateAndRender) vm._regenerateAndRender();
                        }
                    });
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
