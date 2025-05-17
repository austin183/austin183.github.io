// src/js/theme-toggle.js
const themeButton = document.querySelector('.theme-button');

// Function to apply the saved theme
function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.body.classList.add(savedTheme);
    document.body.classList.remove(savedTheme === 'dark-theme' ? 'light-theme' : 'dark-theme');
  }
}

// Apply theme when the page is shown (including from cache)
window.addEventListener('pageshow', applySavedTheme);

// Apply theme when navigating via browser back/forward buttons
window.addEventListener('popstate', applySavedTheme);

// Toggle theme on button click and save to localStorage
themeButton.addEventListener('click', () => {
  if (document.body.classList.contains('light-theme')) {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    localStorage.setItem('theme', 'light-theme');
  }
});