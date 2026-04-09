const PALETTES = {
    light: {
        unplayed: ["#031f57", "#025b97", "#0077c7", "#1e88e5"],
        good: "#2e7d32",
        ok: "#f9a825",
        bad: "#c62828",
        missed: "#1565c0",
        scoreGradient: ["#880e4f", "#1a237e", "#b71c1c"]
    },
    dark: {
        unplayed: ["#90caf9", "#64b5f6", "#42a5f5", "#2196f3"],
        good: "#81c784",
        ok: "#fff59d",
        bad: "#e57373",
        missed: "#64b5f6",
        scoreGradient: ["#f06292", "#534bae", "#ef5350"]
    }
};

export function getThemeService() {
    const listeners = new Set();

    const getCurrentTheme = () => {
        return document.documentElement.getAttribute('data-theme') || 'light';
    };

    const getColorPalette = () => {
        const theme = getCurrentTheme();
        return PALETTES[theme] || PALETTES.light;
    };

    const notifyListeners = (theme) => {
        listeners.forEach(callback => callback(theme));
    };

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                notifyListeners(getCurrentTheme());
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    return {
        getCurrentTheme,
        getColorPalette,
        onThemeChange: (callback) => {
            listeners.add(callback);
            return () => listeners.delete(callback);
        },
        _observer: observer // Exposed for testing/cleanup if needed
    };
}
