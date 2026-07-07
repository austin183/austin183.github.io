/**
 * Export handlers - Handles export functionality.
 */

import { ExportManager } from '../Export/ExportManager.js';

/**
 * Creates export handlers.
 * @param {Object} assembler - CollageAssembler instance
 * @returns {Object} Export handlers object
 */
export function createExportHandlers(assembler) {
    return {
        /**
         * Triggers collage export as JPEG.
         */
        async exportCollage() {
            if (this.isExporting) return;
            this.isExporting = true;
            this.exportStatus = 'Exporting...';

            try {
                const stateSnapshot = {
                    panels: this.panels,
                    images: this.images,
                    crops: this.crops,
                    panelAssignments: this.panelAssignments,
                    backgroundColor: this.backgroundColor,
                    backgroundState: this._buildBackgroundState ? this._buildBackgroundState() : null,
                    overlayState: this._buildOverlayState ? this._buildOverlayState() : null,
                    titleStyle: this.titleStyle,
                    titleRuns: this.titleRuns
                };

                // Use ExportManager for extensibility
                await ExportManager.export(
                    assembler,
                    stateSnapshot,
                    this.exportFormat || 'jpeg',
                    this.exportQuality
                );

                this.exportStatus = 'Exported successfully!';
                setTimeout(() => { this.exportStatus = ''; }, 3000);
            } catch (e) {
                console.error('Export failed:', e);
                this.exportStatus = 'Export failed: ' + e;
                // Error messages stay longer so users can read them
                setTimeout(() => { this.exportStatus = ''; }, 6000);
            } finally {
                this.isExporting = false;
            }
        },

        /**
         * Handles export quality change.
         */
        onExportQualityChange() {
            // State is updated by caller if needed
        }
    };
}

