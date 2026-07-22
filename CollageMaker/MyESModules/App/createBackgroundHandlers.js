/**
 * Background handlers - Handles background controls.
 * Uses injected callback for DIP compliance — no direct this._scheduleRender().
 * Supports optional onUndoCommand callback for undo/redo integration.
 */

import { loadImageFromFile } from '../Utils/loadImageFromFile.js';

/**
 * Creates background handlers.
 * @param {Function} getBackgroundManager - Function that returns BackgroundManager instance
 * @param {Function} onRenderScheduled - Callback to schedule a canvas render
 * @param {Function|null} onUndoCommand - Optional callback to push undo commands (vm, cmd)
 * @returns {Object} Background handlers object
 */
export function createBackgroundHandlers(getBackgroundManager, onRenderScheduled, onUndoCommand = null) {
    // Background snapshot — captured on first interaction,
    // cleared after commitBackground() pushes the undo command.
    let backgroundSnapshot = null;

    function snapshotBackgroundInternal(vm) {
        if (!backgroundSnapshot) {
            backgroundSnapshot = {
                backgroundStyle: vm.backgroundStyle,
                backgroundColor: vm.backgroundColor,
                gradientColors: vm.gradientColors ? [...vm.gradientColors] : null,
                gradientAngle: vm.gradientAngle,
                backgroundImage: vm.backgroundImage,
                backgroundOpacity: vm.backgroundOpacity
            };
        }
    }

    function pushBackgroundUndo(vm) {
        if (backgroundSnapshot && onUndoCommand) {
            const preState = {
                backgroundStyle: backgroundSnapshot.backgroundStyle,
                backgroundColor: backgroundSnapshot.backgroundColor,
                gradientColors: backgroundSnapshot.gradientColors ? [...backgroundSnapshot.gradientColors] : null,
                gradientAngle: backgroundSnapshot.gradientAngle,
                backgroundImage: backgroundSnapshot.backgroundImage,
                backgroundOpacity: backgroundSnapshot.backgroundOpacity
            };
            const postState = {
                backgroundStyle: vm.backgroundStyle,
                backgroundColor: vm.backgroundColor,
                gradientColors: vm.gradientColors ? [...vm.gradientColors] : null,
                gradientAngle: vm.gradientAngle,
                backgroundImage: vm.backgroundImage,
                backgroundOpacity: vm.backgroundOpacity
            };

            // Check if anything changed
            let changed = false;
            for (const key of Object.keys(preState)) {
                if (preState[key] !== postState[key]) { changed = true; break; }
            }

            if (changed) {
                onUndoCommand(vm, {
                    label: 'Change Background',
                    undoFn: (v) => {
                        v.backgroundStyle = preState.backgroundStyle;
                        v.backgroundColor = preState.backgroundColor;
                        v.gradientColors = preState.gradientColors;
                        v.gradientAngle = preState.gradientAngle;
                        v.backgroundImage = preState.backgroundImage;
                        v.backgroundOpacity = preState.backgroundOpacity;
                        const bm = v.backgroundManager;
                        if (bm) {
                            bm.updateStyle(preState.backgroundStyle);
                            bm.setColor(preState.backgroundColor);
                            if (preState.gradientColors) bm.setGradientColors(preState.gradientColors[0], preState.gradientColors[1]);
                            bm.setAngle(preState.gradientAngle);
                            bm.setImage(preState.backgroundImage);
                            bm.setOpacity(preState.backgroundOpacity);
                        }
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        v.backgroundStyle = postState.backgroundStyle;
                        v.backgroundColor = postState.backgroundColor;
                        v.gradientColors = postState.gradientColors;
                        v.gradientAngle = postState.gradientAngle;
                        v.backgroundImage = postState.backgroundImage;
                        v.backgroundOpacity = postState.backgroundOpacity;
                        const bm = v.backgroundManager;
                        if (bm) {
                            bm.updateStyle(postState.backgroundStyle);
                            bm.setColor(postState.backgroundColor);
                            if (postState.gradientColors) bm.setGradientColors(postState.gradientColors[0], postState.gradientColors[1]);
                            bm.setAngle(postState.gradientAngle);
                            bm.setImage(postState.backgroundImage);
                            bm.setOpacity(postState.backgroundOpacity);
                        }
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        }
        backgroundSnapshot = null;
    }

    return {
        /**
         * Called when the user starts interacting with background controls.
         * Captures the pre-state before v-model updates.
         */
        snapshotBackground() {
            snapshotBackgroundInternal(this);
        },

        /**
         * Handles background style change.
         */
        onBackgroundStyleChange() {
            snapshotBackgroundInternal(this);
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.updateStyle(this.backgroundStyle);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles background color change.
         */
        onBackgroundColorChange() {
            snapshotBackgroundInternal(this);
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setColor(this.backgroundColor);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles gradient color 1 change.
         * @param {string} c1 - Start color (hex)
         * @param {string} c2 - End color (hex)
         */
        onGradientColor1Change(c1, c2) {
            snapshotBackgroundInternal(this);
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setGradientColors(c1, c2);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles gradient color 2 change.
         * @param {string} c1 - Start color (hex)
         * @param {string} c2 - End color (hex)
         */
        onGradientColor2Change(c1, c2) {
            snapshotBackgroundInternal(this);
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setGradientColors(c1, c2);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles gradient angle change.
         */
        onGradientAngleChange() {
            snapshotBackgroundInternal(this);
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setAngle(this.gradientAngle);
            }
            onRenderScheduled(this);
        },

        /**
         * Handles background image file input.
         * @param {File} file - Selected file
         */
        async handleBackgroundImageChange(file) {
            if (!file) return;

            const img = await loadImageFromFile(file);
            if (img) {
                this.backgroundImage = img;
                this.backgroundStyle = 'image';
                snapshotBackgroundInternal(this);
                const backgroundManager = getBackgroundManager();
                if (backgroundManager) {
                    backgroundManager.setImage(img);
                }
                onRenderScheduled(this);
            }
            // Reset file input so re-selecting the same file triggers @change
            // This is handled by caller setting value=''
        },

        /**
         * Handles background opacity change.
         */
        onBackgroundOpacityChange() {
            snapshotBackgroundInternal(this);
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setOpacity(this.backgroundOpacity);
            }
            onRenderScheduled(this);
        },

        /**
         * Removes the background image.
         */
        removeBackgroundImage() {
            snapshotBackgroundInternal(this);
            this.backgroundImage = null;
            this.backgroundStyle = 'solid';
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setImage(null);
            }
            onRenderScheduled(this);
        },

        /**
         * Commits the batched background change to the undo stack.
         * Called on blur of background controls. Safe to call multiple times —
         * idempotent when no snapshot exists.
         */
        commitBackground() {
            pushBackgroundUndo(this);
        },

        /**
         * Atomic background style change: snapshot, mutate, call manager,
         * schedule render, and push undo command — all in one call. Replaces
         * inline template expressions like: snapshotBackground();
         * backgroundStyle = 'X'; onBackgroundStyleChange(); commitBackground()
         * @param {string} style - 'solid', 'gradient', or 'image'
         */
        setBackgroundStyle(style) {
            const preStyle = this.backgroundStyle;
            this.backgroundStyle = style;
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.updateStyle(style);
            }
            onRenderScheduled(this);
            if (onUndoCommand && preStyle !== style) {
                onUndoCommand(this, {
                    label: 'Change Background',
                    undoFn: (v) => {
                        v.backgroundStyle = preStyle;
                        const bm = v.backgroundManager;
                        if (bm) bm.updateStyle(preStyle);
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        v.backgroundStyle = style;
                        const bm = v.backgroundManager;
                        if (bm) bm.updateStyle(style);
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        },

        /**
         * Atomic background image removal: snapshot, remove image, revert style
         * to 'solid', call manager, schedule render, and push undo command —
         * all in one call. Replaces inline template expression:
         * snapshotBackground(); removeBackgroundImage(); commitBackground()
         */
        removeBackgroundImageAtomic() {
            const preState = {
                backgroundImage: this.backgroundImage,
                backgroundStyle: this.backgroundStyle
            };
            if (!preState.backgroundImage) {
                // Nothing to remove — guard against no-op
                return;
            }
            this.backgroundImage = null;
            this.backgroundStyle = 'solid';
            const backgroundManager = getBackgroundManager();
            if (backgroundManager) {
                backgroundManager.setImage(null);
            }
            onRenderScheduled(this);
            if (onUndoCommand) {
                onUndoCommand(this, {
                    label: 'Change Background',
                    undoFn: (v) => {
                        v.backgroundImage = preState.backgroundImage;
                        v.backgroundStyle = preState.backgroundStyle;
                        const bm = v.backgroundManager;
                        if (bm) {
                            bm.updateStyle(preState.backgroundStyle);
                            bm.setImage(preState.backgroundImage);
                        }
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        v.backgroundImage = null;
                        v.backgroundStyle = 'solid';
                        const bm = v.backgroundManager;
                        if (bm) {
                            bm.updateStyle('solid');
                            bm.setImage(null);
                        }
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        }
    };
}
