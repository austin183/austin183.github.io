import { expect } from 'chai';

describe('BrowserUtils', () => {
    it('should export getBrowserUtils function', async function() {
        const module = await import('./BrowserUtils.js');
        
        expect(module.getBrowserUtils).to.be.a('function');
    });

    it('should return an object with isFileAPISupported method', async function() {
        const module = await import('./BrowserUtils.js');
        const utils = module.getBrowserUtils();
        
        expect(utils).to.be.an('object');
        expect(utils.isFileAPISupported).to.be.a('function');
    });

    it.skip('should return a boolean from isFileAPISupported - requires browser environment', async function() {
        const module = await import('./BrowserUtils.js');
        const utils = module.getBrowserUtils();
        
        const result = utils.isFileAPISupported();
        
        expect(typeof result).to.equal('boolean');
    });

    it.skip('should have consistent output for repeated calls - requires browser environment', async function() {
        const module = await import('./BrowserUtils.js');
        const utils = module.getBrowserUtils();
        
        const result1 = utils.isFileAPISupported();
        const result2 = utils.isFileAPISupported();
        
        expect(result1).to.equal(result2);
    });

    it('should return different utils instance on each call', async function() {
        const module = await import('./BrowserUtils.js');
        
        const utils1 = module.getBrowserUtils();
        const utils2 = module.getBrowserUtils();
        
        expect(utils1).to.not.equal(utils2);
    });

    it.skip('should have isFileAPISupported return same result - requires browser environment', async function() {
        const module = await import('./BrowserUtils.js');
        
        const utils1 = module.getBrowserUtils();
        const utils2 = module.getBrowserUtils();
        
        expect(utils1.isFileAPISupported()).to.equal(utils2.isFileAPISupported());
    });

    it.skip('should work in browser environment - requires window object', async function() {
        const module = await import('./BrowserUtils.js');
        const utils = module.getBrowserUtils();
        
        // In browser, this should return true or false based on File API support
        expect(typeof utils.isFileAPISupported()).to.equal('boolean');
    });

    it('should have isFileAPISupported as a function that takes no arguments', async function() {
        const module = await import('./BrowserUtils.js');
        const utils = module.getBrowserUtils();
        
        expect(utils.isFileAPISupported.length).to.equal(0);
    });

    it('should have isFileAPISupported function in returned object', async function() {
        const module = await import('./BrowserUtils.js');
        const utils = module.getBrowserUtils();
        
        expect(utils).to.have.property('isFileAPISupported');
    });

    it('should have only isFileAPISupported method', async function() {
        const module = await import('./BrowserUtils.js');
        const utils = module.getBrowserUtils();
        
        expect(Object.keys(utils)).to.deep.equal(['isFileAPISupported']);
    });

    it('should have isFileAPISupported as own property', async function() {
        const module = await import('./BrowserUtils.js');
        const utils = module.getBrowserUtils();
        
        expect(utils.hasOwnProperty('isFileAPISupported')).to.be.true;
    });

    it('should export only getBrowserUtils', async function() {
        const module = await import('./BrowserUtils.js');
        
        expect(Object.keys(module)).to.deep.equal(['getBrowserUtils']);
    });
});
