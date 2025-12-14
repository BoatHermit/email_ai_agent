import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import { themes } from './themes';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(themes.light);

  // Load theme from local storage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('dashboardTheme');
    if (savedThemeId && themes[savedThemeId]) {
      setTheme(themes[savedThemeId]);
    }
  }, []);

  // Apply theme side effects (scrollbar colors)
  useEffect(() => {
    document.documentElement.style.setProperty('--scrollbar-thumb', theme.scrollbarThumb);
    document.documentElement.style.setProperty('--scrollbar-thumb-hover', theme.scrollbarHover);
  }, [theme]);

  // Save theme to local storage when it changes
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('dashboardTheme', newTheme.id);
  };

  const handleLogin = (username) => {
    setUser({ name: username });
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} theme={theme} />;
  }

  return (
    <DashboardLayout 
      user={user} 
      onLogout={handleLogout} 
      theme={theme} 
      setTheme={handleThemeChange} 
    />
  );
}

export default App;
