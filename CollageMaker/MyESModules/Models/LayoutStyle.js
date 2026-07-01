/**
 * LayoutStyle - Layout style enum and display options.
 * Ported from Swift LayoutStyle.swift
 */

export const LayoutStyle = {
    UNIFORM: 'uniform',
    HERO: 'hero',
    MOSAIC: 'mosaic',
    DIAGONAL_SLICES: 'diagonalSlices',
    HEXAGONAL: 'hexagonal'
};

export const LAYOUT_STYLE_OPTIONS = [
    { value: LayoutStyle.UNIFORM, label: 'Uniform' },
    { value: LayoutStyle.HERO, label: 'Hero' },
    { value: LayoutStyle.MOSAIC, label: 'Mosaic' },
    { value: LayoutStyle.DIAGONAL_SLICES, label: 'Diagonal Slices' },
    { value: LayoutStyle.HEXAGONAL, label: 'Hexagonal' }
];

/**
 * Migrates legacy raw values to current layout style cases.
 * @param {string|null} rawValue
 * @returns {string}
 */
export function migrateLayoutStyle(rawValue) {
    if (!rawValue) return LayoutStyle.HERO;
    if (rawValue === 'doubleExposure') return LayoutStyle.UNIFORM;
    const validStyles = Object.values(LayoutStyle);
    return validStyles.includes(rawValue) ? rawValue : LayoutStyle.HERO;
}
