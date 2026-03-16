import { expect } from 'chai';
import getSongCompression from './SongCompression.js';

describe('getSongCompression', function() {
    it('should return an object with compression methods', function() {
        const compression = getSongCompression();
        expect(compression).to.be.an('object');
    });

    it('should have getCompressedJson method', function() {
        const compression = getSongCompression();
        expect(compression.getCompressedJson).to.be.a('function');
    });

    it('should have getDecompressedSong method', function() {
        const compression = getSongCompression();
        expect(compression.getDecompressedSong).to.be.a('function');
    });

    it('should compress tracks to shorter property names', function() {
        const compression = getSongCompression();
        const tracks = [
            {},
            {
                name: 'track1',
                notes: [
                    { time: 0.1234567, duration: 0.9876543, velocity: 1.0, name: 'C4' }
                ]
            }
        ];
        
        const compressed = compression.getCompressedJson(tracks);
        
        expect(compressed).to.have.property('tracks');
        expect(compressed.tracks[0]).to.have.property('name', 'track1');
        expect(compressed.tracks[0].notes[0]).to.have.property('t', '0.123457');
        expect(compressed.tracks[0].notes[0]).to.have.property('d', '0.987654');
        expect(compressed.tracks[0].notes[0]).to.have.property('v', '1.000000');
        expect(compressed.tracks[0].notes[0]).to.have.property('n', 'C4');
    });

    it('should skip the first track (index 0) during compression', function() {
        const compression = getSongCompression();
        const tracks = [
            { name: 'meta', notes: [] },
            { name: 'track1', notes: [{ time: 0.5, duration: 0.25, velocity: 1.0, name: 'C4' }] }
        ];
        
        const compressed = compression.getCompressedJson(tracks);
        
        expect(compressed.tracks.length).to.equal(1);
        expect(compressed.tracks[0].name).to.equal('track1');
    });

    it('should decompress tracks back to full property names', function() {
        const compression = getSongCompression();
        const compressedTracks = [
            {
                name: 'track1',
                notes: [
                    { t: '0.500000', d: '0.250000', v: '1.000000', n: 'C4' }
                ]
            }
        ];
        
        const decompressed = compression.getDecompressedSong(compressedTracks);
        
        expect(decompressed).to.have.property('tracks');
        expect(decompressed.tracks[0]).to.have.property('name', 'track1');
        expect(decompressed.tracks[0].notes[0]).to.have.property('time', 0.5);
        expect(decompressed.tracks[0].notes[0]).to.have.property('duration', 0.25);
        expect(decompressed.tracks[0].notes[0]).to.have.property('velocity', 1.0);
        expect(decompressed.tracks[0].notes[0]).to.have.property('name', 'C4');
    });

    it('should round-trip compression and decompression correctly', function() {
        const compression = getSongCompression();
        
        // Create original tracks (skip index 0 for meta)
        const originalTracks = [
            {},
            {
                name: 'melody',
                notes: [
                    { time: 0.123456, duration: 0.987654, velocity: 0.875, name: 'C4' },
                    { time: 1.234567, duration: 0.123456, velocity: 1.0, name: 'E4' }
                ]
            },
            {
                name: 'bass',
                notes: [
                    { time: 0.0, duration: 2.0, velocity: 0.75, name: 'C3' }
                ]
            }
        ];
        
        const compressed = compression.getCompressedJson(originalTracks);
        const decompressed = compression.getDecompressedSong(compressed.tracks);
        
        expect(decompressed.tracks.length).to.equal(2);
        expect(decompressed.tracks[0].name).to.equal('melody');
        expect(decompressed.tracks[0].notes.length).to.equal(2);
        expect(decompressed.tracks[1].name).to.equal('bass');
    });

    it('should convert time to string with 6 decimal places', function() {
        const compression = getSongCompression();
        const tracks = [
            {},
            { name: 'track1', notes: [{ time: 0.123456789, duration: 0.5, velocity: 1.0, name: 'C4' }] }
        ];
        
        const compressed = compression.getCompressedJson(tracks);
        
        expect(compressed.tracks[0].notes[0].t).to.equal('0.123457');
    });

    it('should convert duration to string with 6 decimal places', function() {
        const compression = getSongCompression();
        const tracks = [
            {},
            { name: 'track1', notes: [{ time: 0.5, duration: 0.987654321, velocity: 1.0, name: 'C4' }] }
        ];
        
        const compressed = compression.getCompressedJson(tracks);
        
        expect(compressed.tracks[0].notes[0].d).to.equal('0.987654');
    });

    it('should convert velocity to string with 6 decimal places', function() {
        const compression = getSongCompression();
        const tracks = [
            {},
            { name: 'track1', notes: [{ time: 0.5, duration: 0.25, velocity: 0.87654321, name: 'C4' }] }
        ];
        
        const compressed = compression.getCompressedJson(tracks);
        
        expect(compressed.tracks[0].notes[0].v).to.equal('0.876543');
    });

    it('should preserve note name during compression', function() {
        const compression = getSongCompression();
        const tracks = [
            {},
            { name: 'track1', notes: [{ time: 0.5, duration: 0.25, velocity: 1.0, name: 'F#4' }] }
        ];
        
        const compressed = compression.getCompressedJson(tracks);
        
        expect(compressed.tracks[0].notes[0].n).to.equal('F#4');
    });

    it('should handle empty tracks array', function() {
        const compression = getSongCompression();
        
        const compressed = compression.getCompressedJson([]);
        expect(compressed.tracks).to.deep.equal([]);
    });

    it('should decompress empty tracks array', function() {
        const compression = getSongCompression();
        
        const decompressed = compression.getDecompressedSong([]);
        expect(decompressed.tracks).to.deep.equal([]);
    });

    it('should parse float values correctly during decompression', function() {
        const compression = getSongCompression();
        const compressedTracks = [
            { name: 'track1', notes: [{ t: '0.500000', d: '0.250000', v: '0.750000', n: 'C4' }] }
        ];
        
        const decompressed = compression.getDecompressedSong(compressedTracks);
        
        expect(decompressed.tracks[0].notes[0].time).to.be.a('number');
        expect(decompressed.tracks[0].notes[0].duration).to.be.a('number');
        expect(decompressed.tracks[0].notes[0].velocity).to.be.a('number');
    });
});
