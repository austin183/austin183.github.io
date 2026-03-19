// Mock Tone.js for Node.js testing
export const version = '14.7.77';

/**
 * Create a mock Tone.js object for testing
 * @returns {Object} Mock Tone.js API
 */
export function createToneMock() {
    return {
        version,
        now: () => Date.now() / 1000,
        PolySynth: class MockPolySynth {
            constructor(params = {}) {
                this.params = params;
                this._disposed = false;
            }
            
            toDestination() { return this; }
            
            disconnect() {
                // Stub - no-op in test environment
            }
            
            triggerAttackRelease(note, duration, time = 'now', velocity = 1) {
                // Stub - no-op in test environment
            }
            
            dispose() {
                this._disposed = true;
            }
        },
        Synth: class MockSynth {
            constructor(params = {}) {
                this.params = params;
                this._disposed = false;
            }
            
            toDestination() { return this; }
            
            disconnect() {
                // Stub - no-op in test environment
            }
            
            triggerAttackRelease(note, duration, time = 'now', velocity = 1) {
                // Stub - no-op in test environment
            }
            
            dispose() {
                this._disposed = true;
            }
        },
        FMSynth,
        MembraneSynth,
        Transport,
        SampleRate: 44100
    };
}

export class FMSynth {
    constructor(params = {}) {
        this.params = params;
        this._disposed = false;
    }
    
    dispose() {
        this._disposed = true;
    }
    
    disconnect() {
        // Stub - no-op in test environment
    }
    
    toDestination() {
        return this;
    }
}

export class MembraneSynth {
    constructor(params = {}) {
        this.params = params;
        this._disposed = false;
    }
    
    dispose() {
        this._disposed = true;
    }
    
    disconnect() {
        // Stub - no-op in test environment
    }
    
    toDestination() {
        return this;
    }
}

export function Transport() {}
Transport.schedule = () => {};
Transport.now = () => 'now';

export { Transport as default };
