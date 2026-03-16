// Mock Three.js for Node.js testing

export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }
    
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    
    subtract(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    
    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }
    
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

export class Raycaster {
    constructor(ray = null, camera = null) {
        this.ray = ray || {};
        this.camera = camera;
    }
    
    set(origin, direction) {
        this.ray.origin = origin;
        this.ray.direction = direction;
    }
    
    setFromCamera(mouse, camera) {
        this.camera = camera;
        return [];
    }
    
    intersectObjects(objects) {
        return [];
    }
}

export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    clone() {
        return new Vector2(this.x, this.y);
    }
}
