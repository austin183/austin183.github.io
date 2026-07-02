/**
 * UndoManager - Command-pattern undo/redo system.
 * Each state change produces a { undo, redo } command pair.
 * Max 60 undo levels (matching macOS app).
 * Ported from Swift UndoManager.swift
 */

const MAX_UNDO_LEVELS = 60;

/**
 * Creates an undo manager.
 * @returns {Object} UndoManager
 */
export function createUndoManager() {
    let undoStack = [];
    let redoStack = [];
    let isBatching = false;
    let batchLabel = null;
    let batchCommands = [];

    return {
        /**
         * Pushes a command onto the undo stack.
         * @param {Object} command
         * @param {string} command.label - Human-readable label (e.g., "Adjust Crop")
         * @param {Function} command.undo - Restores previous state
         * @param {Function} command.redo - Re-applies the change
         */
        push(command) {
            if (isBatching) {
                // During a batch, accumulate commands
                batchCommands.push(command);
                return;
            }

            undoStack.push(command);
            if (undoStack.length > MAX_UNDO_LEVELS) {
                undoStack.shift();
            }
            // Clear redo stack on new action
            redoStack = [];
        },

        /**
         * Begins a batch of changes that will be grouped into a single undo action.
         * @param {string} label - Label for the batch
         */
        beginBatch(label) {
            isBatching = true;
            batchLabel = label;
            batchCommands = [];
        },

        /**
         * Ends a batch, pushing the combined command onto the undo stack.
         * All accumulated commands are combined: undo runs them in reverse order,
         * redo runs them in forward order.
         */
        endBatch() {
            if (!isBatching) {
                isBatching = false;
                batchLabel = null;
                batchCommands = [];
                return;
            }

            if (batchCommands.length > 0) {
                const commands = [...batchCommands];
                undoStack.push({
                    label: batchLabel,
                    undo: () => {
                        // Execute all undos in reverse order
                        for (let i = commands.length - 1; i >= 0; i--) {
                            commands[i].undo();
                        }
                    },
                    redo: () => {
                        // Execute all redos in forward order
                        for (const cmd of commands) {
                            cmd.redo();
                        }
                    }
                });
                if (undoStack.length > MAX_UNDO_LEVELS) {
                    undoStack.shift();
                }
                redoStack = [];
            }

            isBatching = false;
            batchLabel = null;
            batchCommands = [];
        },

        /**
         * Undoes the last action.
         * Executes the command's undo function (which mutates state directly),
         * then pushes the same command onto the redo stack so redo can re-execute
         * the original redo function.
         * @returns {boolean} True if an undo was performed
         */
        undo() {
            if (undoStack.length === 0) return false;

            const command = undoStack.pop();
            command.undo();
            redoStack.push(command);
            return true;
        },

        /**
         * Redoes the last undone action.
         * Executes the command's redo function (which mutates state directly),
         * then pushes the same command back onto the undo stack.
         * @returns {boolean} True if a redo was performed
         */
        redo() {
            if (redoStack.length === 0) return false;

            const command = redoStack.pop();
            command.redo();
            undoStack.push(command);
            return true;
        },

        /**
         * Returns whether there are actions that can be undone.
         * @returns {boolean}
         */
        canUndo() {
            return undoStack.length > 0;
        },

        /**
         * Returns whether there are actions that can be redone.
         * @returns {boolean}
         */
        canRedo() {
            return redoStack.length > 0;
        },

        /**
         * Clears all undo/redo history.
         */
        clear() {
            undoStack = [];
            redoStack = [];
        },

        /**
         * Returns the number of undo levels available.
         * @returns {number}
         */
        getUndoCount() {
            return undoStack.length;
        },

        /**
         * Returns the number of redo levels available.
         * @returns {number}
         */
        getRedoCount() {
            return redoStack.length;
        }
    };
}
