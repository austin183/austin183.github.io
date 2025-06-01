document.addEventListener('DOMContentLoaded', function() {
  applyUserTheme();
  
  var themeToggleButton = document.getElementById('theme-toggle');

  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', function() {
      // Toggle dark/light theme
      toggleDarkLightTheme();
    });
  }
});

window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    applyUserTheme();
  }
});

function applyUserTheme() {
  var preferredTheme = localStorage.getItem('theme');

  if (preferredTheme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}

function toggleDarkLightTheme() {
  if (document.body.classList.contains('dark-theme')) {
    localStorage.setItem('theme', 'light');
    document.body.classList.remove('dark-theme');
  } else {
    localStorage.setItem('theme', 'dark');
    document.body.classList.add('dark-theme');
  }

  // Reapply the theme immediately to ensure visual consistency
  applyUserTheme();
}
