import { expect } from 'chai';
import getMidiSongList from './midiSongList.js';

describe('getMidiSongList', function() {
    it('should return an object with MIDI song metadata', function() {
        const list = getMidiSongList();
        expect(list).to.be.an('object');
    });

    it('should contain Anonymous - For All the Seasons', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Anonymous - For All the Seasons');
    });

    it('should contain Anonymous - The First Noel', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Anonymous - The First Noel');
    });

    it('should contain Johann Sebastian Bach pieces', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Johann Sebastian Bach - 2 Part Inventions');
        expect(list).to.have.property('Johann Sebastian Bach - Brandenburg Concerto #2 in F');
        expect(list).to.have.property('Johann Sebastian Bach - Prelude 1');
    });

    it('should have song entries with filename property', function() {
        const list = getMidiSongList();
        expect(list['Anonymous - For All the Seasons']).to.have.property('filename', 'anon_als_com.mid');
    });

    it('should have song entries with difficultySettings property', function() {
        const list = getMidiSongList();
        expect(list['Anonymous - For All the Seasons']).to.have.property('difficultySettings');
    });

    it('should have difficulty settings with easy, normal, hard, crazy levels', function() {
        const list = getMidiSongList();
        const settings = list['Anonymous - For All the Seasons'].difficultySettings;
        expect(settings).to.have.property('easy');
        expect(settings).to.have.property('normal');
        expect(settings).to.have.property('hard');
        expect(settings).to.have.property('crazy');
    });

    it('should have difficulty settings with minNoteDistance and minNoteDuration', function() {
        const list = getMidiSongList();
        const easySettings = list['Anonymous - For All the Seasons'].difficultySettings.easy;
        expect(easySettings).to.have.property('difficultyKey', 'easy');
        expect(easySettings).to.have.property('minNoteDistance');
        expect(easySettings).to.have.property('minNoteDuration');
    });

    it('should have Vivaldi Spring', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Antonio Vivaldi - Spring from The Four Seasons, RV 269');
        expect(list['Antonio Vivaldi - Spring from The Four Seasons, RV 269']).to.have.property('filename', 'vivaldi_4s_spring.mid');
    });

    it('should have Vivaldi Winter', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Antonio Vivaldi - Winter from The Four Seasons, RV 297');
        expect(list['Antonio Vivaldi - Winter from The Four Seasons, RV 297']).to.have.property('filename', 'vivaldi_4s_winter.mid');
    });

    it('should have Tchaikovsky Swan Lake', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Pyotr Ilyich Tchaikovsky - Swan Lake from Ballet Suite');
        expect(list['Pyotr Ilyich Tchaikovsky - Swan Lake from Ballet Suite']).to.have.property('filename', 'tchaik_lakescene.mid');
    });

    it('should have Debussy Golliwog', function() {
        const list = getMidiSongList();
        expect(list).to.have.property("Debussy - Golliwog's Cakewalk");
    });

    it('should have Mozart Elvira Madigan', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Wolfgang Amadeus Mozart - Piano Concerto No. 21 in C major, K. 467 (II. Andante) - Elvira Madigan');
    });

    it('should have Schubert Serenade', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Franz Schubert - Serenade from Schwanengesang, D. 957');
    });

    it('should have Strauss Blue Danube pieces', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Johann Strauss II - The Blue Danube Waltz, Op. 314 (II. Trio)');
        expect(list).to.have.property('Johann Strauss II - The Blue Danube Waltz, Op. 314 (III. Refrain)');
        expect(list).to.have.property('Johann Strauss II - The Blue Danube Waltz, Op. 314 (IV. Finale)');
    });

    it('should have Grieg Hall of the Mountain King', function() {
        const list = getMidiSongList();
        expect(list).to.have.property('Edvard Grieg - Hall of the Mountain King from Peer Gynt Suite No. 1');
    });

    it('should have all songs with valid difficulty settings structure', function() {
        const list = getMidiSongList();
        Object.values(list).forEach(song => {
            expect(song).to.have.property('filename');
            expect(song).to.have.property('difficultySettings');
            expect(song.difficultySettings).to.have.all.keys(['easy', 'normal', 'hard', 'crazy']);
        });
    });

    it('should have 29 songs in total', function() {
        const list = getMidiSongList();
        expect(Object.keys(list).length).to.equal(29);
    });
});
