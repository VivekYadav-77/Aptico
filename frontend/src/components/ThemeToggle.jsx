import { useEffect, useState } from 'react';
import { useTheme } from '../app/theme.jsx';

export default function ThemeToggle({ compact = false }) {
  const { theme, mounted, toggleTheme } = useTheme();
  const [hydrated, setHydrated] = useState(false);
  const canShowThemeState = mounted && hydrated;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const icon = canShowThemeState ? (theme === 'dark' ? 'light_mode' : 'dark_mode') : 'dark_mode';

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`app-icon-button ${compact ? 'h-10 w-10' : ''}`}
      aria-label="Toggle theme"
      title={canShowThemeState ? `Switch to ${nextTheme} mode` : 'Toggle theme'}
    >
      <span className="material-symbols-outlined text-[20px]">
        {icon}
      </span>
    </button>
  );
}
