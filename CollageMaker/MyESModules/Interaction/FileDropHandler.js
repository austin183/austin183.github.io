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
            let dragCounter = 0;

            document.addEventListener('dragenter', (e) => {
                e.preventDefault();
                dragCounter++;
                document.body.classList.add('drag-over');
            });

            document.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dragCounter--;
                if (dragCounter <= 0) {
                    dragCounter = 0;
                    document.body.classList.remove('drag-over');
                }
            });

            document.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            document.addEventListener('drop', (e) => {
                e.preventDefault();
                dragCounter = 0;
                document.body.classList.remove('drag-over');

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    onFilesDropped(files);
                }
            });
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
