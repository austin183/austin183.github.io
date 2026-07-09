/**
 * SaliencyAnalyzer - Pure functions for saliency-based image cropping.
 * 
 * Provides focus point computation from detection bounding boxes,
 * detection filtering, crop shifting, and inference size calculations.
 * All core functions are pure and testable without TF.js or browser APIs.
 * 
 * Ported from Swift SaliencyAnalyzer.swift (pure math paths)
 */

// ============================================================
// Constants
// ============================================================

/** Configuration for saliency analysis thresholds and limits. */
export const SALIENCY_CONFIG = {
    MAX_INFERENCE_DIMENSION: 512,          // Downscale images above this for inference
    MIN_INFERENCE_DIMENSION: 32,           // Below this, skip inference (too small for TF.js)
    FACE_CONFIDENCE_THRESHOLD: 0.5,        // Minimum confidence for face detections
    OBJECT_CONFIDENCE_THRESHOLD: 0.3,      // Minimum confidence for object detections
    MIN_DETECTION_PIXEL_SIZE: 20,          // Ignore detections smaller than 20px (in original image)
    MODEL_PRIORITY: ['face-detection', 'coco-ssd', 'center-fallback'],
    INFERENCE_TIMEOUT_MS: 15000,           // Max time per inference before fallback
    WORKER_URL: './MyESModules/Saliency/SaliencyWorker.js',
};

/** Worker message protocol constants for main-thread ↔ worker communication. */
export const WORKER_MSG = {
    INIT_MODELS: 'saliency:init_models',
    ANALYZE_IMAGE: 'saliency:analyze_image',
    DISPOSE: 'saliency:dispose',
    MODELS_READY: 'saliency:models_ready',
    MODELS_FAILED: 'saliency:models_failed',
    ANALYSIS_COMPLETE: 'saliency:analysis_complete',
    ANALYSIS_ERROR: 'saliency:analysis_error',
    DISPOSED: 'saliency:disposed',
};

// ============================================================
// Pure Functions
// ============================================================

/**
 * Computes the centroid (average center) of an array of bounding boxes.
 * Returns the image center if no boxes are provided.
 * @param {Array<{x: number, y: number, w: number, h: number}>} bboxes
 * @param {{width: number, height: number}} imageSize
 * @returns {{x: number, y: number}} Centroid in image coordinates
 */
export function computeBboxCentroid(bboxes, imageSize) {
    if (!bboxes || bboxes.length === 0) {
        return { x: imageSize.width / 2, y: imageSize.height / 2 };
    }

    let centerX = 0;
    let centerY = 0;
    for (const b of bboxes) {
        centerX += b.x + b.w / 2;
        centerY += b.y + b.h / 2;
    }
    centerX /= bboxes.length;
    centerY /= bboxes.length;

    return { x: centerX, y: centerY };
}

/**
 * Filters detections by confidence threshold and minimum pixel size.
 * A detection passes if its confidence >= minConfidence AND
 * both its width and height >= minPixelSize.
 * @param {Array<Object>} detections - Array of { bbox: {x,y,w,h}, confidence: number }
 * @param {number} minConfidence - Minimum confidence threshold (default 0)
 * @param {number} minPixelSize - Minimum pixel dimension (both w and h) (default 0)
 * @returns {Array<Object>} Filtered detections
 */
export function filterDetections(detections, minConfidence, minPixelSize) {
    if (!detections || detections.length === 0) {
        return [];
    }

    const confThreshold = minConfidence ?? 0;
    const sizeThreshold = minPixelSize ?? 0;

    return detections.filter(d => {
        if (!d || !d.bbox || d.confidence == null) return false;
        if (d.confidence < confThreshold) return false;
        if (d.bbox.w < sizeThreshold || d.bbox.h < sizeThreshold) return false;
        return true;
    });
}

/**
 * Computes a normalized focus point (0-1) from ML detections using tiered priority:
 * 1. Face detections (highest priority)
 * 2. Object detections (fallback if no faces)
 * 3. Image center (final fallback)
 * @param {{faces: Array, objects: Array}} detections - Detection results from ML models
 * @param {{width: number, height: number}} imageSize - Original image dimensions
 * @param {Object} config - Saliency configuration (thresholds, minPixelSize)
 * @returns {{focusPoint: {x: number, y: number}, source: string}}
 */
