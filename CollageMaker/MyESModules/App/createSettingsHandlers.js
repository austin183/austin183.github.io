/**
 * Settings handlers - Handles settings persistence.
 */

import { save as defaultSave, load as loadSettings } from '../Persistence/SettingsPersistence.js';

/**
 * Creates settings handlers.
 * @param {Function} [saveFn] - Save function (injected for testability, defaults to SettingsPersistence.save)
 * @returns {Object} Settings handlers object
 */
export function createSettingsHandlers(saveFn) {
    const save = typeof saveFn === 'function' ? saveFn : defaultSave;
    return {
        /**
         * Saves current settings to localStorage.
         * Shows a toast notification if storage quota is exceeded.
         * @param {Object} state - Vue reactive state
         */
        _saveSettings(state) {
            try {
                const success = save({
                    layoutStyle: state.layoutStyle,
                    gutter: state.gutter,
                    sliceAngle: state.sliceAngle,
                    hexSpacing: state.hexSpacing,
                    backgroundStyle: state.backgroundStyle,
                    backgroundColor: state.backgroundColor,
                    gradientColors: state.gradientColors,
                    gradientAngle: state.gradientAngle,
                    titleFontFamily: state.titleStyle.fontFamily,
                    titleFontSize: state.titleStyle.fontSize,
                    titleFontColor: state.titleStyle.fontColor,
                    titleAlignment: state.titleStyle.alignment,
                    // Title opacity, position, width, and background fields
                    titleFontOpacity: state.titleStyle.fontOpacity,
                    titleBgOpacity: state.titleStyle.bgOpacity,
                    titleBoxWidth: state.titleStyle.titleBoxWidth,
                    titleBoxX: state.titleStyle.titleBoxX,
                    titleBoxY: state.titleStyle.titleBoxY,
                    titleShowBackground: state.titleStyle.showBackground,
                    titleBackgroundColor: state.titleStyle.backgroundColor,
                    exportQuality: state.exportQuality
                });
                if (success === false && typeof state.showToast === 'function') {
                    state.showToast('Settings not saved — storage full', 'error', 5000);
                }
            } catch (e) {
                console.warn('Failed to save settings:', e);
            }
        },

        /**
         * Loads persisted settings from localStorage.
         * @returns {Object} Settings object or null
         */
        loadSettings() {
            return loadSettings();
        },

        /**
         * Applies saved settings from localStorage to reactive state.
         * @param {Object} state - Vue reactive state
         * @param {Object} settings - Settings object
         */
        _applySavedSettings(state, settings) {
            if (!settings) return;

            // Layout settings
            if (settings.layoutStyle) state.layoutStyle = settings.layoutStyle;
            if (settings.gutter !== undefined) state.gutter = settings.gutter;
            if (settings.sliceAngle !== undefined) state.sliceAngle = settings.sliceAngle;
            if (settings.hexSpacing !== undefined) state.hexSpacing = settings.hexSpacing;

            // Background settings
            if (settings.backgroundStyle) state.backgroundStyle = settings.backgroundStyle;
            if (settings.backgroundColor) state.backgroundColor = settings.backgroundColor;
            if (settings.gradientColors) state.gradientColors = settings.gradientColors;
            if (settings.gradientAngle !== undefined) state.gradientAngle = settings.gradientAngle;

            // Title settings
            if (settings.titleFontFamily) state.titleStyle.fontFamily = settings.titleFontFamily;
            if (settings.titleFontSize !== undefined) state.titleStyle.fontSize = settings.titleFontSize;
            if (settings.titleFontColor) state.titleStyle.fontColor = settings.titleFontColor;
            if (settings.titleAlignment) state.titleStyle.alignment = settings.titleAlignment;

            // Export settings
            if (settings.exportQuality !== undefined) state.exportQuality = settings.exportQuality;
        }
    };
}

