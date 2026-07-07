/**
 * File handlers - Handles file input and drag-drop operations.
 */

/**
 * Creates file handlers.
 * @param {Function} getImageLibrary - Function that returns ImageLibrary instance
 * @param {Function} onRegenerate - Callback to trigger layout regeneration and render
 * @returns {Object} File handlers object
 */
export function createFileHandlers(getImageLibrary, onRegenerate) {
    let activeCleanup = null;

    return {
        /**
         * Triggers the hidden file input.
         */
        triggerFilePicker() {
            const input = document.getElementById('fileInput');
            if (input) {
                input.value = '';
                input.click();
            }
        },

        /**
          * Handles file input change.
          * @param {Event} event
          */
          async handleFileInputChange(event) {
              const files = event.target.files;
              if (files && files.length > 0) {
                  const imageLibrary = getImageLibrary();
                  await imageLibrary.addImages(files);
                  // Use _regenerateAndRender to ensure layout is regenerated and canvas is rendered
                  this._regenerateAndRender();
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
