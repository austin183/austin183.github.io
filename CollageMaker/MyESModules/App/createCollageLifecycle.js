/**
 * createCollageLifecycle - Vue lifecycle hooks for CollageMaker.
 * Handles canvas initialization, render scheduling, and cleanup.
 * Accepts domIds configuration to avoid hardcoded getElementById calls.
 */

import { createCanvasRenderer } from '../Rendering/CanvasRenderer.js';
import { createLayoutManager } from '../State/LayoutManager.js';
import { createImageLibrary } from '../State/ImageLibrary.js';
import { createCropManager } from '../State/CropManager.js';
import { createUndoManager } from '../State/UndoManager.js';
import { createBackgroundManager } from '../State/BackgroundManager.js';
import { createTitleManager } from '../State/TitleManager.js';
import { createGestureHandler } from '../Interaction/GestureHandler.js';
import { createCropInteraction } from '../Interaction/CropInteraction.js';
import { createPanelSwapHandler, swapPanelAssignments } from '../Interaction/PanelSwap.js';
import { createKeyboardHandler } from '../Interaction/KeyboardHandler.js';
import { createMultiTouchHandler } from '../Interaction/MultiTouchHandler.js';
import { createTitleInteraction } from '../Interaction/TitleInteraction.js';
import { createSaliencyAnalyzer } from '../Saliency/SaliencyAnalyzer.js';
import { load as loadSettings } from '../Persistence/SettingsPersistence.js';
import { SIZE_CONSTANTS } from '../Models/SizeConstants.js';
import { createTitleStyle } from '../Models/TitleStyle.js';

/**
 * Default DOM element IDs for lifecycle initialization.
 */
const DEFAULT_DOM_IDS = {
    previewCanvas: 'previewCanvas',
    cropPreviewCanvas: 'cropPreviewCanvas'
};

