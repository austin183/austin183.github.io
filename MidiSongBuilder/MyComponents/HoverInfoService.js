/**
 * HoverInfoService - Handles raycasting and hover info calculations
 *
 * This service is responsible for:
 * - Raycasting against scene objects (notes, now line)
 * - Converting world coordinates to screen coordinates
 * - Calculating grid column from world X position
 * - Calculating note time from world Z position
 * - Extracting note metadata from object userData
 */
function getHoverInfoService() {
    // Reuse constants from CoordinateCalculator
    var CONSTANTS = null;

    // Raycaster and mouse vector
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();

    /**
     * Set the constants for coordinate calculations
     * @param {Object} constants - The CONSTANTS object from CoordinateCalculator
     */
    function setConstants(constants) {
        CONSTANTS = constants;
    }

    /**
     * Get the current constants
     * @returns {Object} The CONSTANTS object
     */
    function getConstants() {
        return CONSTANTS;
    }

    /**
     * Main entry point - returns hover info object
     * @param {MouseEvent} mouseEvent - The mouse move event
     * @param {HTMLElement} canvas - The canvas element
     * @param {THREE.Camera} camera - The camera
     * @param {THREE.Group} noteGroup - The group containing note meshes
     * @param {THREE.Mesh} nowLine - The now line mesh
     * @returns {Object} Hover info object with data about what's being hovered
     */
    function getHoverInfo(mouseEvent, canvas, camera, noteGroup, nowLine) {
        // Calculate mouse position in normalized device coordinates
        var rect = canvas.getBoundingClientRect();
        mouse.x = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast from camera through mouse
        raycaster.setFromCamera(mouse, camera);

        // Get all note meshes from noteGroup
        var intersectedObjects = [];
        if (noteGroup && noteGroup.children && noteGroup.children.length > 0) {
            intersectedObjects = raycaster.intersectObjects(noteGroup.children, true);
        }

        // Also check now line
        var nowLineHit = null;
        if (nowLine) {
            var nowLineIntersects = raycaster.intersectObject(nowLine);
            if (nowLineIntersects.length > 0) {
                intersectedObjects.push(nowLineIntersects[0]);
                nowLineHit = nowLineIntersects[0];
            }
        }

        // Check if the first hit is the nowLine (use type identifier instead of reference - Issue #3)
        if (intersectedObjects.length > 0 && intersectedObjects[0].object.userData && intersectedObjects[0].object.userData.type === 'nowLine') {
            // Calculate world position from raycaster intersection point
            var worldPos = intersectedObjects[0].point.clone();

            // Calculate screen position
            var screenPos = worldPos.clone();
            screenPos.project(camera);
            var rect = canvas.getBoundingClientRect();
            var screenX = (screenPos.x * 0.5 + 0.5) * rect.width;
            var screenY = (screenPos.y * -0.5 + 0.5) * rect.height;

            // Calculate grid column and time from world position
            var gridColumn = calculateGridColumn(worldPos.x, CONSTANTS);
            var noteTime = calculateNoteTime(worldPos.z, CONSTANTS);

            return {
                type: 'nowLine',
                isNote: false,
                object: nowLine,
                worldPosition: worldPos,
                screenPosition: { x: screenX, y: screenY },
                gridColumn: gridColumn,
                noteTime: noteTime
            };
        }

        // Check if hit is on a note (has letter in userData chain)
        var hitNote = null;
        var checkObj = intersectedObjects.length > 0 ? intersectedObjects[0].object : null;
        while (checkObj) {
            if (checkObj.userData && checkObj.userData.letter) {
                hitNote = checkObj;
                break;
            }
            checkObj = checkObj.parent;
        }

        if (!hitNote) {
            return {
                type: 'none',
                isNote: false,
                object: null
            };
        }

        // Verify this object is under noteGroup
        var isUnderNoteGroup = false;
        var checkParent = hitNote.parent;
        while (checkParent) {
            if (checkParent === noteGroup) {
                isUnderNoteGroup = true;
                break;
            }
            checkParent = checkParent.parent;
        }

        if (!isUnderNoteGroup) {
            return {
                type: 'none',
                isNote: false,
                object: null
            };
        }

        // Extract note data from the hit
        var noteData = extractNoteData(hitNote, noteGroup);

        // Calculate world position
        var worldPos = new THREE.Vector3();
        hitNote.getWorldPosition(worldPos);

        // Calculate screen position
        var screenPos = worldPos.clone();
        screenPos.project(camera);
        var screenX = (screenPos.x * 0.5 + 0.5) * rect.width;
        var screenY = (screenPos.y * -0.5 + 0.5) * rect.height;

        // Calculate grid column and time from world position
        var gridColumn = calculateGridColumn(worldPos.x, CONSTANTS);
        var noteTime = calculateNoteTime(worldPos.z, CONSTANTS);

        return {
            type: 'note',
            isNote: true,
            object: hitNote,
            worldPosition: worldPos,
            screenPosition: { x: screenX, y: screenY },
            gridColumn: gridColumn,
            noteTime: noteTime,
            noteData: noteData
        };
    }

    /**
     * Convert world position to screen coordinates
     * @param {THREE.Vector3} worldPos - World position vector
     * @param {THREE.Camera} camera - The camera
     * @param {Object} rect - Canvas bounding rectangle
     * @returns {Object} Screen coordinates {x, y}
     */
    function worldToScreen(worldPos, camera, rect) {
        var screenPos = worldPos.clone();
        screenPos.project(camera);
        var screenX = (screenPos.x * 0.5 + 0.5) * rect.width;
        var screenY = (screenPos.y * -0.5 + 0.5) * rect.height;
        return { x: screenX, y: screenY };
    }

    /**
     * Calculate grid column from world X position
     * @param {number} worldX - World X coordinate
     * @param {Object} constants - CONSTANTS object with GRID_SPACING and GRID_WIDTH
     * @returns {number} Grid column index
     */
    function calculateGridColumn(worldX, constants) {
        if (!constants) return null;
        var gridSpacing = constants.GRID_SPACING || 1.2;
        var gridWidth = constants.GRID_WIDTH || 10;
        var halfGridWidth = gridWidth * gridSpacing / 2;
        return Math.floor((worldX + halfGridWidth) / gridSpacing);
    }

    /**
     * Calculate note time from world Z position
     * @param {number} worldZ - World Z coordinate
     * @param {Object} constants - CONSTANTS object with DEFAULT_DELAY and Z_SCALE
     * @returns {number} Note time in seconds
     */
    function calculateNoteTime(worldZ, constants) {
        if (!constants) return null;
        var delay = constants.DEFAULT_DELAY || 4;
        var zScale = constants.Z_SCALE || 2;
        return delay - worldZ / zScale;
    }

    /**
     * Extract note data from intersected object
     * @param {THREE.Object3D} intersectedObject - The intersected object
     * @param {THREE.Group} noteGroup - The note group
     * @returns {Object} Note data {letter, row, column, time}
     */
    function extractNoteData(intersectedObject, noteGroup) {
        var target = intersectedObject;
        var depth = 0;

        // Traverse up the parent chain to find note data
        while (target && depth < 10) {
            if (target.userData && target.userData.letter) {
                break;
            }
            target = target.parent;
            depth++;
        }

        if (!target || !target.userData) {
            return { letter: '-', row: '-', column: '-', time: '-' };
        }

        return {
            letter: target.userData.letter || '-',
            row: target.userData.row !== undefined ? target.userData.row : '-',
            column: target.userData.column !== undefined ? target.userData.column : '-',
            time: target.userData.time !== undefined ? target.userData.time.toFixed(2) + 's' : '-'
        };
    }

    return {
        setConstants: setConstants,
        getConstants: getConstants,
        getHoverInfo: getHoverInfo,
        worldToScreen: worldToScreen,
        calculateGridColumn: calculateGridColumn,
        calculateNoteTime: calculateNoteTime,
        extractNoteData: extractNoteData
    };
}
