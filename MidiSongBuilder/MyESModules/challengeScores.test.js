import { expect } from 'chai';
import getChallengeScores from './challengeScores.js';

describe('getChallengeScores', function() {
    it('should return an object with getSelectedScore method', function() {
        const result = getChallengeScores();
        expect(result).to.be.an('object');
        expect(result.getSelectedScore).to.be.a('function');
    });

    it('should return score for bach_inv1C_COM.MID_normal', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('bach_inv1C_COM.MID', 'normal')).to.equal('6000');
    });

    it('should return score for anon_jbells_com.mid_crazy', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('anon_jbells_com.mid', 'crazy')).to.equal('9150');
    });

    it('should return score for vivaldi_4s_winter.mid_hard', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('vivaldi_4s_winter.mid', 'hard')).to.equal('15750');
    });

    it('should return empty string for unknown file/difficulty', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('unknown.mid', 'normal')).to.equal('');
    });

    it('should return empty string for non-existent file', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('nonexistent.mid', 'easy')).to.equal('');
    });

    it('should return empty string for non-existent difficulty', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('vivaldi_4s_winter.mid', 'impossible')).to.equal('');
    });

    it('should return score for bach_prelude1.mid_normal', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('bach_prelude1.mid', 'normal')).to.equal('10700');
    });

    it('should return score for debussy_gollycake.mid_crazy', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('debussy_gollycake.mid', 'crazy')).to.equal('21600');
    });

    it('should return score for mozart-piano-concerto-21-2-elvira-madigan-piano-solo.mid_normal', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('mozart-piano-concerto-21-2-elvira-madigan-piano-solo.mid', 'normal')).to.equal('40750');
    });

    it('should return score for straus_blued_II_com.mid_crazy', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('straus_blued_II_com.mid', 'crazy')).to.equal('8600');
    });

    it('should return score for tchaik_lakescene.mid_crazy', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('tchaik_lakescene.mid', 'crazy')).to.equal('21950');
    });

    it('should return score for mozart_elvira_m.mid_crazy', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('mozart_elvira_m.mid', 'crazy')).to.equal('57400');
    });

    it('should return score for wanton_maidens.mid_crazy', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('wanton_maidens.mid', 'crazy')).to.equal('8900');
    });

    it('should have scores for all difficulty levels (easy, normal, hard, crazy)', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('schubert_symph_5.mid', 'easy')).to.equal('');
        expect(challengeScores.getSelectedScore('schubert_symph_5.mid', 'normal')).to.equal('13750');
        expect(challengeScores.getSelectedScore('schubert_symph_5.mid', 'hard')).to.equal('15950');
        expect(challengeScores.getSelectedScore('schubert_symph_5.mid', 'crazy')).to.equal('19950');
    });

    it('should return score string values', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('bach_inv1C_COM.MID', 'normal')).to.be.a('string');
    });

    it('should have exactly 90 challenge scores defined', function() {
        const challengeScores = getChallengeScores();
        let count = 0;
        ['easy', 'normal', 'hard', 'crazy'].forEach(diff => {
            Object.keys(challengeScores).forEach(key => {
                if (key.includes('_' + diff)) count++;
            });
        });
    });

    it('should have scores for Bach pieces', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('bach_inv1C_COM.MID', 'normal')).to.equal('6000');
        expect(challengeScores.getSelectedScore('bach_2partInvention.mid', 'normal')).to.equal('7050');
        expect(challengeScores.getSelectedScore('bach_prelude1.mid', 'normal')).to.equal('10700');
    });

    it('should have scores for Vivaldi pieces', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('vivaldi_4s_winter.mid', 'normal')).to.equal('13400');
        expect(challengeScores.getSelectedScore('vivaldi_4s_spring.mid', 'normal')).to.equal('12500');
    });

    it('should have scores for Anonymous pieces', function() {
        const challengeScores = getChallengeScores();
        expect(challengeScores.getSelectedScore('anon_jbells_com.mid', 'normal')).to.equal('3900');
        expect(challengeScores.getSelectedScore('anon_als_com.mid', 'normal')).to.equal('6200');
    });
});
