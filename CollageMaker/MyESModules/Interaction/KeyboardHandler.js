/**
 * KeyboardHandler - Centralized keyboard shortcut handler for CollageMaker.
 * Replaces inline _handleKeyboard with a testable, callback-driven module.
 *
 * Pure functions (parseKeyShortcut, matchesShortcut) are exported for
 * unit testing without DOM dependencies. The factory function
 * createKeyboardHandler provides attach/detach lifecycle for DOM integration.
 */

import { LayoutStyle } from '../Models/LayoutStyle.js';

// ========================
// Constants
// ========================

/**
 * Keyboard shortcut definitions.
 * Each entry maps a shortcut name to a pattern string used by matchesShortcut().
 * Layout shortcuts include the LayoutStyle value as the `value` property.
 */
export const KEYBOARD_SHORTCUTS = {
    OPEN_FILE_PICKER: 'meta+o',
    EXPORT: 'meta+s',
    LAYOUT_UNIFORM: { pattern: 'meta+1', value: LayoutStyle.UNIFORM },
    LAYOUT_HERO: { pattern: 'meta+2', value: LayoutStyle.HERO },
    LAYOUT_MOSAIC: { pattern: 'meta+3', value: LayoutStyle.MOSAIC },
    LAYOUT_DIAGONAL_SLICES: { pattern: 'meta+4', value: LayoutStyle.DIAGONAL_SLICES },
    LAYOUT_HEXAGONAL: { pattern: 'meta+5', value: LayoutStyle.HEXAGONAL },
    DESELECT: 'Escape',
    DELETE_BACKSPACE: ['Delete', 'Backspace'],
    UNDO: 'meta+z',
    REDO: 'shift+meta+z'
};

// ========================
// Pure Functions
// ========================

/**
 * Parses a KeyboardEvent into a normalized key descriptor.
 * Pure function — testable without browser context.
 *
 * @param {KeyboardEvent|Object} event - KeyboardEvent or plain object with
 *   key, metaKey, ctrlKey, shiftKey, altKey properties
 * @returns {{ key: string, meta: boolean, ctrl: boolean, shift: boolean, alt: boolean }}
 */
export function parseKeyShortcut(event) {
    return {
        key: (event.key || '').toLowerCase(),
        meta: !!event.metaKey,
        ctrl: !!event.ctrlKey,
        shift: !!event.shiftKey,
        alt: !!event.altKey
    };
}

/**
 * Checks if a parsed key descriptor matches a shortcut pattern string.
 * Pure function — testable without browser context.
 *
 * Pattern format: "meta+s", "shift+meta+z", "Escape", "Delete", "Backspace", "meta+1"
 * - "meta+" matches both metaKey (macOS Cmd) and ctrlKey (Windows/Linux)
 * - Pattern parts are order-insensitive (e.g., "meta+shift+z" === "shift+meta+z")
 * - Key comparison is case-insensitive (key is lowercased by parseKeyShortcut)
 *
 * @param {{ key: string, meta: boolean, ctrl: boolean, shift: boolean, alt: boolean }} parsed
 * @param {string} pattern - Shortcut pattern string
 * @returns {boolean}
 */
export function matchesShortcut(parsed, pattern) {
    const parts = pattern.toLowerCase().split('+');
    const patternKey = parts.find(p => !['meta', 'shift', 'alt'].includes(p));
    const hasMeta = parts.includes('meta');
    const hasShift = parts.includes('shift');
    const hasAlt = parts.includes('alt');
    const isBareKey = !hasMeta && !hasShift && !hasAlt;

    // Key must match (case-insensitive)
    if ((parsed.key || '').toLowerCase() !== patternKey) return false;

    // Meta: pattern's "meta" matches either metaKey or ctrlKey
    const parsedHasMeta = parsed.meta || parsed.ctrl;
    if (hasMeta !== parsedHasMeta) return false;

    // If pattern has no meta, parsed must not have ctrl either
    if (!hasMeta && parsed.ctrl) return false;

    // Alt must match exactly (always strict — alt is reserved for menus)
    if (hasAlt !== parsed.alt) return false;

    // Shift: strict when pattern specifies it, lenient for bare keys
    // (e.g., Shift+Delete should match "Delete" pattern)
    if (hasShift && !parsed.shift) return false;
    if (!isBareKey && !hasShift && parsed.shift) return false;

    return true;
}

// ========================
// Factory
// ========================

