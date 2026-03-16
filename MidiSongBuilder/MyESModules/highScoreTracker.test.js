import { expect } from 'chai';
import getHighScoreTracker from './highScoreTracker.js';

describe('constructor validation', function() {
    it('throws error when storageService is not provided', function() {
        expect(() => {
            getHighScoreTracker(null);
        }).to.throw('HighScoreTracker requires a storage service');
    });

    it('throws error when storageService is undefined', function() {
        expect(() => {
            getHighScoreTracker();
        }).to.throw('HighScoreTracker requires a storage service');
    });
});

describe('getHighScoreTracker', function() {
    let tracker;
    let mockStorage;

    beforeEach(() => {
        mockStorage = {
            store: new Map(),
            getItem(key) { return this.store.get(key) || null; },
            setItem(key, value) { this.store.set(key, value); },
            key(i) { return Array.from(this.store.keys())[i] || null; },
            get length() { return this.store.size; }
        };

        tracker = getHighScoreTracker(mockStorage);
    });

    it('should return an object with high score methods', function() {
        expect(tracker).to.be.an('object');
    });

    it('should have getHighScore method', function() {
        expect(tracker.getHighScore).to.be.a('function');
    });

    it('should have setHighScore method', function() {
        expect(tracker.setHighScore).to.be.a('function');
    });

    it('should have exportHighScoresToClipBoardAsJsonString method', function() {
        expect(tracker.exportHighScoresToClipBoardAsJsonString).to.be.a('function');
    });

    it('should return empty string for non-existent high score', function() {
        const result = tracker.getHighScore('unknown.mid', 'normal');
        expect(result).to.equal('');
    });

    it('should create correct key from midiFileName and difficulty', function() {
        const testKey = 'test.mid_normal';
        
        tracker.setHighScore('test.mid', 'normal', 5000);
        
        const result = tracker.getHighScore('test.mid', 'normal');
        expect(result).to.equal('5000');
    });

    it('should store new high score when higher than current', function() {
        tracker.setHighScore('test.mid', 'crazy', 5000);
        
        const result = tracker.getHighScore('test.mid', 'crazy');
        expect(result).to.equal('5000');
    });

    it('should not update high score when new score is lower', function() {
        tracker.setHighScore('test.mid', 'hard', 10000);
        
        tracker.setHighScore('test.mid', 'hard', 5000);
        
        const result = tracker.getHighScore('test.mid', 'hard');
        expect(result).to.equal('10000');
    });

    it('should update high score when new score is exactly equal', function() {
        tracker.setHighScore('test.mid', 'easy', 5000);
        
        tracker.setHighScore('test.mid', 'easy', 5000);
        
        const result = tracker.getHighScore('test.mid', 'easy');
        expect(result).to.equal('5000');
    });

    it('should handle different difficulties for same file', function() {
        tracker.setHighScore('test.mid', 'easy', 3000);
        tracker.setHighScore('test.mid', 'normal', 5000);
        tracker.setHighScore('test.mid', 'hard', 7000);
        tracker.setHighScore('test.mid', 'crazy', 9000);

        expect(tracker.getHighScore('test.mid', 'easy')).to.equal('3000');
        expect(tracker.getHighScore('test.mid', 'normal')).to.equal('5000');
        expect(tracker.getHighScore('test.mid', 'hard')).to.equal('7000');
        expect(tracker.getHighScore('test.mid', 'crazy')).to.equal('9000');
    });

    it('should handle different files with same difficulty', function() {
        tracker.setHighScore('song1.mid', 'normal', 5000);
        tracker.setHighScore('song2.mid', 'normal', 6000);

        expect(tracker.getHighScore('song1.mid', 'normal')).to.equal('5000');
        expect(tracker.getHighScore('song2.mid', 'normal')).to.equal('6000');
    });

    it('should store score as string', function() {
        tracker.setHighScore('test.mid', 'normal', 5000);

        const result = tracker.getHighScore('test.mid', 'normal');
        expect(result).to.be.a('string').that.equals('5000');
    });

    it('should handle zero as a valid score', function() {
        tracker.setHighScore('test.mid', 'normal', 0);

        const result = tracker.getHighScore('test.mid', 'normal');
        expect(result).to.equal('0');
    });

    it('should handle very large scores', function() {
        const hugeScore = 9999999;
        tracker.setHighScore('test.mid', 'normal', hugeScore);

        const result = tracker.getHighScore('test.mid', 'normal');
        expect(result).to.equal(hugeScore.toString());
    });

    it('should handle real file names from midiSongList', function() {
        tracker.setHighScore('vivaldi_4s_spring.mid', 'normal', 12500);
        tracker.setHighScore('bach_prelude1.mid', 'hard', 11550);

        expect(tracker.getHighScore('vivaldi_4s_spring.mid', 'normal')).to.equal('12500');
        expect(tracker.getHighScore('bach_prelude1.mid', 'hard')).to.equal('11550');
    });
});
