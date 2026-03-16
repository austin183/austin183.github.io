import { getBrowserUtils } from './BrowserUtils.js';

export default function getDomUtils() {
    const browserUtils = getBrowserUtils();
    
    return {
        toggleElementById: function(id) {
            var configDiv = document.getElementById(id);
            if (configDiv) {
                const currentDisplayState = configDiv.style.display;
                if (currentDisplayState === "none") {
                    configDiv.style.display = "";
                } else {
                    configDiv.style.display = "none";
                }
            }
        },
        isFileAPISupported: browserUtils.isFileAPISupported
    };
}
