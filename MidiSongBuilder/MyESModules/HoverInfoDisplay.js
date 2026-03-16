import { Vector3 } from './mocks/Three.js';

export function getHoverInfoDisplay() {
    var hoverInfoElement = null;
    var hoverInfoObject = null;
    var hoverInfoWorldPos = null;
    var hoverInfoScreenPos = null;
    var hoverInfoColumn = null;
    var hoverInfoRow = null;
    var hoverInfoTime = null;

    /**
     * Initialize the hover info display elements
     * @param {string} hoverInfoElementId - The ID of the hover info container element
     */
    function init(hoverInfoElementId) {
        hoverInfoElement = document.getElementById(hoverInfoElementId);
        if (hoverInfoElement) {
            hoverInfoObject = document.getElementById('hoverInfoObject');
            hoverInfoWorldPos = document.getElementById('hoverInfoWorldPos');
            hoverInfoScreenPos = document.getElementById('hoverInfoScreenPos');
            hoverInfoColumn = document.getElementById('hoverInfoColumn');
            hoverInfoRow = document.getElementById('hoverInfoRow');
            hoverInfoTime = document.getElementById('hoverInfoTime');
        }
    }

    /**
     * Update the display with hover data
     * @param {Object} hoverData - Hover info data from HoverInfoService
     */
    function update(hoverData) {
        if (!hoverInfoElement || !hoverInfoObject) return;

        if (!hoverData || hoverData.type === 'none') {
            clear();
            return;
        }

        if (hoverData.type === 'nowLine') {
            updateNowLineDisplay(hoverData);
            return;
        }

        if (hoverData.type === 'note' && hoverData.isNote) {
            updateNoteDisplay(hoverData);
            return;
        }

        // Default fallback
        clear();
    }

    /**
     * Update display for a note hit
     * @param {Object} hoverData - Hover data with note info
     */
    function updateNoteDisplay(hoverData) {
        if (!hoverInfoElement || !hoverInfoObject) return;

        hoverInfoElement.style.display = 'block';

        var noteData = hoverData.noteData || {};
        var worldPos = hoverData.worldPosition || new Vector3();
        var screenPos = hoverData.screenPosition || { x: 0, y: 0 };

        hoverInfoObject.textContent = 'Note (' + noteData.letter + ')';
        hoverInfoWorldPos.textContent =
            '(' + worldPos.x.toFixed(2) + ', ' + worldPos.y.toFixed(2) + ', ' + worldPos.z.toFixed(2) + ')';
        hoverInfoScreenPos.textContent =
            '(' + Math.round(screenPos.x) + ', ' + Math.round(screenPos.y) + ')';
        hoverInfoColumn.textContent = noteData.column !== undefined ? noteData.column : '-';
        hoverInfoRow.textContent = noteData.row !== undefined ? noteData.row : '-';
        hoverInfoTime.textContent = noteData.time !== undefined ? noteData.time : '-';
    }

    /**
     * Update display for now line hit
     * @param {Object} hoverData - Hover data with now line info
     */
    function updateNowLineDisplay(hoverData) {
        if (!hoverInfoElement || !hoverInfoObject) return;

        hoverInfoElement.style.display = 'block';
        hoverInfoObject.textContent = 'Now Line';

        var worldPos = hoverData.worldPosition || new Vector3();
        var screenPos = hoverData.screenPosition || { x: 0, y: 0 };

        hoverInfoWorldPos.textContent =
            '(' + worldPos.x.toFixed(2) + ', ' + worldPos.y.toFixed(2) + ', ' + worldPos.z.toFixed(2) + ')';
        hoverInfoScreenPos.textContent =
            '(' + Math.round(screenPos.x) + ', ' + Math.round(screenPos.y) + ')';
        hoverInfoColumn.textContent = hoverData.gridColumn !== undefined ? hoverData.gridColumn : '-';
        hoverInfoRow.textContent = '-';  // Now line spans all rows
        hoverInfoTime.textContent = hoverData.noteTime !== undefined ? hoverData.noteTime.toFixed(2) + 's' : '-';
    }

    /**
     * Clear the hover info display (show N/A values)
     */
    function clear() {
        if (!hoverInfoElement || !hoverInfoObject) return;

        hoverInfoElement.style.display = 'block';
        hoverInfoObject.textContent = 'N/A';
        hoverInfoWorldPos.textContent = 'N/A';
        hoverInfoScreenPos.textContent = 'N/A';
        hoverInfoColumn.textContent = 'N/A';
        hoverInfoRow.textContent = 'N/A';
        hoverInfoTime.textContent = 'N/A';
    }

    /**
     * Show the hover info panel
     */
    function show() {
        if (hoverInfoElement) {
            hoverInfoElement.style.display = 'block';
        }
    }

    /**
     * Hide the hover info panel
     */
    function hide() {
        if (hoverInfoElement) {
            hoverInfoElement.style.display = 'none';
        }
    }

    /**
     * Check if the display is initialized
     * @returns {boolean}
     */
    function isInitialized() {
        return hoverInfoElement !== null;
    }

    return {
        init: init,
        update: update,
        clear: clear,
        show: show,
        hide: hide,
        isInitialized: isInitialized
    };
}
