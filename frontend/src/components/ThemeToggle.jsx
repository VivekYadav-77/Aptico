import { useTheme } from './theme.jsx';

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`app-icon-button ${compact ? 'h-10 w-10' : ''}`}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className="text-lg">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}
