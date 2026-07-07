/**
 * PNG Exporter - Exports collage as PNG format.
 * Part of extensible export system using strategy pattern.
 *
 * @param {Object} assembler - The CollageAssembler instance
 * @param {Object} state - Current collage state
 * @param {number} [_quality=1.0] - Quality parameter (accepted for API alignment
 *   with JPEG exporter; ignored by browser for PNG since it is lossless)
 * @param {Object} [exportSize={width:1920, height:1080}] - Export dimensions
 * @returns {Promise<string>} Resolves with 'success' or rejects with error
 */
export function exportToPng(assembler, state, _quality = 1.0, exportSize = { width: 1920, height: 1080 }) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = exportSize.width;
            canvas.height = exportSize.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject('Failed to get canvas 2D context');
                return;
            }

            // Clear and fill white background before rendering
            ctx.clearRect(0, 0, exportSize.width, exportSize.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, exportSize.width, exportSize.height);

            assembler.render(ctx, {
                panels: state.panels,
                images: state.images,
                crops: state.crops,
                panelAssignments: state.panelAssignments,
                backgroundColor: state.backgroundColor,
                canvasSize: exportSize,
                selectedPanelId: null,
                hoveredPanelId: null,
                backgroundState: state.backgroundState,
                overlayState: state.overlayState,
                titleStyle: state.titleStyle,
                titleRuns: state.titleRuns
            });

            canvas.toBlob((blob) => {
                if (!blob) {
                    reject('Failed to generate PNG blob');
                    return;
                }

                const url = URL.createObjectURL(blob);
                let a = null;
                try {
                    a = document.createElement('a');
                    a.href = url;
                    a.download = 'collage.png';
                    document.body.appendChild(a);
                    a.click();
                } finally {
                    if (a && document.body.contains(a)) {
                        document.body.removeChild(a);
                    }
                    URL.revokeObjectURL(url);
                }
                resolve('success');
            }, 'image/png');

        } catch (e) {
            reject('Export failed: ' + e.message);
        }
    });
}
