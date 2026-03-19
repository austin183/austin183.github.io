import getScoringSettings from './scoringSettings.js';
import { SCORING } from './GameConstants.js';

function getScoreKeeper(scoringSettings, debugLogger = null) {
    const settings = scoringSettings || getScoringSettings().default;
    const goodRange = settings.goodRange;
    const okRange = settings.okRange;
    const badRange = settings.badRange;
    const goodPoints = settings.goodPoints;
    const okPoints = settings.okPoints;
    let score = {
        total: 0,
        keyScores: {}
    };
    let previousPressedKeys = {};
    let now;

    return {
        reset: function() {
            score.total = 0;
            score.keyScores = {};
            previousPressedKeys = {};
        },

        calculateNewScore: function(visibleField, pressedKeys, nowParam, earliestNoteIndex, visibleFuture) {
            now = nowParam;

            if (debugLogger?.enabled) {
                const activeKeys = Object.keys(pressedKeys || {}).filter(k => pressedKeys[k] === true);
                debugLogger.log('ScoreKeeper.calculateNewScore called:', {
                    now: now,
                    visibleFieldLength: visibleField?.length,
                    activeKeys: activeKeys,
                    allPressedKeys: pressedKeys || {},
                    previousPressedKeys: previousPressedKeys || {},
                    earliestNoteIndex: earliestNoteIndex,
                    visibleFuture: visibleFuture,
                });
            }

            const newPressedKeys = this._processKeyPresses(visibleField, pressedKeys, earliestNoteIndex, visibleFuture);
            this._detectMissedNotes(visibleField, earliestNoteIndex);

            previousPressedKeys = newPressedKeys;
            return score;
        },

        _processKeyPresses: function(visibleField, pressedKeys, earliestNoteIndex, visibleFuture) {
            const newPressedKeys = {};
            
            for (const key in pressedKeys) {
                if (pressedKeys[key] !== true) {
                    continue;
                }

                newPressedKeys[key] = true;

                if (!previousPressedKeys[key]) {
                    this._scoreKeyHit(key, visibleField, earliestNoteIndex, visibleFuture);
                }
            }

            return newPressedKeys;
        },

        _scoreKeyHit: function(key, visibleField, earliestNoteIndex, visibleFuture) {
            let closestNoteId = null;
            let closestDistance = Infinity;

            for (let i = earliestNoteIndex; i < visibleField.length; i++) {
                const canvasNote = visibleField[i];

                if (canvasNote.time > visibleFuture) {
                    break;
                }

                if (canvasNote.letter === key) {
                    const distanceToNow = canvasNote.time - now;

                    if (Math.abs(distanceToNow) < Math.abs(closestDistance)) {
                        closestDistance = distanceToNow;
                        closestNoteId = canvasNote.id;
                    } else {
                        break;
                    }
                }
            }

            if (debugLogger?.enabled && closestNoteId) {
                debugLogger.log('Found matching note:', { 
                    key, 
                    closestNoteId, 
                    closestNoteTime: closestDistance,
                    goodRange, 
                    okRange, 
                    badRange,
                    inGoodRange: closestDistance <= goodRange,
                    inOkRange: closestDistance <= okRange,
                    inBadRange: closestDistance <= badRange,
                    alreadyScored: !!score.keyScores[closestNoteId]
                });
            }

            if (closestNoteId && !score.keyScores[closestNoteId]) {
                this._applyScoreForDistance(closestNoteId, closestDistance);
            }
        },

        _applyScoreForDistance: function(noteId, distance) {
            if (distance <= goodRange) {
                if (debugLogger?.enabled) { 
                    debugLogger.log('SCORING GOOD!', distance, '<=', goodRange); 
                }
                score.total += goodPoints;
                score.keyScores[noteId] = { 
                    points: goodPoints, 
                    tag: SCORING.TAGS.GOOD 
                };
            } else if (distance <= okRange) {
                score.total += okPoints;
                score.keyScores[noteId] = { 
                    points: okPoints, 
                    tag: SCORING.TAGS.OK 
                };
            } else if (distance <= badRange) {
                score.keyScores[noteId] = { 
                    points: 0, 
                    tag: SCORING.TAGS.BAD 
                };
            }
        },

        _detectMissedNotes: function(visibleField, earliestNoteIndex) {
            for (let i = earliestNoteIndex; i < visibleField.length; i++) {
                const canvasNote = visibleField[i];
                const distanceToNow = now - canvasNote.time;

                if (!score.keyScores[canvasNote.id] && distanceToNow > badRange) {
                    score.keyScores[canvasNote.id] = { 
                        points: 0, 
                        tag: SCORING.TAGS.MISSED 
                    };
                }

                if (canvasNote.time > now) {
                    break;
                }
            }
        },

        getCounts: function() {
            const counts = {
                goodCount: 0,
                okCount: 0,
                badCount: 0,
                missedCount: 0
            };
            for (const key in score.keyScores) {
                const keyScore = score.keyScores[key];
                switch (keyScore.tag) {
                    case SCORING.TAGS.GOOD:
                        counts.goodCount++;
                        break;
                    case SCORING.TAGS.OK:
                        counts.okCount++;
                        break;
                    case SCORING.TAGS.BAD:
                        counts.badCount++;
                        break;
                    case SCORING.TAGS.MISSED:
                        counts.missedCount++;
                        break;
                }
            }
            return counts;
        }
    };
}

export default getScoreKeeper;