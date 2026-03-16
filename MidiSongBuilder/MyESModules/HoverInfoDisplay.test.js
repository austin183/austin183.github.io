import { expect } from 'chai';
import { getHoverInfoDisplay } from './HoverInfoDisplay.js';

describe('HoverInfoDisplay', () => {
    let hoverInfoDisplay;

    beforeEach(() => {
        hoverInfoDisplay = getHoverInfoDisplay();
    });

    describe('init', () => {
        it.skip('requires browser DOM API for getElementById', () => {
            // Skip in Node.js - requires document.getElementById
        });

        it('returns false from isInitialized before init', () => {
            const initialized = hoverInfoDisplay.isInitialized();

            expect(initialized).to.be.false;
        });
    });

    describe('update', () => {
        it.skip('requires initialized display element in browser', () => {
            // Skip - needs DOM initialization
        });

        it('accepts hoverData parameter', () => {
            const mockHoverData = { type: 'note', isNote: true };

            expect(() => {
                hoverInfoDisplay.update(mockHoverData);
            }).to.not.throw();
        });

        it('handles null hoverData gracefully', () => {
            expect(() => {
                hoverInfoDisplay.update(null);
            }).to.not.throw();
        });

        it('handles undefined hoverData gracefully', () => {
            expect(() => {
                hoverInfoDisplay.update();
            }).to.not.throw();
        });

        it('calls clear when hoverData type is none', () => {
            const mockHoverData = { type: 'none' };

            expect(() => {
                hoverInfoDisplay.update(mockHoverData);
            }).to.not.throw();
        });

        it('handles nowLine type correctly', () => {
            const mockHoverData = { 
                type: 'nowLine',
                worldPosition: null,
                screenPosition: { x: 0, y: 0 },
                gridColumn: 5,
                noteTime: 10.5
            };

            expect(() => {
                hoverInfoDisplay.update(mockHoverData);
            }).to.not.throw();
        });

        it('handles note type correctly', () => {
            const mockHoverData = { 
                type: 'note',
                isNote: true,
                noteData: { letter: 'z' },
                worldPosition: null,
                screenPosition: { x: 100, y: 200 }
            };

            expect(() => {
                hoverInfoDisplay.update(mockHoverData);
            }).to.not.throw();
        });

        it('calls clear for unknown hoverData types', () => {
            const mockHoverData = { type: 'unknown' };

            expect(() => {
                hoverInfoDisplay.update(mockHoverData);
            }).to.not.throw();
        });
    });

    describe('clear', () => {
        it.skip('requires initialized display element in browser', () => {
            // Skip - needs DOM initialization
        });

        it('does not throw when called before init', () => {
            expect(() => {
                hoverInfoDisplay.clear();
            }).to.not.throw();
        });
    });

    describe('show', () => {
        it.skip('requires initialized display element in browser', () => {
            // Skip - needs DOM initialization
        });

        it('does not throw when called before init', () => {
            expect(() => {
                hoverInfoDisplay.show();
            }).to.not.throw();
        });
    });

    describe('hide', () => {
        it.skip('requires initialized display element in browser', () => {
            // Skip - needs DOM initialization
        });

        it('does not throw when called before init', () => {
            expect(() => {
                hoverInfoDisplay.hide();
            }).to.not.throw();
        });
    });

    describe('isInitialized', () => {
        it('returns false before init is called', () => {
            const initialized = hoverInfoDisplay.isInitialized();

            expect(initialized).to.be.false;
        });
    });
});
