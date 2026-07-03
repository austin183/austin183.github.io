/**
 * TitleManager - Manages title text as an array of formatted runs.
 * Supports per-character formatting with run merging/splitting.
 */

import { createTitleRun, cloneTitleRun, runsHaveSameFormatting } from '../Models/TitleRun.js';

/**
 * Creates a title manager.
 * @param {Object} state - Reactive state object (Vue instance or plain data)
 * @param {Function} [onChange] - Callback fired on any title state change
 * @returns {Object} TitleManager
 */
export function createTitleManager(state, onChange) {
    let changeCallback = onChange || null;

    function notify() {
        if (changeCallback) {
            changeCallback();
        }
    }

    /**
     * Merges adjacent runs that have identical formatting.
     * Keeps the runs array minimal.
     * @private
     */
    function mergeAdjacentRuns() {
        const runs = state.titleRuns;
        if (!runs || runs.length <= 1) return;

        let merged = [runs[0]];
        for (let i = 1; i < runs.length; i++) {
            const prev = merged[merged.length - 1];
            const curr = runs[i];
            if (runsHaveSameFormatting(prev, curr)) {
                prev.text = prev.text + curr.text;
            } else {
                merged.push(curr);
            }
        }
        state.titleRuns = merged;
    }

    /**
     * Splits runs at a given character index and applies formatting to a range.
     * @param {number} startIndex - Start character index (inclusive)
     * @param {number} endIndex - End character index (exclusive)
     * @param {Object} formatting - { bold, italic, underline } properties to toggle
     * @private
     */
    function applyFormattingToRange(startIndex, endIndex, formatting) {
        if (startIndex < 0 || endIndex <= startIndex) return;

        const runs = state.titleRuns;
        if (!runs || runs.length === 0) return;

        // Build flat character index map to find which runs contain the range
        let charOffset = 0;
        const newRuns = [];

        for (let i = 0; i < runs.length; i++) {
            const run = runs[i];
            const runStart = charOffset;
            const runEnd = charOffset + run.text.length;
            charOffset = runEnd;

            if (runEnd <= startIndex || runStart >= endIndex) {
                // Run is entirely outside the range
                newRuns.push(cloneTitleRun(run));
                continue;
            }

            // Run overlaps with the range - may need to split
            const beforeStart = Math.max(0, startIndex - runStart);
            const afterStart = Math.min(run.text.length, endIndex - runStart);

            // Part before the range
            if (beforeStart > 0) {
                newRuns.push(createTitleRun(
                    run.text.substring(0, beforeStart),
                    run.bold, run.italic, run.underline
                ));
            }

            // Part inside the range - apply formatting
            const insideText = run.text.substring(beforeStart, afterStart);
            if (insideText.length > 0) {
                newRuns.push(createTitleRun(
                    insideText,
                    formatting.bold !== undefined ? formatting.bold : !run.bold,
                    formatting.italic !== undefined ? formatting.italic : !run.italic,
                    formatting.underline !== undefined ? formatting.underline : !run.underline
                ));
            }

            // Part after the range
            if (afterStart < run.text.length) {
                newRuns.push(createTitleRun(
                    run.text.substring(afterStart),
                    run.bold, run.italic, run.underline
                ));
            }
        }

        state.titleRuns = newRuns;
        mergeAdjacentRuns();
    }

    return {
        /**
         * Sets a callback for title change notifications.
         * @param {Function} fn
         */
        onTitleChanged(fn) {
            changeCallback = fn;
        },

        /**
         * Sets the title text (creates a single plain run).
         * @param {string} text
         */
        setText(text) {
            const t = String(text || '');
            state.titleText = t;
            if (t.length === 0) {
                state.titleRuns = [];
            } else {
                state.titleRuns = [createTitleRun(t, false, false, false)];
            }
            notify();
        },

        /**
         * Inserts a character at the given position.
         * @param {number} index - Character index to insert at
         * @param {string} char - Character to insert
         * @param {boolean} [bold] - Bold flag
         * @param {boolean} [italic] - Italic flag
         * @param {boolean} [underline] - Underline flag
         */
        insertChar(index, char, bold = false, italic = false, underline = false) {
            const runs = state.titleRuns;
            if (!runs || runs.length === 0) {
                this.setText(char);
                return;
            }

            let charOffset = 0;
            const newRuns = [];
            let inserted = false;

            for (const run of runs) {
                const runStart = charOffset;
                const runEnd = charOffset + run.text.length;
                charOffset = runEnd;

                // Insert before this run if we haven't inserted yet and index is at or before run start
                if (!inserted && index <= runStart) {
                    newRuns.push(createTitleRun(char, bold, italic, underline));
                    inserted = true;
                }

                if (!inserted && index < runEnd) {
                    // Insert in the middle of this run
                    const splitPos = index - runStart;
                    newRuns.push(createTitleRun(run.text.substring(0, splitPos), run.bold, run.italic, run.underline));
                    newRuns.push(createTitleRun(char, bold, italic, underline));
                    newRuns.push(createTitleRun(run.text.substring(splitPos), run.bold, run.italic, run.underline));
                    inserted = true;
                } else {
                    // Run is entirely before or after the insertion point
                    newRuns.push(cloneTitleRun(run));
                }
            }

            // If we never inserted, append at the end
            if (!inserted) {
                newRuns.push(createTitleRun(char, bold, italic, underline));
            }

            state.titleRuns = newRuns;
            state.titleText = this.getFullText();
            mergeAdjacentRuns();
            notify();
        },

        /**
         * Deletes a character at the given position.
         * @param {number} index - Character index to delete
         */
        deleteChar(index) {
            if (index < 0) return;

            let charOffset = 0;
            const newRuns = [];

            for (const run of state.titleRuns) {
                const runStart = charOffset;
                const runEnd = charOffset + run.text.length;
                charOffset = runEnd;

                if (index < runStart || index >= runEnd) {
                    newRuns.push(cloneTitleRun(run));
                    continue;
                }

                // Delete from this run
                const splitPos = index - runStart;
                const before = run.text.substring(0, splitPos);
                const after = run.text.substring(splitPos + 1);

                if (before.length > 0) {
                    newRuns.push(createTitleRun(before, run.bold, run.italic, run.underline));
                }
                if (after.length > 0) {
                    newRuns.push(createTitleRun(after, run.bold, run.italic, run.underline));
                }
                break;
            }

            state.titleRuns = newRuns;
            state.titleText = this.getFullText();
            mergeAdjacentRuns();
            notify();
        },

        /**
         * Toggles bold on a range of characters.
         * @param {number} startIndex - Start index (inclusive)
         * @param {number} endIndex - End index (exclusive)
         */
        toggleBold(startIndex, endIndex) {
            applyFormattingToRange(startIndex, endIndex, { bold: undefined });
            state.titleText = this.getFullText();
            notify();
        },

        /**
         * Toggles italic on a range of characters.
         * @param {number} startIndex - Start index (inclusive)
         * @param {number} endIndex - End index (exclusive)
         */
        toggleItalic(startIndex, endIndex) {
            applyFormattingToRange(startIndex, endIndex, { italic: undefined });
            state.titleText = this.getFullText();
            notify();
        },

        /**
         * Toggles underline on a range of characters.
         * @param {number} startIndex - Start index (inclusive)
         * @param {number} endIndex - End index (exclusive)
         */
        toggleUnderline(startIndex, endIndex) {
            applyFormattingToRange(startIndex, endIndex, { underline: undefined });
            state.titleText = this.getFullText();
            notify();
        },

        /**
         * Returns the current array of title runs.
         * @returns {Array}
         */
        getRuns() {
            return state.titleRuns || [];
        },

        /**
         * Returns the full title text (concatenated from all runs).
         * @returns {string}
         */
        getFullText() {
            return (state.titleRuns || []).map(r => r.text).join('');
        },

        /**
         * Finds which run contains the character at the given index.
         * @param {number} index - Character index
         * @returns {Object|null} The run containing the index, or null
         */
        getTextAt(index) {
            let offset = 0;
            for (const run of (state.titleRuns || [])) {
                if (index >= offset && index < offset + run.text.length) {
                    return run;
                }
                offset += run.text.length;
            }
            return null;
        },

        /**
         * Returns the current background state snapshot.
         * @returns {Object}
         */
        getState() {
            return {
                text: state.titleText,
                runs: state.titleRuns || [],
                style: state.titleStyle
            };
        }
    };
}
