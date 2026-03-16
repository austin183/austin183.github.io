export function getBrowserUtils() {
    return {
        isFileAPISupported: () => 
            window.File && window.FileReader && window.FileReader.prototype.readAsArrayBuffer
    };
}
