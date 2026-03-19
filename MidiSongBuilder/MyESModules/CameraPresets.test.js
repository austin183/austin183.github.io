import { expect } from 'chai';
import getCameraPresets from './CameraPresets.js';

describe('getCameraPresets', function() {
    it('should return an object with camera preset configurations', function() {
        const presets = getCameraPresets();
        expect(presets).to.be.an('object');
    });

    it('should contain topDown preset', function() {
        const presets = getCameraPresets();
        expect(presets).to.have.property('topDown');
    });

    it('should contain roadView preset', function() {
        const presets = getCameraPresets();
        expect(presets).to.have.property('roadView');
    });

    it('should contain isometric preset', function() {
        const presets = getCameraPresets();
        expect(presets).to.have.property('isometric');
    });

    it('should contain playerView preset', function() {
        const presets = getCameraPresets();
        expect(presets).to.have.property('playerView');
    });

    it('should have topDown with name "Top-Down View"', function() {
        const presets = getCameraPresets();
        expect(presets.topDown).to.have.property('name', 'Top-Down View');
    });

    it('should have roadView with name "Road View (Default)"', function() {
        const presets = getCameraPresets();
        expect(presets.roadView).to.have.property('name', 'Road View (Default)');
    });

    it('should have isometric with name "3/4 Isometric View"', function() {
        const presets = getCameraPresets();
        expect(presets.isometric).to.have.property('name', '3/4 Isometric View');
    });

    it('should have playerView with name "Player View"', function() {
        const presets = getCameraPresets();
        expect(presets.playerView).to.have.property('name', 'Player View');
    });

    it('should have topDown with position at { x: 0, y: 20, z: 0 }', function() {
        const presets = getCameraPresets();
        expect(presets.topDown).to.have.property('position');
        expect(presets.topDown.position).to.deep.equal({ x: 0, y: 20, z: 0 });
    });

    it('should have roadView with position at { x: 0, y: 6.6, z: 12.6 }', function() {
        const presets = getCameraPresets();
        expect(presets.roadView.position).to.deep.equal({ x: 0, y: 6.6, z: 14 });
    });

    it('should have isometric with position at { x: -10, y: 10, z: 10 }', function() {
        const presets = getCameraPresets();
        expect(presets.isometric.position).to.deep.equal({ x: -10, y: 10, z: 10 });
    });

    it('should have playerView with position at { x: 0, y: 3, z: 20 }', function() {
        const presets = getCameraPresets();
        expect(presets.playerView.position).to.deep.equal({ x: 0, y: 3, z: 20 });
    });

    it('should have topDown looking at { x: 0, y: 0, z: 0 }', function() {
        const presets = getCameraPresets();
        expect(presets.topDown.lookAt).to.deep.equal({ x: 0, y: 0, z: 0 });
    });

    it('should have roadView looking at { x: 0, y: 6, z: 11.8 }', function() {
        const presets = getCameraPresets();
        expect(presets.roadView.lookAt).to.deep.equal({ x: 0, y: 6, z: 13.2 });
    });

    it('should have isometric looking at { x: 0, y: 0, z: 5 }', function() {
        const presets = getCameraPresets();
        expect(presets.isometric.lookAt).to.deep.equal({ x: 0, y: 0, z: 5 });
    });

    it('should have playerView looking at { x: 0, y: 0, z: 0 }', function() {
        const presets = getCameraPresets();
        expect(presets.playerView.lookAt).to.deep.equal({ x: 0, y: 0, z: 0 });
    });

    it('should have all presets with required properties (name, position, lookAt)', function() {
        const presets = getCameraPresets();
        Object.values(presets).forEach(preset => {
            expect(preset).to.have.property('name');
            expect(preset).to.have.property('position');
            expect(preset).to.have.property('lookAt');
        });
    });

    it('should have exactly 4 presets', function() {
        const presets = getCameraPresets();
        expect(Object.keys(presets).length).to.equal(4);
    });
});
