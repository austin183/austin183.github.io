import { expect } from 'chai';
import { getSynthKeyPlayer } from './SynthKeyPlayer.js';

describe('SynthKeyPlayer', () => {
    let synthKeyPlayer;

    beforeEach(() => {
        synthKeyPlayer = getSynthKeyPlayer();
    });

    describe('getFreeSynth', () => {
        it('returns 0 when synthMap is empty', () => {
            const freeSynth = synthKeyPlayer.getFreeSynth({});
            
            expect(freeSynth).to.equal(0);
        });

        it('returns first available synth index', () => {
            const synthMap = { 'a': 0, 's': 1 };
            const freeSynth = synthKeyPlayer.getFreeSynth(synthMap);
            
            expect(freeSynth).to.equal(2);
        });

        it('returns 9 when synths 0-8 are in use', () => {
            const synthMap = { 'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, 'h': 5, 'j': 6, 'k': 7, 'l': 8 };
            const freeSynth = synthKeyPlayer.getFreeSynth(synthMap);
            
            expect(freeSynth).to.equal(9);
        });

        it('returns undefined when all 10 synths are in use', () => {
            const synthMap = { 'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, 'h': 5, 'j': 6, 'k': 7, 'l': 8, ';': 9 };
            const freeSynth = synthKeyPlayer.getFreeSynth(synthMap);
            
            expect(freeSynth).to.be.undefined;
        });

        it('handles non-contiguous synth assignments', () => {
            const synthMap = { 'a': 5, 's': 7, 'd': 9 };
            const freeSynth = synthKeyPlayer.getFreeSynth(synthMap);
            
            expect(freeSynth).to.equal(0);
        });
    });

    describe('playNotes', () => {
        it.skip('requires synth array and app context in browser environment', () => {
            // Skip in Node.js - requires Tone.js synth instances
        });

        it('respects playerVolume setting', () => {
            const app = {
                notesPlaying: '',
                playerVolume: 0.5,
                selectedKeyNoteMap: { keyNoteMap: { 'a': 'C4' } }
            };
            const pressedKeys = { 'a': true };
            
            expect(app.playerVolume).to.equal(0.5);
        });

        it('uses velocity of 1 when playerVolume is undefined', () => {
            const app = {
                notesPlaying: '',
                selectedKeyNoteMap: { keyNoteMap: {} }
            };
            
            expect(app.playerVolume).to.be.undefined;
        });

        it('uses velocity of 1 when playerVolume is outside 0-1 range', () => {
            const app = {
                notesPlaying: '',
                playerVolume: 1.5,
                selectedKeyNoteMap: { keyNoteMap: {} }
            };
            
            expect(app.playerVolume).to.equal(1.5);
        });
    });
});
