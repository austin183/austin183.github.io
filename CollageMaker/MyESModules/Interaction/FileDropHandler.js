/**
 * FileDropHandler - Multi-file image drag-and-drop handler.
 * Adapted from Midiestro FileDropHandler.js for multi-file image support
 */

import { getBrowserUtils } from '../Utils/BrowserUtils.js';

/**
 * Creates a file drop handler.
 * @returns {Object} FileDropHandler
 */
export function createFileDropHandler() {
    const browserUtils = getBrowserUtils();
    let activeCleanup = null;

    return {
        /**
         * Check if the File API is supported.
         * @returns {boolean}
         */
        isFileAPISupported: browserUtils.isFileAPISupported,

        /**
         * Sets up drag-and-drop on the document body for image files.
         * @param {Function} onFilesDropped - Callback receiving File[] array
         */
        setupGlobalDrop(onFilesDropped) {
            // Clean up previous setup if it exists (prevents listener accumulation)
            if (activeCleanup) {
                activeCleanup();
            }

            let dragCounter = 0;

            const onDragEnter = (e) => {
                e.preventDefault();
                dragCounter++;
                document.body.classList.add('drag-over');
            };
            const onDragLeave = (e) => {
                e.preventDefault();
                dragCounter--;
                if (dragCounter <= 0) {
                    dragCounter = 0;
                    document.body.classList.remove('drag-over');
                }
            };
            const onDragOver = (e) => {
                e.preventDefault();
            };
            const onDrop = (e) => {
                e.preventDefault();
                dragCounter = 0;
                document.body.classList.remove('drag-over');

                const files = e.dataTransfer?.files;
                if (files && files.length > 0) {
                    onFilesDropped(Array.from(files));
                }
            };

            document.addEventListener('dragenter', onDragEnter);
            document.addEventListener('dragleave', onDragLeave);
            document.addEventListener('dragover', onDragOver);
            document.addEventListener('drop', onDrop);

            const cleanup = function cleanup() {
                document.removeEventListener('dragenter', onDragEnter);
                document.removeEventListener('dragleave', onDragLeave);
                document.removeEventListener('dragover', onDragOver);
                document.removeEventListener('drop', onDrop);
                // Clear visual state on cleanup (prevents stuck drag-over class)
                document.body.classList.remove('drag-over');
                activeCleanup = null;
            };

            activeCleanup = cleanup;
            return cleanup;
        },

        /**
         * Reads image files and returns them as an array.
         * @param {FileList|File[]} files
         * @returns {File[]} Filtered array of image files
         */
        filterImageFiles(files) {
            return Array.from(files).filter(f => f.type.startsWith('image/'));
        }
    };
}
