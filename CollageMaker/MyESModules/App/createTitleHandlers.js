/**
 * Title handlers - Handles title editing and formatting.
 * Uses injected callback for DIP compliance — no direct this._scheduleRender().
 * Supports optional onUndoCommand callback for undo/redo integration.
 */

/**
 * Creates title handlers.
 * @param {Function} getTitleManager - Function that returns TitleManager instance
 * @param {Function} onRenderScheduled - Callback to schedule a canvas render
 * @param {Function|null} onUndoCommand - Optional callback to push undo commands (vm, cmd)
 * @returns {Object} Title handlers object
 */
export function createTitleHandlers(getTitleManager, onRenderScheduled, onUndoCommand = null) {
    // Title text snapshot — captures pre-state on first keystroke,
    // cleared after commitTitleText() pushes the undo command.
    let titleTextSnapshot = null;

    // Title style snapshot — captured on focus so we know the pre-state
    // when style change handlers fire (v-model updates data before @change/@input).
    let titleStyleSnapshot = null;

    function pushTitleTextUndo(vm) {
        if (titleTextSnapshot && onUndoCommand) {
            const preState = {
                titleText: titleTextSnapshot.titleText,
                titleRuns: JSON.parse(JSON.stringify(titleTextSnapshot.titleRuns))
            };
            const postState = {
                titleText: vm.titleText,
                titleRuns: JSON.parse(JSON.stringify(vm.titleRuns || []))
            };

            if (preState.titleText !== postState.titleText) {
                onUndoCommand(vm, {
                    label: 'Edit Title',
                    undoFn: (v) => {
                        v.titleText = preState.titleText;
                        v.titleRuns.length = 0;
                        v.titleRuns.push(...preState.titleRuns);
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        v.titleText = postState.titleText;
                        v.titleRuns.length = 0;
                        v.titleRuns.push(...postState.titleRuns);
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        }
        titleTextSnapshot = null;
    }

    function snapshotTitleStyleInternal(vm) {
        if (!titleStyleSnapshot) {
            titleStyleSnapshot = { ...vm.titleStyle };
        }
    }

    function pushTitleStyleUndo(vm) {
        if (titleStyleSnapshot && onUndoCommand) {
            const preState = { ...titleStyleSnapshot };
            const postState = { ...vm.titleStyle };

            // Check if anything changed
            let changed = false;
            for (const key of Object.keys(preState)) {
                if (preState[key] !== postState[key]) { changed = true; break; }
            }

            if (changed) {
                onUndoCommand(vm, {
                    label: 'Change Title Style',
                    undoFn: (v) => {
                        for (const key of Object.keys(preState)) {
                            v.titleStyle[key] = preState[key];
                        }
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        for (const key of Object.keys(postState)) {
                            v.titleStyle[key] = postState[key];
                        }
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        }
        titleStyleSnapshot = null;
    }

    return {
        /**
         * Called when the title textarea gains focus.
         * Captures the current text so onTitleTextChange can detect the delta.
         * In Vue, v-model updates data before @input fires, so we need
         * a pre-change snapshot from @focus.
         */
        snapshotTitleText() {
            titleTextSnapshot = {
                titleText: this.titleText,
                titleRuns: JSON.parse(JSON.stringify(this.titleRuns || []))
            };
        },

        /**
         * Handles title text change.
         * Shows a toast if the text was truncated (exceeded 3 lines).
         * Requires snapshotTitleText() to have been called first (e.g., via @focus).
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
         * Commits the batched title text change to the undo stack.
         * Called on blur or Enter key. Safe to call multiple times —
         * idempotent when no snapshot exists.
         */
        commitTitleText() {
            pushTitleTextUndo(this);
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
         * Pushes an undo command for each toggle.
         */
        toggleTitleBold() {
            const start = Math.min(this.titleSelectionStart, this.titleSelectionEnd);
            const end = Math.max(this.titleSelectionStart, this.titleSelectionEnd);
            const titleManager = getTitleManager();
            if (titleManager && start < end) {
                const preRuns = JSON.parse(JSON.stringify(this.titleRuns || []));
                const preText = this.titleText;
                titleManager.toggleBold(start, end);
                this.titleText = titleManager.getFullText();

                if (onUndoCommand) {
                    const postRuns = JSON.parse(JSON.stringify(this.titleRuns || []));
                    const postText = this.titleText;
                    onUndoCommand(this, {
                        label: 'Format Title',
                        undoFn: (vm) => {
                            vm.titleText = preText;
                            vm.titleRuns.length = 0;
                            vm.titleRuns.push(...preRuns);
                            if (vm._scheduleRender) vm._scheduleRender();
                        },
                        redoFn: (vm) => {
                            vm.titleText = postText;
                            vm.titleRuns.length = 0;
                            vm.titleRuns.push(...postRuns);
                            if (vm._scheduleRender) vm._scheduleRender();
                        }
                    });
                }

                onRenderScheduled(this);
            }
        },

        /**
         * Toggles italic on selected title text.
         * Pushes an undo command for each toggle.
         */
        toggleTitleItalic() {
            const start = Math.min(this.titleSelectionStart, this.titleSelectionEnd);
            const end = Math.max(this.titleSelectionStart, this.titleSelectionEnd);
            const titleManager = getTitleManager();
            if (titleManager && start < end) {
                const preRuns = JSON.parse(JSON.stringify(this.titleRuns || []));
                const preText = this.titleText;
                titleManager.toggleItalic(start, end);
                this.titleText = titleManager.getFullText();

                if (onUndoCommand) {
                    const postRuns = JSON.parse(JSON.stringify(this.titleRuns || []));
                    const postText = this.titleText;
                    onUndoCommand(this, {
                        label: 'Format Title',
                        undoFn: (vm) => {
                            vm.titleText = preText;
                            vm.titleRuns.length = 0;
                            vm.titleRuns.push(...preRuns);
                            if (vm._scheduleRender) vm._scheduleRender();
                        },
                        redoFn: (vm) => {
                            vm.titleText = postText;
                            vm.titleRuns.length = 0;
                            vm.titleRuns.push(...postRuns);
                            if (vm._scheduleRender) vm._scheduleRender();
                        }
                    });
                }

                onRenderScheduled(this);
            }
        },

        /**
         * Toggles underline on selected title text.
         * Pushes an undo command for each toggle.
         */
        toggleTitleUnderline() {
            const start = Math.min(this.titleSelectionStart, this.titleSelectionEnd);
            const end = Math.max(this.titleSelectionStart, this.titleSelectionEnd);
            const titleManager = getTitleManager();
            if (titleManager && start < end) {
                const preRuns = JSON.parse(JSON.stringify(this.titleRuns || []));
                const preText = this.titleText;
                titleManager.toggleUnderline(start, end);
                this.titleText = titleManager.getFullText();

                if (onUndoCommand) {
                    const postRuns = JSON.parse(JSON.stringify(this.titleRuns || []));
                    const postText = this.titleText;
                    onUndoCommand(this, {
                        label: 'Format Title',
                        undoFn: (vm) => {
                            vm.titleText = preText;
                            vm.titleRuns.length = 0;
                            vm.titleRuns.push(...preRuns);
                            if (vm._scheduleRender) vm._scheduleRender();
                        },
                        redoFn: (vm) => {
                            vm.titleText = postText;
                            vm.titleRuns.length = 0;
                            vm.titleRuns.push(...postRuns);
                            if (vm._scheduleRender) vm._scheduleRender();
                        }
                    });
                }

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
         * Called when the user starts interacting with title style controls
         * (e.g., @focus on a select or @pointerdown on a slider).
         * Captures the pre-state before v-model updates.
         */
        snapshotTitleStyle() {
            snapshotTitleStyleInternal(this);
        },

        /**
         * Handles title font family change.
         */
        onTitleFontFamilyChange() {
            snapshotTitleStyleInternal(this);
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
            snapshotTitleStyleInternal(this);
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
            snapshotTitleStyleInternal(this);
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
            snapshotTitleStyleInternal(this);
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
            snapshotTitleStyleInternal(this);
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
            snapshotTitleStyleInternal(this);
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
            snapshotTitleStyleInternal(this);
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
            snapshotTitleStyleInternal(this);
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
            snapshotTitleStyleInternal(this);
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setWidth(this.titleStyle.titleBoxWidth);
            }
            onRenderScheduled(this);
        },

        /**
         * Commits the batched title style change to the undo stack.
         * Called on blur of style controls. Safe to call multiple times —
         * idempotent when no snapshot exists.
         */
        commitTitleStyle() {
            pushTitleStyleUndo(this);
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
        },

        /**
         * Atomic alignment change: snapshot, mutate, call manager, schedule render,
         * and push undo command — all in one call. Replaces inline template
         * expressions like: snapshotTitleStyle(); titleStyle.alignment = 'X';
         * onTitleAlignmentChange(); commitTitleStyle()
         * @param {string} alignment - 'left', 'center', or 'right'
         */
        setTitleAlignment(alignment) {
            const preState = this.titleStyle.alignment;
            this.titleStyle.alignment = alignment;
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.setAlignment(alignment);
            }
            onRenderScheduled(this);
            if (onUndoCommand && preState !== alignment) {
                const postState = this.titleStyle.alignment;
                onUndoCommand(this, {
                    label: 'Change Title Style',
                    undoFn: (v) => {
                        v.titleStyle.alignment = preState;
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        v.titleStyle.alignment = postState;
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        },

        /**
         * Atomic background visibility toggle: snapshot, toggle, call manager,
         * schedule render, and push undo command — all in one call. Replaces
         * inline template expression for the "Show Background" checkbox.
         */
        toggleTitleShowBackground() {
            const preState = this.titleStyle.showBackground;
            this.titleStyle.showBackground = !preState;
            const titleManager = getTitleManager();
            if (titleManager) {
                titleManager.showBackground(this.titleStyle.showBackground);
            }
            onRenderScheduled(this);
            if (onUndoCommand) {
                const postState = this.titleStyle.showBackground;
                onUndoCommand(this, {
                    label: 'Change Title Style',
                    undoFn: (v) => {
                        v.titleStyle.showBackground = preState;
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        v.titleStyle.showBackground = postState;
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        }
    };
}
