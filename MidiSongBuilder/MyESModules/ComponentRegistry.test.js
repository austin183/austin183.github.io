import { expect } from 'chai';
import getComponentRegistry from './ComponentRegistry.js';

describe('getComponentRegistry', function() {
    it('should return an object with registry methods', function() {
        const registry = getComponentRegistry();
        expect(registry).to.be.an('object');
    });

    it('should have getPressedKeys method', function() {
        const registry = getComponentRegistry();
        expect(registry.getPressedKeys).to.be.a('function');
    });

    it('should have setPressedKeys method', function() {
        const registry = getComponentRegistry();
        expect(registry.setPressedKeys).to.be.a('function');
    });

    it('should have registerService method', function() {
        const registry = getComponentRegistry();
        expect(registry.registerService).to.be.a('function');
    });

    it('should have getService method', function() {
        const registry = getComponentRegistry();
        expect(registry.getService).to.be.a('function');
    });

    it('should have clearServices method', function() {
        const registry = getComponentRegistry();
        expect(registry.clearServices).to.be.a('function');
    });

    it('should have reset method', function() {
        const registry = getComponentRegistry();
        expect(registry.reset).to.be.a('function');
    });

    it('should return empty pressedKeys object on initial get', function() {
        const registry = getComponentRegistry();
        expect(registry.getPressedKeys()).to.deep.equal({});
    });

    it('should set and get pressedKeys', function() {
        const registry = getComponentRegistry();
        const newPressedKeys = { 'z': true, 'x': false };
        
        registry.setPressedKeys(newPressedKeys);
        
        expect(registry.getPressedKeys()).to.deep.equal(newPressedKeys);
    });

    it('should not set pressedKeys with invalid input', function() {
        const registry = getComponentRegistry();
        
        registry.setPressedKeys('invalid');
        expect(registry.getPressedKeys()).to.deep.equal({});
        
        registry.setPressedKeys(null);
        expect(registry.getPressedKeys()).to.deep.equal({});
        
        registry.setPressedKeys(123);
        expect(registry.getPressedKeys()).to.deep.equal({});
    });

    it('should register a service', function() {
        const registry = getComponentRegistry();
        const mockService = { doSomething: () => 'result' };
        
        registry.registerService('testService', mockService);
        
        expect(registry.getService('testService')).to.equal(mockService);
    });

    it('should return null for non-existent service', function() {
        const registry = getComponentRegistry();
        
        expect(registry.getService('nonExistent')).to.equal(null);
    });

    it('should not register service with empty name', function() {
        const registry = getComponentRegistry();
        const mockService = {};
        
        registry.registerService('', mockService);
        
        expect(registry.getService('')).to.equal(null);
    });

    it('should not register service with null service', function() {
        const registry = getComponentRegistry();
        
        registry.registerService('test', null);
        
        expect(registry.getService('test')).to.equal(null);
    });

    it('should clear all registered services', function() {
        const registry = getComponentRegistry();
        
        registry.registerService('service1', {});
        registry.registerService('service2', {});
        
        expect(registry.getService('service1')).to.not.equal(null);
        expect(registry.getService('service2')).to.not.equal(null);
        
        registry.clearServices();
        
        expect(registry.getService('service1')).to.equal(null);
        expect(registry.getService('service2')).to.equal(null);
    });

    it('should reset pressedKeys and clear services', function() {
        const registry = getComponentRegistry();
        
        registry.setPressedKeys({ 'z': true });
        registry.registerService('test', {});
        
        registry.reset();
        
        expect(registry.getPressedKeys()).to.deep.equal({});
        expect(registry.getService('test')).to.equal(null);
    });

    it('should allow multiple services to be registered', function() {
        const registry = getComponentRegistry();
        
        registry.registerService('inputHandler', {});
        registry.registerService('scoreKeeper', {});
        registry.registerService('gameState', {});
        
        expect(registry.getService('inputHandler')).to.not.equal(null);
        expect(registry.getService('scoreKeeper')).to.not.equal(null);
        expect(registry.getService('gameState')).to.not.equal(null);
    });

    it('should update pressedKeys reference properly', function() {
        const registry = getComponentRegistry();
        
        const initialKeys = {};
        registry.setPressedKeys(initialKeys);
        
        expect(registry.getPressedKeys()).to.equal(initialKeys);
    });

    it('should share pressedKeys between get calls', function() {
        const registry = getComponentRegistry();
        
        const keys1 = registry.getPressedKeys();
        keys1['z'] = true;
        
        const keys2 = registry.getPressedKeys();
        
        expect(keys2['z']).to.equal(true);
    });
});