export function computeFocusPoint(detections, imageSize, config) {
    if (!detections) detections = {};
    const cfg = config || SALIENCY_CONFIG;

    // Tier 1: Face detections
    const faces = filterDetections(
        detections.faces || [],
        cfg.FACE_CONFIDENCE_THRESHOLD,
        cfg.MIN_DETECTION_PIXEL_SIZE
    );

    if (faces.length > 0) {
        const bboxes = faces.map(f => f.bbox);
        const centroid = computeBboxCentroid(bboxes, imageSize);
        const normalized = normalizeFocusPoint(centroid, imageSize);
        return { focusPoint: normalized, source: 'face-detection' };
    }

    // Tier 2: Object detections
    const objects = filterDetections(
        detections.objects || [],
        cfg.OBJECT_CONFIDENCE_THRESHOLD,
        cfg.MIN_DETECTION_PIXEL_SIZE
    );

    if (objects.length > 0) {
        const bboxes = objects.map(o => o.bbox);
        const centroid = computeBboxCentroid(bboxes, imageSize);
        const normalized = normalizeFocusPoint(centroid, imageSize);
        return { focusPoint: normalized, source: 'coco-ssd' };
    }

    // Tier 3: Center fallback
    return { focusPoint: { x: 0.5, y: 0.5 }, source: 'center-fallback' };
}

/**
 * Normalizes an absolute focus point to [0, 1] range and clamps.
 * @param {{x: number, y: number}} absolutePoint - Point in image coordinates
 * @param {{width: number, height: number}} imageSize
 * @returns {{x: number, y: number}} Normalized and clamped focus point
 */
function normalizeFocusPoint(absolutePoint, imageSize) {
    if (imageSize.width <= 0 || imageSize.height <= 0) {
        return { x: 0.5, y: 0.5 };
    }

    const nx = absolutePoint.x / imageSize.width;
    const ny = absolutePoint.y / imageSize.height;

    return clampFocusPoint(nx, ny);
}

/**
 * Clamps a normalized focus point to [0, 1] range.
 * Handles NaN and Infinity by clamping to nearest valid edge.
 * @param {number} x - Normalized x coordinate
 * @param {number} y - Normalized y coordinate
 * @returns {{x: number, y: number}} Clamped point
 */
function clampFocusPoint(x, y) {
    return {
        x: isNaN(x) ? 0.5 : Math.max(0, Math.min(1, x)),
        y: isNaN(y) ? 0.5 : Math.max(0, Math.min(1, y))
    };
}

/**
 * Computes the target inference size by downscaling the image to fit
 * within maxDim while preserving aspect ratio.
 * @param {{width: number, height: number}} imageSize - Original image dimensions
 * @param {number} maxDim - Maximum dimension for inference (e.g., 512)
 * @returns {{width: number, height: number, scale: number}}
 */
export function computeInferenceSize(imageSize, maxDim) {
    if (imageSize.width <= 0 || imageSize.height <= 0) {
        return { width: 0, height: 0, scale: 1.0 };
    }

    if (maxDim == null || maxDim <= 0) {
        throw new Error('computeInferenceSize: maxDim must be a positive number, got ' + maxDim);
    }

    const maxSide = Math.max(imageSize.width, imageSize.height);
    if (maxSide <= maxDim) {
        return { width: imageSize.width, height: imageSize.height, scale: 1.0 };
    }

    const scale = maxDim / maxSide;
    return {
        width: Math.round(imageSize.width * scale),
        height: Math.round(imageSize.height * scale),
        scale: scale
    };
}

/**
 * Scales a detection bounding box up from inference size back to original image size.
 * @param {{x: number, y: number, w: number, h: number}} bbox - BBox at inference resolution
 * @param {number} scale - Scale factor from inference to original (e.g., 0.267)
 * @returns {{x: number, y: number, w: number, h: number}} BBox at original resolution
 */
export function scaleDetectionUp(bbox, scale) {
    if (scale <= 0) {
        // Handle degenerate scale: return original bbox unchanged
        return { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h };
    }

    return {
        x: bbox.x / scale,
        y: bbox.y / scale,
        w: bbox.w / scale,
        h: bbox.h / scale
    };
}

