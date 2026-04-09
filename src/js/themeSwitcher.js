function getInitialTheme() {
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme) {
    return savedTheme;
  }
  
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? 'sunny' : 'bedtime';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  applyUserTheme();
});

window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    applyUserTheme();
  }
});

function applyUserTheme() {
  const preferredTheme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', preferredTheme);

  if (preferredTheme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
  
  updateThemeIcon(preferredTheme);
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
    html.classList.remove('light');
  }

  const newTheme = html.getAttribute('data-theme');
  updateThemeIcon(newTheme);
  
  // Dispatch custom event for theme change
  window.dispatchEvent(new CustomEvent('themeproject:change', { detail: { theme: newTheme } }));
}