/**
 * Creates a keyboard shortcut handler.
 *
 * @param {Object} options
 * @param {Object} options.callbacks - Plain object mapping shortcut names to
 *   callback functions. Missing callbacks are silently ignored.
 *   Expected keys: onOpenFilePicker, onExport, onLayoutSwitch, onDeselect,
 *   onRemoveSelected, onUndo, onRedo
 * @returns {{ attach: Function, detach: Function, handleKeydown: Function }}
 */
export function createKeyboardHandler({ callbacks }) {
    const _callbacks = callbacks || {};
    let _attached = false;
    let _listener = null;

    /**
     * Input types that should NOT suppress keyboard shortcuts.
     * These are interactive controls where keyboard input is expected
     * but shouldn't block global shortcuts.
     */
    const SHORTCUT_SAFE_INPUT_TYPES = new Set([
        'button',
        'submit',
        'reset',
        'checkbox',
        'radio',
        'color',
        'range',
        'number'
    ]);

    /**
     * Checks if the event target is an editable element where shortcuts
     * should be suppressed.
     * @param {KeyboardEvent} e
     * @returns {boolean}
     */
    function _isFocusInEditableElement(e) {
        const el = e.target;
        if (!el) return false;

        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'textarea' || tag === 'select') return true;
        if (el.isContentEditable) return true;

        if (tag === 'input') {
            const inputType = (el.type || 'text').toLowerCase();
            // Suppress shortcuts for text-like inputs, but allow them for
            // controls that don't accept free-form text entry
            if (!SHORTCUT_SAFE_INPUT_TYPES.has(inputType)) return true;
        }

        return false;
    }

    /**
     * Handles a keydown event by matching against registered shortcuts
     * and invoking the corresponding callback.
     * @param {KeyboardEvent} e
     */
    function handleKeydown(e) {
        // Suppress shortcuts when focus is in an editable element
        if (_isFocusInEditableElement(e)) return;

        const parsed = parseKeyShortcut(e);

        for (const [name, shortcut] of Object.entries(KEYBOARD_SHORTCUTS)) {
            const patterns = _getPatterns(shortcut);

            for (const pattern of patterns) {
                if (matchesShortcut(parsed, pattern)) {
                    let callbackName;
                    if (name.startsWith('LAYOUT_')) {
                        callbackName = 'onLayoutSwitch';
                    } else {
                        callbackName = _shortcutNameToCallback(name);
                    }

                    const cb = _callbacks[callbackName];
                    if (cb) {
                        try {
                            if (name.startsWith('LAYOUT_')) {
                                cb(shortcut.value);
                            } else {
                                cb();
                            }
                            e.preventDefault();
                        } catch (err) {
                            console.error('Keyboard shortcut failed (' + name + '):', err);
                        }
                    } else {
                        // No callback registered — still preventDefault to
                        // suppress browser default (e.g., Cmd+S save dialog)
                        e.preventDefault();
                    }
                    return;
                }
            }
        }
    }

    /**
     * Extracts pattern string(s) from a shortcut definition.
     * Handles string patterns, object patterns, and array patterns.
     * @param {string|Object|string[]} shortcut
     * @returns {string[]}
     */
    function _getPatterns(shortcut) {
        if (Array.isArray(shortcut)) return shortcut;
        if (typeof shortcut === 'string') return [shortcut];
        return [shortcut.pattern];
    }

    /**
     * Maps a shortcut constant name to a callback property name.
     * @param {string} shortcutName
     * @returns {string}
     */
    function _shortcutNameToCallback(shortcutName) {
        const map = {
            OPEN_FILE_PICKER: 'onOpenFilePicker',
            EXPORT: 'onExport',
            DESELECT: 'onDeselect',
            DELETE_BACKSPACE: 'onRemoveSelected',
            UNDO: 'onUndo',
            REDO: 'onRedo'
        };
        return map[shortcutName];
    }

    return {
        /**
         * Attaches the keydown listener to the document.
         * Safe to call multiple times (no-op if already attached).
         */
        attach() {
            if (_attached) return;
            _attached = true;
            _listener = handleKeydown;
            document.addEventListener('keydown', _listener);
        },

        /**
         * Removes the keydown listener from the document.
         * Safe to call multiple times or without prior attach().
         */
        detach() {
            if (!_attached) return;
            _attached = false;
            if (_listener) {
                document.removeEventListener('keydown', _listener);
                _listener = null;
            }
        },

        /**
         * Exposed for integration testing.
         * @param {KeyboardEvent} e
         */
        handleKeydown
    };
}
