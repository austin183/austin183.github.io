import { expect } from 'chai';
import getScoreKeeper from '../../ScoreKeeper.js';

describe('Integration: Score Calculation Flow', () => {
    let scoreKeeper;

    beforeEach(() => {
        scoreKeeper = getScoreKeeper();
    });

    it('should calculate good/ok/bad scores based on timing', () => {
        const visibleField = [
            { id: 'C4_0', letter: 'A', time: 1.0, duration: 0.5 }
        ];

        let result = scoreKeeper.calculateNewScore(
            visibleField, { A: true }, 0.95, 0, 2.0
        );
        expect(result.keyScores['C4_0'].tag).to.equal('good');

        scoreKeeper.reset();
        
        result = scoreKeeper.calculateNewScore(
            visibleField, { A: true }, 0.75, 0, 2.0
        );
        expect(result.keyScores['C4_0'].tag).to.equal('ok');

        scoreKeeper.reset();
        
        result = scoreKeeper.calculateNewScore(
            visibleField, { A: true }, 0.5, 0, 2.0
        );
        expect(result.keyScores['C4_0'].tag).to.equal('bad');
    });

    it('should detect missed notes when time passes badRange', () => {
        const visibleField = [
            { id: 'C4_0', letter: 'A', time: 0, duration: 0.5 }
        ];

        const result = scoreKeeper.calculateNewScore(
            visibleField, {}, 1.0, 0, 2.0
        );

        expect(result.keyScores['C4_0'].tag).to.equal('missed');
    });

    it('should accumulate total score correctly', () => {
        const visibleField = [
            { id: 'C4_0', letter: 'A', time: 1.0, duration: 0.5 },
            { id: 'E4_1', letter: 'S', time: 2.0, duration: 0.5 }
        ];

        let result = scoreKeeper.calculateNewScore(
            visibleField, { A: true }, 0.95, 0, 3.0
        );
        
        expect(result.total).to.be.greaterThan(0);
    });
});
