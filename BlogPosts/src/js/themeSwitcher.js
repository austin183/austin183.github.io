// themeSwitcher.js
function toggleTheme() {
    const html = document.documentElement;
    if (html.getAttribute('data-theme') === 'light') {
        // Remove light theme attribute and reset to default (dark)
        html.removeAttribute('data-theme');
    } else {
        // Add light theme attribute
        html.setAttribute('data-theme', 'light');
    }
}