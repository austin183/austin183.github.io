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

// State
export { createCollageState } from './State/CollageState.js';
export { createLayoutManager } from './State/LayoutManager.js';
export { createImageLibrary } from './State/ImageLibrary.js';
export { createCropManager } from './State/CropManager.js';
export { createUndoManager } from './State/UndoManager.js';
export { createBackgroundManager } from './State/BackgroundManager.js';
export { createTitleManager } from './State/TitleManager.js';

// Export
export { exportToJpeg } from './Export/ExportManager.js';

// Persistence
export { save as saveSettings, load as loadSettings, clear as clearSettings } from './Persistence/SettingsPersistence.js';

// Saliency
export { defaultCenterCrop, saliencyCrop } from './Saliency/SaliencyFallback.js';

// Interaction
export { createFileDropHandler } from './Interaction/FileDropHandler.js';
export { createGestureHandler } from './Interaction/GestureHandler.js';
export { createCropInteraction } from './Interaction/CropInteraction.js';

// Utils
export { getBrowserUtils } from './Utils/BrowserUtils.js';
export { getComponentRegistry } from './Utils/ComponentRegistry.js';
