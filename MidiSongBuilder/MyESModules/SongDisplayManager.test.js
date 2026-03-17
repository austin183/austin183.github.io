import { expect } from 'chai';
import { createSongDisplayManager } from './SongDisplayManager.js';

describe('SongDisplayManager', function() {
    let songDisplayManager;
    let mockSongNoteRenderer;
    let mockKeyNoteMapService;

    beforeEach(function() {
        mockSongNoteRenderer = {
            renderSongNotes: function(song, keyNoteMap) {
                return {
                    renderedSongNotes: 'rendered notes',
                    renderedSongNotesOnKeyMap: 'key map'
                };
            },
            renderDebugNotesPlaying: function(canvas, song, currentScore, invertedKeyNoteMap, now, visiblePast) {
                return 'debug output';
            }
        };

        mockKeyNoteMapService = {
            getInvertedMap: function(keyNoteMap) {
                return { 'C4': 'a', 'D4': 's', 'E4': 'd' };
            }
        };

        songDisplayManager = createSongDisplayManager(mockSongNoteRenderer, mockKeyNoteMapService);
    });

    describe('setDebugMode', function() {
        it('should set debug mode', function() {
            songDisplayManager.setDebugMode(true);
            expect(songDisplayManager.getDebugMode()).to.equal(true);
        });
    });

    describe('renderSongNotesForDisplay', function() {
        it('should return null when currentMidi is falsy', function() {
            const result = songDisplayManager.renderSongNotesForDisplay(null, {});
            expect(result).to.equal(null);
        });

        it('should return null when selectedTrack is empty', function() {
            const result = songDisplayManager.renderSongNotesForDisplay({}, { selectedTrack: '' });
            expect(result).to.equal(null);
        });

        it('should render song notes when valid data provided', function() {
            const currentMidi = { tracks: [] };
            const app = {
                selectedTrack: { notes: [{ name: 'C4', time: 0, duration: 1 }] },
                selectedKeyNoteMap: { keyNoteMap: {} }
            };

            const result = songDisplayManager.renderSongNotesForDisplay(currentMidi, app);
            
            expect(result).to.not.equal(null);
            expect(result.songNotes).to.equal('rendered notes');
            expect(result.songNotesOnKeyMap).to.equal('key map');
        });
    });

    describe('renderDebugNotesPlaying', function() {
        it('should delegate to songNoteRenderer', function() {
            const result = songDisplayManager.renderDebugNotesPlaying(
                'canvas', 
                'song', 
                { keyScores: {} }, 
                'invertedMap', 
                0, 
                0
            );
            expect(result).to.equal('debug output');
        });
    });

    describe('create3DVisibleField', function() {
        it('should create visible field from song notes', function() {
            const song = [
                { name: 'C4', time: 0, duration: 1 },
                { name: 'D4', time: 2, duration: 0.5 },
                { name: 'X4', time: 3, duration: 1 } // Not in key map
            ];
            const invertedKeyNoteMap = { 'C4': 'a', 'D4': 's', 'E4': 'd' };

            const result = songDisplayManager.create3DVisibleField(song, invertedKeyNoteMap);
            
            expect(result).to.have.length(2);
            expect(result[0]).to.deep.include({
                id: 'C4_0',
                letter: 'a',
                time: 0,
                duration: 1,
                state: 'unplayed'
            });
            expect(result[1]).to.deep.include({
                id: 'D4_2',
                letter: 's',
                time: 2,
                duration: 0.5,
                state: 'unplayed'
            });
        });

        it('should filter out notes not in key map', function() {
            const song = [
                { name: 'X4', time: 0, duration: 1 },
                { name: 'Y4', time: 2, duration: 0.5 }
            ];
            const invertedKeyNoteMap = { 'C4': 'a', 'D4': 's' };

            const result = songDisplayManager.create3DVisibleField(song, invertedKeyNoteMap);
            
            expect(result).to.have.length(0);
        });
    });
});
