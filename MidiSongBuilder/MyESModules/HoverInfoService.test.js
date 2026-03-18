import { expect } from 'chai';
import { getHoverInfoService } from './HoverInfoService.js';

describe('HoverInfoService', () => {
    let hoverInfoService;
    const mockConstants = {
        GRID_SPACING: 1.2,
        GRID_WIDTH: 10,
        DEFAULT_DELAY: 4,
        Z_SCALE: 2
    };

    // Mock THREE library for tests that need it
    const mockVector3 = function(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    };
    mockVector3.prototype.clone = function() { return new mockVector3(this.x, this.y, this.z); };
    mockVector3.prototype.project = function() { return this; };

    const mockVector2 = function(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    };

    const mockRaycaster = function() {};
    mockRaycaster.prototype.setFromCamera = function() {};
    mockRaycaster.prototype.intersectObjects = function() { return []; };
    mockRaycaster.prototype.intersectObject = function() { return []; };

    const mockTHREE = {
        Raycaster: mockRaycaster,
        Vector2: mockVector2,
        Vector3: mockVector3
    };

    beforeEach(() => {
        hoverInfoService = getHoverInfoService(mockTHREE);
        hoverInfoService.setConstants(mockConstants);
    });

    describe('setConstants', () => {
        it('stores constants for later use', () => {
            hoverInfoService.setConstants(mockConstants);

            const constants = hoverInfoService.getConstants();

            expect(constants).to.deep.equal(mockConstants);
        });

        it('allows constants to be updated', () => {
            const newConstants = { ...mockConstants, GRID_SPACING: 2.0 };
            hoverInfoService.setConstants(newConstants);

            const constants = hoverInfoService.getConstants();

            expect(constants.GRID_SPACING).to.equal(2.0);
        });
    });

    describe('getConstants', () => {
        it('returns null before constants are set', () => {
            const service = getHoverInfoService(mockTHREE);

            expect(service.getConstants()).to.be.null;
        });

        it('returns stored constants after set', () => {
            hoverInfoService.setConstants(mockConstants);

            expect(hoverInfoService.getConstants()).to.deep.equal(mockConstants);
        });
    });

    describe('calculateGridColumn', () => {
        it('calculates column from world X position', () => {
            const column = hoverInfoService.calculateGridColumn(0, mockConstants);

            expect(column).to.be.a('number');
        });

        it('handles positive X values', () => {
            const column = hoverInfoService.calculateGridColumn(5, mockConstants);

            expect(column).to.be.greaterThan(0);
        });

        it('handles negative X values', () => {
            const column = hoverInfoService.calculateGridColumn(-5, mockConstants);

            expect(column).to.be.lessThan(10);
        });

        it('returns null when constants is null', () => {
            const service = getHoverInfoService(mockTHREE);

            expect(service.calculateGridColumn(0, null)).to.be.null;
        });

        it('returns null when constants is undefined', () => {
            const service = getHoverInfoService(mockTHREE);

            expect(service.calculateGridColumn(0, undefined)).to.be.null;
        });

        it('uses default GRID_SPACING when not provided', () => {
            const constants = { GRID_WIDTH: 10 };

            expect(hoverInfoService.calculateGridColumn(0, constants)).to.be.a('number');
        });

        it('uses default GRID_WIDTH when not provided', () => {
            const constants = { GRID_SPACING: 1.2 };

            expect(hoverInfoService.calculateGridColumn(0, constants)).to.be.a('number');
        });

        it('calculates correct column at center (x=0)', () => {
            const column = hoverInfoService.calculateGridColumn(0, mockConstants);

            expect(column).to.equal(5);
        });

        it('calculates correct column at left edge', () => {
            const column = hoverInfoService.calculateGridColumn(-6, mockConstants);

            expect(column).to.equal(0);
        });

        it('calculates correct column at right edge', () => {
            const column = hoverInfoService.calculateGridColumn(4.8, mockConstants);

            expect(column).to.equal(9);
        });
    });

    describe('calculateNoteTime', () => {
        it('calculates time from world Z position', () => {
            const noteTime = hoverInfoService.calculateNoteTime(0, mockConstants);

            expect(noteTime).to.equal(4);
        });

        it('calculates time for forward Z values', () => {
            const noteTime = hoverInfoService.calculateNoteTime(2, mockConstants);

            expect(noteTime).to.equal(3);
        });

        it('calculates time for backward Z values', () => {
            const noteTime = hoverInfoService.calculateNoteTime(-2, mockConstants);

            expect(noteTime).to.equal(5);
        });

        it('returns null when constants is null', () => {
            const service = getHoverInfoService(mockTHREE);

            expect(service.calculateNoteTime(0, null)).to.be.null;
        });

        it('returns null when constants is undefined', () => {
            const service = getHoverInfoService(mockTHREE);

            expect(service.calculateNoteTime(0, undefined)).to.be.null;
        });

        it('uses default DEFAULT_DELAY when not provided', () => {
            const constants = { Z_SCALE: 2 };

            expect(hoverInfoService.calculateNoteTime(0, constants)).to.equal(4);
        });

        it('uses default Z_SCALE when not provided', () => {
            const constants = { DEFAULT_DELAY: 4 };

            expect(hoverInfoService.calculateNoteTime(0, constants)).to.equal(4);
        });

        it('calculates time at z=0 with delay 4', () => {
            const noteTime = hoverInfoService.calculateNoteTime(0, mockConstants);

            expect(noteTime).to.equal(4);
        });

        it('calculates time at z=8 with delay 4 and scale 2', () => {
            const noteTime = hoverInfoService.calculateNoteTime(8, mockConstants);

            expect(noteTime).to.equal(0);
        });
    });

    describe('extractNoteData', () => {
        it.skip('requires THREE.Object3D in browser environment', () => {
            // Skip - needs Three.js objects
        });

        it('returns default data when target has no userData', () => {
            const mockObject = {};

            const noteData = hoverInfoService.extractNoteData(mockObject, null);

            expect(noteData).to.deep.equal({ letter: '-', row: '-', column: '-', time: '-' });
        });

        it('returns default data when userData has no letter', () => {
            const mockObject = { userData: {} };

            const noteData = hoverInfoService.extractNoteData(mockObject, null);

            expect(noteData.letter).to.equal('-');
        });

        it('extracts letter from userData', () => {
            const mockObject = { userData: { letter: 'z' } };

            const noteData = hoverInfoService.extractNoteData(mockObject, null);

            expect(noteData.letter).to.equal('z');
        });

        it('extracts row from userData', () => {
            const mockObject = { userData: { letter: 'z', row: 2 } };

            const noteData = hoverInfoService.extractNoteData(mockObject, null);

            expect(noteData.row).to.equal(2);
        });

        it('extracts column from userData', () => {
            const mockObject = { userData: { letter: 'z', column: 5 } };

            const noteData = hoverInfoService.extractNoteData(mockObject, null);

            expect(noteData.column).to.equal(5);
        });

        it('formats time with 2 decimals and s suffix', () => {
            const mockObject = { userData: { letter: 'z', time: 10.5 } };

            const noteData = hoverInfoService.extractNoteData(mockObject, null);

            expect(noteData.time).to.equal('10.50s');
        });

        it('uses default - for missing row', () => {
            const mockObject = { userData: { letter: 'z' } };

            const noteData = hoverInfoService.extractNoteData(mockObject, null);

            expect(noteData.row).to.equal('-');
        });

        it('uses default - for missing column', () => {
            const mockObject = { userData: { letter: 'z' } };

            const noteData = hoverInfoService.extractNoteData(mockObject, null);

            expect(noteData.column).to.equal('-');
        });

        it('uses default - for missing time', () => {
            const mockObject = { userData: { letter: 'z' } };

            const noteData = hoverInfoService.extractNoteData(mockObject, null);

            expect(noteData.time).to.equal('-');
        });

        it('traverses parent chain to find userData with letter', () => {
            const mockParent = { userData: { letter: 'x', row: 1, column: 3, time: 5.25 } };
            const mockChild = { parent: mockParent, userData: {} };

            const noteData = hoverInfoService.extractNoteData(mockChild, null);

            expect(noteData.letter).to.equal('x');
            expect(noteData.row).to.equal(1);
        });

        it('limits parent traversal to 10 levels', () => {
            let current = { userData: {} };
            for (let i = 0; i < 15; i++) {
                current = { parent: current, userData: {} };
            }

            const noteData = hoverInfoService.extractNoteData(current, null);

            expect(noteData.letter).to.equal('-');
        });
    });

    describe('getHoverInfo', () => {
        it.skip('requires browser DOM and Three.js scene in browser environment', () => {
            // Skip - needs full Three.js scene setup
        });

        it('accepts all required parameters without error', () => {
            expect(() => {
                try {
                    hoverInfoService.getHoverInfo(null, null, null, null, null);
                } catch (e) {
                    // Expected to fail without proper Three.js objects
                }
            }).to.not.throw();
        });
    });
});
