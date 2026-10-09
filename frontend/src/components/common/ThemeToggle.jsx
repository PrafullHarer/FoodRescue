import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle({ className = '', variant = 'button', showLabel = false }) {
  const { theme, toggleTheme, isDark } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center ${
          isDark
            ? 'bg-[#18181b] border border-[#232328] text-neutral-300 hover:text-white hover:bg-[#232328]'
            : 'bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-200 shadow-sm'
        } ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 animate-fade-in" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 animate-fade-in" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`sidebar-link w-full transition-all duration-200 ${
        isDark
          ? 'text-neutral-400 hover:text-white hover:bg-[#1c1c20]'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 flex-shrink-0 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 flex-shrink-0 text-slate-700" />
      )}
      {showLabel && (
        <span className="text-xs font-medium animate-fade-in">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
