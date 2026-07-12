/**
 * MultiTouchHandler — Two-finger gestures on the main preview canvas.
 * Provides two-finger pan (move image within panel) and pinch-to-zoom
 * for the selected panel's crop.
 *
 * Supports three input paths:
 * - TouchEvent: for touchscreen devices (two-finger touch)
 * - WheelEvent: for trackpad gestures (macOS two-finger pan, pinch-to-zoom)
 *   The browser synthesizes trackpad gestures as wheel events (deltaY for pan,
 *   deltaZ for zoom), not as separate pointerdown events.
 * - PointerEvent: for multi-pointer input (e.g., stylus + touch hybrid devices)
 *   with a pointerType guard that delegates touch pointers to the TouchEvent path.
 *
 * Pure math functions are exported for unit testing without DOM dependencies.
 */

/**
 * Computes the midpoint between two touch points.
 * @param {Object} t1 - Touch-like object with clientX, clientY
 * @param {Object} t2 - Touch-like object with clientX, clientY
 * @returns {{ x: number, y: number }}
 */
export function computeTouchMidpoint(t1, t2) {
    return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
    };
}

/**
 * Computes the Euclidean distance between two touch points.
 * @param {Object} t1
 * @param {Object} t2
 * @returns {number}
 */
export function computeTouchDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes a pinch scale factor from initial and current touch distances.
 * Returns 1.0 when distances are equal. Guards against zero initial distance.
 * @param {number} initialDistance
 * @param {number} currentDistance
 * @returns {number} Scale factor (>= 0, never NaN)
 */
export function computePinchScale(initialDistance, currentDistance) {
    if (initialDistance <= 0) return 1.0;
    const ratio = currentDistance / initialDistance;
    return Math.max(0.01, ratio);
}

/**
 * Creates a multi-touch gesture handler for the main preview canvas.
 *
 * @param {Object} options
 * @param {string} options.canvasId - DOM ID of the main preview canvas
 * @param {Object} options.cropManager - CropManager instance with adjustCrop/zoomCrop
 * @param {Object} options.state - Reactive state with selectedPanelId
 * @param {Function} options.onCropPreviewRender - Call to re-render crop preview
 * @param {Function} options.onRenderScheduled - Call to re-render main canvas
 * @returns {Object} MultiTouchHandler with attach() and detach()
 */
