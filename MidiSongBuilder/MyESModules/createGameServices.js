/**
 * createGameServices - Factory for creating Vue app services configuration (DI container injection)
 * 
 * Extracts dependency injection setup from the fat config object.
 * Provides services to child components via Vue's provide/inject pattern:
 * - $midiParser: Parse MIDI files and array buffers
 * - $songNoteRenderer: Render notes to canvas/3D scene
 * - $keyNoteMapService: Map keyboard keys to musical notes
 * - $registry: Component service registry for DIP compliance
 * - $getScoreKeeper: Factory function to create score keeper instances
 * - $getScoringSettings: Get scoring configuration for different difficulties
 */

export function createGameServices({ 
    midiParser,
    songNoteRenderer,
    keyNoteMapService,
    componentRegistry,
    getScoreKeeper,
    getScoringSettings
}) {
    return {
        // Provide services to child components via Vue's provide/inject pattern
        provide() {
            return {
                // MIDI parsing service - parses .midi files into JSON format
                $midiParser: midiParser,
                
                // Note rendering service - draws notes on canvas or in 3D scene
                $songNoteRenderer: songNoteRenderer,
                
                // Key mapping service - translates keyboard input to musical notes
                $keyNoteMapService: keyNoteMapService,
                
                // Component registry - service locator for dependency injection
                $registry: componentRegistry,
                
                // Score keeper factory - creates score tracking instances
                $getScoreKeeper: getScoreKeeper,
                
                // Scoring settings - gets difficulty-based scoring parameters
                $getScoringSettings: getScoringSettings
            };
        }
    };
}
