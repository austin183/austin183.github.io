function getScoringSettings() {
    return {
        default: {
            goodRange: 0.15,    // within 150 milliseconds is good
            okRange: 0.4,       // within 400 milliseconds is ok
            badRange: 0.7,      // within 700 milliseconds is bad
            goodPoints: 100,
            okPoints: 50
        },
        easy: {
            goodRange: 0.2,     // more forgiving: 200ms for good
            okRange: 0.6,       // more forgiving: 600ms for ok
            badRange: 1.0,      // more forgiving: 1000ms for bad
            goodPoints: 100,
            okPoints: 50
        },
        hard: {
            goodRange: 0.1,     // stricter: 100ms for good
            okRange: 0.3,       // stricter: 300ms for ok
            badRange: 0.5,      // stricter: 500ms for bad
            goodPoints: 100,
            okPoints: 50
        }
    };
}

export default getScoringSettings;
