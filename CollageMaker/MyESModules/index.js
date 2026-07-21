// CollageMaker MyESModules - Barrel exports

// Models
export { LayoutStyle, LAYOUT_STYLE_OPTIONS } from './Models/LayoutStyle.js';
export { createImageItem } from './Models/ImageItem.js';
export { createImagePanel } from './Models/ImagePanel.js';
export { createRectGeometry, createPathGeometry, geometryBoundingRect } from './Models/PanelGeometry.js';
export { SIZE_CONSTANTS } from './Models/SizeConstants.js';
export { createCropInfo, createDefaultCrop, cloneCropInfo } from './Models/CropInfo.js';
export { BackgroundStyle, BACKGROUND_STYLE_OPTIONS, createBackgroundStyle } from './Models/BackgroundStyle.js';
export { createTitleStyle, TITLE_FONT_OPTIONS } from './Models/TitleStyle.js';
export { createTitleRun, cloneTitleRun, runsHaveSameFormatting } from './Models/TitleRun.js';

// Layout
export { LayoutGenerator } from './Layout/LayoutGenerator.js';
export { SeededPRNG } from './Layout/SeededPRNG.js';
export * as FitMath from './Layout/FitMath.js';
export { PolygonClipper } from './Layout/PolygonClipper.js';

// Rendering
export { createCanvasRenderer } from './Rendering/CanvasRenderer.js';
export { createPanelRenderer } from './Rendering/PanelRenderer.js';
export { createCollageAssembler } from './Rendering/CollageAssembler.js';
export * as BackgroundRenderer from './Rendering/BackgroundRenderer.js';
export * as OverlayRenderer from './Rendering/OverlayRenderer.js';
export * as TitleRenderer from './Rendering/TitleRenderer.js';
export {
    createDebugOverlay,
    focusPointToCanvasCoords,
    imageCenterToCanvasCoords,
    computeDebugMarkers,
    validateFocusPoint,
    DEBUG_OVERLAY_STYLES,
    render as renderDebugOverlay
} from './Rendering/SaliencyDebugOverlay.js';

// State
export { createLayoutManager } from './State/LayoutManager.js';
export { createImageLibrary } from './State/ImageLibrary.js';
export { createCropManager } from './State/CropManager.js';
export { createUndoManager } from './State/UndoManager.js';
export { createBackgroundManager } from './State/BackgroundManager.js';
export { createTitleManager } from './State/TitleManager.js';

// Export
export { exportToJpeg } from './Export/formats/jpegExporter.js';
export { exportToPng } from './Export/formats/pngExporter.js';

// Persistence
export { save as saveSettings, load as loadSettings, clear as clearSettings } from './Persistence/SettingsPersistence.js';

// Saliency
export { defaultCenterCrop, saliencyCrop as fallbackSaliencyCrop } from './Saliency/SaliencyFallback.js';
export {
    computeFocusPoint,
    filterDetections,
    computeBboxCentroid,
    saliencyCrop,
    computeInferenceSize,
    scaleDetectionUp,
    SALIENCY_CONFIG,
    WORKER_MSG,
    createSaliencyAnalyzer
} from './Saliency/SaliencyAnalyzer.js';

// Interaction
export { createFileDropHandler } from './Interaction/FileDropHandler.js';
export { createGestureHandler } from './Interaction/GestureHandler.js';
export { createCropInteraction } from './Interaction/CropInteraction.js';
export { createKeyboardHandler, parseKeyShortcut, matchesShortcut, KEYBOARD_SHORTCUTS } from './Interaction/KeyboardHandler.js';
export { createTitleInteraction } from './Interaction/TitleInteraction.js';

// Utils
export { getBrowserUtils } from './Utils/BrowserUtils.js';
export { loadImageFromFile } from './Utils/loadImageFromFile.js';
export {
    getLayoutTier,
    getSidebarConfig,
    getCanvasMaxDimensions,
    hasResponsiveClass,
    computeTouchPadding,
    isStackedLayout,
    isOverlaySidebar,
    BREAKPOINTS,
    TOUCH_TARGET,
    SIDEBAR_CONFIG
} from './Utils/ResponsiveUtils.js';
export {
    CACHE_CONFIG,
    isAppShellURL,
    isImageURL,
    routeRequest,
    computeCacheKey,
    getCacheName,
    shouldCacheResponse,
    validateManifest
} from './Utils/PWACacheUtils.js';
