import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import { themes } from './themes';
import axios from 'axios';

// Configure global defaults if needed, but components might use their own instances
// axios.defaults.baseURL = 'http://localhost:8000'; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(themes.light);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Load theme from local storage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('dashboardTheme');
    if (savedThemeId && themes[savedThemeId]) {
      setTheme(themes[savedThemeId]);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    if (token && userId) {
      // Validate token or just assume valid for now
      setUser({ name: userId, id: userId });
      setIsLoggedIn(true);
      // Optional: Set default auth header for axios
      // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setIsAuthChecking(false);
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

  const handleLogin = (authData) => {
    // authData: { userId, token }
    localStorage.setItem('authToken', authData.token);
    localStorage.setItem('userId', authData.userId);
    
    setUser({ name: authData.userId, id: authData.userId });
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    setUser(null);
    setIsLoggedIn(false);
  };

  if (isAuthChecking) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${theme.accent}-500`}></div>
      </div>
    );
  }

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
