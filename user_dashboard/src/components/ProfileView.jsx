import React, { useState } from 'react';
import { User, Mail, Bell, Shield, Settings, Layout, Grid, List, Monitor, Check, Palette, Camera } from 'lucide-react';
import { themes } from '../themes';

// --- Layout 1: Classic (The current default) ---
const ClassicLayout = ({ user, theme, setTheme }) => {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${theme.text}`}>My Profile</h2>
        <p className={theme.textSecondary}>Manage your account settings and preferences</p>
      </div>

      <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border} overflow-hidden mb-6`}>
        <div className={`h-32 bg-gradient-to-r ${theme.id === 'light' ? 'from-blue-500 to-purple-600' : 'from-slate-800 to-slate-900'}`}></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="flex items-end gap-6">
              <div className={`w-24 h-24 ${theme.cardBg} rounded-full p-1 shadow-lg`}>
                <div className={`w-full h-full ${theme.bg} rounded-full flex items-center justify-center text-3xl font-bold ${theme.text}`}>
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
              <div className="mb-1">
                <h3 className={`text-2xl font-bold ${theme.text}`}>{user?.name || 'User'}</h3>
                <p className={theme.textSecondary}>Productivity Enthusiast</p>
              </div>
            </div>
            <button className={`px-4 py-2 ${theme.primary} ${theme.primaryHover} text-white rounded-lg transition-colors shadow-sm font-medium`}>
              Edit Profile
            </button>
          </div>

          {/* Theme Selection Section */}
          <div className="mb-8">
            <h4 className={`font-semibold ${theme.text} mb-4 flex items-center gap-2`}>
              <Palette className={`w-5 h-5 ${theme.textSecondary}`} />
              Theme
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.values(themes).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t)}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    theme.id === t.id 
                      ? `border-${theme.accent}-500 bg-${theme.accent}-500/5` 
                      : `${theme.border} hover:border-${theme.accent}-500/50`
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${theme.id === t.id ? `text-${theme.accent}-600` : theme.text}`}>
                      {t.name}
                    </span>
                    {theme.id === t.id && (
                      <Check className={`w-4 h-4 text-${theme.accent}-600`} />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className={`w-6 h-6 rounded-full ${t.bg} border border-gray-200`}></div>
                    <div className={`w-6 h-6 rounded-full ${t.primary}`}></div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className={`${theme.bg} p-6 rounded-xl`}>
                <h4 className={`font-semibold ${theme.text} mb-4 flex items-center gap-2`}>
                  <User className={`w-5 h-5 ${theme.textSecondary}`} />
                  Personal Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-1`}>Full Name</label>
                    <div className={theme.text}>{user?.name || 'User'}</div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-1`}>Email</label>
                    <div className={theme.text}>user@example.com</div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-1`}>Role</label>
                    <div className={theme.text}>Administrator</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`${theme.bg} p-6 rounded-xl`}>
                <h4 className={`font-semibold ${theme.text} mb-4 flex items-center gap-2`}>
                  <Settings className={`w-5 h-5 ${theme.textSecondary}`} />
                  Preferences
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className={`w-5 h-5 ${theme.textSecondary}`} />
                      <span className={theme.text}>Email Notifications</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-${theme.accent}-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:${theme.primary}`}></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className={`w-5 h-5 ${theme.textSecondary}`} />
                      <span className={theme.text}>Two-Factor Auth</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-${theme.accent}-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:${theme.primary}`}></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Layout 2: Creative (Glass/Dark) ---