export function createCollageLifecycle(base, domIds = {}) {
    const ids = { ...DEFAULT_DOM_IDS, ...domIds };
    return {
        mounted() {
            // Load persisted settings
            const savedSettings = loadSettings();
            this._applySavedSettings(savedSettings);

            // Initialize canvas renderer
            const renderer = createCanvasRenderer(ids.previewCanvas);
            renderer.init({
                width: SIZE_CONSTANTS.defaultPreviewWidth,
                height: SIZE_CONSTANTS.defaultPreviewHeight
            });
            base.setCanvasRenderer(renderer);
            this.canvasRenderer = renderer;

            // Store assembler reference for render function
            this._assembler = base.assembler;

            // Initialize undo manager
            this.undoManager = createUndoManager();

            // Initialize layout manager
            const layoutManager = createLayoutManager(this, base.assembler);
            base.setLayoutManager(layoutManager);
            this.layoutManager = layoutManager;

            // Initialize crop manager
            const onCropChanged = () => {
                this._scheduleRender();
                this._scheduleCropPreviewRender();
            };
            this.cropManager = createCropManager(this, onCropChanged);
            base.setCropManager(this.cropManager);

            // Initialize image library
            const onImagesChanged = () => {
                // Hook point for future use
            };
            const imageLibrary = createImageLibrary(this, onImagesChanged);
            base.setImageLibrary(imageLibrary);
            this.imageLibrary = imageLibrary;

            // Initialize background manager
            const onBackgroundChanged = () => {
                this._scheduleRender();
            };
            this.backgroundManager = createBackgroundManager(this, onBackgroundChanged);
            base.setBackgroundManager(this.backgroundManager);

            // Initialize title manager
            const onTitleChanged = () => {
                this._scheduleRender();
            };
            this.titleManager = createTitleManager(this, onTitleChanged);
            base.setTitleManager(this.titleManager);

            // Initialize gesture handler (panel selection on main canvas)
            this._gestureHandler = createGestureHandler({
                canvasId: ids.previewCanvas,
                state: this,
                onPanelSelected: (panelId) => {
                    this.selectPanel(panelId);
                },
                onHoverChanged: (panelId) => {
                    this.hoveredPanelId = panelId;
                },
                onRenderScheduled: () => {
                    this._scheduleRender();
                }
            });
            this._gestureHandler.attach();

            // Initialize panel swap handler (drag-and-drop swap in all layouts)
            this._panelSwapHandler = createPanelSwapHandler({
                canvasId: ids.previewCanvas,
                state: this,
                onPanelSelected: (panelId) => {
                    this.selectPanel(panelId);
                },
                onRenderScheduled: () => {
                    this._scheduleRender();
                },
                onTargetHovered: (targetId) => {
                    this.dragTargetId = targetId;
                },
                onSwapPerformed: (swapInfo) => {
                    // Push undo command for the swap
                    if (this.undoManager) {
                        this.undoManager.push({
                            label: 'Swap Panels',
                            undo: () => {
                                swapPanelAssignments(this, swapInfo.sourceId, swapInfo.targetId, this.crops, this.images);
                            },
                            redo: () => {
                                swapPanelAssignments(this, swapInfo.sourceId, swapInfo.targetId, this.crops, this.images);
                            }
                        });
                        this._updateUndoState();
                    }
                }
            });

            // Initialize crop interaction handler
            let cropUndoSnapshot = null;
            this._cropInteraction = createCropInteraction({
                canvasId: ids.cropPreviewCanvas,
                cropManager: this.cropManager,
                panelId: null,
                onRenderScheduled: () => {
                    this._scheduleRender();
                },
                onCropPreviewRender: () => {
                    this._scheduleCropPreviewRender();
                },
                onDragStart: () => {
                    // Capture pre-drag crop state for undo
                    const crop = this.cropManager.getCrop(this.selectedPanelId);
                    if (crop) {
                        cropUndoSnapshot = { ...crop.sourceRect };
                    }
                },
                onDragEnd: () => {
                    // Push undo command for the entire drag session
                    if (cropUndoSnapshot && this.selectedPanelId && this.undoManager) {
                        const panelId = this.selectedPanelId;
                        const preState = { ...cropUndoSnapshot };
                        const crop = this.cropManager.getCrop(panelId);
                        const postState = crop ? { ...crop.sourceRect } : null;

                        if (postState) {
                            this.undoManager.push({
                                label: 'Adjust Crop',
                                undo: () => {
                                    this.cropManager.setSourceRect(panelId, preState);
                                },
                                redo: () => {
                                    this.cropManager.setSourceRect(panelId, postState);
                                }
                            });
                            this._updateUndoState();
                        }
                    }
                    cropUndoSnapshot = null;
                }
            });

            // Initialize multi-touch gesture handler (two-finger pan + pinch-to-zoom on main canvas)
            this._multiTouchHandler = createMultiTouchHandler({
                canvasId: ids.previewCanvas,
                cropManager: this.cropManager,
                state: this,
                onCropPreviewRender: () => {
                    this._scheduleCropPreviewRender();
                },
                onRenderScheduled: () => {
                    this._scheduleRender();
                }
            });
            this._multiTouchHandler.attach();

            // Initialize title interaction handler (drag to move + edge-drag to resize title box)
            let titleUndoSnapshot = null;
            this._titleInteraction = createTitleInteraction({
                canvasId: ids.previewCanvas,
                state: this,
                titleManager: this.titleManager,
                onRenderScheduled: () => {
                    this._scheduleRender();
                },
                onInteractionStart: () => {
                    // Capture pre-interaction title state for undo
                    titleUndoSnapshot = {
                        titleBoxX: this.titleStyle.titleBoxX,
                        titleBoxY: this.titleStyle.titleBoxY,
                        titleBoxWidth: this.titleStyle.titleBoxWidth
                    };
                },
                onInteractionEnd: () => {
                    // Push undo command for the title interaction
                    if (titleUndoSnapshot && this.undoManager) {
                        const postState = {
                            titleBoxX: this.titleStyle.titleBoxX,
                            titleBoxY: this.titleStyle.titleBoxY,
                            titleBoxWidth: this.titleStyle.titleBoxWidth
                        };
                        // Only push if something actually changed
                        if (titleUndoSnapshot.titleBoxX !== postState.titleBoxX ||
                            titleUndoSnapshot.titleBoxY !== postState.titleBoxY ||
                            titleUndoSnapshot.titleBoxWidth !== postState.titleBoxWidth) {
                            this.undoManager.push({
                                label: 'Move/Resize Title',
                                undo: () => {
                                    this.titleStyle.titleBoxX = titleUndoSnapshot.titleBoxX;
                                    this.titleStyle.titleBoxY = titleUndoSnapshot.titleBoxY;
                                    this.titleStyle.titleBoxWidth = titleUndoSnapshot.titleBoxWidth;
                                },
                                redo: () => {
                                    this.titleStyle.titleBoxX = postState.titleBoxX;
                                    this.titleStyle.titleBoxY = postState.titleBoxY;
                                    this.titleStyle.titleBoxWidth = postState.titleBoxWidth;
                                }
                            });
                            this._updateUndoState();
                        }
                    }
                    titleUndoSnapshot = null;
                }
            });
            this._titleInteraction.attach();

            // Attach panel swap AFTER title interaction so TitleInteraction's
            // pointerdown fires first and sets titleInteractionMode before
            // PanelSwap checks it — prevents panel drag starting behind title
            this._panelSwapHandler.attach();

            // Initialize saliency analyzer (AI-based crop focus, deferred feature)
            // onModelsFailed shows a non-blocking toast when ML models can't load
            this._saliencyAnalyzer = createSaliencyAnalyzer({
                onModelsFailed: (errorMsg) => {
                    this.showToast('AI features unavailable — using default focus', 'info', 5000);
                }
            });
            this._saliencyAnalyzer.initModels();

            // Set up global file drop handler for drops outside Vue-managed elements
            // (the element-level @drop handlers in the template handle drops on canvas/library)
            this._dropCleanup = base.dropHandler.setupGlobalDrop(async (files) => {
                await imageLibrary.addImages(files);
                this._regenerateAndRender();
            });

            // Set up keyboard shortcuts via centralized handler
            this._keyboardHandler = createKeyboardHandler({
                callbacks: {
                    onOpenFilePicker: () => this.triggerFilePicker(),
                    onExport: () => this.exportCollage(),
                    onLayoutSwitch: (style) => {
                        this.layoutStyle = style;
                        this.onLayoutStyleChange();
                    },
                    onDeselect: () => {
                        if (this.selectedPanelId) {
                            this.selectPanel(null);
                            this._scheduleRender();
                        }
                    },
                    onRemoveSelected: () => this.removeSelectedImage(),
                    onUndo: () => this.undo(),
                    onRedo: () => this.redo()
                }
            });
            this._keyboardHandler.attach();

            // Handle window resize
            this._handleResize = () => {
                this._scheduleCropPreviewRender();
            };
            window.addEventListener('resize', this._handleResize);
        },

        beforeUnmount() {
            // Clear active toast timer to prevent state updates on destroyed instance
            if (this.toast && this.toast.timer) {
                clearTimeout(this.toast.timer);
                this.toast.timer = null;
            }
            // 1. Stop new interactions first (prevents race conditions with async drop handlers)
            if (this._dropCleanup) {
                this._dropCleanup();
            }
            if (this._keyboardHandler) {
                this._keyboardHandler.detach();
            }
            if (this._gestureHandler) {
                this._gestureHandler.detach();
            }
            if (this._panelSwapHandler) {
                this._panelSwapHandler.detach();
            }
            if (this._cropInteraction) {
                this._cropInteraction.detach();
            }
            if (this._multiTouchHandler) {
                this._multiTouchHandler.detach();
            }
            if (this._titleInteraction) {
                this._titleInteraction.detach();
            }

            // 2. Remove window listeners
            window.removeEventListener('resize', this._handleResize);

            // 3. Dispose canvas renderer
            if (this.canvasRenderer) {
                this.canvasRenderer.dispose();
            }

            // 4. Dispose all images in library to prevent memory leaks
            if (this.imageLibrary) {
                this.imageLibrary.clearAll();
            }

            // 5. Dispose saliency analyzer if it was initialized
            if (this._saliencyAnalyzer) {
                this._saliencyAnalyzer.dispose();
            }

            // 6. Dispose background and overlay images
            this.backgroundImage = null;
            this.overlayImage = null;
        },

        methods: {
            /**
             * Applies saved settings from localStorage to reactive state.
             * @param {Object} settings
             */
            _applySavedSettings(settings) {
                if (!settings) return;

                // Layout settings
                if (settings.layoutStyle) this.layoutStyle = settings.layoutStyle;
                if (settings.gutter !== undefined) this.gutter = settings.gutter;
                if (settings.sliceAngle !== undefined) this.sliceAngle = settings.sliceAngle;
                if (settings.hexSpacing !== undefined) this.hexSpacing = settings.hexSpacing;

                // Background settings
                if (settings.backgroundStyle) this.backgroundStyle = settings.backgroundStyle;
                if (settings.backgroundColor) this.backgroundColor = settings.backgroundColor;
                if (settings.gradientColors) this.gradientColors = settings.gradientColors;
                if (settings.gradientAngle !== undefined) this.gradientAngle = settings.gradientAngle;

                // Title settings
                if (settings.titleFontFamily) this.titleStyle.fontFamily = settings.titleFontFamily;
                if (settings.titleFontSize !== undefined) this.titleStyle.fontSize = settings.titleFontSize;
                if (settings.titleFontColor) this.titleStyle.fontColor = settings.titleFontColor;
                if (settings.titleAlignment) this.titleStyle.alignment = settings.titleAlignment;
                // Restore title opacity, position, width, and background fields
                if (settings.titleFontOpacity !== undefined) this.titleStyle.fontOpacity = settings.titleFontOpacity;
                if (settings.titleBgOpacity !== undefined) this.titleStyle.bgOpacity = settings.titleBgOpacity;
                if (settings.titleBoxWidth !== undefined) this.titleStyle.titleBoxWidth = settings.titleBoxWidth;
                if (settings.titleBoxX !== undefined) this.titleStyle.titleBoxX = settings.titleBoxX;
                if (settings.titleBoxY !== undefined) this.titleStyle.titleBoxY = settings.titleBoxY;
                if (settings.titleShowBackground !== undefined) this.titleStyle.showBackground = settings.titleShowBackground;
                if (settings.titleBackgroundColor) this.titleStyle.backgroundColor = settings.titleBackgroundColor;

                // Export settings
                if (settings.exportQuality !== undefined) this.exportQuality = settings.exportQuality;
            },

        }
    };
}
