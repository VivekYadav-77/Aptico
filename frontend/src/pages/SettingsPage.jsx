export { default } from './SettingsWorkspace.jsx';
/*
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import AppShell from '../components/AppShell.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { useTheme } from '../components/theme.jsx';
import {
  employmentTypeOptions,
  profileStatusOptions,
  useProfileSettings,
  workModeOptions
} from '../hooks/useProfileSettings.js';
import { selectAuth } from '../store/authSlice.js';
import { selectCurrentAnalysis } from '../store/historySlice.js';

const settingSections = ['Profile', 'Career', 'Education', 'Visibility', 'Notifications', 'Theme'];

function ToggleRow({ title, description, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-left"
    >
      <div>
        <p className="font-semibold text-[var(--text)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--muted-strong)]">{description}</p>
      </div>
      <div className={`app-switch ${checked ? 'is-on' : ''}`} />
    </button>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="space-y-2">
      <span className="app-field-label">{label}</span>
      <select className="app-input" value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SettingsPage() {
  const auth = useSelector(selectAuth);
  const analysis = useSelector(selectCurrentAnalysis);
  const { theme, setTheme } = useTheme();
  const { profile, saveProfile, resetProfile } = useProfileSettings(auth, analysis);
  const [activeSection, setActiveSection] = useState('Profile');
  const [draft, setDraft] = useState(profile);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateListField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }));
  }

  function toggleListValue(field, value) {
    setDraft((current) => {
      const nextSet = new Set(current[field] || []);

      if (nextSet.has(value)) {
        nextSet.delete(value);
      } else {
        nextSet.add(value);
      }

      return { ...current, [field]: Array.from(nextSet) };
    });
  }

  function handleSave() {
    saveProfile(draft);
    setStatusMessage('Profile settings saved. Your profile page now reflects these updates.');
  }

  function handleReset() {
    resetProfile();
    setStatusMessage('Profile settings were reset to the latest Aptico defaults.');
  }

  return (
    <AppShell
      title="Settings"
      description="The settings screen now matches Aptico’s product structure with practical controls for account preferences, privacy, security, and theme behavior."
    >
      <section className="grid gap-6 xl:grid-cols-[240px_1fr]">
        <aside className="app-panel h-fit">
          <nav className="space-y-2">
            {settingSections.map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  activeSection === section
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                    : 'text-[var(--muted-strong)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]'
                }`}
              >
                <span>{section}</span>
                {activeSection === section ? <span>•</span> : null}
              </button>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <article className="app-panel">
            <p className="app-kicker">{activeSection}</p>
            <h2 className="mt-3 text-2xl font-bold text-[var(--text)]">{activeSection} preferences</h2>

            {activeSection === 'Account' ? (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="app-field-label">Display name</span>
                  <input className="app-input" defaultValue="Aptico User" />
                </label>
                <label className="space-y-2">
                  <span className="app-field-label">Primary email</span>
                  <input className="app-input" defaultValue="you@example.com" />
                </label>
              </div>
            ) : null}

            {activeSection === 'Notifications' ? (
              <div className="mt-6 space-y-4">
                {[
                  'Analysis completion updates',
                  'New job matches from stored skills',
                  'Security alerts and session activity'
                ].map((label, index) => (
                  <div key={label} className="flex items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                    <div>
                      <p className="font-medium text-[var(--text)]">{label}</p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">Control when Aptico reaches out.</p>
                    </div>
                    <div className={`app-switch ${index < 2 ? 'is-on' : ''}`} />
                  </div>
                ))}
              </div>
            ) : null}

            {activeSection === 'Privacy' ? (
              <div className="mt-6 space-y-4 text-sm leading-7 text-[var(--muted-strong)]">
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  Resume files and job descriptions should only be uploaded when you are comfortable analyzing them in your account.
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  Guest mode is intentionally limited and should not be treated as persistent secure storage.
                </div>
              </div>
            ) : null}

            {activeSection === 'Security' ? (
              <div className="mt-6 space-y-4">
                {[
      ['Authentication', 'Email/password and Google-based sign-in with verified sessions is active.'],
                  ['Refresh handling', 'Protected calls can refresh valid sessions when possible.'],
                  ['Session hygiene', 'Admin tools can revoke refresh sessions for affected users.']
                ].map(([title, copy]) => (
                  <div key={title} className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                    <p className="font-medium text-[var(--text)]">{title}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">{copy}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {activeSection === 'Theme' ? (
              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`app-button-secondary ${theme === 'light' ? 'ring-2 ring-[var(--accent)]' : ''}`}
                  >
                    Light mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`app-button-secondary ${theme === 'dark' ? 'ring-2 ring-[var(--accent)]' : ''}`}
                  >
                    Dark mode
                  </button>
                  <ThemeToggle />
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm leading-7 text-[var(--muted-strong)]">
                  The redesigned Aptico UI preserves hierarchy, card depth, and readability across both themes and screen sizes.
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="app-button">
                Save settings
              </button>
              <button type="button" className="app-button-secondary">
                Cancel
              </button>
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
*/
