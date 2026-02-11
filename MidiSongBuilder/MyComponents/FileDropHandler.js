function getFileDropHandler() {
    return {
        /**
         * Check if the File API is supported by the browser
         * @returns {boolean} True if File API is supported
         */
        isFileAPISupported: function() {
            return (
                window.File &&
                window.FileReader &&
                window.FileList &&
                window.Blob
            );
        },

        /**
         * Set up drag and drop functionality for a file drop zone
         * @param {string} elementId - The ID of the drop zone container element
         * @param {Function} onFileSelectCallback - Callback function that receives the selected file
         */
        setupFileDrop: function(elementId, onFileSelectCallback) {
            const element = document.getElementById(elementId);

            if (!element) {
                console.error(`Element with ID "${elementId}" not found`);
                return;
            }

            // Drag enter handler - add hover state
            element.addEventListener("dragenter", (e) => {
                e.preventDefault();
                element.classList.add("Hover");
            });

            // Drag leave handler - remove hover state
            element.addEventListener("dragleave", (e) => {
                e.preventDefault();
                element.classList.remove("Hover");
            });

            // Drag over handler - prevent default to allow drop
            element.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            // Drop handler - process the dropped file
            element.addEventListener("drop", (e) => {
                e.preventDefault();
                element.classList.remove("Hover");

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    onFileSelectCallback(files[0]);
                }
            });

            // Set up file input change handler
            const fileInput = element.querySelector("input[type='file']");
            if (fileInput) {
                fileInput.addEventListener("change", (e) => {
                    const files = e.target.files;
                    if (files.length > 0) {
                        onFileSelectCallback(files[0]);
                    }
                });
            }
        },

        /**
         * Remove all event listeners from a file drop zone
         * @param {string} elementId - The ID of the drop zone container element
         */
        removeFileDropListeners: function(elementId) {
            const element = document.getElementById(elementId);

            if (!element) {
                return;
            }

            // Remove drag event listeners
            element.removeEventListener("dragenter", null);
            element.removeEventListener("dragleave", null);
            element.removeEventListener("dragover", null);
            element.removeEventListener("drop", null);

            // Remove file input change listener
            const fileInput = element.querySelector("input[type='file']");
            if (fileInput) {
                fileInput.removeEventListener("change", null);
            }
        },

        /**
         * Read a MIDI file and return its contents as an ArrayBuffer
         * @param {File} file - The file to read
         * @param {Function} callback - Callback function that receives the ArrayBuffer result
         */
        readMidiFile: function(file, callback) {
            const reader = new FileReader();
            reader.onload = function(e) {
                callback(e.target.result);
            }.bind(this);
            reader.readAsArrayBuffer(file);
        }
    };
}
