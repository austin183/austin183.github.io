// script.js (updated)

// Select the theme toggle button
const themeToggle = document.getElementById('theme-toggle');

// Define the theme classes
const DARK_THEME_CLASS = 'dark-theme';
const LIGHT_THEME_CLASS = 'light-theme';

// Initial theme check (defaults to light if no class is found)
let currentTheme = localStorage.getItem('theme') || LIGHT_THEME_CLASS;

// Function to apply a specific theme
function applyTheme(theme) {
  document.body.classList.remove(LIGHT_THEME_CLASS, DARK_THEME_CLASS);
  document.body.classList.add(theme);
}

// Apply the initial theme (if stored in local storage)
applyTheme(currentTheme);

// Toggle theme function
function toggleTheme() {
  // Check the current theme and switch to the other one
  if (currentTheme === LIGHT_THEME_CLASS) {
    applyTheme(DARK_THEME_CLASS);
    currentTheme = DARK_THEME_CLASS;
  } else {
    applyTheme(LIGHT_THEME_CLASS);
    currentTheme = LIGHT_THEME_CLASS;
  }
  
  // Store the new theme in local storage
  localStorage.setItem('theme', currentTheme);
}

// Add event listener to the theme toggle button
themeToggle.addEventListener('click', toggleTheme);

// Enhanced theme persistence on load and pageshow
window.addEventListener('load', function() {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme && document.body.classList[0] !== storedTheme) {
    applyTheme(storedTheme);
  }
});

window.addEventListener('pageshow', function(event) {
  if (event.persisted) { 
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme && document.body.classList.contains(storedTheme) === false) {
      applyTheme(storedTheme);
    }
  }
});