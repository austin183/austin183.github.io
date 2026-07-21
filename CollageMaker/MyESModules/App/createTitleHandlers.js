/**
 * Title handlers - Handles title editing and formatting.
 * Uses injected callback for DIP compliance — no direct this._scheduleRender().
 */

/**
 * Creates title handlers.
 * @param {Function} getTitleManager - Function that returns TitleManager instance
 * @param {Function} onRenderScheduled - Callback to schedule a canvas render
 * @returns {Object} Title handlers object
 */
export function createTitleHandlers(getTitleManager, onRenderScheduled) {
    return {
        /**
         * Handles title text change.
         * Shows a toast if the text was truncated (exceeded 3 lines).
         */
        onTitleTextChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                const result = titleManager.setText(this.titleText);
                if (result && result.truncated && this.showToast) {
                    this.showToast('Title limited to 3 lines', 'info', 3000);
                }
            }
            onRenderScheduled(this);
        },

        /**
         * Prevents Enter key from creating a 4th line (avoids visual flicker).
         * Shows a brief toast so the user understands why Enter was blocked.
         * @param {KeyboardEvent} event
         */
        onTitleEnterKey(event) {
            const lineCount = (this.titleText || '').split('\n').length;
            if (lineCount >= 3) {
                event.preventDefault();
                if (this.showToast) {
                    this.showToast('Maximum 3 lines reached', 'info', 2000);
                }
            }
        },

        /**
         * Handles title text input selection change.
         * @param {Event} event
         */
        onTitleSelectionChange(event) {
            this.titleSelectionStart = event.target.selectionStart;
            this.titleSelectionEnd = event.target.selectionEnd;
            return {
                start: this.titleSelectionStart,
                end: this.titleSelectionEnd
            };
        },

        /**
         * Toggles bold on selected title text.
         */
        toggleTitleBold() {
            const start = Math.min(this.titleSelectionStart, this.titleSelectionEnd);
            const end = Math.max(this.titleSelectionStart, this.titleSelectionEnd);
            const titleManager = getTitleManager();
            if (titleManager && start < end) {
                titleManager.toggleBold(start, end);
                this.titleText = titleManager.getFullText();
                onRenderScheduled(this);
            }
        },

        /**
         * Toggles italic on selected title text.
         */
        toggleTitleItalic() {
            const start = Math.min(this.titleSelectionStart, this.titleSelectionEnd);
            const end = Math.max(this.titleSelectionStart, this.titleSelectionEnd);
            const titleManager = getTitleManager();
            if (titleManager && start < end) {
                titleManager.toggleItalic(start, end);
                this.titleText = titleManager.getFullText();
                onRenderScheduled(this);
            }
        },

        /**
         * Toggles underline on selected title text.
         */
        toggleTitleUnderline() {
            const start = Math.min(this.titleSelectionStart, this.titleSelectionEnd);
            const end = Math.max(this.titleSelectionStart, this.titleSelectionEnd);
            const titleManager = getTitleManager();
            if (titleManager && start < end) {
                titleManager.toggleUnderline(start, end);
                this.titleText = titleManager.getFullText();
                onRenderScheduled(this);
            }
        },

        /**
         * Checks if any formatting is active for the current selection.
         * @param {string} prop - 'bold', 'italic', or 'underline'
         * @returns {boolean}
         */
        isTitleFormatActive(prop) {
            const start = Math.min(this.titleSelectionStart, this.titleSelectionEnd);
            const end = Math.max(this.titleSelectionStart, this.titleSelectionEnd);
            if (start === end || !this.titleRuns || this.titleRuns.length === 0) return false;

            let offset = 0;
            for (const run of this.titleRuns) {
                const runStart = offset;
                const runEnd = offset + run.text.length;
                if (runEnd > start && runStart < end) {
                    if (run[prop]) return true;
                }
                offset = runEnd;
            }
            return false;
        },

        /**
         * Handles title font family change.
         */
        onTitleFontFamilyChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setFontFamily(this.titleStyle.fontFamily);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles title font size change.
         */
        onTitleFontSizeChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setFontSize(this.titleStyle.fontSize);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles title font color change.
         */
        onTitleFontColorChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setFontColor(this.titleStyle.fontColor);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles title background color change.
         */
        onTitleBackgroundColorChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setBackgroundColor(this.titleStyle.backgroundColor);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles title alignment change.
         */
        onTitleAlignmentChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setAlignment(this.titleStyle.alignment);
            }
            onRenderScheduled(this);
        },

        /**
         * Toggles title background visibility.
         */
        onTitleShowBackgroundChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.showBackground(this.titleStyle.showBackground);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles title font opacity change.
         */
        onTitleFontOpacityChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setFontOpacity(this.titleStyle.fontOpacity);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles title background opacity change.
         */
        onTitleBgOpacityChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setBgOpacity(this.titleStyle.bgOpacity);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles title box width change.
         */
        onTitleWidthChange() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setWidth(this.titleStyle.titleBoxWidth);
            }
            onRenderScheduled(this);
        },

        /**
         * Resets the title box position and width to defaults.
         */
        resetTitlePosition() {
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.resetPosition();
            }
            onRenderScheduled(this);
        }
    };
}

