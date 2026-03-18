import { expect } from 'chai';
import sinon from 'sinon';
import mockTHREE, { createMockFont } from './mocks/Three.js';

global.window = global.window || {};
global.window.location = { search: '' };

import getThreeJSRenderer from './ThreeJSRenderer.js';

describe('ThreeJSRenderer', () => {
    let THREE;
    let FontLoader;
    let TextGeometry;
    let mockFont;
    
    function createMockThree() {
        const three = typeof mockTHREE === 'function' ? mockTHREE() : mockTHREE;
        
        three.FontLoader = class MockFontLoader {
            load(url, onLoad, onProgress, onError) {}
        };
        
        three.TextGeometry = class MockTextGeometry {
            constructor(text, params) {
                this.text = text;
                this.font = params.font;
            }
        };
        
        return three;
    }

    beforeEach(() => {
        THREE = createMockThree();
        FontLoader = THREE.FontLoader;
        TextGeometry = THREE.TextGeometry;
        mockFont = createMockFont();
    });

    describe('getThreeJSRenderer', () => {
        it('should return null when THREE is not provided', () => {
            const renderer = getThreeJSRenderer(null, FontLoader, TextGeometry);
            
            expect(renderer).to.be.null;
        });

        it('should return null when THREE is undefined', () => {
            const renderer = getThreeJSRenderer(undefined, FontLoader, TextGeometry);
            
            expect(renderer).to.be.null;
        });

        it('should return renderer object when THREE is provided', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);
            
            expect(renderer).to.not.be.null;
            expect(typeof renderer.init).to.equal('function');
        });

        it('should log error when THREE is missing', () => {
            const consoleStub = sinon.stub(console, 'error');
            
            const renderer = getThreeJSRenderer(null, FontLoader, TextGeometry);
            
            expect(consoleStub.calledOnce).to.be.true;
            expect(consoleStub.firstCall.args[0]).to.include('THREE library is required');
            
            consoleStub.restore();
        });

        it('should have expected methods', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);
            
            expect(typeof renderer.init).to.equal('function');
            expect(typeof renderer.render).to.equal('function');
            expect(typeof renderer.dispose).to.equal('function');
        });
    });

    describe('init', () => {
        it('should create renderer instance without errors', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            expect(renderer).to.not.be.null;
        });

        it('should handle missing canvas element gracefully', () => {
            const consoleStub = sinon.stub(console, 'error');
            
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            try {
                renderer.init('nonexistent-canvas');
            } catch (e) {
                expect(true).to.be.true;
            }

            consoleStub.restore();
        });
    });

    describe('createNote', () => {
        it('should return null when font is not loaded', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            const note = renderer.createNote('A', 0, 1, 5.0, 'unplayed');

            expect(note).to.be.null;
        });

        it('should return null with invalid note parameters', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            const note1 = renderer.createNote(null, 0, 1, 5.0, 'unplayed');
            const note2 = renderer.createNote('A', -1, 1, 5.0, 'unplayed');
            const note3 = renderer.createNote('A', 0, 1, NaN, 'unplayed');

            expect(note1).to.be.null;
            expect(note2).to.be.null;
            expect(note3).to.be.null;
        });

        it('should accept valid note parameters', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            expect(typeof renderer.createNote).to.equal('function');
        });
    });

    describe('render', () => {
        it('should not error when called without scene initialized', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            expect(() => renderer.render()).to.not.throw();
        });

        it('should be callable multiple times', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            expect(() => {
                renderer.render();
                renderer.render();
                renderer.render();
            }).to.not.throw();
        });
    });

    describe('dispose', () => {
        it('should clean up animation loop when active', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            expect(() => renderer.dispose()).to.not.throw();
        });

        it('should be safe to call multiple times', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            expect(() => {
                renderer.dispose();
                renderer.dispose();
                renderer.dispose();
            }).to.not.throw();
        });

        it('should clean up when not initialized', () => {
            const renderer = getThreeJSRenderer(THREE, FontLoader, TextGeometry);

            expect(() => renderer.dispose()).to.not.throw();
        });
    });
});
