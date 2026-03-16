import { expect } from 'chai';
import getKeyRenderInfo from './keyRenderInfo.js';

describe('getKeyRenderInfo', function() {
    it('should return an object with keyboard render info', function() {
        const info = getKeyRenderInfo();
        expect(info).to.be.an('object');
    });

    it('should contain all 39 keyboard keys', function() {
        const info = getKeyRenderInfo();
        expect(Object.keys(info).length).to.equal(39);
    });

    it('should have z key at column 0, row 0', function() {
        const info = getKeyRenderInfo();
        expect(info).to.have.property('z');
        expect(info.z).to.deep.equal({ column: 0, row: 0 });
    });

    it('should have bottom row keys in row 0', function() {
        const info = getKeyRenderInfo();
        expect(info.z).to.have.property('row', 0);
        expect(info.x).to.have.property('row', 0);
        expect(info.c).to.have.property('row', 0);
        expect(info.v).to.have.property('row', 0);
        expect(info.b).to.have.property('row', 0);
        expect(info.n).to.have.property('row', 0);
        expect(info.m).to.have.property('row', 0);
        expect(info[',']).to.have.property('row', 0);
        expect(info['.']).to.have.property('row', 0);
    });

    it('should have home row keys in row 1', function() {
        const info = getKeyRenderInfo();
        expect(info.a).to.have.property('row', 1);
        expect(info.s).to.have.property('row', 1);
        expect(info.d).to.have.property('row', 1);
        expect(info.f).to.have.property('row', 1);
        expect(info.g).to.have.property('row', 1);
        expect(info.h).to.have.property('row', 1);
        expect(info.j).to.have.property('row', 1);
        expect(info.k).to.have.property('row', 1);
        expect(info.l).to.have.property('row', 1);
        expect(info[';']).to.have.property('row', 1);
    });

    it('should have top letter row keys in row 2', function() {
        const info = getKeyRenderInfo();
        expect(info.q).to.have.property('row', 2);
        expect(info.w).to.have.property('row', 2);
        expect(info.e).to.have.property('row', 2);
        expect(info.r).to.have.property('row', 2);
        expect(info.t).to.have.property('row', 2);
        expect(info.y).to.have.property('row', 2);
        expect(info.u).to.have.property('row', 2);
        expect(info.i).to.have.property('row', 2);
        expect(info.o).to.have.property('row', 2);
        expect(info.p).to.have.property('row', 2);
    });

    it('should have number row keys in row 3', function() {
        const info = getKeyRenderInfo();
        expect(info['1']).to.have.property('row', 3);
        expect(info['2']).to.have.property('row', 3);
        expect(info['3']).to.have.property('row', 3);
        expect(info['4']).to.have.property('row', 3);
        expect(info['5']).to.have.property('row', 3);
        expect(info['6']).to.have.property('row', 3);
        expect(info['7']).to.have.property('row', 3);
        expect(info['8']).to.have.property('row', 3);
        expect(info['9']).to.have.property('row', 3);
        expect(info['0']).to.have.property('row', 3);
    });

    it('should have correct column spacing for row 0 (z to .)', function() {
        const info = getKeyRenderInfo();
        expect(info.z).to.have.property('column', 0);
        expect(info.x).to.have.property('column', 1);
        expect(info.c).to.have.property('column', 3);
        expect(info.v).to.have.property('column', 4);
        expect(info.b).to.have.property('column', 5);
    });

    it('should have correct column spacing for row 1 (a to ;)', function() {
        const info = getKeyRenderInfo();
        expect(info.a).to.have.property('column', 0);
        expect(info.s).to.have.property('column', 1);
        expect(info.d).to.have.property('column', 2);
        expect(info.f).to.have.property('column', 3);
        expect(info.g).to.have.property('column', 4);
    });

    it('should have correct column spacing for row 2 (q to p)', function() {
        const info = getKeyRenderInfo();
        expect(info.q).to.have.property('column', 0);
        expect(info.w).to.have.property('column', 1);
        expect(info.e).to.have.property('column', 2);
        expect(info.r).to.have.property('column', 3);
        expect(info.t).to.have.property('column', 4);
    });

    it('should have correct column spacing for row 3 (1 to 0)', function() {
        const info = getKeyRenderInfo();
        expect(info['1']).to.have.property('column', 0);
        expect(info['2']).to.have.property('column', 1);
        expect(info['3']).to.have.property('column', 2);
        expect(info['4']).to.have.property('column', 3);
        expect(info['5']).to.have.property('column', 4);
    });

    it('should have all keys with both column and row properties', function() {
        const info = getKeyRenderInfo();
        Object.values(info).forEach(keyData => {
            expect(keyData).to.have.property('column');
            expect(keyData).to.have.property('row');
        });
    });
});
