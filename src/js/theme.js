// Theme management utility

const THEME_KEY = 'themePreference';

// Apply theme immediately to prevent flash
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

// Load and apply stored theme
function loadTheme() {
    chrome.storage.sync.get({ [THEME_KEY]: 'light' }, (res) => {
        applyTheme(res[THEME_KEY]);
    });
}

// Toggle and save theme
function toggleTheme(isDark) {
    const theme = isDark ? 'dark' : 'light';
    applyTheme(theme);
    chrome.storage.sync.set({ [THEME_KEY]: theme });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadTheme);

// Export for use in other files if needed (though mostly used via global scope in this simple setup)
if (typeof window !== 'undefined') {
    window.themeUtils = {
        loadTheme,
        toggleTheme,
        applyTheme
    };
}