const CreativeLayout = ({ user, theme, setTheme }) => {
  return (
    <div className={`max-w-5xl mx-auto p-6 ${theme.bg} rounded-3xl min-h-[600px] ${theme.text} overflow-hidden relative animate-in fade-in duration-500 border ${theme.border}`}>
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
        <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] ${theme.primary} rounded-full blur-[100px]`}></div>
        <div className={`absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-${theme.accent}-600 rounded-full blur-[100px]`}></div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-4 space-y-6">
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-8 flex flex-col items-center text-center`}>
            <div className="relative mb-6 group cursor-pointer">
              <div className={`w-32 h-32 rounded-full bg-gradient-to-tr from-${theme.accent}-500 to-purple-500 p-1`}>
                <div className={`w-full h-full rounded-full ${theme.bg} flex items-center justify-center overflow-hidden`}>
                   <span className="text-4xl font-bold">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-1">{user?.name || 'User'}</h2>
            <p className={`${theme.textSecondary} text-sm mb-6`}>Productivity Enthusiast</p>
            <button className={`w-full py-2.5 ${theme.primary} rounded-xl font-medium hover:opacity-90 transition-opacity text-white`}>
              Edit Profile
            </button>
          </div>

          {/* Theme Switcher for Creative Layout */}
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-6`}>
            <h3 className={`text-sm font-bold ${theme.textSecondary} uppercase tracking-wider mb-4`}>Theme</h3>
            <div className="flex gap-2 justify-center">
               {Object.values(themes).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    theme.id === t.id ? `border-${theme.accent}-500 scale-110` : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: t.id === 'light' ? '#f9fafb' : (t.id === 'nebula' ? '#0f172a' : '#1c1917') }}
                  title={t.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="md:col-span-8 space-y-6">
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-8`}>
            <h3 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${theme.text}`}>
              <User className={`w-5 h-5 text-${theme.accent}-400`} />
              Account Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`text-xs ${theme.textSecondary} uppercase tracking-wider`}>Full Name</label>
                <input 
                  type="text" 
                  value={user?.name || 'User'} 
                  className={`w-full bg-black/20 border ${theme.border} rounded-lg px-4 py-3 focus:outline-none focus:border-${theme.accent}-500/50 transition-colors ${theme.text}`}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label className={`text-xs ${theme.textSecondary} uppercase tracking-wider`}>Email</label>
                <input 
                  type="text" 
                  value="user@example.com" 
                  className={`w-full bg-black/20 border ${theme.border} rounded-lg px-4 py-3 focus:outline-none focus:border-${theme.accent}-500/50 transition-colors ${theme.text}`}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-8`}>
            <h3 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${theme.text}`}>
              <Settings className={`w-5 h-5 text-${theme.accent}-400`} />
              Preferences
            </h3>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 bg-white/5 rounded-xl border ${theme.border} hover:bg-white/10 transition-colors`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full bg-${theme.accent}-500/20 flex items-center justify-center`}>
                    <Bell className={`w-5 h-5 text-${theme.accent}-400`} />
                  </div>
                  <div>
                    <div className={`font-medium ${theme.text}`}>Notifications</div>
                    <div className={`text-xs ${theme.textSecondary}`}>Get alerted on new emails</div>
                  </div>
                </div>
                <div className={`w-12 h-6 ${theme.primary} rounded-full relative cursor-pointer`}>
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Layout 3: Zen (Minimal) ---
const ZenLayout = ({ user, theme, setTheme }) => {
  return (
    <div className={`max-w-2xl mx-auto py-12 animate-in fade-in duration-500 ${theme.text}`}>
      <div className="text-center mb-16">
        <div className={`w-32 h-32 mx-auto mb-6 rounded-full ${theme.bg} border ${theme.border} flex items-center justify-center text-4xl font-light ${theme.textSecondary}`}>
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <h1 className="text-4xl font-light mb-2">{user?.name || 'User'}</h1>
        <p className={`${theme.textSecondary} font-light tracking-wide`}>user@example.com</p>
      </div>

      <div className="space-y-12">
        <section>
          <h3 className={`text-xs font-bold ${theme.textSecondary} uppercase tracking-[0.2em] mb-8 text-center`}>Theme</h3>
          <div className="flex justify-center gap-6">
             {Object.values(themes).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t)}
                  className={`text-sm tracking-widest uppercase transition-all ${
                    theme.id === t.id ? `text-${theme.accent}-500 border-b border-${theme.accent}-500` : `${theme.textSecondary} hover:${theme.text}`
                  }`}
                >
                  {t.name}
                </button>
              ))}
          </div>
        </section>

        <section>
          <h3 className={`text-xs font-bold ${theme.textSecondary} uppercase tracking-[0.2em] mb-8 text-center`}>Settings</h3>
          <div className="space-y-2">
            {['Edit Profile', 'Notifications', 'Security', 'Language'].map((item) => (
              <button key={item} className={`w-full py-4 ${theme.textSecondary} hover:${theme.text} hover:${theme.bg} transition-colors text-lg font-light border-b ${theme.border} flex justify-between items-center group`}>
                {item}
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme.textSecondary}`}>→</span>
              </button>
            ))}
          </div>
        </section>

        <div className="flex justify-center">
          <button className="text-red-400 hover:text-red-600 text-sm tracking-widest uppercase transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileView = ({ user, theme, setTheme }) => {
  const [layoutMode, setLayoutMode] = useState(() => {
    return localStorage.getItem('profileLayout') || 'classic';
  });

  const handleLayoutChange = (mode) => {
    setLayoutMode(mode);
    localStorage.setItem('profileLayout', mode);
  };

  return (
    <div className="space-y-6">
      {/* Layout Switcher */}
      <div className="flex justify-end">
        <div className={`${theme.cardBg} p-1 rounded-lg border ${theme.border} shadow-sm inline-flex gap-1`}>
          <button
            onClick={() => handleLayoutChange('classic')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              layoutMode === 'classic' 
                ? `${theme.bg} ${theme.text} shadow-sm` 
                : `${theme.textSecondary} hover:${theme.text} hover:${theme.bg}`
            }`}
          >
            <Layout className="w-4 h-4" />
            Classic
          </button>
          <button
            onClick={() => handleLayoutChange('creative')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              layoutMode === 'creative' 
                ? `${theme.bg} ${theme.text} shadow-sm` 
                : `${theme.textSecondary} hover:${theme.text} hover:${theme.bg}`
            }`}
          >
            <Palette className="w-4 h-4" />
            Creative
          </button>
          <button
            onClick={() => handleLayoutChange('zen')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              layoutMode === 'zen' 
                ? `${theme.bg} ${theme.text} shadow-sm` 
                : `${theme.textSecondary} hover:${theme.text} hover:${theme.bg}`
            }`}
          >
            <Monitor className="w-4 h-4" />
            Zen
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        {layoutMode === 'classic' && <ClassicLayout user={user} theme={theme} setTheme={setTheme} />}
        {layoutMode === 'creative' && <CreativeLayout user={user} theme={theme} setTheme={setTheme} />}
        {layoutMode === 'zen' && <ZenLayout user={user} theme={theme} setTheme={setTheme} />}
      </div>
    </div>
  );
};

export default ProfileView;

