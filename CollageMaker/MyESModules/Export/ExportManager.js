/**
 * ExportManager - Handles collage export with multiple format support.
 * Renders at 1080p resolution and triggers file download.
 * Uses strategy pattern for extensibility.
 */

import { exportToJpeg } from './formats/jpegExporter.js';
import { exportToPng } from './formats/pngExporter.js';

// Registry of export formats
const EXPORT_FORMATS = {
    jpeg: exportToJpeg,
    png: exportToPng
};

export const ExportManager = {
    /**
     * Register a new export format.
     * @param {string} formatName - The format name (e.g., 'jpeg', 'png')
     * @param {Function} exporterFn - Function that performs the export
     */
    registerFormat(formatName, exporterFn) {
        EXPORT_FORMATS[formatName] = exporterFn;
    },

    /**
     * Export the collage in the specified format.
     * @param {Object} assembler - The CollageAssembler instance
     * @param {Object} state - Current collage state
     * @param {string} [format='jpeg'] - Export format
     * @param {number} [quality=0.92] - JPEG quality (ignored for other formats)
     * @returns {Promise<string>} Resolves with 'success' or rejects with error
     */
    async export(assembler, state, format = 'jpeg', quality = 0.92) {
        const exporter = EXPORT_FORMATS[format];
        if (!exporter) {
            throw new Error(`Unsupported export format: ${format}`);
        }

        return exporter(assembler, state, quality);
    }
};

