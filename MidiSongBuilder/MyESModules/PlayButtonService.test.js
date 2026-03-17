import { expect } from 'chai';
import { createPlayButtonService } from './PlayButtonService.js';

describe('PlayButtonService', () => {
    const mockConstants = {};

    beforeEach(() => {
        // Skip in Node.js - requires browser DOM
        if (typeof document === 'undefined') {
            return;
        }

        // Set up test DOM element
        document.body.innerHTML = '<button id="tonePlayToggle" disabled>Play</button>';
    });

    afterEach(() => {
        // Skip in Node.js - requires browser DOM
        if (typeof document === 'undefined') {
            return;
        }

        document.body.innerHTML = '';
    });

    it('returns null when button not found', () => {
        const service = createPlayButtonService('nonexistent-button');
        expect(service).to.be.null;
    });

    it.skip('returns service object when button exists - requires browser environment', () => {
        const service = createPlayButtonService('tonePlayToggle');
        expect(service).to.not.be.null;
        expect(service.updateText).to.be.a('function');
        expect(service.enable).to.be.a('function');
        expect(service.disable).to.be.a('function');
    });

    describe('updateText', () => {
        it.skip('sets text to "Stop" when playing is true - requires browser environment', () => {
            const service = createPlayButtonService('tonePlayToggle');
            service.updateText(true);
            
            const button = document.getElementById('tonePlayToggle');
            expect(button.textContent).to.equal('Stop');
        });

        it.skip('sets text to "Restart" when playing is false - requires browser environment', () => {
            const service = createPlayButtonService('tonePlayToggle');
            service.updateText(false);
            
            const button = document.getElementById('tonePlayToggle');
            expect(button.textContent).to.equal('Restart');
        });

        it.skip('toggles text correctly on multiple calls - requires browser environment', () => {
            const service = createPlayButtonService('tonePlayToggle');
            
            service.updateText(true);
            expect(document.getElementById('tonePlayToggle').textContent).to.equal('Stop');
            
            service.updateText(false);
            expect(document.getElementById('tonePlayToggle').textContent).to.equal('Restart');
            
            service.updateText(true);
            expect(document.getElementById('tonePlayToggle').textContent).to.equal('Stop');
        });
    });

    describe('enable', () => {
        it.skip('removes disabled attribute from button - requires browser environment', () => {
            const service = createPlayButtonService('tonePlayToggle');
            
            expect(document.getElementById('tonePlayToggle').hasAttribute('disabled')).to.be.true;
            
            service.enable();
            
            expect(document.getElementById('tonePlayToggle').hasAttribute('disabled')).to.be.false;
        });

        it.skip('can be called multiple times without error - requires browser environment', () => {
            const service = createPlayButtonService('tonePlayToggle');
            
            expect(() => {
                service.enable();
                service.enable();
                service.enable();
            }).to.not.throw();
        });
    });

    describe('disable', () => {
        it.skip('adds disabled attribute to button - requires browser environment', () => {
            const service = createPlayButtonService('tonePlayToggle');
            
            // First enable to remove initial disabled state
            service.enable();
            expect(document.getElementById('tonePlayToggle').hasAttribute('disabled')).to.be.false;
            
            service.disable();
            
            expect(document.getElementById('tonePlayToggle').hasAttribute('disabled')).to.be.true;
        });

        it.skip('sets disabled attribute to "true" string - requires browser environment', () => {
            const service = createPlayButtonService('tonePlayToggle');
            service.enable();
            service.disable();
            
            const button = document.getElementById('tonePlayToggle');
            expect(button.getAttribute('disabled')).to.equal('true');
        });
    });

    describe('setInitialText', () => {
        it.skip('sets button text to "Play" - requires browser environment', () => {
            const service = createPlayButtonService('tonePlayToggle');
            
            // Change text first to verify setInitialText works
            document.getElementById('tonePlayToggle').textContent = 'Stop';
            
            service.setInitialText();
            
            expect(document.getElementById('tonePlayToggle').textContent).to.equal('Play');
        });
    });

    describe('integration', () => {
        it.skip('simulates full play/stop lifecycle - requires browser environment', () => {
            const service = createPlayButtonService('tonePlayToggle');
            
            // Initial state
            expect(document.getElementById('tonePlayToggle').textContent).to.equal('Play');
            expect(document.getElementById('tonePlayToggle').hasAttribute('disabled')).to.be.true;
            
            // Enable and start playing
            service.enable();
            service.updateText(true);
            expect(document.getElementById('tonePlayToggle').textContent).to.equal('Stop');
            expect(document.getElementById('tonePlayToggle').hasAttribute('disabled')).to.be.false;
            
            // Stop playing
            service.updateText(false);
            expect(document.getElementById('tonePlayToggle').textContent).to.equal('Restart');
        });
    });

    describe('Node.js compatibility', () => {
        it('exports createPlayButtonService function', () => {
            expect(createPlayButtonService).to.be.a('function');
        });

        it('returns null when called in Node.js (no DOM)', () => {
            const result = createPlayButtonService('any-id');
            // Should return null since no DOM exists
            expect(result).to.be.null;
        });
    });
});
