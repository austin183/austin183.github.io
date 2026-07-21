// PWACacheUtils — Pure utility functions for PWA cache strategy
// All functions are pure and testable without service worker context.
// The actual service-worker.js uses these utilities for cache routing decisions.

// ============================================================
// Cache Configuration
// ============================================================

export const CACHE_CONFIG = {
    APP_SHELL_CACHE_NAME: 'collagemaker-shell-v1',
    IMAGE_CACHE_NAME: 'collagemaker-images-v1',
    CACHE_VERSION: 1,
    MAX_IMAGE_CACHE_SIZE: 50,
    IMAGE_CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
    APP_SHELL_URLS: [
        './index.html',
        './Style.css',
        // Barrel export
        './MyESModules/index.js',
        // Models
        './MyESModules/Models/LayoutStyle.js',
        './MyESModules/Models/ImageItem.js',
        './MyESModules/Models/ImagePanel.js',
        './MyESModules/Models/PanelGeometry.js',
        './MyESModules/Models/SizeConstants.js',
        './MyESModules/Models/CropInfo.js',
        './MyESModules/Models/BackgroundStyle.js',
        './MyESModules/Models/TitleStyle.js',
        './MyESModules/Models/TitleRun.js',
        // Layout
        './MyESModules/Layout/LayoutGenerator.js',
        './MyESModules/Layout/SeededPRNG.js',
        './MyESModules/Layout/FitMath.js',
        './MyESModules/Layout/PolygonClipper.js',
        './MyESModules/Layout/HexagonalLayout.js',
        './MyESModules/Layout/HeroLayout.js',
        './MyESModules/Layout/DiagonalSlicesLayout.js',
        './MyESModules/Layout/MosaicLayout.js',
        './MyESModules/Layout/UniformLayout.js',
        // Rendering
        './MyESModules/Rendering/CanvasRenderer.js',
        './MyESModules/Rendering/PanelRenderer.js',
        './MyESModules/Rendering/CollageAssembler.js',
        './MyESModules/Rendering/BackgroundRenderer.js',
        './MyESModules/Rendering/OverlayRenderer.js',
        './MyESModules/Rendering/TitleRenderer.js',
        './MyESModules/Rendering/SaliencyDebugOverlay.js',
        // State
        './MyESModules/State/LayoutManager.js',
        './MyESModules/State/ImageLibrary.js',
        './MyESModules/State/CropManager.js',
        './MyESModules/State/UndoManager.js',
        './MyESModules/State/BackgroundManager.js',
        './MyESModules/State/TitleManager.js',
        // Export
        './MyESModules/Export/ExportManager.js',
        // Persistence
        './MyESModules/Persistence/SettingsPersistence.js',
        // Saliency
        './MyESModules/Saliency/SaliencyFallback.js',
        './MyESModules/Saliency/SaliencyAnalyzer.js',
        // Interaction
        './MyESModules/Interaction/FileDropHandler.js',
        './MyESModules/Interaction/GestureHandler.js',
        './MyESModules/Interaction/CropInteraction.js',
        './MyESModules/Interaction/KeyboardHandler.js',
        // Utils
        './MyESModules/Utils/BrowserUtils.js',
        './MyESModules/Utils/ResponsiveUtils.js',
        './MyESModules/Utils/PWACacheUtils.js',
        // App
        './MyESModules/App/CollageBase.js',
        './MyESModules/App/createCollageMethods.js',
        './MyESModules/App/createCollageServices.js',
        './MyESModules/App/createCollageLifecycle.js',
        './MyESModules/App/createCollageApp.js',
        './MyESModules/App/createCollageData.js',
        // Service worker itself
        './service-worker.js',
    ],
};

// ============================================================
// Pure Functions
// ============================================================

/**
 * Check if a URL is part of the app shell (local assets to be cached first).
 * Uses exact match against APP_SHELL_URLS.
 */
export function isAppShellURL(url) {
    if (typeof url !== 'string' || !url) return false;
    return CACHE_CONFIG.APP_SHELL_URLS.includes(url);
}

