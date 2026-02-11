function getDomUtils() {
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
        isFileAPISupported: function() {
            return (
                window.File &&
                window.FileReader &&
                window.FileList &&
                window.Blob
            );
        }
    };
}