/**
 * Shifts a center crop rectangle toward a normalized focus point.
 * The crop center is moved to align with the focus point,
 * then clamped to stay within image bounds.
 * @param {{x: number, y: number, width: number, height: number}} centerCrop - Centered crop rect
 * @param {{x: number, y: number}} focusPoint - Normalized focus (0-1), NaN/Infinity treated as center
 * @param {{width: number, height: number}} imageSize - Original image dimensions
 * @returns {{x: number, y: number, width: number, height: number}} Shifted crop rect
 */
export function saliencyCrop(centerCrop, focusPoint, imageSize) {
    // Defensive: return center crop unchanged if required params missing
    if (!centerCrop || !focusPoint || !imageSize) {
        return centerCrop ? { ...centerCrop } : { x: 0, y: 0, width: 0, height: 0 };
    }

    // Validate focus point — NaN treated as center (no shift), Infinity clamped to edge
    let fx = focusPoint.x;
    let fy = focusPoint.y;

    if (isNaN(fx)) fx = 0.5;
    if (isNaN(fy)) fy = 0.5;

    // Clamp to [0, 1]
    fx = Math.max(0, Math.min(1, fx));
    fy = Math.max(0, Math.min(1, fy));

    // If focus is at center, no shift needed
    if (fx === 0.5 && fy === 0.5) {
        return { ...centerCrop };
    }

    // Compute absolute focus position
    const absFocusX = fx * imageSize.width;
    const absFocusY = fy * imageSize.height;

    // Current crop center
    const cropCenterX = centerCrop.x + centerCrop.width / 2;
    const cropCenterY = centerCrop.y + centerCrop.height / 2;

    // Shift crop center toward focus
    let newX = centerCrop.x + (absFocusX - cropCenterX);
    let newY = centerCrop.y + (absFocusY - cropCenterY);

    // Clamp to image bounds
    newX = Math.max(0, Math.min(newX, imageSize.width - centerCrop.width));
    newY = Math.max(0, Math.min(newY, imageSize.height - centerCrop.height));

    return {
        x: newX,
        y: newY,
        width: centerCrop.width,
        height: centerCrop.height
    };
}

// ============================================================
// Factory (DOM-dependent — lifecycle management)
// ============================================================

/**
 * Creates a saliency analyzer that manages Web Worker lifecycle and TF.js models.
 * This factory is for integration with the Vue app. The pure functions above
 * are used internally by the worker for actual analysis.
 * 
 * @param {{
 *   onModelsReady?: function,
 *   onModelsFailed?: function,
 *   onAnalysisComplete?: function,
 *   onAnalysisError?: function
 * }} callbacks - Event callbacks
 * @returns {{
 *   initModels: function,
 *   analyzeImage: function,
 *   cancel: function,
 *   dispose: function,
 *   getState: function
 * }}
 */
