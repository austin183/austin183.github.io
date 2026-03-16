import { expect } from 'chai';
import getKeyNoteMaps from './keyNoteMaps.js';

describe('getKeyNoteMaps', function() {
    it('should return an object with key note map layouts', function() {
        const maps = getKeyNoteMaps();
        expect(maps).to.be.an('object');
    });

    it('should contain HorizontalZTo0 layout', function() {
        const maps = getKeyNoteMaps();
        expect(maps).to.have.property('HorizontalZTo0');
        expect(maps.HorizontalZTo0).to.be.an('object');
    });

    it('should contain VerticalZTo0 layout', function() {
        const maps = getKeyNoteMaps();
        expect(maps).to.have.property('VerticalZTo0');
    });

    it('should contain TypersSplitZToP layout', function() {
        const maps = getKeyNoteMaps();
        expect(maps).to.have.property('TypersSplitZToP');
    });

    it('should contain HorizontalZToP layout', function() {
        const maps = getKeyNoteMaps();
        expect(maps).to.have.property('HorizontalZToP');
    });

    it('should contain VerticalZToP layout', function() {
        const maps = getKeyNoteMaps();
        expect(maps).to.have.property('VerticalZToP');
    });

    it('should have HorizontalZTo0 with description and keyNoteMap', function() {
        const maps = getKeyNoteMaps();
        expect(maps.HorizontalZTo0).to.have.property('description');
        expect(maps.HorizontalZTo0).to.have.property('keyNoteMap');
    });

    it('should have HorizontalZTo0 keyNoteMap with z key mapping to D3', function() {
        const maps = getKeyNoteMaps();
        expect(maps.HorizontalZTo0.keyNoteMap).to.have.property('z', 'D3');
    });

    it('should have HorizontalZToP keyNoteMap with z key mapping to D2', function() {
        const maps = getKeyNoteMaps();
        expect(maps.HorizontalZToP.keyNoteMap).to.have.property('z', 'D2');
    });

    it('should have VerticalZToP keyNoteMap with z key mapping to D2', function() {
        const maps = getKeyNoteMaps();
        expect(maps.VerticalZToP.keyNoteMap).to.have.property('z', 'D2');
    });

    it('should have TypersSplitZToP keyNoteMap with z key mapping to D2', function() {
        const maps = getKeyNoteMaps();
        expect(maps.TypersSplitZToP.keyNoteMap).to.have.property('z', 'D2');
    });

    it('should have HorizontalZTo0 with 39 key mappings', function() {
        const maps = getKeyNoteMaps();
        expect(Object.keys(maps.HorizontalZTo0.keyNoteMap).length).to.equal(39);
    });

    it('should have HorizontalZToP with 29 key mappings', function() {
        const maps = getKeyNoteMaps();
        expect(Object.keys(maps.HorizontalZToP.keyNoteMap).length).to.equal(29);
    });

    it('should have VerticalZToP with 29 key mappings', function() {
        const maps = getKeyNoteMaps();
        expect(Object.keys(maps.VerticalZToP.keyNoteMap).length).to.equal(29);
    });

    it('should have TypersSplitZToP with 29 key mappings', function() {
        const maps = getKeyNoteMaps();
        expect(Object.keys(maps.TypersSplitZToP.keyNoteMap).length).to.equal(29);
    });

    it('should have VerticalZTo0 with 39 key mappings', function() {
        const maps = getKeyNoteMaps();
        expect(Object.keys(maps.VerticalZTo0.keyNoteMap).length).to.equal(39);
    });

    it('should have different key-to-note mappings between layouts', function() {
        const maps = getKeyNoteMaps();
        expect(maps.HorizontalZToP.keyNoteMap['a']).to.not.equal(maps.VerticalZToP.keyNoteMap['a']);
    });
});
