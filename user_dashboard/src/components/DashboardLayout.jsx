import React, { useState } from 'react';
import { LayoutGrid, User, Mail, LogOut } from 'lucide-react';
import QuadrantView from './QuadrantView';
import ProfileView from './ProfileView';
import AllEmailsView from './AllEmailsView';

const DashboardLayout = ({ user, onLogout, theme, setTheme }) => {
  const [currentView, setCurrentView] = useState('quadrant');

  const renderView = () => {
    switch (currentView) {
      case 'quadrant':
        return <QuadrantView theme={theme} />;
      case 'profile':
        return <ProfileView user={user} theme={theme} setTheme={setTheme} />;
      case 'emails':
        return <AllEmailsView theme={theme} />;
      default:
        return <QuadrantView theme={theme} />;
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${theme.bg}`}>
      {/* Sidebar */}
      <div className={`w-64 border-r flex flex-col transition-colors duration-300 ${theme.cardBg} ${theme.border}`}>
        <div className={`p-6 border-b ${theme.border}`}>
          <h1 className={`text-xl font-bold flex items-center gap-2 ${theme.text}`}>
            <Mail className={`w-6 h-6 text-${theme.accent}-600`} />
            Email AI
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setCurrentView('quadrant')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'quadrant' 
                ? `${theme.primary} text-white shadow-md` 
                : `${theme.textSecondary} ${theme.secondaryHover}`
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="font-medium">Priority Matrix</span>
          </button>
          
          <button
            onClick={() => setCurrentView('emails')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'emails' 
                ? `${theme.primary} text-white shadow-md` 
                : `${theme.textSecondary} ${theme.secondaryHover}`
            }`}
          >
            <Mail className="w-5 h-5" />
            <span className="font-medium">All Emails</span>
          </button>

          <button
            onClick={() => setCurrentView('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'profile' 
                ? `${theme.primary} text-white shadow-md` 
                : `${theme.textSecondary} ${theme.secondaryHover}`
            }`}
          >
            <User className="w-5 h-5" />
            <span className="font-medium">Profile</span>
          </button>
        </nav>

        <div className={`p-4 border-t ${theme.border}`}>
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme.primary} text-white`}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${theme.text}`}>{user?.name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
