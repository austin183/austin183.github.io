import { expect } from 'chai';
import { getMidiParser } from './MidiParser.js';

describe('MidiParser', () => {
    let midiParser;

    beforeEach(() => {
        const noopMarkRaw = (obj) => obj;
        midiParser = getMidiParser(noopMarkRaw);
    });

    describe('parseMidiFile', () => {
        it.skip('requires browser File API and FileReader', () => {
            // Skip in Node.js - requires browser File API
        });
    });

    describe('parseMidiArrayBuffer', () => {
        it.skip('requires Tone.Midi in browser environment', () => {
            // Skip in Node.js - requires Tone.js audio context
        });
    });

    describe('extractTracks', () => {
        it('returns tracks and fullTrack object', () => {
            const mockMidi = {
                tracks: [
                    { name: '', notes: [] },
                    { name: 'Drums', notes: [{ time: 0, duration: 1 }] },
                    { name: '', notes: [{ time: 2, duration: 0.5 }] }
                ]
            };

            const result = midiParser.extractTracks(mockMidi);

            expect(result).to.have.property('tracks');
            expect(result).to.have.property('fullTrack');
            expect(result).to.have.property('songEnd');
        });

        it('names unnamed tracks with Track counter', () => {
            const mockMidi = {
                tracks: [
                    { name: '', notes: [{ time: 0, duration: 1 }] },
                    { name: 'Bass', notes: [{ time: 0, duration: 1 }] },
                    { name: '', notes: [{ time: 0, duration: 1 }] }
                ]
            };

            const result = midiParser.extractTracks(mockMidi);

            expect(result.tracks[0].name).to.equal('Track 1');
            expect(result.tracks[1].name).to.equal('Bass 2');
            expect(result.tracks[2].name).to.equal('Track 3');
        });

        it('filters out empty tracks', () => {
            const mockMidi = {
                tracks: [
                    { name: 'Empty', notes: [] },
                    { name: 'Has Notes', notes: [{ time: 0, duration: 1 }] }
                ]
            };

            const result = midiParser.extractTracks(mockMidi);

            expect(result.tracks.length).to.equal(1);
            expect(result.tracks[0].name).to.equal('Has Notes 2');
        });

        it('calculates songEnd from last note', () => {
            const mockMidi = {
                tracks: [
                    { name: 'Track', notes: [{ time: 5, duration: 3 }] }
                ]
            };

            const result = midiParser.extractTracks(mockMidi);

            expect(result.songEnd).to.equal(8);
        });

        it('sets songEnd to 0 when no notes exist', () => {
            const mockMidi = {
                tracks: [
                    { name: 'Track', notes: [] }
                ]
            };

            const result = midiParser.extractTracks(mockMidi);

            expect(result.songEnd).to.equal(0);
        });

        it('includes notes in track objects', () => {
            const mockMidi = {
                tracks: [
                    { name: 'Piano', notes: [{ time: 0, duration: 1, note: 'C4' }] }
                ]
            };

            const result = midiParser.extractTracks(mockMidi);

            expect(result.tracks[0].notes).to.deep.equal([{ time: 0, duration: 1, note: 'C4' }]);
        });
    });

    describe('combineAllTrackNotes', () => {
        it('combines notes from multiple tracks', () => {
            const tracks = [
                { name: 'Track 1', notes: [{ time: 0, duration: 1 }, { time: 2, duration: 1 }] },
                { name: 'Track 2', notes: [{ time: 1, duration: 0.5 }] }
            ];

            const combined = midiParser.combineAllTrackNotes(tracks);

            expect(combined.length).to.equal(3);
        });

        it('sorts combined notes by time', () => {
            const tracks = [
                { name: 'Track 1', notes: [{ time: 2, duration: 1 }, { time: 0, duration: 1 }] },
                { name: 'Track 2', notes: [{ time: 1, duration: 0.5 }] }
            ];

            const combined = midiParser.combineAllTrackNotes(tracks);

            expect(combined[0].time).to.equal(0);
            expect(combined[1].time).to.equal(1);
            expect(combined[2].time).to.equal(2);
        });

        it('returns empty array for tracks with no notes', () => {
            const tracks = [
                { name: 'Empty 1', notes: [] },
                { name: 'Empty 2', notes: [] }
            ];

            const combined = midiParser.combineAllTrackNotes(tracks);

            expect(combined).to.deep.equal([]);
        });

        it('handles single track', () => {
            const tracks = [
                { name: 'Single', notes: [{ time: 0, duration: 1 }] }
            ];

            const combined = midiParser.combineAllTrackNotes(tracks);

            expect(combined.length).to.equal(1);
        });
    });

    describe('filterTracksByNoteCount', () => {
        it('filters tracks by minimum note count', () => {
            const tracks = [
                { name: 'Many', notes: [{ time: 0 }, { time: 1 }, { time: 2 }] },
                { name: 'Few', notes: [{ time: 0 }] },
                { name: 'Empty', notes: [] }
            ];

            const filtered = midiParser.filterTracksByNoteCount(tracks, 2);

            expect(filtered.length).to.equal(1);
            expect(filtered[0].name).to.equal('Many');
        });

        it('returns all tracks when minNotes is 0', () => {
            const tracks = [
                { name: 'Any', notes: [{ time: 0 }] },
                { name: 'Empty', notes: [] }
            ];

            const filtered = midiParser.filterTracksByNoteCount(tracks, 0);

            expect(filtered.length).to.equal(2);
        });

        it('returns empty array when no tracks meet minimum', () => {
            const tracks = [
                { name: 'Empty', notes: [] },
                { name: 'Single', notes: [{ time: 0 }] }
            ];

            const filtered = midiParser.filterTracksByNoteCount(tracks, 5);

            expect(filtered).to.deep.equal([]);
        });
    });
});
