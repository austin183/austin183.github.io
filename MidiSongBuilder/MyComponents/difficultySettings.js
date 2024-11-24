function getDifficultySettings(){
    return {
        "A Bit Less Please": {
            difficultyKey: "easy",
            minNoteDistance: .5,
            minNoteDuration: .2,
            targetNotesPerMinute: 60
        },
        "Normal": {
            difficultyKey: "normal",
            minNoteDistance: .25,
            minNoteDuration: .2,
            targetNotesPerMinute: 100
        },
        "A Bit More Please": {
            difficultyKey: "hard",
            minNoteDistance: .15,
            minNoteDuration: .2,
            targetNotesPerMinute: 120
        },
        "Insanity": {
            difficultyKey: "crazy",
            minNoteDistance: 0.1,
            minNoteDuration: .1,
            targetNotesPerMinute: 160
        }
    };
}