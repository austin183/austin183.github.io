function getDifficultySettings(){
    return {
        "A Bit Less Please": {
            difficultyKey: "easy",
            minNoteDistance: .5,
            minNoteDuration: .2,
            targetNotesPerMinute: 50
        },
        "Normal": {
            difficultyKey: "normal",
            minNoteDistance: .3,
            minNoteDuration: .17,
            targetNotesPerMinute: 60
        },
        "A Bit More Please": {
            difficultyKey: "hard",
            minNoteDistance: .2,
            minNoteDuration: .17,
            targetNotesPerMinute: 80
        },
        "Insanity": {
            difficultyKey: "crazy",
            minNoteDistance: 0.18,
            minNoteDuration: .17,
            targetNotesPerMinute: 100
        }
    };
}