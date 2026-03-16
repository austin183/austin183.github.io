/**
 * VisibleFieldFactory - Factory for creating visible field calculation strategies
 * 
 * Implements Strategy pattern to encapsulate different visible field calculation approaches:
 * - DifficultyBasedVisibleField: Uses song-specific difficulty settings with direct filtering
 * - TargetNPMVisibleField: Uses target notes-per-minute with iterative optimization
 * 
 * This removes conditional logic from main files and improves OCP compliance.
 */

class DifficultyBasedVisibleField {
    constructor(config) {
        this.visibleFieldFilterer = config.visibleFieldFilterer;
        this.songNoteRenderer = config.songNoteRenderer;
    }
    
    build(song, minNoteDistance, minDuration, invertedKeyNoteMap, keyRenderInfo, notesCanvas) {
        return this.visibleFieldFilterer.filterToFullVisibleField(
            song, 
            minNoteDistance, 
            minDuration, 
            invertedKeyNoteMap, 
            keyRenderInfo, 
            notesCanvas, 
            this.songNoteRenderer
        );
    }
}

class TargetNPMVisibleField {
    constructor(config) {
        this.visibleFieldFilterer = config.visibleFieldFilterer;
        this.difficultySettingsCalculator = config.difficultySettingsCalculator;
        this.songNoteRenderer = config.songNoteRenderer;
    }
    
    build(targetNotesPerMinute, song, invertedKeyNoteMap, keyRenderInfo, notesCanvas, songEnd) {
        return this.difficultySettingsCalculator.getTargetVisibleField(
            targetNotesPerMinute, 
            song, 
            invertedKeyNoteMap, 
            this.visibleFieldFilterer, 
            keyRenderInfo, 
            notesCanvas, 
            this.songNoteRenderer,
            songEnd
        );
    }
}

export function getVisibleFieldFactory(difficultyConfig) {
    if (difficultyConfig && difficultyConfig.songDifficultySettings) {
        return new DifficultyBasedVisibleField(difficultyConfig);
    }
    return new TargetNPMVisibleField(difficultyConfig);
}
