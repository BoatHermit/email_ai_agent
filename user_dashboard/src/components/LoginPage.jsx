import React, { useState } from 'react';
import { Mail } from 'lucide-react';

const LoginPage = ({ onLogin, theme }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Accept any input as valid login
    onLogin(username || 'User');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme.loginBg}`}>
      <div className={`${theme.cardBg} p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105 duration-300 border ${theme.border}`}>
        <div className="flex justify-center mb-8">
          <div className={`bg-${theme.accent}-100 p-4 rounded-full`}>
            <Mail className={`w-12 h-12 text-${theme.accent}-600`} />
          </div>
        </div>
        <h2 className={`text-3xl font-bold text-center ${theme.text} mb-8`}>Welcome Back</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${theme.border} focus:ring-2 focus:ring-${theme.accent}-500 focus:border-transparent transition-all outline-none ${theme.bg} ${theme.text}`}
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>Password</label>
            <input
              type="password"
              className={`w-full px-4 py-3 rounded-lg border ${theme.border} focus:ring-2 focus:ring-${theme.accent}-500 focus:border-transparent transition-all outline-none ${theme.bg} ${theme.text}`}
              placeholder="Any password works"
            />
          </div>
          <button
            type="submit"
            className={`w-full ${theme.primary} ${theme.primaryHover} text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg hover:shadow-xl`}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