/**
 * Check if a URL is an image URL based on file extension.
 * Case-insensitive, handles query params and fragments.
 * Rejects data:, blob:, and file: URLs — those are not network requests
 * that a service worker can intercept or cache.
 */
export function isImageURL(url) {
    if (typeof url !== 'string' || !url) return false;
    // Skip data:, blob:, and file: URLs — not network requests
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('file:')) return false;

    const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif)(\?|#|$)/i;
    return IMAGE_EXTENSIONS.test(url);
}

/**
 * Route a request URL to a cache strategy category.
 * Returns 'shell' (cache-first), 'images' (network-first), or 'passthrough' (no cache).
 */
export function routeRequest(url) {
    if (isAppShellURL(url)) return 'shell';
    if (isImageURL(url)) return 'images';
    return 'passthrough';
}

/**
 * Compute a versioned cache key for a URL.
 * Ensures cache invalidation when CACHE_VERSION is bumped.
 */
export function computeCacheKey(url, cacheName) {
    const version = CACHE_CONFIG.CACHE_VERSION;
    return `${url}?__v=${version}#__cache=${cacheName}`;
}

/**
 * Get the cache name for a given route type.
 * Returns null for unknown types.
 */
export function getCacheName(type) {
    if (type === 'shell') return CACHE_CONFIG.APP_SHELL_CACHE_NAME;
    if (type === 'images') return CACHE_CONFIG.IMAGE_CACHE_NAME;
    return null;
}

/**
 * Determine if a response should be cached.
 * Only caches 200 OK responses with a content-type header that is not opaque.
 */
export function shouldCacheResponse(url, response) {
    if (!response) return false;
    if (response.type === 'opaque') return false;
    if (response.status !== 200) return false;
    const contentType = response.headers && response.headers.get
        ? response.headers.get('content-type')
        : (response.headers && response.headers['content-type']);
    if (!contentType) return false;
    return true;
}

/**
 * Validate a web app manifest object.
 * Returns { valid: boolean, errors: string[] }.
 * Checks required fields and recommended fields.
 */
export function validateManifest(manifest) {
    const errors = [];

    if (!manifest) {
        return { valid: false, errors: ['Manifest is null'] };
    }
    if (typeof manifest !== 'object' || Array.isArray(manifest)) {
        return { valid: false, errors: ['Manifest must be an object'] };
    }

    // Required fields
    if (manifest.name === undefined || manifest.name === null) {
        errors.push('Missing required field: name');
    } else if (typeof manifest.name === 'string' && !manifest.name.trim()) {
        errors.push('name must be non-empty');
    }

    if (!manifest.short_name) {
        errors.push('Missing required field: short_name');
    } else if (typeof manifest.short_name === 'string' && manifest.short_name.length > 12) {
        errors.push('short_name exceeds 12 characters');
    }

    if (!manifest.start_url) {
        errors.push('Missing required field: start_url');
    } else if (typeof manifest.start_url === 'string' && manifest.start_url.startsWith('http')) {
        errors.push('start_url must be relative');
    }

    if (!manifest.display) {
        errors.push('Missing required field: display');
    } else if (manifest.display !== 'standalone' && manifest.display !== 'fullscreen' && manifest.display !== 'minimal-ui') {
        errors.push('display must be standalone, fullscreen, or minimal-ui');
    }

    if (manifest.icons === undefined || manifest.icons === null || !Array.isArray(manifest.icons)) {
        errors.push('Missing required field: icons');
    } else if (manifest.icons.length === 0) {
        errors.push('icons must have at least 1 entry');
    } else {
        manifest.icons.forEach((icon, i) => {
            if (!icon.src) errors.push(`Icon[${i}] missing src`);
            if (!icon.sizes) errors.push(`Icon[${i}] missing sizes`);
        });
    }

    // Recommended fields
    if (!manifest.background_color) {
        errors.push('Missing recommended field: background_color');
    }
    if (!manifest.theme_color) {
        errors.push('Missing recommended field: theme_color');
    }

    return { valid: errors.length === 0, errors };
}
