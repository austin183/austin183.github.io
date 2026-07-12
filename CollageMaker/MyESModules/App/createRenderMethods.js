/**
 * createRenderMethods — Render-related methods extracted from createCollageMethods.
 * Handles render scheduling, background/overlay state building,
 * and layout regeneration + render.
 *
 * Each method accepts an explicit `vm` parameter (Vue instance) —
 * no `this` dependency, enabling clean callback injection.
 */

export function createRenderMethods(base) {
    const canvasRenderer = () => base.getCanvasRenderer();
    const assembler = () => base.assembler;

    /**
     * Schedules a canvas render with the current state.
     * Uses on-demand rendering (no continuous loop) — only renders
     * when state changes, saving CPU/battery.
     * @param {Object} vm — Vue instance with reactive state
     */
    function _scheduleRender(vm) {
        const renderer = canvasRenderer();
        if (!renderer) return;

        renderer.scheduleRender(function (ctx, width, height) {
            if (!vm.images || vm.images.length === 0) return;

            const asm = assembler();
            if (!asm) return;

            const scaleX = width / 1920;
            const scaleY = height / 1080;

            ctx.save();
            ctx.scale(scaleX, scaleY);

            asm.render(ctx, {
                panels: vm.panels,
                images: vm.images,
                crops: vm.crops,
                panelAssignments: vm.panelAssignments,
                backgroundColor: vm.backgroundColor,
                canvasSize: {
                    width: 1920,
                    height: 1080
                },
                selectedPanelId: vm.selectedPanelId,
                hoveredPanelId: vm.hoveredPanelId,
                hexDragTargetId: vm.hexDragTargetId,
                backgroundState: _buildBackgroundState(vm),
                overlayState: _buildOverlayState(vm),
                titleStyle: vm.titleStyle,
                titleRuns: vm.titleRuns
            });

            ctx.restore();
        });
    }

    /**
     * Builds the background state object for the assembler.
     * @param {Object} vm — Vue instance with reactive state
     * @returns {Object} Background state descriptor
     */
    function _buildBackgroundState(vm) {
        return {
            type: vm.backgroundStyle,
            color1: vm.backgroundColor,
            color2: vm.gradientColors ? vm.gradientColors[1] || vm.backgroundColor : vm.backgroundColor,
            angle: vm.gradientAngle,
            image: vm.backgroundImage,
            opacity: vm.backgroundOpacity
        };
    }

    /**
     * Builds the overlay state object for the assembler.
     * @param {Object} vm — Vue instance with reactive state
     * @returns {Object} Overlay state descriptor
     */
    function _buildOverlayState(vm) {
        return {
            image: vm.overlayImage,
            mode: vm.overlayMode,
            opacity: vm.overlayOpacity
        };
    }

    /**
     * Regenerates layout and triggers a render.
     * @param {Object} vm — Vue instance with reactive state
     */
    function _regenerateAndRender(vm) {
        if (vm.layoutManager) {
            vm.layoutManager.regenerate();
        }
        _scheduleRender(vm);
    }

    return {
        _scheduleRender,
        _buildBackgroundState,
        _buildOverlayState,
        _regenerateAndRender
    };
}