export function createMultiTouchHandler({ canvasId, cropManager, state, onCropPreviewRender, onRenderScheduled }) {
    let canvas = null;
    let handlerAttached = false;

    // Shared gesture state (used by both TouchEvent and PointerEvent paths)
    let gestureActive = false;
    let initialMidpoint = null;
    let initialDistance = 0;

    // TouchEvent-specific state
    let activeTouchIds = null; // Set of touch identifiers we're tracking

    // PointerEvent-specific state
    let activePointers = new Map(); // pointerId -> { clientX, clientY }
    let pointerGestureActive = false;

    // Wheel event sensitivity (CSS pixels per wheel delta unit)
    const WHEEL_PAN_SENSITIVITY = 2;
    const WHEEL_ZOOM_SENSITIVITY = 0.005;

    // Global event handler references (for cleanup in detach)
    let handleWindowBlur, handleVisibilityChange;

    // Placeholder for bound handlers
    let onTouchStart, onTouchMove, onTouchEnd;
    let onPointerDown, onPointerMove, onPointerUp, onPointerCancel;
    let onWheel;

    /**
     * Finds two touch objects by identifier from a TouchList.
     * @param {TouchList} touches
     * @param {number} id1
     * @param {number} id2
     * @returns {[Object, Object]|null}
     */
    function findTwoTouches(touches, id1, id2) {
        let t1 = null, t2 = null;
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            if (t.identifier === id1) t1 = t;
            else if (t.identifier === id2) t2 = t;
        }
        return (t1 && t2) ? [t1, t2] : null;
    }

    /**
     * Estimates the scale factor from canvas CSS pixels to source image pixels.
     * Uses canvas dimensions and image aspect ratio as an approximation.
     * @param {string} panelId
     * @returns {number}
     */
    function estimateImageScale(panelId) {
        const imageItem = cropManager.getPanelImage(panelId);
        if (!imageItem) return 1;

        const canvasW = canvas ? canvas.getBoundingClientRect().width : 1920;
        const canvasH = canvas ? canvas.getBoundingClientRect().height : 1080;
        const imageAspect = imageItem.width / imageItem.height;
        const canvasAspect = canvasW / canvasH;

        // How the image would be scaled to fill a panel-sized area (contain mode)
        let drawW, drawH;
        if (imageAspect > canvasAspect) {
            drawW = canvasW;
            drawH = canvasW / imageAspect;
        } else {
            drawH = canvasH;
            drawW = canvasH * imageAspect;
        }

        // Scale from canvas CSS pixels to image pixels
        return imageItem.width / drawW;
    }

    // =====================================================
    // Shared gesture functions (used by both input paths)
    // =====================================================

    function startGesture(t1, t2) {
        const panelId = state.selectedPanelId;
        if (!panelId) return false;

        gestureActive = true;
        initialMidpoint = computeTouchMidpoint(t1, t2);
        initialDistance = computeTouchDistance(t1, t2);
        return true;
    }

    function processGesture(t1, t2) {
        if (!gestureActive) return;

        const panelId = state.selectedPanelId;
        if (!panelId) return;

        // Compute current midpoint and distance
        const currentMidpoint = computeTouchMidpoint(t1, t2);
        const currentDistance = computeTouchDistance(t1, t2);

        let needsRender = false;

        // --- Pan: midpoint delta converted to image pixels ---
        const dx = currentMidpoint.x - initialMidpoint.x;
        const dy = currentMidpoint.y - initialMidpoint.y;
        const moveThreshold = 2; // CSS pixels before we consider it a move

        if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) {
            const imageScale = estimateImageScale(panelId);
            cropManager.adjustCrop(panelId, {
                x: dx * imageScale,
                y: dy * imageScale
            });
            needsRender = true;
            // Reset initial midpoint to current to avoid accumulating deltas
            initialMidpoint = currentMidpoint;
        }

        // --- Zoom: pinch scale factor ---
        const scaleRatio = computePinchScale(initialDistance, currentDistance);
        // Use a root to convert the total ratio into a small incremental factor
        // e.g., ratio 1.5 -> factor 1.5^0.15 ≈ 1.06 (small zoom step)
        const zoomThreshold = 1.02;
        if (scaleRatio > zoomThreshold || scaleRatio < 1 / zoomThreshold) {
            const factor = Math.pow(scaleRatio, 0.15);
            cropManager.zoomCrop(panelId, factor);
            needsRender = true;
            // Reset initial distance to current to avoid accumulating scale
            initialDistance = currentDistance;
        }

        // Consolidate render calls to avoid double rendering
        if (needsRender) {
            onCropPreviewRender();
        }
    }

    function endGesture() {
        gestureActive = false;
        activeTouchIds = null;
        initialMidpoint = null;
        initialDistance = 0;
        onRenderScheduled();
    }

    // =====================================================
    // TouchEvent handlers
    // =====================================================

    function _onTouchStart(e) {
        // Only activate for exactly 2 touches — 3+ fingers may trigger OS gestures
        if (e.touches.length !== 2) return;

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        if (startGesture(t1, t2)) {
            e.preventDefault();
            activeTouchIds = new Set([t1.identifier, t2.identifier]);
        }
    }

    function _onTouchMove(e) {
        if (!gestureActive) return;

        // Cancel gesture if touch count deviates from 2 (3+ fingers or 1 remaining)
        if (e.touches.length !== 2) {
            gestureActive = false;
            activeTouchIds = null;
            initialMidpoint = null;
            initialDistance = 0;
            return;
        }

        e.preventDefault();

        // Find the two touches we're tracking
        const touches = findTwoTouches(e.touches, ...activeTouchIds) || [e.touches[0], e.touches[1]];
        processGesture(touches[0], touches[1]);
    }

    function _onTouchEnd(e) {
        if (!gestureActive) return;

        // If fewer than 2 touches remain, end the gesture
        if (e.touches.length < 2) {
            endGesture();
        }
    }

    // =====================================================
    // PointerEvent handlers (trackpad gestures)
    // =====================================================

    function _onPointerDown(e) {
        // Skip touch pointers — delegate to TouchEvent path
        if (e.pointerType === 'touch') return;

        activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

        if (activePointers.size === 2) {
            const pointers = [...activePointers.values()];
            if (!startGesture(pointers[0], pointers[1])) {
                // No selected panel — clean up, do not intercept
                activePointers.clear();
                return;
            }
            e.preventDefault();
            pointerGestureActive = true;
            if (canvas && canvas.setPointerCapture) {
                try {
                    // Only capture the current pointer — setPointerCapture only works
                    // for the pointer that fired the current event
                    canvas.setPointerCapture(e.pointerId);
                } catch (_) { /* not all browsers support */ }
            }
        }
    }

    function _onPointerMove(e) {
        // Skip touch pointers
        if (e.pointerType === 'touch') return;
        if (!pointerGestureActive) return;

        e.preventDefault();
        activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

        if (activePointers.size >= 2) {
            const pointers = [...activePointers.values()].slice(0, 2);
            processGesture(pointers[0], pointers[1]);
        }
    }

    function _onPointerUp(e) {
        if (e.pointerType === 'touch') return;

        activePointers.delete(e.pointerId);

        if (activePointers.size < 2) {
            if (gestureActive) {
                endGesture();
            }
            pointerGestureActive = false;
            activePointers.clear();
        }
    }

    function _onPointerCancel(e) {
        if (e.pointerType === 'touch') return;

        if (gestureActive) {
            endGesture();
        }
        pointerGestureActive = false;
        activePointers.clear();
    }

    // =====================================================
    // WheelEvent handler (macOS trackpad two-finger pan + pinch)
    // =====================================================

    function _onWheel(e) {
        const panelId = state.selectedPanelId;
        if (!panelId) return;

        e.preventDefault();

        const imageScale = estimateImageScale(panelId);
        let needsRender = false;

        // --- Pan: two-finger drag produces deltaY/deltaX ---
        if (e.deltaY !== 0 || e.deltaX !== 0) {
            cropManager.adjustCrop(panelId, {
                x: e.deltaX * WHEEL_PAN_SENSITIVITY * imageScale,
                y: e.deltaY * WHEEL_PAN_SENSITIVITY * imageScale
            });
            needsRender = true;
        }

        // --- Zoom: pinch-to-zoom produces deltaZ (macOS) or ctrlKey + deltaY ---
        let zoomDelta = 0;
        if (e.deltaZ !== 0) {
            // macOS pinch-to-zoom fires deltaZ
            zoomDelta = e.deltaZ;
        } else if (e.ctrlKey && e.deltaY !== 0) {
            // Some platforms use ctrlKey + deltaY for pinch
            zoomDelta = e.deltaY;
        }

        if (zoomDelta !== 0) {
            // Negative deltaZ = pinch open (zoom in), positive = pinch close (zoom out)
            const factor = Math.exp(-zoomDelta * WHEEL_ZOOM_SENSITIVITY);
            cropManager.zoomCrop(panelId, factor);
            needsRender = true;
        }

        if (needsRender) {
            onCropPreviewRender();
        }
    }

    const handler = {
        attach() {
            if (handlerAttached) return;
            handlerAttached = true;

            canvas = document.getElementById(canvasId);
            if (!canvas) return;

            // TouchEvent listeners
            canvas.addEventListener('touchstart', onTouchStart, { passive: false });
            canvas.addEventListener('touchmove', onTouchMove, { passive: false });
            canvas.addEventListener('touchend', onTouchEnd, { passive: false });
            canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

            // PointerEvent listeners
            canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
            canvas.addEventListener('pointermove', onPointerMove, { passive: false });
            canvas.addEventListener('pointerup', onPointerUp);
            canvas.addEventListener('pointercancel', onPointerCancel);

            // WheelEvent listener (macOS trackpad two-finger pan + pinch-to-zoom)
            canvas.addEventListener('wheel', onWheel, { passive: false });

            // Global safety net: clear gesture state on tab switch / window blur
            handleWindowBlur = () => {
                if (gestureActive || pointerGestureActive) {
                    endGesture();
                    pointerGestureActive = false;
                    activePointers.clear();
                }
            };
            handleVisibilityChange = () => {
                if (document.hidden) {
                    handleWindowBlur();
                }
            };
            window.addEventListener('blur', handleWindowBlur);
            document.addEventListener('visibilitychange', handleVisibilityChange);
        },

        detach() {
            if (!handlerAttached) return;
            handlerAttached = false;
            gestureActive = false;
            pointerGestureActive = false;
            activeTouchIds = null;
            activePointers.clear();

            if (canvas) {
                canvas.removeEventListener('touchstart', onTouchStart, { passive: false });
                canvas.removeEventListener('touchmove', onTouchMove, { passive: false });
                canvas.removeEventListener('touchend', onTouchEnd, { passive: false });
                canvas.removeEventListener('touchcancel', onTouchEnd, { passive: false });

                canvas.removeEventListener('pointerdown', onPointerDown, { passive: false });
                canvas.removeEventListener('pointermove', onPointerMove, { passive: false });
                canvas.removeEventListener('pointerup', onPointerUp);
                canvas.removeEventListener('pointercancel', onPointerCancel);
                canvas.removeEventListener('wheel', onWheel, { passive: false });
            }

            // Remove global safety net listeners
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        },

        // Expose private handlers for testing
        _onTouchStart,
        _onTouchMove,
        _onTouchEnd,
        _onPointerDown,
        _onPointerMove,
        _onPointerUp,
        _onPointerCancel,
        _onWheel
    };

    // Bind event handlers now that handler object exists
    onTouchStart = (e) => handler._onTouchStart(e);
    onTouchMove = (e) => handler._onTouchMove(e);
    onTouchEnd = (e) => handler._onTouchEnd(e);
    onPointerDown = (e) => handler._onPointerDown(e);
    onPointerMove = (e) => handler._onPointerMove(e);
    onPointerUp = (e) => handler._onPointerUp(e);
    onPointerCancel = (e) => handler._onPointerCancel(e);
    onWheel = (e) => handler._onWheel(e);

    return handler;
}
