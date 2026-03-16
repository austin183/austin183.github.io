import { expect } from 'chai';
import getCoordinateCalculator from './CoordinateCalculator.js';

describe('getCoordinateCalculator', function() {
    it('should return an object with calculation methods', function() {
        const calc = getCoordinateCalculator();
        expect(calc).to.be.an('object');
    });

    it('should have calculateNotePosition method', function() {
        const calc = getCoordinateCalculator();
        expect(calc.calculateNotePosition).to.be.a('function');
    });

    it('should have calculateDynamicPosition method', function() {
        const calc = getCoordinateCalculator();
        expect(calc.calculateDynamicPosition).to.be.a('function');
    });

    it('should have calculateNowLinePosition method', function() {
        const calc = getCoordinateCalculator();
        expect(calc.calculateNowLinePosition).to.be.a('function');
    });

    it('should have getNoteDimensions method', function() {
        const calc = getCoordinateCalculator();
        expect(calc.getNoteDimensions).to.be.a('function');
    });

    it('should have getConstants method', function() {
        const calc = getCoordinateCalculator();
        expect(calc.getConstants).to.be.a('function');
    });

    it('should calculate note position for column 0 at time 0', function() {
        const calc = getCoordinateCalculator();
        const position = calc.calculateNotePosition(0, 0);
        
        expect(position.x).to.be.closeTo(-5.4, 0.01);
        expect(position).to.have.property('y', 0);
        expect(position).to.have.property('z', 8);
    });

    it('should calculate note position with custom delay', function() {
        const calc = getCoordinateCalculator();
        const position = calc.calculateNotePosition(5, 0, 2);
        
        expect(position.y).to.equal(0);
        expect(position.z).to.equal(4);
    });

    it('should calculate now line position with default delay', function() {
        const calc = getCoordinateCalculator();
        const zPos = calc.calculateNowLinePosition();
        
        expect(zPos).to.equal(8);
    });

    it('should calculate now line position with custom delay', function() {
        const calc = getCoordinateCalculator();
        const zPos = calc.calculateNowLinePosition(3);
        
        expect(zPos).to.equal(6);
    });

    it('should get note dimensions', function() {
        const calc = getCoordinateCalculator();
        const dims = calc.getNoteDimensions();
        
        expect(dims).to.have.property('width', 0.84);
        expect(dims).to.have.property('height', 1.5);
        expect(dims).to.have.property('thickness', 0.2);
    });

    it('should get constants with grid configuration', function() {
        const calc = getCoordinateCalculator();
        const consts = calc.getConstants();
        
        expect(consts).to.have.property('GRID_WIDTH', 10);
        expect(consts).to.have.property('GRID_HEIGHT', 4);
        expect(consts).to.have.property('GRID_SPACING', 1.2);
    });

    it('should get constants with note dimensions configuration', function() {
        const calc = getCoordinateCalculator();
        const consts = calc.getConstants();
        
        expect(consts).to.have.property('NOTE_THICKNESS', 0.2);
        expect(consts).to.have.property('NOTE_WIDTH_SCALE', 0.7);
        expect(consts).to.have.property('NOTE_HEIGHT', 1.5);
    });

    it('should get constants with Z_SCALE and DEFAULT_DELAY', function() {
        const calc = getCoordinateCalculator();
        const consts = calc.getConstants();
        
        expect(consts).to.have.property('Z_SCALE', 2);
        expect(consts).to.have.property('DEFAULT_DELAY', 4);
    });

    it('should calculate dynamic position for moving notes', function() {
        const calc = getCoordinateCalculator();
        // calculateDynamicPosition(5, 3, 4) = (3 - 5 + 4) * 2 = 4
        const position = calc.calculateDynamicPosition(5, 3, 4);
        
        expect(position.x).to.equal(null);
        expect(position.y).to.equal(0);
        expect(position.z).to.closeTo(4, 0.01);
    });

    it('should have all columns span from left to right', function() {
        const calc = getCoordinateCalculator();
        
        const leftEdge = calc.calculateNotePosition(0, 0);
        const rightEdge = calc.calculateNotePosition(9, 0);
        
        expect(leftEdge.x).to.be.lessThan(rightEdge.x);
    });

    it('should have center columns around x=0', function() {
        const calc = getCoordinateCalculator();
        
        const center4 = calc.calculateNotePosition(4, 0);
        const center5 = calc.calculateNotePosition(5, 0);
        
        expect(center4.x).to.be.lessThan(0);
        expect(center5.x).to.be.greaterThan(0);
    });
});
