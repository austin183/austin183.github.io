document.addEventListener('DOMContentLoaded', function() {
  applyUserTheme();
});

window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    applyUserTheme();
  }
});

function applyUserTheme() {
  const preferredTheme = localStorage.getItem('theme') || 'dark'; // Use the saved or default theme
  document.documentElement.setAttribute('data-theme', preferredTheme);

  if (preferredTheme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light'); // Ensure light class is removed for dark theme
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');

  if (currentTheme === 'dark') {
    localStorage.setItem('theme', 'light');
    html.setAttribute('data-theme', 'light');
    html.classList.add('light');
  } else {
    localStorage.setItem('theme', 'dark');
    html.setAttribute('data-theme', 'dark');
    html.classList.remove('light'); // Ensure light class is removed for dark theme
  }

  applyUserTheme(); // Reapply the theme immediately to ensure visual consistency
}