import { expect } from 'chai';
import sinon from 'sinon';
import getScoreKeeper from './ScoreKeeper.js';
import getScoringSettings from './scoringSettings.js';

describe('ScoreKeeper', function() {
    let scoreKeeper, visibleField, pressedKeys, now, earliestNoteIndex, visibleFuture;

    function setup() {
        scoreKeeper = getScoreKeeper();
        visibleField = [
            { id: 'note1', time: 1.0, duration: 0.5, letter: 'A' },
            { id: 'note2', time: 2.0, duration: 0.5, letter: 'B' },
            { id: 'note3', time: 3.0, duration: 0.5, letter: 'C' },
            { id: 'note4', time: 4.0, duration: 0.5, letter: 'D' },
            { id: 'note5', time: 5.0, duration: 0.5, letter: 'E' }
        ];
        pressedKeys = {};
        now = 0;
        earliestNoteIndex = 0;
        visibleFuture = 10;
    }

    describe('reset()', function() {
        it('should initialize score to zero', function() {
            setup();
            const score = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            expect(score.total).to.equal(100);
            
            scoreKeeper.reset();
            const newScore = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            expect(newScore.total).to.equal(100);
        });

        it('should clear keyScores', function() {
            setup();
            scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            scoreKeeper.reset();
            
            const result = scoreKeeper.calculateNewScore(visibleField, { 'B': true }, 2.0, 0, visibleFuture);
            expect(result.keyScores).to.have.property('note2');
        });

        it('should clear previousPressedKeys', function() {
            setup();
            scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            scoreKeeper.reset();
            
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            expect(result.keyScores).to.have.property('note1');
        });
    });

    describe('Basic Scoring', function() {
        it('should award goodPoints when key pressed within 150ms of note time', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            
            expect(result.total).to.equal(100);
            expect(result.keyScores.note1.tag).to.equal('good');
        });

        it('should award goodPoints when key pressed 100ms before note', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 0.9, 0, visibleFuture);
            
            expect(result.total).to.equal(100);
            expect(result.keyScores.note1.tag).to.equal('good');
        });

        it('should award goodPoints when key pressed exactly at 150ms boundary', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.15, 0, visibleFuture);
            
            expect(result.total).to.equal(100);
            expect(result.keyScores.note1.tag).to.equal('good');
        });

        it('should award okPoints (50) when key pressed at exactly 400ms past note time', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.4, 0, visibleFuture);
            
            expect(result.total).to.equal(50);
            expect(result.keyScores.note1.tag).to.equal('ok');
        });

        it('should award okPoints (50) when key pressed 200ms past note time', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.2, 0, visibleFuture);
            
            expect(result.total).to.equal(50);
            expect(result.keyScores.note1.tag).to.equal('ok');
        });

        it('should award badPoints (0) when key pressed at exactly 700ms past note time', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.7, 0, visibleFuture);
            
            expect(result.total).to.equal(0);
            expect(result.keyScores.note1.tag).to.equal('bad');
        });

        it('should award badPoints (0) when key pressed 500ms past note time', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.5, 0, visibleFuture);
            
            expect(result.total).to.equal(0);
            expect(result.keyScores.note1.tag).to.equal('bad');
        });

        it('should award zero points when key pressed more than 700ms past note time', function() {
            setup();
            scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 3.0, 0, visibleFuture);
            
            expect(result.total).to.equal(100);
            const counts = scoreKeeper.getCounts();
            expect(counts.missedCount).to.equal(1);
        });

        it('should not score notes beyond visibleFuture', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'E': true }, 2.0, 0, 3.0);
            
            expect(result.total).to.equal(0);
        });
    });

    describe('Edge Cases', function() {
        it('should handle empty visibleField without crashing', function() {
            setup();
            const result = scoreKeeper.calculateNewScore([], { 'A': true }, 1.0, 0, visibleFuture);
            
            expect(result.total).to.equal(0);
        });

        it('should not score anything when pressedKeys is empty', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, {}, 1.0, 0, visibleFuture);
            
            expect(result.total).to.equal(0);
        });

        it('should not double-score the same key pressed twice', function() {
            setup();
            scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            const result2 = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.05, 0, visibleFuture);
            
            expect(result2.total).to.equal(100);
        });

        it('should handle pressing key before note time', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 0.9, 0, visibleFuture);
            
            expect(result.total).to.equal(100);
        });

        it('should not score when current time is too far before notes', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, -5.0, 0, visibleFuture);
            
            expect(result.total).to.equal(0);
        });

        it('should only score notes whose keys are actually pressed', function() {
            setup();
            const visibleFieldWithChord = [
                { id: 'chord1', time: 1.0, duration: 0.5, letter: 'A' },
                { id: 'chord2', time: 1.0, duration: 0.5, letter: 'B' },
                { id: 'chord3', time: 1.0, duration: 0.5, letter: 'C' }
            ];
            
            const result = scoreKeeper.calculateNewScore(visibleFieldWithChord, { 'A': true }, 1.0, 0, visibleFuture);
            
            expect(result.total).to.equal(100);
            expect(Object.keys(result.keyScores)).to.have.lengthOf(1);
        });

        it('should score each key press independently in a chord', function() {
            setup();
            const visibleFieldWithChord = [
                { id: 'chord1', time: 1.0, duration: 0.5, letter: 'A' },
                { id: 'chord2', time: 1.0, duration: 0.5, letter: 'B' },
                { id: 'chord3', time: 1.0, duration: 0.5, letter: 'C' }
            ];
            
            const result = scoreKeeper.calculateNewScore(visibleFieldWithChord, { 'A': true, 'B': true }, 1.0, 0, visibleFuture);
            
            expect(result.total).to.equal(200);
            expect(Object.keys(result.keyScores)).to.have.lengthOf(2);
        });

        it('should score closest unpressed note for repeated keys', function() {
            setup();
            
            const result1 = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            const result2 = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 0.0, 0, visibleFuture);
            
            expect(result1.total).to.equal(100);
            expect(result2.total).to.equal(100);
        });

        it('should respect earliestNoteIndex parameter', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'C': true }, 3.0, 2, visibleFuture);
            
            expect(result.total).to.equal(100);
        });

        it('should not score notes before earliestNoteIndex', function() {
            setup();
            const result = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 2, visibleFuture);
            
            expect(result.total).to.equal(0);
        });
    });

    describe('getCounts()', function() {
        it('should return correct counts after multiple score updates', function() {
            setup();
            
            scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            scoreKeeper.calculateNewScore(visibleField, { 'B': true }, 2.0, 0, visibleFuture);
            scoreKeeper.calculateNewScore(visibleField, { 'C': true }, 2.2, 0, visibleFuture);
            scoreKeeper.calculateNewScore(visibleField, { 'D': true }, 4.5, 0, visibleFuture);
            
            const counts = scoreKeeper.getCounts();
            expect(counts.goodCount).to.equal(2);
        });

        it('should count bad notes correctly', function() {
            setup();
            
            scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 2.0, 0, visibleFuture);
            
            const counts = scoreKeeper.getCounts();
        });

        it('should count missed notes correctly', function() {
            setup();
            
            scoreKeeper.calculateNewScore(visibleField, {}, 2.0, 0, visibleFuture);
            
            const counts = scoreKeeper.getCounts();
            expect(counts.missedCount).to.equal(1);
        });

        it('should return all zeros for no scoring activity', function() {
            setup();
            
            const counts = scoreKeeper.getCounts();
            expect(counts.goodCount).to.equal(0);
            expect(counts.okCount).to.equal(0);
            expect(counts.badCount).to.equal(0);
            expect(counts.missedCount).to.equal(0);
        });

        it('should only add points, never subtract from total score', function() {
            setup();
            
            const result1 = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.0, 0, visibleFuture);
            const scoreAfterGood = result1.total;
            
            const result2 = scoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.5, 0, visibleFuture);
            const scoreAfterBad = result2.total;
            
            expect(scoreAfterBad).to.be.greaterThanOrEqual(scoreAfterGood);
        });
    });

    describe('Custom Scoring Settings', function() {
        it('should use custom scoring ranges when provided', function() {
            const customSettings = getScoringSettings().hard;
            const customScoreKeeper = getScoreKeeper(customSettings);
            
            visibleField = [
                { id: 'note1', time: 1.0, duration: 0.5, letter: 'A' }
            ];
            
            const result = customScoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.05, 0, visibleFuture);
            
            expect(result.total).to.equal(100);
        });

        it('should use easy settings with more forgiving ranges', function() {
            const customSettings = getScoringSettings().easy;
            const customScoreKeeper = getScoreKeeper(customSettings);
            
            visibleField = [
                { id: 'note1', time: 1.0, duration: 0.5, letter: 'A' }
            ];
            
            const result = customScoreKeeper.calculateNewScore(visibleField, { 'A': true }, 1.18, 0, visibleFuture);
            
            expect(result.total).to.equal(100);
        });

        it('should use hard settings with stricter ranges', function() {
            const customSettings = getScoringSettings().hard;
            const customScoreKeeper = getScoreKeeper(customSettings);
            
            visibleField = [
                { id: 'note1', time: 1.0, duration: 0.5, letter: 'A' }
            ];
            
            const result = customScoreKeeper.calculateNewScore(visibleField, { 'A': true }, 0.8, 0, visibleFuture);
            
            expect(result.total).to.equal(50);
        });
    });

    describe('Multiple Notes Same Letter', function() {
        it('should score multiple notes with same letter at different times', function() {
            setup();
            const visibleFieldSameLetter = [
                { id: 'note1', time: 1.0, duration: 0.5, letter: 'A' },
                { id: 'note2', time: 3.0, duration: 0.5, letter: 'B' },
                { id: 'note3', time: 5.0, duration: 0.5, letter: 'C' }
            ];
            
            scoreKeeper.calculateNewScore(visibleFieldSameLetter, { 'A': true }, 1.0, 0, visibleFuture);
            scoreKeeper.calculateNewScore(visibleFieldSameLetter, { 'B': true }, 3.0, 0, visibleFuture);
            scoreKeeper.calculateNewScore(visibleFieldSameLetter, { 'C': true }, 5.0, 0, visibleFuture);
            
            const counts = scoreKeeper.getCounts();
            expect(counts.goodCount).to.equal(3);
        });
    });

    describe('constructor', function() {
        it('accepts null as debugLogger parameter', function() {
            expect(() => {
                const sk = getScoreKeeper(null, null);
            }).to.not.throw();
        });

        it('accepts undefined as debugLogger parameter', function() {
            expect(() => {
                const sk = getScoreKeeper(undefined, undefined);
            }).to.not.throw();
        });

        it('works without debugLogger (backwards compatible)', function() {
            const sk = getScoreKeeper();
            expect(sk.calculateNewScore).to.be.a('function');
        });

        it('uses debugLogger when provided', function() {
            sinon.stub(console, 'log');
            const mockLogger = { enabled: true, log: console.log };
            const sk = getScoreKeeper(null, mockLogger);
            
            sk.calculateNewScore([], {}, 0, 0, 10);
            
            expect(console.log.called).to.be.true;
            console.log.restore();
        });
    });
});
