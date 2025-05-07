// script.js
function applyTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
  } else {
      document.body.classList.remove('light-theme');
  }
}

// Apply the theme on initial page load
document.addEventListener('DOMContentLoaded', function() {
  applyTheme();
});

// Apply the theme whenever the page visibility changes
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
      applyTheme();
  }
});

const themeToggle = document.querySelector('.theme-toggle');

themeToggle.addEventListener('click', function() {
  document.body.classList.toggle('light-theme');

  if (document.body.classList.contains('light-theme')) {
      localStorage.setItem('theme', 'light');
  } else {
      localStorage.setItem('theme', 'dark');
  }
});