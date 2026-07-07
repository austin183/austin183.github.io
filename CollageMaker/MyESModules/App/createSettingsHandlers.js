/**
 * Settings handlers - Handles settings persistence.
 */

import { save as saveSettings, load as loadSettings } from '../Persistence/SettingsPersistence.js';

/**
 * Creates settings handlers.
 * @returns {Object} Settings handlers object
 */
export function createSettingsHandlers() {
    return {
        /**
         * Saves current settings to localStorage.
         * @param {Object} state - Vue reactive state
         */
        _saveSettings(state) {
            try {
                saveSettings({
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
                    exportQuality: state.exportQuality
                });
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

