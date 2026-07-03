/**
 * SettingsPersistence - localStorage wrapper for user settings.
 * Saves and loads collage settings to persist across sessions.
 */

const STORAGE_KEY = 'collagemaker_settings';

/**
 * Default settings object.
 * @returns {Object}
 */
function defaultSettings() {
    return {
        layoutStyle: 'hero',
        gutter: 0,
        sliceAngle: 45,
        hexSpacing: 8,
        backgroundStyle: 'solid',
        backgroundColor: '#ffffff',
        gradientColors: ['#000000', '#333333'],
        gradientAngle: 90,
        titleFontFamily: 'Arial',
        titleFontSize: 36,
        titleFontColor: '#FFFFFF',
        titleAlignment: 'center',
        exportQuality: 0.92,
        theme: 'light'
    };
}

/**
 * Saves settings to localStorage.
 * @param {Object} settings - Settings object to persist
 * @returns {boolean} True if save succeeded
 */
export function save(settings) {
    try {
        const json = JSON.stringify(settings);
        localStorage.setItem(STORAGE_KEY, json);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn('SettingsPersistence: localStorage quota exceeded, settings not saved.');
        } else {
            console.warn('SettingsPersistence: Failed to save settings:', e);
        }
        return false;
    }
}

/**
 * Loads settings from localStorage.
 * @returns {Object} Settings object, or defaults if not found or invalid
 */
export function load() {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return defaultSettings();
        const parsed = JSON.parse(json);
        // Merge with defaults to handle missing fields from older versions
        const defaults = defaultSettings();
        return { ...defaults, ...parsed };
    } catch (e) {
        console.warn('SettingsPersistence: Failed to load settings, using defaults:', e);
        return defaultSettings();
    }
}

/**
 * Clears saved settings from localStorage.
 */
export function clear() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('SettingsPersistence: Failed to clear settings:', e);
    }
}
