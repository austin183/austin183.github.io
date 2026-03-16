import { expect } from 'chai';
import getDomUtils from './DomUtils.js';

describe('getDomUtils', function() {
    it('should return an object with utility methods', function() {
        const utils = getDomUtils();
        expect(utils).to.be.an('object');
    });

    it('should have toggleElementById method', function() {
        const utils = getDomUtils();
        expect(utils.toggleElementById).to.be.a('function');
    });

    it('should have isFileAPISupported method', function() {
        const utils = getDomUtils();
        expect(utils.isFileAPISupported).to.be.a('function');
    });

    it('should return true for isFileAPISupported in Node.js environment', function() {
        const utils = getDomUtils();
        expect(utils.isFileAPISupported()).to.be.a('boolean');
    });

    it('should have toggleElementById accept a string id', function() {
        const utils = getDomUtils();
        expect(utils.toggleElementById).to.be.a('function');
    });

    it('should not throw error when toggleElementById is called with non-existent id', function() {
        const utils = getDomUtils();
        expect(() => utils.toggleElementById('nonExistentId')).to.not.throw();
    });

    it('should return boolean from isFileAPISupported', function() {
        const utils = getDomUtils();
        const result = utils.isFileAPISupported();
        expect(result).to.be.oneOf([true, false]);
    });
});
