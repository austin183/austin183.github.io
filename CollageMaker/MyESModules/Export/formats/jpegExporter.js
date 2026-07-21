/**
 * JPEG Exporter - Exports collage as JPEG format.
 * Part of extensible export system using strategy pattern.
 */

export function exportToJpeg(assembler, state, quality = 0.92, exportSize = { width: 1920, height: 1080 }) {
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

            // Render collage
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

            // Export as JPEG
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
