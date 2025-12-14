import React, { useState } from 'react';
import { Mail, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const LoginPage = ({ onLogin, theme }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use direct URL for now, can be configured via env vars
      const response = await axios.post('/api2/auth/login', {
        user_id: userId,
        password: password
      });

      if (response.data && response.data.access_token) {
        onLogin({
          userId: response.data.user_id,
          token: response.data.access_token
        });
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme.loginBg}`}>
      <div className={`${theme.cardBg} p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 border ${theme.border}`}>
        <div className="flex justify-center mb-8">
          <div className={`bg-${theme.accent}-100 p-4 rounded-full`}>
            <Mail className={`w-12 h-12 text-${theme.accent}-600`} />
          </div>
        </div>
        <h2 className={`text-3xl font-bold text-center ${theme.text} mb-2`}>Welcome Back</h2>
        <p className={`text-center ${theme.textSecondary} mb-8 text-sm`}>
          Sign in or create a new account automatically
        </p>
        
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>User ID / Email</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${theme.border} focus:ring-2 focus:ring-${theme.accent}-500 focus:border-transparent transition-all outline-none ${theme.bg} ${theme.text}`}
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${theme.border} focus:ring-2 focus:ring-${theme.accent}-500 focus:border-transparent transition-all outline-none ${theme.bg} ${theme.text}`}
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full ${theme.primary} ${theme.primaryHover} text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg hover:shadow-xl flex items-center justify-center`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
