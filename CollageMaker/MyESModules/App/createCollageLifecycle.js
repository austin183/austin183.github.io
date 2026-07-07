/**
 * createCollageLifecycle - Vue lifecycle hooks for CollageMaker.
 * Handles canvas initialization, render scheduling, and cleanup.
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
import { createKeyboardHandler } from '../Interaction/KeyboardHandler.js';
import { load as loadSettings } from '../Persistence/SettingsPersistence.js';
import { SIZE_CONSTANTS } from '../Models/SizeConstants.js';
import { createTitleStyle } from '../Models/TitleStyle.js';

export function createCollageLifecycle(base) {
    return {
        mounted() {
            // Load persisted settings
            const savedSettings = loadSettings();
            this._applySavedSettings(savedSettings);

            // Initialize canvas renderer
            const renderer = createCanvasRenderer('previewCanvas');
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
                canvasId: 'previewCanvas',
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

            // Initialize crop interaction handler
            let cropUndoSnapshot = null;
            this._cropInteraction = createCropInteraction({
                canvasId: 'cropPreviewCanvas',
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

            // Set up global file drop handler for drops outside Vue-managed elements
            // (the element-level @drop handlers in the template handle drops on canvas/library)
            this._dropCleanup = base.dropHandler.setupGlobalDrop(async (files) => {
                await imageLibrary.addImages(files);
                layoutManager.regenerate();
                this._scheduleRender();
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
            if (this._cropInteraction) {
                this._cropInteraction.detach();
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

                // Export settings
                if (settings.exportQuality !== undefined) this.exportQuality = settings.exportQuality;
            },

        }
    };
}
