import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle({ className = '', variant = 'button', showLabel = false }) {
  const { toggleTheme, isDark } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center border border-neutral-200 dark:border-[#232328] bg-white dark:bg-[#18181b] text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-[#232328] shadow-sm cursor-pointer ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 animate-fade-in" />
        ) : (
          <Moon className="w-4 h-4 text-neutral-800 animate-fade-in" />
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
      className={`sidebar-link w-full transition-all duration-200 cursor-pointer ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 flex-shrink-0 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 flex-shrink-0 text-neutral-700" />
      )}
      {showLabel && (
        <span className="text-xs font-medium animate-fade-in">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
