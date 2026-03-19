/**
 * CameraPresets - Centralized camera preset configurations
 *
 * This module provides a single source of truth for all camera preset values.
 */
export default function getCameraPresets() {
    return {
        topDown: {
            name: 'Top-Down View',
            position: { x: 0, y: 20, z: 0 },
            lookAt: { x: 0, y: 0, z: 0 }
        },
        roadView: {
            name: 'Road View (Default)',
            position: { x: 0, y: 6.6, z: 14 },
            lookAt: { x: 0, y: 6, z: 13.2 }
        },
        isometric: {
            name: '3/4 Isometric View',
            position: { x: -10, y: 10, z: 10 },
            lookAt: { x: 0, y: 0, z: 5 }
        },
        playerView: {
            name: 'Player View',
            position: { x: 0, y: 3, z: 20 },
            lookAt: { x: 0, y: 0, z: 0 }
        }
    };
}
