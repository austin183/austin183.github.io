export function createLogger(debugMode = false) {
    return {
        log(message, args) {
            if (debugMode) {
                console.log(message, args);
            }
        },

        error(message, args) {
            if (debugMode) {
                console.error(message, args);
            }
        },

        warn(message, args) {
            if (debugMode) {
                console.warn(message, args);
            }
        }
    };
}
