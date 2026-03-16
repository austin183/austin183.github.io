import { expect } from 'chai';
import sinon from 'sinon';
import { getToneHelper } from './ToneHelper.js';
import * as Tone from './mocks/Tone.js';

describe('ToneHelper', () => {
    let toneHelper;

    beforeEach(() => {
        toneHelper = getToneHelper(Tone);
    });

    describe('getDefaultFMSynthParams', () => {
        it('returns synth parameters object', () => {
            const params = toneHelper.getDefaultFMSynthParams();
            
            expect(params).to.be.an('object');
            expect(params.harmonicity).to.equal(8000);
            expect(params.modulationIndex).to.equal(10);
            expect(params.detune).to.equal(0);
        });

        it('has correct oscillator settings', () => {
            const params = toneHelper.getDefaultFMSynthParams();
            
            expect(params.oscillator.type).to.equal('triangle');
        });

        it('has correct envelope settings', () => {
            const params = toneHelper.getDefaultFMSynthParams();
            
            expect(params.envelope.attack).to.equal(0.01);
            expect(params.envelope.decay).to.equal(0.01);
            expect(params.envelope.sustain).to.equal(1);
            expect(params.envelope.release).to.equal(0.5);
        });

        it('has correct modulation settings', () => {
            const params = toneHelper.getDefaultFMSynthParams();
            
            expect(params.modulation.type).to.equal('sawtooth');
            expect(params.modulationEnvelope.attack).to.equal(0.5);
            expect(params.modulationEnvelope.decay).to.equal(0);
            expect(params.modulationEnvelope.sustain).to.equal(1);
            expect(params.modulationEnvelope.release).to.equal(0.5);
        });
    });

    describe('getOscillatorTypes', () => {
        it('returns array of oscillator types', () => {
            const types = toneHelper.getOscillatorTypes();
            
            expect(types).to.be.an('array');
            expect(types).to.deep.equal(['sine', 'square', 'sawtooth', 'triangle']);
            expect(types.length).to.equal(4);
        });
    });

    describe('getCongaSynth', () => {
        it.skip('returns MembraneSynth instance in browser environment', () => {
            // Skip in Node.js - requires Tone.js audio context
        });
    });

    describe('buildSynths', () => {
        it('clears existing synths from array', () => {
            const originalSynth = { dispose: sinon.spy() };
            const synthArray = [originalSynth];
            toneHelper.buildSynths({}, synthArray, 2);
            
            expect(originalSynth.dispose.called).to.be.true;
            expect(synthArray.length).to.equal(2, 'Should have new synths after clearing old ones');
        });

        it.skip('creates specified number of FMSynth instances in browser', () => {
            // Skip in Node.js - requires Tone.js audio context
        });
    });
});
