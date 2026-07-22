/**
 * Overlay handlers - Handles overlay controls.
 * Uses injected callback for DIP compliance — no direct this._scheduleRender().
 * Supports optional onUndoCommand callback for undo/redo integration.
 */

import { loadImageFromFile } from '../Utils/loadImageFromFile.js';

/**
 * Creates overlay handlers.
 * @param {Function} onRenderScheduled - Callback to schedule a canvas render
 * @param {Function|null} onUndoCommand - Optional callback to push undo commands (vm, cmd)
 * @returns {Object} Overlay handlers object
 */
export function createOverlayHandlers(onRenderScheduled, onUndoCommand = null) {
    // Overlay snapshot — captured on first interaction,
    // cleared after commitOverlay() pushes the undo command.
    let overlaySnapshot = null;

    function snapshotOverlayInternal(vm) {
        if (!overlaySnapshot) {
            overlaySnapshot = {
                overlayImage: vm.overlayImage,
                overlayMode: vm.overlayMode,
                overlayOpacity: vm.overlayOpacity
            };
        }
    }

    function pushOverlayUndo(vm) {
        if (overlaySnapshot && onUndoCommand) {
            const preState = {
                overlayImage: overlaySnapshot.overlayImage,
                overlayMode: overlaySnapshot.overlayMode,
                overlayOpacity: overlaySnapshot.overlayOpacity
            };
            const postState = {
                overlayImage: vm.overlayImage,
                overlayMode: vm.overlayMode,
                overlayOpacity: vm.overlayOpacity
            };

            // Check if anything changed
            let changed = false;
            for (const key of Object.keys(preState)) {
                if (preState[key] !== postState[key]) { changed = true; break; }
            }

            if (changed) {
                onUndoCommand(vm, {
                    label: 'Change Overlay',
                    undoFn: (v) => {
                        v.overlayImage = preState.overlayImage;
                        v.overlayMode = preState.overlayMode;
                        v.overlayOpacity = preState.overlayOpacity;
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        v.overlayImage = postState.overlayImage;
                        v.overlayMode = postState.overlayMode;
                        v.overlayOpacity = postState.overlayOpacity;
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        }
        overlaySnapshot = null;
    }

    return {
        /**
         * Called when the user starts interacting with overlay controls.
         * Captures the pre-state before v-model updates.
         */
        snapshotOverlay() {
            snapshotOverlayInternal(this);
        },

        /**
         * Handles overlay image file input.
         * @param {File} file - Selected file
         */
        async handleOverlayImageChange(file) {
            if (!file) return;

            const img = await loadImageFromFile(file);
            if (img) {
                // Dispose old overlay image to prevent memory leaks
                if (this.overlayImage) {
                    this.overlayImage = null;
                }
                this.overlayImage = img;
                snapshotOverlayInternal(this);
                onRenderScheduled(this);
            }
        },

        /**
         * Handles overlay mode change.
         */
        onOverlayModeChange() {
            snapshotOverlayInternal(this);
            this.overlayMode = this.overlayMode || 'source-over'; // ensure it's set
            onRenderScheduled(this);
        },

        /**
         * Handles overlay opacity change.
         */
        onOverlayOpacityChange() {
            snapshotOverlayInternal(this);
            this.overlayOpacity = this.overlayOpacity || 1;
            onRenderScheduled(this);
        },

        /**
         * Removes the overlay image.
         */
        removeOverlay() {
            snapshotOverlayInternal(this);
            this.overlayImage = null;
            onRenderScheduled(this);
        },

        /**
         * Commits the batched overlay change to the undo stack.
         * Called on blur of overlay controls. Safe to call multiple times —
         * idempotent when no snapshot exists.
         */
        commitOverlay() {
            pushOverlayUndo(this);
        },

        /**
         * Atomic overlay removal: snapshot, remove image, schedule render,
         * and push undo command — all in one call. Replaces inline template
         * expression: snapshotOverlay(); removeOverlay(); commitOverlay()
         */
        removeOverlayAtomic() {
            const preState = {
                overlayImage: this.overlayImage,
                overlayMode: this.overlayMode,
                overlayOpacity: this.overlayOpacity
            };
            if (!preState.overlayImage) {
                // Nothing to remove — guard against no-op
                return;
            }
            this.overlayImage = null;
            onRenderScheduled(this);
            if (onUndoCommand) {
                onUndoCommand(this, {
                    label: 'Change Overlay',
                    undoFn: (v) => {
                        v.overlayImage = preState.overlayImage;
                        v.overlayMode = preState.overlayMode;
                        v.overlayOpacity = preState.overlayOpacity;
                        if (v._scheduleRender) v._scheduleRender();
                    },
                    redoFn: (v) => {
                        v.overlayImage = null;
                        if (v._scheduleRender) v._scheduleRender();
                    }
                });
            }
        }
    };
}
