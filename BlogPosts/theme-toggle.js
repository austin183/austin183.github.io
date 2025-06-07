// theme-toggle.js
const toggleBtn = document.querySelector('.theme-toggle-btn');
const html = document.documentElement;

toggleBtn.addEventListener('click', function() {
    const isDarkMode = html.getAttribute('data-theme') === 'dark';
    if (isDarkMode) {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
});

function setTheme() {
    const theme = localStorage.getItem('theme');
    if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

window.addEventListener('pageshow', setTheme);