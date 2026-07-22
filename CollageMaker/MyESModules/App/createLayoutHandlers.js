/**
 * Layout handlers - Handles layout style, gutter, angle, and spacing changes.
 * Uses injected callback for DIP compliance — no direct this._scheduleRender().
 * Supports optional onUndoCommand callback for undo/redo integration.
 */

/**
 * Creates layout handlers.
 * @param {Function} getLayoutManager - Function that returns LayoutManager instance
 * @param {Function} onRenderScheduled - Callback to schedule a canvas render
 * @param {Function|null} onUndoCommand - Optional callback to push undo commands (vm, cmd)
 * @returns {Object} Layout handlers object
 */
export function createLayoutHandlers(getLayoutManager, onRenderScheduled, onUndoCommand = null) {
    // Batched layout options snapshot — captures pre-state on first interaction,
    // cleared after commitLayoutOptions() pushes the undo command.
    let layoutOptionsSnapshot = null;

    // Layout style snapshot — captured on focus so we know the pre-state
    // when the @change handler fires (v-model updates data before @change).
    let layoutStyleSnapshot = null;

    function snapshotLayoutOptions(vm) {
        if (!layoutOptionsSnapshot) {
            layoutOptionsSnapshot = {
                gutter: vm.gutter,
                sliceAngle: vm.sliceAngle,
                hexSpacing: vm.hexSpacing,
                hexSizeMultiplier: vm.hexSizeMultiplier
            };
        }
    }

    function pushLayoutOptionsUndo(vm) {
        if (layoutOptionsSnapshot && onUndoCommand) {
            const preState = { ...layoutOptionsSnapshot };
            const postState = {
                gutter: vm.gutter,
                sliceAngle: vm.sliceAngle,
                hexSpacing: vm.hexSpacing,
                hexSizeMultiplier: vm.hexSizeMultiplier
            };

            // Only push if something actually changed
            if (preState.gutter !== postState.gutter ||
                preState.sliceAngle !== postState.sliceAngle ||
                preState.hexSpacing !== postState.hexSpacing ||
                preState.hexSizeMultiplier !== postState.hexSizeMultiplier) {
                onUndoCommand(vm, {
                    label: 'Adjust Layout Options',
                    undoFn: (v) => {
                        v.gutter = preState.gutter;
                        v.sliceAngle = preState.sliceAngle;
                        v.hexSpacing = preState.hexSpacing;
                        v.hexSizeMultiplier = preState.hexSizeMultiplier;
                        if (v.layoutManager) {
                            // Each setter has early-exit for unchanged values and
                            // calls regenerate() internally — no need for extra call
                            v.layoutManager.setGutter(preState.gutter);
                            v.layoutManager.setSliceAngle(preState.sliceAngle);
                            v.layoutManager.setHexSpacing(preState.hexSpacing);
                            v.layoutManager.setHexSizeMultiplier(preState.hexSizeMultiplier);
                        }
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        v.gutter = postState.gutter;
                        v.sliceAngle = postState.sliceAngle;
                        v.hexSpacing = postState.hexSpacing;
                        v.hexSizeMultiplier = postState.hexSizeMultiplier;
                        if (v.layoutManager) {
                            v.layoutManager.setGutter(postState.gutter);
                            v.layoutManager.setSliceAngle(postState.sliceAngle);
                            v.layoutManager.setHexSpacing(postState.hexSpacing);
                            v.layoutManager.setHexSizeMultiplier(postState.hexSizeMultiplier);
                        }
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        }
        layoutOptionsSnapshot = null;
    }

    return {
        /**
         * Called when the layout style select gains focus.
         * Captures the current style so onLayoutStyleChange can detect the delta.
         * In Vue, v-model updates data before @change fires, so we need
         * a pre-change snapshot from @focus.
         */
        snapshotLayoutStyle() {
            layoutStyleSnapshot = this.layoutStyle;
        },

        /**
         * Handles layout style change. Pushes an undo command for each style change.
         * Requires snapshotLayoutStyle() to have been called first (e.g., via @focus).
         */
        onLayoutStyleChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setLayoutStyle(this.layoutStyle);

            const preStyle = layoutStyleSnapshot;
            if (onUndoCommand && preStyle !== null && this.layoutStyle !== preStyle) {
                const postStyle = this.layoutStyle;
                onUndoCommand(this, {
                    label: 'Change Layout',
                    undoFn: (vm) => {
                        vm.layoutStyle = preStyle;
                        if (vm.layoutManager) vm.layoutManager.setLayoutStyle(preStyle);
                        if (vm._scheduleRender) vm._scheduleRender();
                    },
                    redoFn: (vm) => {
                        vm.layoutStyle = postStyle;
                        if (vm.layoutManager) vm.layoutManager.setLayoutStyle(postStyle);
                        if (vm._scheduleRender) vm._scheduleRender();
                    }
                });
            }

            onRenderScheduled(this);
        },

        /**
         * Called when the user starts interacting with layout option controls
         * (e.g., @mousedown on a slider). Captures the pre-state before v-model
         * updates, so the change handlers can detect the delta.
         */
        snapshotLayoutOptions() {
            // Only snapshot once per interaction session
            if (!layoutOptionsSnapshot) {
                layoutOptionsSnapshot = {
                    gutter: this.gutter,
                    sliceAngle: this.sliceAngle,
                    hexSpacing: this.hexSpacing,
                    hexSizeMultiplier: this.hexSizeMultiplier
                };
            }
        },

        /**
         * Handles gutter change. Updates layout manager and schedules render.
         * Pre-state should be captured via snapshotLayoutOptions() before v-model updates.
         */
        onGutterChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setGutter(this.gutter);
            onRenderScheduled(this);
        },

        /**
         * Handles slice angle change. Updates layout manager and schedules render.
         */
        onSliceAngleChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setSliceAngle(this.sliceAngle);
            onRenderScheduled(this);
        },

        /**
         * Handles hex spacing change. Updates layout manager and schedules render.
         */
        onHexSpacingChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setHexSpacing(this.hexSpacing);
            onRenderScheduled(this);
        },

        /**
         * Handles hex size multiplier change. Updates layout manager and schedules render.
         */
        onHexSizeMultiplierChange() {
            const layoutManager = getLayoutManager();
            if (layoutManager) layoutManager.setHexSizeMultiplier(this.hexSizeMultiplier);
            onRenderScheduled(this);
        },

        /**
         * Called when the user finishes interacting with layout option controls
         * (e.g., @blur on a slider). Commits the batched layout options change
         * to the undo stack.
         * Safe to call multiple times — idempotent when no snapshot exists.
         */
        commitLayoutOptions() {
            pushLayoutOptionsUndo(this);
        }
    };
}
