(function() {
  function updateToggleUI(theme) {
    const icon = theme === 'light' ? 'dark_mode' : 'light_mode';
    const text = theme === 'light' ? 'Dark Mode' : 'Light Mode';
    
    const sidebarIcon = document.getElementById('theme-toggle-icon');
    const sidebarText = document.getElementById('theme-toggle-text');
    const mobileIcon = document.getElementById('mobile-theme-toggle-icon');
    
    if (sidebarIcon) sidebarIcon.innerText = icon;
    if (sidebarText) sidebarText.innerText = text;
    if (mobileIcon) mobileIcon.innerText = icon;
  }

  function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light-mode');
    }
    
    localStorage.setItem('theme', newTheme);
    updateToggleUI(newTheme);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const sidebarBtn = document.getElementById('theme-toggle-btn');
    const mobileBtn = document.getElementById('mobile-theme-toggle-btn');
    
    const currentTheme = localStorage.getItem('theme') || 'dark';
    updateToggleUI(currentTheme);
    
    if (sidebarBtn) {
      sidebarBtn.addEventListener('click', toggleTheme);
    }
    if (mobileBtn) {
      mobileBtn.addEventListener('click', toggleTheme);
    }
  });
})();
