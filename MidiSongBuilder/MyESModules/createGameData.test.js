import { expect } from 'chai';
import sinon from 'sinon';
import { createGameData } from './createGameData.js';

describe('createGameData', () => {
    let mockMidiSongs;
    let mockDefaultKeyNoteMap;
    let mockKeyNoteMapCollection;
    let mockDifficultySettingsObj;
    let mockHighScoreTracker;
    let mockChallengeScoresObj;

    beforeEach(() => {
        mockMidiSongs = [{ filename: 'song1.mid', difficultySettings: {} }];
        mockDefaultKeyNoteMap = { keyNoteMap: {} };
        mockKeyNoteMapCollection = [mockDefaultKeyNoteMap];
        mockDifficultySettingsObj = {
            Normal: { minNoteDuration: 0.1, minNoteDistance: 50, difficultyKey: 'Normal' }
        };
        mockHighScoreTracker = { getHighScore: sinon.stub() };
        mockChallengeScoresObj = { getSelectedScore: sinon.stub() };
    });

    describe('Node.js compatibility', () => {
        it('exports createGameData function', () => {
            expect(createGameData).to.be.a('function');
        });

        it('returns a function (data factory)', () => {
            const dataFactory = createGameData({ mode: '2d', midiSongs: mockMidiSongs });
            expect(dataFactory).to.be.a('function');
        });

        it('returns data object with all required properties for 2D mode', () => {
            const dataFactory = createGameData({
                mode: '2d',
                midiSongs: mockMidiSongs,
                defaultKeyNoteMap: mockDefaultKeyNoteMap,
                keyNoteMapCollection: mockKeyNoteMapCollection,
                difficultySettingsObj: mockDifficultySettingsObj,
                highScoreTracker: mockHighScoreTracker,
                challengeScoresObj: mockChallengeScoresObj
            });

            const data = dataFactory();

            // Key note map properties
            expect(data.selectedKeyNoteMap).to.equal(mockDefaultKeyNoteMap);
            expect(data.availableKeyNoteMaps).to.equal(mockKeyNoteMapCollection);

            // Rendering display properties
            expect(data.renderedNotesPlaying).to.equal('');
            expect(data.songNotes).to.equal('');
            expect(data.songNotesOnKeyMap).to.equal('');

            // Track selection properties
            expect(data.selectedTrack).to.equal('');
            expect(data.availableTracks).to.deep.equal([]);

            // Canvas references (initialized in mounted lifecycle)
            expect(data.vueCanvas).to.equal(null);
            expect(data.notesCanvas).to.equal(null);

            // Score tracking properties
            expect(data.score).to.equal(0);
            expect(data.goodCount).to.equal(0);
            expect(data.okCount).to.equal(0);
            expect(data.badCount).to.equal(0);
            expect(data.missedCount).to.equal(0);

            // Difficulty properties (initialized from Normal difficulty)
            expect(data.minDuration).to.equal(0.1);
            expect(data.minNoteDistance).to.equal(50);

            // Volume control properties
            expect(data.playerVolume).to.equal(0.7);
            expect(data.trackVolume).to.equal(1);

            // MIDI file properties
            expect(data.midiJson).to.equal('');
            expect(data.midiSongs).to.equal(mockMidiSongs);
            expect(data.selectedMidiSong).to.equal(null);
            expect(data.songEnd).to.equal(null);

            // Difficulty settings reference
            expect(data.difficultySettings).to.equal(mockDifficultySettingsObj);
            expect(data.selectedDifficulty).to.deep.equal(mockDifficultySettingsObj.Normal);

            // High score tracking
            expect(data.toggleTrackHighScores).to.equal(false);
            expect(data.highScore).to.equal(0);
            expect(data.challengeScore).to.equal(0);

            // 3D-specific properties should NOT exist in 2D mode
            expect(data.hasOwnProperty('threeJSRenderer')).to.be.false;
            expect(data.hasOwnProperty('keyRenderInfo')).to.be.false;
        });

        it('includes 3D-specific properties in 3D mode', () => {
            const mockKeyRenderInfo = {};
            const dataFactory = createGameData({
                mode: '3d',
                midiSongs: mockMidiSongs,
                defaultKeyNoteMap: mockDefaultKeyNoteMap,
                keyNoteMapCollection: mockKeyNoteMapCollection,
                difficultySettingsObj: mockDifficultySettingsObj,
                highScoreTracker: mockHighScoreTracker,
                challengeScoresObj: mockChallengeScoresObj,
                keyRenderInfo: mockKeyRenderInfo
            });

            const data = dataFactory();

            // 3D-specific properties should exist in 3D mode
            expect(data.threeJSRenderer).to.equal(null);
            expect(data.keyRenderInfo).to.equal(mockKeyRenderInfo);
        });

        it('uses custom default values when provided', () => {
            const dataFactory = createGameData({
                mode: '2d',
                midiSongs: mockMidiSongs,
                defaultKeyNoteMap: mockDefaultKeyNoteMap,
                keyNoteMapCollection: mockKeyNoteMapCollection,
                difficultySettingsObj: mockDifficultySettingsObj,
                highScoreTracker: mockHighScoreTracker,
                challengeScoresObj: mockChallengeScoresObj,
                defaultNotesPlaying: 'custom playing',
                defaultSongNotes: 'custom notes',
                defaultSongNotesOnKeyMap: 'custom keymap'
            });

            const data = dataFactory();

            expect(data.renderedNotesPlaying).to.equal('custom playing');
            expect(data.songNotes).to.equal('custom notes');
            expect(data.songNotesOnKeyMap).to.equal('custom keymap');
        });

        it('handles missing optional parameters gracefully', () => {
            const dataFactory = createGameData({
                mode: '2d',
                midiSongs: mockMidiSongs,
                defaultKeyNoteMap: mockDefaultKeyNoteMap,
                keyNoteMapCollection: mockKeyNoteMapCollection,
                difficultySettingsObj: mockDifficultySettingsObj,
                highScoreTracker: mockHighScoreTracker,
                challengeScoresObj: mockChallengeScoresObj
            });

            expect(() => dataFactory()).to.not.throw();
        });
    });
});
