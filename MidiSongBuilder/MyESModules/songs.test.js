import { expect } from 'chai';
import getSongs from './songs.js';

describe('getSongs', function() {
    it('should return an object with song data', function() {
        const songs = getSongs();
        expect(songs).to.be.an('object');
    });

    it('should contain NationalAnthem song', function() {
        const songs = getSongs();
        expect(songs).to.have.property('NationalAnthem');
        expect(songs.NationalAnthem).to.be.an('array');
    });

    it('should contain AmazingGrace song', function() {
        const songs = getSongs();
        expect(songs).to.have.property('AmazingGrace');
        expect(songs.AmazingGrace).to.be.an('array');
    });

    it('should contain MarioBrosTheme song', function() {
        const songs = getSongs();
        expect(songs).to.have.property('MarioBrosTheme');
        expect(songs.MarioBrosTheme).to.be.an('array');
    });

    it('should have NationalAnthem with notes containing note property', function() {
        const songs = getSongs();
        expect(songs.NationalAnthem.length).to.be.greaterThan(0);
        songs.NationalAnthem.forEach(note => {
            expect(note).to.have.property('note');
        });
    });

    it('should have AmazingGrace with notes containing note property', function() {
        const songs = getSongs();
        expect(songs.AmazingGrace.length).to.be.greaterThan(0);
        songs.AmazingGrace.forEach(note => {
            expect(note).to.have.property('note');
        });
    });

    it('should have MarioBrosTheme with notes containing note property', function() {
        const songs = getSongs();
        expect(songs.MarioBrosTheme.length).to.be.greaterThan(0);
        songs.MarioBrosTheme.forEach(note => {
            expect(note).to.have.property('note');
        });
    });

    it('should have NationalAnthem starting with B3 note', function() {
        const songs = getSongs();
        expect(songs.NationalAnthem[0].note).to.equal('B3');
    });

    it('should have AmazingGrace starting with G3 note', function() {
        const songs = getSongs();
        expect(songs.AmazingGrace[0].note).to.equal('G3');
    });

    it('should have MarioBrosTheme starting with E4 note', function() {
        const songs = getSongs();
        expect(songs.MarioBrosTheme[0].note).to.equal('E4');
    });
});
