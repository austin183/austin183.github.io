import { expect } from 'chai';
import getScoringSettings from './scoringSettings.js';

describe('getScoringSettings', function() {
    it('should return an object with scoring settings', function() {
        const settings = getScoringSettings();
        expect(settings).to.be.an('object');
    });

    it('should contain "default" difficulty settings', function() {
        const settings = getScoringSettings();
        expect(settings).to.have.property('default');
    });

    it('should contain "easy" difficulty settings', function() {
        const settings = getScoringSettings();
        expect(settings).to.have.property('easy');
    });

    it('should contain "hard" difficulty settings', function() {
        const settings = getScoringSettings();
        expect(settings).to.have.property('hard');
    });

    it('should have exactly 3 difficulty levels', function() {
        const settings = getScoringSettings();
        expect(Object.keys(settings).length).to.equal(3);
    });

    it('should have default with goodRange 0.15', function() {
        const settings = getScoringSettings();
        expect(settings.default).to.have.property('goodRange', 0.15);
    });

    it('should have default with okRange 0.4', function() {
        const settings = getScoringSettings();
        expect(settings.default).to.have.property('okRange', 0.4);
    });

    it('should have default with badRange 0.7', function() {
        const settings = getScoringSettings();
        expect(settings.default).to.have.property('badRange', 0.7);
    });

    it('should have default with goodPoints 100', function() {
        const settings = getScoringSettings();
        expect(settings.default).to.have.property('goodPoints', 100);
    });

    it('should have default with okPoints 50', function() {
        const settings = getScoringSettings();
        expect(settings.default).to.have.property('okPoints', 50);
    });

    it('should have easy with more forgiving goodRange 0.2', function() {
        const settings = getScoringSettings();
        expect(settings.easy).to.have.property('goodRange', 0.2);
    });

    it('should have easy with more forgiving okRange 0.6', function() {
        const settings = getScoringSettings();
        expect(settings.easy).to.have.property('okRange', 0.6);
    });

    it('should have easy with more forgiving badRange 1.0', function() {
        const settings = getScoringSettings();
        expect(settings.easy).to.have.property('badRange', 1.0);
    });

    it('should have easy with same goodPoints as default', function() {
        const settings = getScoringSettings();
        expect(settings.easy).to.have.property('goodPoints', 100);
    });

    it('should have easy with same okPoints as default', function() {
        const settings = getScoringSettings();
        expect(settings.easy).to.have.property('okPoints', 50);
    });

    it('should have hard with stricter goodRange 0.1', function() {
        const settings = getScoringSettings();
        expect(settings.hard).to.have.property('goodRange', 0.1);
    });

    it('should have hard with stricter okRange 0.3', function() {
        const settings = getScoringSettings();
        expect(settings.hard).to.have.property('okRange', 0.3);
    });

    it('should have hard with stricter badRange 0.5', function() {
        const settings = getScoringSettings();
        expect(settings.hard).to.have.property('badRange', 0.5);
    });

    it('should have hard with same goodPoints as default', function() {
        const settings = getScoringSettings();
        expect(settings.hard).to.have.property('goodPoints', 100);
    });

    it('should have hard with same okPoints as default', function() {
        const settings = getScoringSettings();
        expect(settings.hard).to.have.property('okPoints', 50);
    });

    it('should have easy with larger ranges than default', function() {
        const settings = getScoringSettings();
        expect(settings.easy.goodRange).to.be.greaterThan(settings.default.goodRange);
        expect(settings.easy.okRange).to.be.greaterThan(settings.default.okRange);
        expect(settings.easy.badRange).to.be.greaterThan(settings.default.badRange);
    });

    it('should have hard with smaller ranges than default', function() {
        const settings = getScoringSettings();
        expect(settings.hard.goodRange).to.be.lessThan(settings.default.goodRange);
        expect(settings.hard.okRange).to.be.lessThan(settings.default.okRange);
        expect(settings.hard.badRange).to.be.lessThan(settings.default.badRange);
    });

    it('should have all difficulties with required properties', function() {
        const settings = getScoringSettings();
        Object.values(settings).forEach(diff => {
            expect(diff).to.have.property('goodRange');
            expect(diff).to.have.property('okRange');
            expect(diff).to.have.property('badRange');
            expect(diff).to.have.property('goodPoints');
            expect(diff).to.have.property('okPoints');
        });
    });

    it('should have increasing badRange with decreasing difficulty', function() {
        const settings = getScoringSettings();
        expect(settings.hard.badRange).to.be.lessThan(settings.default.badRange);
        expect(settings.default.badRange).to.be.lessThan(settings.easy.badRange);
    });

    it('should have goodRange < okRange < badRange for all difficulties', function() {
        const settings = getScoringSettings();
        Object.values(settings).forEach(diff => {
            expect(diff.goodRange).to.be.lessThan(diff.okRange);
            expect(diff.okRange).to.be.lessThan(diff.badRange);
        });
    });

    it('should have goodPoints > okPoints for all difficulties', function() {
        const settings = getScoringSettings();
        Object.values(settings).forEach(diff => {
            expect(diff.goodPoints).to.be.greaterThan(diff.okPoints);
        });
    });

    it('should have consistent goodPoints across all difficulties', function() {
        const settings = getScoringSettings();
        expect(settings.default.goodPoints).to.equal(settings.easy.goodPoints);
        expect(settings.default.goodPoints).to.equal(settings.hard.goodPoints);
    });

    it('should have consistent okPoints across all difficulties', function() {
        const settings = getScoringSettings();
        expect(settings.default.okPoints).to.equal(settings.easy.okPoints);
        expect(settings.default.okPoints).to.equal(settings.hard.okPoints);
    });
});
