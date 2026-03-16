// Mock Tone.js for Node.js testing
export const version = '14.7.77';

export class FMSynth {
    constructor(params = {}) {
        this.params = params;
        this._disposed = false;
    }
    
    dispose() {
        this._disposed = true;
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
    
    toDestination() {
        return this;
    }
}

export function Transport() {}
Transport.schedule = () => {};
Transport.now = () => 'now';

export { Transport as default };