export function createSaliencyAnalyzer(callbacks) {
    let worker = null;
    let state = 'idle';
    let pendingRequestId = 0;
    let currentRequestId = 0;
    const cb = callbacks || {};

    // Queue for analysis requests that arrive before models are ready
    let pendingQueue = [];

    // Timeout guard for model loading (CR-11)
    let loadingTimeoutId = null;

    function processQueue() {
        while (pendingQueue.length > 0 && state === 'ready') {
            const item = pendingQueue.shift();
            pendingRequestId++;
            currentRequestId = pendingRequestId;
            worker.postMessage({
                type: WORKER_MSG.ANALYZE_IMAGE,
                requestId: currentRequestId,
                imageData: item.imageData,
                imageSize: item.imageSize
            });
        }
    }

    return {
        initModels() {
            // Guard: don't reinitialize if already loading or ready
            if (state === 'loading' || state === 'ready') {
                return;
            }

            if (worker) {
                worker.postMessage({ type: WORKER_MSG.INIT_MODELS });
                state = 'loading';
                // Start timeout guard (CR-11)
                loadingTimeoutId = setTimeout(() => {
                    if (state === 'loading') {
                        state = 'failed';
                        if (cb.onModelsFailed) {
                            cb.onModelsFailed('Model loading timeout after ' + SALIENCY_CONFIG.INFERENCE_TIMEOUT_MS + 'ms');
                        }
                    }
                    loadingTimeoutId = null;
                }, SALIENCY_CONFIG.INFERENCE_TIMEOUT_MS);
                return;
            }

            try {
                worker = new Worker(SALIENCY_CONFIG.WORKER_URL);
                state = 'loading';

                // Start timeout guard (CR-11)
                loadingTimeoutId = setTimeout(() => {
                    if (state === 'loading') {
                        state = 'failed';
                        if (cb.onModelsFailed) {
                            cb.onModelsFailed('Model loading timeout after ' + SALIENCY_CONFIG.INFERENCE_TIMEOUT_MS + 'ms');
                        }
                    }
                    loadingTimeoutId = null;
                }, SALIENCY_CONFIG.INFERENCE_TIMEOUT_MS);

                worker.onmessage = (e) => {
                    const msg = e.data;
                    switch (msg.type) {
                        case WORKER_MSG.MODELS_READY:
                            clearTimeout(loadingTimeoutId);
                            loadingTimeoutId = null;
                            state = 'ready';
                            if (cb.onModelsReady) cb.onModelsReady(msg.models);
                            processQueue();
                            break;
                        case WORKER_MSG.MODELS_FAILED:
                            clearTimeout(loadingTimeoutId);
                            loadingTimeoutId = null;
                            state = 'failed';
                            if (cb.onModelsFailed) cb.onModelsFailed(msg.error);
                            // Drain queue with center fallback
                            while (pendingQueue.length > 0) {
                                const item = pendingQueue.shift();
                                if (item.onComplete) {
                                    item.onComplete({ x: 0.5, y: 0.5 }, 'center-fallback');
                                }
                            }
                            break;
                        case WORKER_MSG.ANALYSIS_COMPLETE:
                            if (msg.requestId === currentRequestId && cb.onAnalysisComplete) {
                                cb.onAnalysisComplete(msg.focusPoint, msg.source, msg.requestId);
                            }
                            break;
                        case WORKER_MSG.ANALYSIS_ERROR:
                            if (msg.requestId === currentRequestId && cb.onAnalysisError) {
                                cb.onAnalysisError(msg.error, msg.requestId);
                            }
                            break;
                        case WORKER_MSG.DISPOSED:
                            worker = null;
                            state = 'idle';
                            break;
                    }
                };

                worker.onerror = (e) => {
                    if (state === 'loading' && cb.onModelsFailed) {
                        cb.onModelsFailed(e.message || 'Worker error');
                    }
                    state = 'failed';
                };

                worker.postMessage({ type: WORKER_MSG.INIT_MODELS });
            } catch (e) {
                state = 'failed';
                if (cb.onModelsFailed) cb.onModelsFailed(e.message);
            }
        },

        /**
         * Analyzes an image for saliency.
         * @param {ImageData|string} imageData - Image data as ImageData object or base64 string.
         *   Must be serializable for Web Worker postMessage.
         * @param {{width: number, height: number}} imageSize - Original image dimensions
         */
        analyzeImage(imageData, imageSize) {
            if (!worker) {
                // No worker available — return center fallback synchronously
                if (cb.onAnalysisComplete) {
                    cb.onAnalysisComplete({ x: 0.5, y: 0.5 }, 'center-fallback');
                }
                return;
            }

            if (state === 'loading') {
                // Queue the request to be processed when models are ready
                pendingQueue.push({ imageData, imageSize, onComplete: cb.onAnalysisComplete });
                return;
            }

            if (state === 'failed') {
                if (cb.onAnalysisComplete) {
                    cb.onAnalysisComplete({ x: 0.5, y: 0.5 }, 'center-fallback');
                }
                return;
            }

            pendingRequestId++;
            currentRequestId = pendingRequestId;
            worker.postMessage({
                type: WORKER_MSG.ANALYZE_IMAGE,
                requestId: currentRequestId,
                imageData: imageData,
                imageSize: imageSize
            });
        },

        cancel() {
            currentRequestId = 0; // Invalidate pending request
            pendingQueue = []; // Clear queued requests
        },

        dispose() {
            clearTimeout(loadingTimeoutId);
            loadingTimeoutId = null;

            if (worker) {
                try {
                    worker.postMessage({ type: WORKER_MSG.DISPOSE });
                } catch (_e) { /* Worker may already be terminated */ }
                try {
                    worker.terminate();
                } catch (_e) { /* Already terminated */ }
                worker = null;
            }
            state = 'idle';
            currentRequestId = 0;
            pendingQueue = [];
        },

        getState() {
            return state;
        }
    };
}
