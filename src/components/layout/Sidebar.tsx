import React from 'react';
import { Home, PieChart, User, LogOut, Coins, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';

interface SidebarProps {
  activeTab: 'groups' | 'analytics' | 'profile';
  onTabChange: (tab: 'groups' | 'analytics' | 'profile') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { signOut, displayName } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { id: 'groups', label: 'Groups', icon: Home },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <aside className="w-20 lg:w-64 h-screen bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex flex-col transition-all sticky top-0 shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary-500 p-2 rounded-xl shadow-lg shadow-primary-500/20 shrink-0">
          <Coins className="text-white w-6 h-6" />
        </div>
        <span className="hidden lg:block text-xl font-black bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
          Settlr
        </span>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as any)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${
              activeTab === item.id
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${
              activeTab === item.id ? 'text-primary-500' : 'text-slate-400'
            }`} />
            <span className="hidden lg:block font-bold">{item.label}</span>
            {activeTab === item.id && (
              <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-50 dark:border-slate-700/50">
        <div className="hidden lg:flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold">
            {displayName?.[0]}
          </div>
          <div className="truncate">
            <div className="font-bold text-sm truncate">{displayName}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Premium Plan</div>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all group mb-1"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun className="w-6 h-6 group-hover:rotate-12 transition-transform text-amber-400" />
            : <Moon className="w-6 h-6 group-hover:-rotate-12 transition-transform" />
          }
          <span className="hidden lg:block font-bold">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all group"
        >
          <LogOut className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          <span className="hidden lg:block font-bold">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
