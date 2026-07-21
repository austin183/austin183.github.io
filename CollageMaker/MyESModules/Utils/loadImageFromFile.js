/**
 * loadImageFromFile - Loads an HTMLImageElement from a File object.
 * Pure utility, no Vue or framework dependencies.
 * @param {File} file - The file to load
 * @returns {Promise<HTMLImageElement|null>} Resolves with image or null on error
 */
export function loadImageFromFile(file) {
    if (!file) {
        return Promise.resolve(null);
    }
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}
