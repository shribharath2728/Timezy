import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, PlusCircle, LayoutDashboard, Moon, Sun, LogIn, LogOut, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api, API_BASE } from '../api';

export function Navbar({ activeScreen, setActiveScreen }) {
  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.getMe()
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/login`;
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch {}
  };

  const navItems = [
    { id: 'dashboard', label: "Today's Page", icon: LayoutDashboard },
    { id: 'new-event', label: 'Dear Journal...', icon: PlusCircle },
    { id: 'calendar', label: 'Almanac', icon: Calendar },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#fdfbf7]/90 dark:bg-[#151412]/90 border-b border-[#e6decb] dark:border-[#38342e] transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Journal Brand */}
        <div
          onClick={() => setActiveScreen('dashboard')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-800/10 dark:bg-amber-400/10 border border-amber-800/20 dark:border-amber-400/20 flex items-center justify-center text-amber-900 dark:text-amber-200 shadow-xs group-hover:scale-105 transition duration-200">
            <BookOpen className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="font-serif-journal text-lg sm:text-xl font-bold tracking-tight text-[#2c2523] dark:text-[#ede8df] leading-tight">
              The Event Journal
            </h1>
            <span className="text-[11px] font-handwriting text-amber-800/70 dark:text-amber-400/70 block -mt-0.5 text-sm">
              memories, budgets & free slots
            </span>
          </div>
        </div>

        {/* Navigation tabs styled as journal ribbons */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[#f3eee3]/80 dark:bg-[#292622]/80 p-1 rounded-xl border border-[#e6decb] dark:border-[#38342e]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#fdfbf7] dark:bg-[#1f1d1a] text-amber-900 dark:text-amber-200 shadow-xs font-serif-journal font-semibold border border-[#e6decb] dark:border-[#38342e]'
                    : 'text-[#5a4e4a] dark:text-[#beb6a8] hover:text-[#2c2523] dark:hover:text-[#ede8df]'
                }`}
              >
                <Icon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Actions (Google Auth + Theme toggle) */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs font-serif-journal text-[#5a4e4a] dark:text-[#beb6a8] px-2.5 py-1 rounded-md bg-[#f3eee3] dark:bg-[#292622] border border-[#e6decb] dark:border-[#38342e]">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-lg border border-[#e6decb] dark:border-[#38342e] text-[#5a4e4a] dark:text-[#beb6a8] hover:bg-[#f3eee3] dark:hover:bg-[#292622] transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-800 dark:bg-amber-700 text-amber-50 hover:bg-amber-900 dark:hover:bg-amber-600 transition shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg border border-[#e6decb] dark:border-[#38342e] text-[#5a4e4a] dark:text-[#beb6a8] hover:bg-[#f3eee3] dark:hover:bg-[#292622] transition"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-800" />}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation for 375px+ screens */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7]/95 dark:bg-[#151412]/95 backdrop-blur px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'text-amber-900 dark:text-amber-200 font-serif-journal font-semibold'
                  : 'text-[#8b7d77] dark:text-[#8c8376] hover:text-[#2c2523] dark:hover:text-[#ede8df]'
              }`}
            >
              <Icon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
