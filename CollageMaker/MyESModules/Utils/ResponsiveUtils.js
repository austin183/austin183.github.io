/**
 * ResponsiveUtils — Pure functions for responsive layout calculations.
 * Provides breakpoint detection, sidebar configuration, touch target math,
 * and canvas dimension calculations for the three-tier responsive layout:
 *   - Desktop (>= 1200px): three-panel flexbox, both sidebars inline
 *   - Tablet (768–1199px): canvas primary, sidebars in overlay mode
 *   - Mobile (< 768px): stacked vertical layout
 *
 * All functions are pure and testable without browser context.
 */

// Breakpoint constants (in CSS pixels)
export const BREAKPOINTS = {
    MOBILE: 768,       // < 768px: stacked layout
    TABLET: 1200,      // < 1200px: sidebar overlay mode
};

// Touch target minimums (WCAG 2.5.5 / Apple HIG)
export const TOUCH_TARGET = {
    MIN_SIZE: 44,      // 44x44px minimum touch target
    RECOMMENDED_SIZE: 48,
};

// Sidebar configuration per breakpoint tier
// Note: MOBILE width=0 means sidebar is not inline; in stacked mode,
// sidebars render as full-width sections below the canvas (CSS-driven).
// TABLET width=0 means sidebar is hidden by default; overlay slides in on toggle.
export const SIDEBAR_CONFIG = {
    DESKTOP: { width: 260, min: 200, max: 350, mode: 'inline' },
    TABLET: { width: 0, min: 0, max: 0, mode: 'overlay' },
    MOBILE: { width: 0, min: 0, max: 0, mode: 'stacked' },
};

// Layout tier labels
export const LAYOUT_TIERS = {
    DESKTOP: 'desktop',
    TABLET: 'tablet',
    MOBILE: 'mobile',
};

/**
 * Determines the layout tier based on viewport width.
 * @param {number} viewportWidth - Viewport width in CSS pixels
 * @returns {'mobile' | 'tablet' | 'desktop'}
 */
export function getLayoutTier(viewportWidth) {
    if (viewportWidth >= BREAKPOINTS.TABLET) return LAYOUT_TIERS.DESKTOP;
    if (viewportWidth >= BREAKPOINTS.MOBILE) return LAYOUT_TIERS.TABLET;
    return LAYOUT_TIERS.MOBILE;
}

/**
 * Returns the sidebar configuration for the given viewport width.
 * @param {number} viewportWidth - Viewport width in CSS pixels
 * @returns {Object} Sidebar config with width, min, max, mode
 */
export function getSidebarConfig(viewportWidth) {
    const tier = getLayoutTier(viewportWidth);
    switch (tier) {
        case LAYOUT_TIERS.DESKTOP: return SIDEBAR_CONFIG.DESKTOP;
        case LAYOUT_TIERS.TABLET: return SIDEBAR_CONFIG.TABLET;
        case LAYOUT_TIERS.MOBILE: return SIDEBAR_CONFIG.MOBILE;
        default: return SIDEBAR_CONFIG.DESKTOP;
    }
}

/**
 * Calculates the maximum canvas dimensions given viewport size and layout tier.
 * Accounts for sidebar widths (desktop), padding, and toolbar height.
 * @param {number} viewportWidth - Viewport width in CSS pixels
 * @param {number} viewportHeight - Viewport height in CSS pixels
 * @param {Object} [tierConfig] - Optional override for sidebar config
 * @returns {{ maxWidth: number, maxHeight: number }}
 */
export function getCanvasMaxDimensions(viewportWidth, viewportHeight, tierConfig) {
    const tier = getLayoutTier(viewportWidth);
    const config = tierConfig || SIDEBAR_CONFIG;

    let sidebarWidth = 0;
    if (tier === LAYOUT_TIERS.DESKTOP) {
        sidebarWidth = config.DESKTOP ? config.DESKTOP.width : 260;
    }

    // Toolbar height (approximate, matches CSS)
    const toolbarHeight = 56;

    // Padding around canvas area
    const horizontalPadding = 32;
    const verticalPadding = 32;

    const maxWidth = tier === LAYOUT_TIERS.DESKTOP
        ? Math.max(0, viewportWidth - sidebarWidth * 2 - horizontalPadding)
        : Math.max(0, viewportWidth - horizontalPadding);

    const maxHeight = Math.max(0, viewportHeight - toolbarHeight - verticalPadding);

    return { maxWidth, maxHeight };
}

/**
 * Validates if a CSS class string contains an expected class name.
 * Uses word-boundary matching to avoid partial matches.
 * @param {string} classList - Space-separated CSS class string
 * @param {string} expectedClass - Class name to check for
 * @returns {boolean}
 */
export function hasResponsiveClass(classList, expectedClass) {
    if (!classList || typeof classList !== 'string') return false;
    const classes = classList.trim().split(/\s+/).filter(Boolean);
    return classes.includes(expectedClass);
}

/**
 * Computes padding needed to ensure a touch target meets minimum size requirements.
 * @param {number} baseWidth - Current element width in CSS pixels
 * @param {number} baseHeight - Current element height in CSS pixels
 * @returns {{ totalPaddingIncrease: number, finalWidth: number, finalHeight: number }}
 *   totalPaddingIncrease is the TOTAL delta (not per-side CSS padding).
 *   To apply as CSS padding, use totalPaddingIncrease / 2 on each side.
 */
export function computeTouchPadding(baseWidth, baseHeight) {
    const minSize = TOUCH_TARGET.MIN_SIZE;
    const finalWidth = Math.max(baseWidth, minSize);
    const finalHeight = Math.max(baseHeight, minSize);
    const paddingWidth = finalWidth - baseWidth;
    const paddingHeight = finalHeight - baseHeight;
    // totalPaddingIncrease is the total delta needed, not per-side CSS padding
    const totalPaddingIncrease = Math.max(paddingWidth, paddingHeight);
    return { totalPaddingIncrease, finalWidth, finalHeight };
}

/**
 * Returns true if the viewport width results in a stacked (mobile) layout.
 * @param {number} viewportWidth - Viewport width in CSS pixels
 * @returns {boolean}
 */
export function isStackedLayout(viewportWidth) {
    return getLayoutTier(viewportWidth) === LAYOUT_TIERS.MOBILE;
}

/**
 * Returns true if the viewport width results in an overlay sidebar (tablet) layout.
 * @param {number} viewportWidth - Viewport width in CSS pixels
 * @returns {boolean}
 */
export function isOverlaySidebar(viewportWidth) {
    return getLayoutTier(viewportWidth) === LAYOUT_TIERS.TABLET;
}
