function getDifficultySettings(){
    return {
        "A Bit Less Please": {
            difficultyKey: "easy",
            minNoteDistance: .7,
            minNoteDuration: .2
        },
        "Normal": {
            difficultyKey: "normal",
            minNoteDistance: .5,
            minNoteDuration: .1
        },
        "A Bit More Please": {
            difficultyKey: "hard",
            minNoteDistance: .4,
            minNoteDuration: .1
        },
        "Insanity": {
            difficultyKey: "crazy",
            minNoteDistance: .1,
            minNoteDuration: .01
        }
    };
}