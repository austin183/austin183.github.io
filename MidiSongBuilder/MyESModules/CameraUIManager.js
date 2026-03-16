/**
 * CameraUIManager - Manages camera UI state synchronization for 3D mode
 * 
 * Extracts duplicated DOM update code from Midiestro3D.html:
 * - Updates camera position and look-at input fields from renderer state
 * - Sets default values for camera UI inputs
 */

export function getCameraUIManager() {
    const updateCameraInputFields = (state) => {
        document.getElementById('cameraPosX').value = state.position.x.toFixed(2);
        document.getElementById('cameraPosY').value = state.position.y.toFixed(2);
        document.getElementById('cameraPosZ').value = state.position.z.toFixed(2);
        
        document.getElementById('cameraLookAtX').value = state.lookAt.x.toFixed(2);
        document.getElementById('cameraLookAtY').value = state.lookAt.y.toFixed(2);
        document.getElementById('cameraLookAtZ').value = state.lookAt.z.toFixed(2);
    };
    
    const setCameraInputDefaults = (defaults) => {
        document.getElementById('cameraPosX').value = defaults.position.x;
        document.getElementById('cameraPosY').value = defaults.position.y;
        document.getElementById('cameraPosZ').value = defaults.position.z;
        
        document.getElementById('cameraLookAtX').value = defaults.lookAt.x;
        document.getElementById('cameraLookAtY').value = defaults.lookAt.y;
        document.getElementById('cameraLookAtZ').value = defaults.lookAt.z;
    };
    
    return { 
        updateCameraInputFields,
        setCameraInputDefaults
    };
}
