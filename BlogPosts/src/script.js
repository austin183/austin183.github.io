// Function to apply the theme
function applyTheme() {
  let currentTheme = localStorage.getItem('theme');
  if (!currentTheme) {
    currentTheme = 'light';
    localStorage.setItem('theme', currentTheme); // Save the default theme
  }

  document.body.classList.remove('dark-mode'); // Remove any existing class
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
}

// Function to toggle the theme
function toggleTheme() {
  let currentTheme = localStorage.getItem('theme');
  if (!currentTheme) {
    currentTheme = 'light';
  }

  // Check if the current theme is light or dark
  currentTheme = (currentTheme === 'light') ? 'dark' : 'light';

  // Update the body class based on the new theme
  document.body.classList.remove('dark-mode', 'light-mode'); // Remove any existing classes
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.add('light-mode');
  }

  // Save the new theme to local storage
  localStorage.setItem('theme', currentTheme);
}

// Add event listener to the button and apply theme on page load
document.addEventListener('DOMContentLoaded', function() {
  applyTheme();
  document.getElementById('theme-toggle-button').addEventListener('click', toggleTheme);
});

// Apply the theme when navigating back
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    applyTheme();
  }
});
