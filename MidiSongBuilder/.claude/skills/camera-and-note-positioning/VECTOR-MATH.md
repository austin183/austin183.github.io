# Vector Math for 3D Positioning

## Quick Reference

| Vector Operation | Use Case | Example |
|------            |------     |------   |
| `set(x, y, z)` | Set absolute position | `position.set(1, 2, 3)` |
| `add(vector)` | Add vectors | `position.add(velocity)` |
| `sub(vector)` | Subtract vectors | `direction.sub(position)` |
| `multiplyScalar(n)` | Scale vector | `velocity.multiplyScalar(0.5)` |
| `normalize()` | Unit vector | `direction.normalize()` |
| `dot(vector)` | Angle between | `a.dot(b)` returns -1 to 1 |
| `cross(vector)` | Perpendicular | `normal.cross(a, b)` |

## Creating Vectors

```javascript
import * as THREE from 'three';

// Create a vector with specific values
const position = new THREE.Vector3(1, 2, 3);

// Create from direction
const direction = new THREE.Vector3(0, 0, -1).normalize();

// Create from camera
const cameraPosition = camera.position.clone();
const cameraDirection = new THREE.Vector3();
camera.getWorldDirection(cameraDirection);
```

## Common Operations

### Calculate Distance Between Points

```javascript
const distance = position1.distanceTo(position2);
// or
const distance = position1.sub(position2).length();
```

### Calculate Direction from One Point to Another

```javascript
const direction = new THREE.Vector3()
  .subVectors(target, source)
  .normalize();
```

### Interpolate Between Positions

```javascript
// Linear interpolation
const intermediate = new THREE.Vector3()
  .copy(start)
  .lerp(end, 0.5); // 0.5 = halfway

// With time-based interpolation
const position = new THREE.Vector3()
  .copy(startPosition)
  .lerp(endPosition, progress); // progress: 0 to 1
```

### Project Point onto Plane

```javascript
// Project camera position onto ground plane (Y = 0)
const projected = camera.position.clone();
projected.y = 0;

// Project note position to camera plane
const toNote = new THREE.Vector3().subVectors(note.position, camera.position);
const projection = toNote.dot(cameraDirection) * cameraDirection;
```

## Camera Vector Math

### Get Camera LookAt Point

```javascript
// Method 1: Using getWorldDirection
const direction = new THREE.Vector3();
camera.getWorldDirection(direction);
const lookAt = new THREE.Vector3()
  .copy(camera.position)
  .add(direction);

// Method 2: Using controls target
const lookAt = controls.target.clone();
```

### Calculate Angle Between Camera and Object

```javascript
const toObject = new THREE.Vector3()
  .subVectors(object.position, camera.position)
  .normalize();

const cameraDirection = new THREE.Vector3();
camera.getWorldDirection(cameraDirection);

// Angle in radians (0 = centered, PI = opposite)
const angle = Math.acos(cameraDirection.dot(toObject));
```

### Check if Object is in Camera View

```javascript
function isObjectVisible(object, camera, thresholdAngle = Math.PI / 4) {
  const toObject = new THREE.Vector3()
    .subVectors(object.position, camera.position)
    .normalize();

  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  const angle = cameraDirection.angleTo(toObject);
  return angle < thresholdAngle;
}
```

## Note Position Calculations

### Calculate Note Velocity Vector

```javascript
// Note falling downward
const velocity = new THREE.Vector3(0, -fallSpeed, 0);

// Update position each frame
note.position.add(velocity.multiplyScalar(deltaTime));
```

### Align Note to Camera Direction

```javascript
// Calculate offset from camera in its viewing direction
const offset = new THREE.Vector3(0, 0, -5).applyQuaternion(camera.quaternion);
note.position.copy(camera.position).add(offset);
```

### Project 2D Mouse Position to 3D Plane

```javascript
// Convert mouse coordinates to 3D world position
const mouse = new THREE.Vector2();
mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

// Raycast to ground plane
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);

const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const target = new THREE.Vector3();
raycaster.ray.intersectPlane(plane, target);

// target now has the 3D position
note.position.copy(target);
```

## Rotation Math

### Rotate Vector Around Axis

```javascript
// Rotate position around Y axis
const axis = new THREE.Vector3(0, 1, 0);
const angle = Math.PI / 4; // 45 degrees

const rotated = position.clone().applyAxisAngle(axis, angle);
```

### Calculate Rotation for Object to Face Target

```javascript
// Make note face the camera
note.lookAt(camera.position);

// Or calculate rotation manually
const direction = new THREE.Vector3()
  .subVectors(camera.position, note.position)
  .normalize();

const quaternion = new THREE.Quaternion();
quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
note.quaternion.copy(quaternion);
```

## Troubleshooting

**Problem**: Vector values are NaN or Infinity.

**Solution**:
1. Check for division by zero before `normalize()`
2. Verify input values are valid numbers
3. Use `isNaN()` and `isFinite()` to validate

**Problem**: Objects move faster/slower than expected.

**Solution**:
1. Multiply by `deltaTime` for frame-rate independent movement
2. Check if vector needs normalization before scaling
3. Verify coordinate system matches expected orientation

**Problem**: Angles are always 0 or π.

**Solution**:
1. Ensure both vectors are normalized before dot product
2. Clamp dot product: `Math.max(-1, Math.min(1, dot))`
3. Check for collinear vectors

## Tips

- Use `clone()` before modifying to preserve original vectors
- Normalize vectors before dot/cross products for predictable results
- Cache calculated vectors when reused to avoid garbage collection
- Use `lerp()` for smooth transitions between positions
- For camera-relative positioning, apply quaternion rotation to offsets
