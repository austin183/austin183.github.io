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
                    selectedPanelId: vm.selectedPanelId
                });

                ctx.restore();
            });
        }
    };
}
