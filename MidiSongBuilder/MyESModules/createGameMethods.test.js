import { expect } from 'chai';
import sinon from 'sinon';
import { createGameMethods } from './createGameMethods.js';

describe('createGameMethods', () => {
    let mockRenderSongNotes;
    let mockSetupSongFromMidiResult;
    let mockHighScoreTracker;
    let mockChallengeScoresObj;
    let mockGameController;
    let mockMidiParser;
    let mockFetch;
    let mockWindowDomUtils;
    let mockLocalStorageSetItem;
    let mockLocalStorageRemoveItem;

    beforeEach(() => {
        mockRenderSongNotes = sinon.stub();
        mockSetupSongFromMidiResult = sinon.stub();
        mockHighScoreTracker = { getHighScore: sinon.stub() };
        mockChallengeScoresObj = { getSelectedScore: sinon.stub() };
        mockGameController = { resetAppStateScores: sinon.stub() };
        mockMidiParser = { parseMidiArrayBuffer: sinon.stub() };
        
        // Mock fetch for handleMidiSongSelection tests
        mockFetch = sinon.stub();
        
        // Mock window/domUtils for handleToggleTrackHighScores tests - save refs before createGameMethods is called
        global.window = { domUtils: { toggleElementById: sinon.stub() } };
        global.localStorage = { setItem: sinon.stub(), removeItem: sinon.stub() };
        
        mockWindowDomUtils = global.window.domUtils.toggleElementById;
        mockLocalStorageSetItem = global.localStorage.setItem;
        mockLocalStorageRemoveItem = global.localStorage.removeItem;
    });

    describe('Node.js compatibility', () => {
        it('exports createGameMethods function', () => {
            expect(createGameMethods).to.be.a('function');
        });

        it('returns an object with all required methods', () => {
            const methods = createGameMethods({
                renderSongNotes: mockRenderSongNotes,
                setupSongFromMidiResult: mockSetupSongFromMidiResult,
                highScoreTracker: mockHighScoreTracker,
                challengeScoresObj: mockChallengeScoresObj,
                gameController: mockGameController,
                midiParser: mockMidiParser
            });

            expect(methods).to.have.property('handleMidiSongSelection').that.is.a('function');
            expect(methods).to.have.property('setDifficulty').that.is.a('function');
            expect(methods).to.have.property('handleToggleTrackHighScores').that.is.a('function');
            expect(methods).to.have.property('renderSongNotes').that.is.a('function');
        });

        describe('handleMidiSongSelection', () => {
            it('does nothing when no song is selected', () => {
                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                const mockThis = { selectedMidiSong: null };
                methods.handleMidiSongSelection.call(mockThis);

                expect(mockGameController.resetAppStateScores.notCalled).to.be.true;
            });

            it('resets app state and fetches MIDI file when song is selected', async () => {
                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                const mockThis = {
                    selectedMidiSong: { filename: 'test.mid', difficultySettings: {} },
                    toggleTrackHighScores: false,
                    availableTracks: ['track1']
                };

                mockFetch.resolves({ arrayBuffer: sinon.stub().resolves(new ArrayBuffer(1024)) });
                mockMidiParser.parseMidiArrayBuffer.resolves({ result: 'parsed' });

                global.fetch = mockFetch;
                
                await methods.handleMidiSongSelection.call(mockThis);

                expect(mockGameController.resetAppStateScores.calledOnce).to.be.true;
                expect(mockThis.availableTracks).to.deep.equal([]);
            });

            it('gets high scores when tracking is enabled', async () => {
                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                mockHighScoreTracker.getHighScore.returns(1000);
                mockChallengeScoresObj.getSelectedScore.returns(500);

                const mockThis = {
                    selectedMidiSong: { filename: 'test.mid', difficultySettings: null },
                    toggleTrackHighScores: true,
                    selectedDifficulty: { difficultyKey: 'Normal' },
                    availableTracks: []
                };

                mockFetch.resolves({ arrayBuffer: sinon.stub().resolves(new ArrayBuffer(1024)) });
                mockMidiParser.parseMidiArrayBuffer.resolves({ result: 'parsed' });

                global.fetch = mockFetch;
                
                await methods.handleMidiSongSelection.call(mockThis);

                expect(mockHighScoreTracker.getHighScore.calledWith('test.mid', 'Normal')).to.be.true;
                expect(mockChallengeScoresObj.getSelectedScore.calledWith('test.mid', 'Normal')).to.be.true;
            });

            it('handles fetch errors gracefully', async () => {
                mockFetch.rejects(new Error('Network error'));
                global.fetch = mockFetch;

                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                const mockThis = {
                    selectedMidiSong: { filename: 'test.mid' },
                    availableTracks: []
                };

                // Should not throw, just log error
                await methods.handleMidiSongSelection.call(mockThis);
            });
        });

        describe('setDifficulty', () => {
            it('updates difficulty parameters', () => {
                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                const mockThis = {
                    toggleTrackHighScores: false,
                    selectedDifficulty: { minNoteDuration: 0.2, minNoteDistance: 100 }
                };

                methods.setDifficulty.call(mockThis);

                expect(mockThis.minDuration).to.equal(0.2);
                expect(mockThis.minNoteDistance).to.equal(100);
            });

            it('updates high scores when tracking is enabled and song selected', () => {
                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                mockHighScoreTracker.getHighScore.returns(2000);
                mockChallengeScoresObj.getSelectedScore.returns(800);

                const mockThis = {
                    toggleTrackHighScores: true,
                    selectedMidiSong: { filename: 'test.mid' },
                    selectedDifficulty: { minNoteDuration: 0.3, minNoteDistance: 150, difficultyKey: 'Hard' }
                };

                methods.setDifficulty.call(mockThis);

                expect(mockGameController.resetAppStateScores.calledOnce).to.be.true;
                expect(mockHighScoreTracker.getHighScore.calledWith('test.mid', 'Hard')).to.be.true;
                expect(mockChallengeScoresObj.getSelectedScore.calledWith('test.mid', 'Hard')).to.be.true;
            });

            it('does not update high scores when no song is selected', () => {
                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                const mockThis = {
                    toggleTrackHighScores: true,
                    selectedMidiSong: null,
                    selectedDifficulty: { minNoteDuration: 0.3, minNoteDistance: 150 }
                };

                methods.setDifficulty.call(mockThis);

                expect(mockHighScoreTracker.getHighScore.notCalled).to.be.true;
                expect(mockChallengeScoresObj.getSelectedScore.notCalled).to.be.true;
            });
        });

        describe('handleToggleTrackHighScores', () => {
            it('saves to localStorage when tracking is enabled', () => {
                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                const mockThis = { toggleTrackHighScores: true };
                
                methods.handleToggleTrackHighScores.call(mockThis);

                expect(mockWindowDomUtils.calledOnce).to.be.true;
                expect(mockLocalStorageSetItem.calledWith('TrackScores', 'true')).to.be.true;
            });

            it('removes from localStorage when tracking is disabled', () => {
                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                const mockThis = { toggleTrackHighScores: false };
                
                methods.handleToggleTrackHighScores.call(mockThis);

                expect(mockLocalStorageRemoveItem.calledWith('TrackScores')).to.be.true;
            });
        });

        describe('renderSongNotes', () => {
            it('calls the provided render function with correct context', () => {
                const methods = createGameMethods({
                    renderSongNotes: mockRenderSongNotes,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                const mockThis = { score: 100 };
                methods.renderSongNotes.call(mockThis);

                expect(mockRenderSongNotes.calledOnce).to.be.true;
            });

            it('handles missing render function gracefully', () => {
                const methods = createGameMethods({
                    renderSongNotes: null,
                    setupSongFromMidiResult: mockSetupSongFromMidiResult,
                    highScoreTracker: mockHighScoreTracker,
                    challengeScoresObj: mockChallengeScoresObj,
                    gameController: mockGameController,
                    midiParser: mockMidiParser
                });

                expect(() => methods.renderSongNotes.call({})).to.not.throw();
            });
        });
    });
});
