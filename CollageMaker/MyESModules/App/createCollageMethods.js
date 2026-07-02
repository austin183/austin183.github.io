/**
 * createCollageMethods - Vue methods factory for CollageMaker.
 */

export function createCollageMethods(base) {
    return {
        /**
         * Truncates a filename for display.
         * @param {string} filename
         * @param {number} maxLen
         * @returns {string}
         */
        truncateFilename(filename, maxLen = 20) {
            if (!filename) return '';
            if (filename.length <= maxLen) return filename;
            const extDot = filename.lastIndexOf('.');
            if (extDot > 0 && filename.length - extDot <= 5) {
                return filename.substring(0, maxLen - 3) + '...' + filename.substring(extDot);
            }
            return filename.substring(0, maxLen - 3) + '...';
        },

        /**
         * Triggers the hidden file input.
         */
        triggerFilePicker() {
            const input = this.$refs.fileInput;
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
                await this.imageLibrary.addImages(files);
                this._regenerateAndRender();
            }
        },

        /**
         * Selects an image from the library.
         * @param {number} index
         */
        selectImage(index) {
            if (index >= 0 && index < this.images.length) {
                this.selectedImageId = this.images[index].id;
            }
        },

        /**
         * Removes an image at the given index.
         * @param {number} index
         */
        removeImage(index) {
            this.imageLibrary.removeImage(index);
            this._regenerateAndRender();
        },

        /**
         * Clears all images.
         */
        clearAllImages() {
            this.imageLibrary.clearAll();
            this._regenerateAndRender();
        },

        /**
         * Handles layout style change.
         */
        onLayoutStyleChange() {
            this.layoutManager.setLayoutStyle(this.layoutStyle);
            this._scheduleRender();
        },

        /**
         * Handles gutter change.
         */
        onGutterChange() {
            this.layoutManager.setGutter(this.gutter);
            this._scheduleRender();
        },

        /**
         * Handles slice angle change.
         */
        onSliceAngleChange() {
            this.layoutManager.setSliceAngle(this.sliceAngle);
            this._scheduleRender();
        },

        /**
         * Handles hex spacing change.
         */
        onHexSpacingChange() {
            this.layoutManager.setHexSpacing(this.hexSpacing);
            this._scheduleRender();
        },

        /**
         * Selects a panel on the canvas.
         * @param {string|null} panelId
         */
        selectPanel(panelId) {
            this.selectedPanelId = panelId;
            // Update crop interaction for the selected panel
            if (this._cropInteraction) {
                this._cropInteraction.setPanelId(panelId);
            }
            this._scheduleCropPreviewRender();
        },

        /**
         * Resets the crop of the currently selected panel.
         */
        resetSelectedCrop() {
            if (!this.selectedPanelId || !this.cropManager) return;

            // Save state for undo
            const prevCrop = this.crops.get(this.selectedPanelId);
            const panelId = this.selectedPanelId;

            if (prevCrop) {
                this.undoManager.push({
                    label: 'Reset Crop',
                    undo: () => {
                        this.crops.set(panelId, {
                            sourceRect: { ...prevCrop.sourceRect },
                            destination: { ...prevCrop.destination }
                        });
                    },
                    redo: () => {
                        this.cropManager.resetCrop(panelId);
                    }
                });
                this._updateUndoState();
            }

            this.cropManager.resetCrop(this.selectedPanelId);
            this._scheduleRender();
            this._scheduleCropPreviewRender();
        },

        /**
         * Performs an undo operation.
         */
        undo() {
            if (!this.undoManager || !this.undoManager.canUndo()) return;

            const hadUndo = this.undoManager.undo();
            if (!hadUndo) return;

            this._updateUndoState();
            this._scheduleRender();
            this._scheduleCropPreviewRender();
        },

        /**
         * Performs a redo operation.
         */
        redo() {
            if (!this.undoManager || !this.undoManager.canRedo()) return;

            const hadRedo = this.undoManager.redo();
            if (!hadRedo) return;

            this._updateUndoState();
            this._scheduleRender();
            this._scheduleCropPreviewRender();
        },

        /**
         * Updates the canUndo/canRedo reactive state.
         * @private
         */
        _updateUndoState() {
            if (!this.undoManager) return;
            this.canUndo = this.undoManager.canUndo();
            this.canRedo = this.undoManager.canRedo();
        },

        /**
         * Regenerates layout and triggers a render.
         * @private
         */
        _regenerateAndRender() {
            this.layoutManager.regenerate();
            this._scheduleRender();
        },

        /**
         * Schedules a canvas render with the current state.
         * Uses on-demand rendering (no continuous loop) — only renders
         * when state changes, saving CPU/battery.
         * @private
         */
        _scheduleRender() {
            if (!this.canvasRenderer) return;

            const vm = this;
            const assembler = vm._assembler;

            this.canvasRenderer.scheduleRender(function (ctx, width, height) {
                if (!vm.images || vm.images.length === 0) return;

                const scaleX = width / 1920;
                const scaleY = height / 1080;

                ctx.save();
                ctx.scale(scaleX, scaleY);

                assembler.render(ctx, {
                    panels: vm.panels,
                    images: vm.images,
                    crops: vm.crops,
                    panelAssignments: vm.panelAssignments,
                    backgroundColor: vm.backgroundColor,
                    canvasSize: {
                        width: 1920,
                        height: 1080
                    },
                    selectedPanelId: vm.selectedPanelId,
                    hoveredPanelId: vm.hoveredPanelId
                });

                ctx.restore();
            });
        },

        /**
         * Schedules a crop preview canvas render.
         * @private
         */
        _scheduleCropPreviewRender() {
            if (!this.selectedPanelId || !this.cropManager) return;

            const crop = this.cropManager.getCrop(this.selectedPanelId);
            const image = this.cropManager.getPanelImage(this.selectedPanelId);
            if (!crop || !image) return;

            const canvas = document.getElementById('cropPreviewCanvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Size canvas to fit in the sidebar
            const container = canvas.parentElement;
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const cssW = rect.width || 200;
            const cssH = rect.height || 150;

            canvas.width = cssW * dpr;
            canvas.height = cssH * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Clear
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, cssW, cssH);

            // Calculate image draw size (contain)
            const imageAspect = image.width / image.height;
            const canvasAspect = cssW / cssH;

            let drawW, drawH, offsetX, offsetY;
            if (imageAspect > canvasAspect) {
                drawW = cssW;
                drawH = cssW / imageAspect;
                offsetX = 0;
                offsetY = (cssH - drawH) / 2;
            } else {
                drawH = cssH;
                drawW = cssH * imageAspect;
                offsetX = (cssW - drawW) / 2;
                offsetY = 0;
            }

            const scale = drawW / image.width;

            // Draw the full image
            ctx.drawImage(image.image, offsetX, offsetY, drawW, drawH);

            // Draw dark overlay outside the crop region
            const sr = crop.sourceRect;
            const cropScreenX = offsetX + sr.x * scale;
            const cropScreenY = offsetY + sr.y * scale;
            const cropScreenW = sr.width * scale;
            const cropScreenH = sr.height * scale;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            // Top
            ctx.fillRect(0, 0, cssW, cropScreenY);
            // Bottom
            ctx.fillRect(0, cropScreenY + cropScreenH, cssW, cssH - cropScreenY - cropScreenH);
            // Left
            ctx.fillRect(0, cropScreenY, cropScreenX, cropScreenH);
            // Right
            ctx.fillRect(cropScreenX + cropScreenW, cropScreenY, cssW - cropScreenX - cropScreenW, cropScreenH);

            // Draw crop border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cropScreenX, cropScreenY, cropScreenW, cropScreenH);

            // Draw corner handles (size matches CORNER_HANDLE_SIZE in CropInteraction.js)
            const handleSize = 12;
            ctx.fillStyle = '#ffffff';
            const corners = [
                [cropScreenX, cropScreenY],
                [cropScreenX + cropScreenW, cropScreenY],
                [cropScreenX, cropScreenY + cropScreenH],
                [cropScreenX + cropScreenW, cropScreenY + cropScreenH]
            ];
            for (const [cx, cy] of corners) {
                ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
            }
        }
    };
}
