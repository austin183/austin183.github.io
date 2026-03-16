import { expect } from 'chai';
import getDifficultySettings from './difficultySettings.js';

describe('getDifficultySettings', function() {
    it('should return an object with difficulty settings', function() {
        const settings = getDifficultySettings();
        expect(settings).to.be.an('object');
    });

    it('should contain "A Bit Less Please" difficulty', function() {
        const settings = getDifficultySettings();
        expect(settings).to.have.property('A Bit Less Please');
    });

    it('should contain "Normal" difficulty', function() {
        const settings = getDifficultySettings();
        expect(settings).to.have.property('Normal');
    });

    it('should contain "A Bit More Please" difficulty', function() {
        const settings = getDifficultySettings();
        expect(settings).to.have.property('A Bit More Please');
    });

    it('should contain "Insanity" difficulty', function() {
        const settings = getDifficultySettings();
        expect(settings).to.have.property('Insanity');
    });

    it('should have "A Bit Less Please" with difficultyKey "easy"', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit Less Please']).to.have.property('difficultyKey', 'easy');
    });

    it('should have "Normal" with difficultyKey "normal"', function() {
        const settings = getDifficultySettings();
        expect(settings.Normal).to.have.property('difficultyKey', 'normal');
    });

    it('should have "A Bit More Please" with difficultyKey "hard"', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit More Please']).to.have.property('difficultyKey', 'hard');
    });

    it('should have "Insanity" with difficultyKey "crazy"', function() {
        const settings = getDifficultySettings();
        expect(settings.Insanity).to.have.property('difficultyKey', 'crazy');
    });

    it('should have "A Bit Less Please" with minNoteDistance 0.5', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit Less Please']).to.have.property('minNoteDistance', 0.5);
    });

    it('should have "Normal" with minNoteDistance 0.3', function() {
        const settings = getDifficultySettings();
        expect(settings.Normal).to.have.property('minNoteDistance', 0.3);
    });

    it('should have "A Bit More Please" with minNoteDistance 0.2', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit More Please']).to.have.property('minNoteDistance', 0.2);
    });

    it('should have "Insanity" with minNoteDistance 0.18', function() {
        const settings = getDifficultySettings();
        expect(settings.Insanity).to.have.property('minNoteDistance', 0.18);
    });

    it('should have "A Bit Less Please" with minNoteDuration 0.2', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit Less Please']).to.have.property('minNoteDuration', 0.2);
    });

    it('should have "Normal" with minNoteDuration 0.17', function() {
        const settings = getDifficultySettings();
        expect(settings.Normal).to.have.property('minNoteDuration', 0.17);
    });

    it('should have "A Bit More Please" with minNoteDuration 0.17', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit More Please']).to.have.property('minNoteDuration', 0.17);
    });

    it('should have "Insanity" with minNoteDuration 0.17', function() {
        const settings = getDifficultySettings();
        expect(settings.Insanity).to.have.property('minNoteDuration', 0.17);
    });

    it('should have "A Bit Less Please" with targetNotesPerMinute 50', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit Less Please']).to.have.property('targetNotesPerMinute', 50);
    });

    it('should have "Normal" with targetNotesPerMinute 60', function() {
        const settings = getDifficultySettings();
        expect(settings.Normal).to.have.property('targetNotesPerMinute', 60);
    });

    it('should have "A Bit More Please" with targetNotesPerMinute 80', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit More Please']).to.have.property('targetNotesPerMinute', 80);
    });

    it('should have "Insanity" with targetNotesPerMinute 100', function() {
        const settings = getDifficultySettings();
        expect(settings.Insanity).to.have.property('targetNotesPerMinute', 100);
    });

    it('should have all difficulties with required properties', function() {
        const settings = getDifficultySettings();
        Object.values(settings).forEach(diff => {
            expect(diff).to.have.property('difficultyKey');
            expect(diff).to.have.property('minNoteDistance');
            expect(diff).to.have.property('minNoteDuration');
            expect(diff).to.have.property('targetNotesPerMinute');
        });
    });

    it('should have exactly 4 difficulty levels', function() {
        const settings = getDifficultySettings();
        expect(Object.keys(settings).length).to.equal(4);
    });

    it('should have increasing targetNotesPerMinute with difficulty', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit Less Please'].targetNotesPerMinute).to.be.lessThan(settings.Normal.targetNotesPerMinute);
        expect(settings.Normal.targetNotesPerMinute).to.be.lessThan(settings['A Bit More Please'].targetNotesPerMinute);
        expect(settings['A Bit More Please'].targetNotesPerMinute).to.be.lessThan(settings.Insanity.targetNotesPerMinute);
    });

    it('should have decreasing minNoteDistance with difficulty', function() {
        const settings = getDifficultySettings();
        expect(settings['A Bit Less Please'].minNoteDistance).to.be.greaterThan(settings.Normal.minNoteDistance);
        expect(settings.Normal.minNoteDistance).to.be.greaterThan(settings['A Bit More Please'].minNoteDistance);
        expect(settings['A Bit More Please'].minNoteDistance).to.be.greaterThan(settings.Insanity.minNoteDistance);
    });
});
