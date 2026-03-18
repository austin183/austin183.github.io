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

export class Color {
    constructor(value = 0x000000) {
        if (typeof value === 'number') {
            this.r = ((value >> 16) & 0xff) / 255;
            this.g = ((value >> 8) & 0xff) / 255;
            this.b = (value & 0xff) / 255;
        } else if (Array.isArray(value)) {
            this.r = value[0];
            this.g = value[1];
            this.b = value[2];
        } else {
            this.r = 0;
            this.g = 0;
            this.b = 0;
        }
    }
    
    set(value) {
        if (typeof value === 'number') {
            this.r = ((value >> 16) & 0xff) / 255;
            this.g = ((value >> 8) & 0xff) / 255;
            this.b = (value & 0xff) / 255;
        }
        return this;
    }
}

export class Scene {
    constructor() {
        this.background = null;
        this.children = [];
    }
    
    add(object) {
        if (!this.children.includes(object)) {
            this.children.push(object);
        }
    }
    
    remove(object) {
        const index = this.children.indexOf(object);
        if (index > -1) {
            this.children.splice(index, 1);
        }
    }
}

export class PerspectiveCamera {
    constructor(fov = 75, aspect = 1, near = 0.1, far = 1000) {
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.position = new Vector3();
        this.up = new Vector3(0, 1, 0);
    }
    
    lookAt(x, y, z) {
        this.lookTarget = new Vector3(x, y, z);
    }
    
    updateProjectionMatrix() {
        this.projectionMatrix = {};
    }
}

export class WebGLRenderer {
    constructor(options = {}) {
        this.domElement = options.canvas || { style: {} };
        this.size = { width: 0, height: 0 };
        this.pixelRatio = 1;
    }
    
    setSize(width, height) {
        this.size = { width, height };
    }
    
    setPixelRatio(ratio) {
        this.pixelRatio = ratio;
    }
    
    render(scene, camera) {
        // Stub implementation
    }
}

export class Mesh {
    constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.position = new Vector3();
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = { x: 1, y: 1, z: 1 };
        this.userData = {};
    }
}

export class BoxGeometry {
    constructor(width = 1, height = 1, depth = 1) {
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
}

export class TextGeometry {
    constructor(text, parameters) {
        this.text = text;
        this.font = parameters.font;
        this.size = parameters.size || 1;
        this.height = parameters.height || 0.1;
    }
}

export class FontLoader {
    constructor() {
        this.manager = {
            setURLPrefix: function(prefix) {}
        };
    }
    
    load(url, onLoad, onProgress, onError) {
        // Stub - in tests you can override this
    }
}

export class MeshBasicMaterial {
    constructor(parameters = {}) {
        this.color = parameters.color || new Color();
        this.side = parameters.side || 1;
    }
}

export class MeshLambertMaterial {
    constructor(parameters = {}) {
        this.color = parameters.color || new Color();
    }
}

export class GridHelper {
    constructor(size, divisions, colorCenterLine, colorGrid) {
        this.size = size;
        this.divisions = divisions;
    }
}

export function createMockFont() {
    return {
        glyphs: {},
        families: {},
        baseline: 0,
        unicodeRanges: []
    };
}

export const createThreeMock = () => {
    return {
        Vector3,
        Vector2,
        Color,
        Scene,
        PerspectiveCamera,
        WebGLRenderer,
        Mesh,
        BoxGeometry,
        TextGeometry,
        FontLoader,
        MeshBasicMaterial,
        MeshLambertMaterial,
        GridHelper,
        Raycaster
    };
};

export default createThreeMock();
