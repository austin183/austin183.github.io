/**
 * ExportManager - Handles collage export to JPEG.
 * Renders at 1080p resolution and triggers file download.
 */

/**
 * Exports the collage as a JPEG file.
 * @param {Object} assembler - The CollageAssembler instance
 * @param {Object} state - Current collage state (panels, images, crops, etc.)
 * @param {number} [quality] - JPEG quality (0-1), default 0.92
 * @returns {Promise<string>} Resolves with 'success' or rejects with error message
 */
export function exportToJpeg(assembler, state, quality = 0.92) {
    return new Promise((resolve, reject) => {
        try {
            // Create offscreen canvas at 1080p
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            // Never appended to DOM

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject('Failed to get canvas 2D context');
                return;
            }

            // Render all layers at full resolution
            assembler.render(ctx, {
                panels: state.panels,
                images: state.images,
                crops: state.crops,
                panelAssignments: state.panelAssignments,
                backgroundColor: state.backgroundColor,
                canvasSize: {
                    width: 1920,
                    height: 1080
                },
                selectedPanelId: null, // Don't show selection in export
                hoveredPanelId: null,
                backgroundState: state.backgroundState,
                overlayState: state.overlayState,
                titleStyle: state.titleStyle,
                titleRuns: state.titleRuns
            });

            // Generate blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject('Failed to generate JPEG blob');
                    return;
                }

                const url = URL.createObjectURL(blob);
                let a = null;
                try {
                    a = document.createElement('a');
                    a.href = url;
                    a.download = 'collage.jpg';
                    document.body.appendChild(a);
                    a.click();
                } finally {
                    if (a && document.body.contains(a)) {
                        document.body.removeChild(a);
                    }
                    URL.revokeObjectURL(url);
                }
                resolve('success');
            }, 'image/jpeg', quality);

        } catch (e) {
            reject('Export failed: ' + e.message);
        }
    });
}
