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

export default function SettingsWorkspace() {
  const auth = useSelector(selectAuth);
  const analysis = useSelector(selectCurrentAnalysis);
  const { theme, setTheme } = useTheme();
  const { profile, saveProfile, resetProfile, isLoadingProfile, profileError } = useProfileSettings(auth, analysis);
  const [activeSection, setActiveSection] = useState('Profile');
  const [draft, setDraft] = useState(profile);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  async function handleSave() {
    setIsSaving(true);
    setStatusMessage('');

    try {
      await saveProfile(draft);
      setStatusMessage('Profile settings saved. Your profile page now reflects these updates.');
    } catch (error) {
      setStatusMessage(error.response?.data?.error || 'Could not save profile settings right now.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    setIsSaving(true);
    setStatusMessage('');

    try {
      await resetProfile();
      setStatusMessage('Profile settings were reset to the latest Aptico defaults.');
    } catch (error) {
      setStatusMessage(error.response?.data?.error || 'Could not reset profile settings right now.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell
      title="Settings"
      description="A deeper settings workspace inspired by your Settings reference, rebuilt as the editing control center for a future LinkedIn-style profile with identity, career, education, visibility, and theme controls."
    >
      <section className="grid gap-6 xl:grid-cols-[240px_1fr]">
        <aside className="app-panel h-fit">
          <p className="app-kicker">Workspace sections</p>
          <nav className="mt-4 space-y-2">
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
                {activeSection === section ? <span>&bull;</span> : null}
              </button>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <article className="app-panel">
            <p className="app-kicker">{activeSection}</p>
            <h2 className="mt-3 text-2xl font-bold text-[var(--text)]">{activeSection} settings</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-strong)]">
              This workspace edits the data shown on your profile page, so you can shape a stronger public professional identity over time.
            </p>

            {isLoadingProfile ? (
              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm text-[var(--muted-strong)]">
                Loading your saved settings...
              </div>
            ) : null}

            {profileError ? (
              <div className="mt-6 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">
                {profileError}
              </div>
            ) : null}

            {activeSection === 'Profile' ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">First name</span>
                    <input className="app-input" value={draft.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Last name</span>
                    <input className="app-input" value={draft.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">Professional headline</span>
                    <input className="app-input" value={draft.headline} onChange={(event) => updateField('headline', event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Primary email</span>
                    <input className="app-input" value={draft.email} onChange={(event) => updateField('email', event.target.value)} />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">Phone</span>
                    <input className="app-input" value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Location</span>
                    <input className="app-input" value={draft.location} onChange={(event) => updateField('location', event.target.value)} />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">Website</span>
                    <input className="app-input" value={draft.website} onChange={(event) => updateField('website', event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Portfolio</span>
                    <input className="app-input" value={draft.portfolio} onChange={(event) => updateField('portfolio', event.target.value)} />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">LinkedIn</span>
                    <input className="app-input" value={draft.linkedin} onChange={(event) => updateField('linkedin', event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">GitHub</span>
                    <input className="app-input" value={draft.github} onChange={(event) => updateField('github', event.target.value)} />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="app-field-label">Professional bio</span>
                  <textarea className="app-input min-h-36" value={draft.bio} onChange={(event) => updateField('bio', event.target.value)} />
                </label>
              </div>
            ) : null}

            {activeSection === 'Career' ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-5 md:grid-cols-3">
                  <SelectField
                    label="Current status"
                    value={draft.currentStatus}
                    onChange={(event) => updateField('currentStatus', event.target.value)}
                    options={profileStatusOptions}
                  />
                  <SelectField
                    label="Employment type"
                    value={draft.employmentType}
                    onChange={(event) => updateField('employmentType', event.target.value)}
                    options={employmentTypeOptions}
                  />
                  <label className="space-y-2">
                    <span className="app-field-label">Years of experience</span>
                    <input className="app-input" value={draft.yearsExperience} onChange={(event) => updateField('yearsExperience', event.target.value)} />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">Current title</span>
                    <input className="app-input" value={draft.currentTitle} onChange={(event) => updateField('currentTitle', event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Current company</span>
                    <input className="app-input" value={draft.currentCompany} onChange={(event) => updateField('currentCompany', event.target.value)} />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">Industry</span>
                    <input className="app-input" value={draft.industry} onChange={(event) => updateField('industry', event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Target role</span>
                    <input className="app-input" value={draft.targetRole} onChange={(event) => updateField('targetRole', event.target.value)} />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="app-field-label">Availability note</span>
                  <input className="app-input" value={draft.availability} onChange={(event) => updateField('availability', event.target.value)} />
                </label>

                <div className="space-y-3">
                  <span className="app-field-label">Preferred work modes</span>
                  <div className="flex flex-wrap gap-3">
                    {workModeOptions.map((option) => {
                      const active = draft.preferredWorkModes.includes(option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleListValue('preferredWorkModes', option.value)}
                          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                            active
                              ? 'border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                              : 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted-strong)]'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">Top skills</span>
                    <textarea
                      className="app-input min-h-28"
                      value={draft.topSkills.join(', ')}
                      onChange={(event) => updateListField('topSkills', event.target.value)}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Tools and platforms</span>
                    <textarea
                      className="app-input min-h-28"
                      value={draft.tools.join(', ')}
                      onChange={(event) => updateListField('tools', event.target.value)}
                    />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">Languages</span>
                    <textarea
                      className="app-input min-h-24"
                      value={draft.languages.join(', ')}
                      onChange={(event) => updateListField('languages', event.target.value)}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Achievements</span>
                    <textarea
                      className="app-input min-h-24"
                      value={draft.achievements.join(', ')}
                      onChange={(event) => updateListField('achievements', event.target.value)}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {activeSection === 'Education' ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">School or university</span>
                    <input className="app-input" value={draft.school} onChange={(event) => updateField('school', event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Degree</span>
                    <input className="app-input" value={draft.degree} onChange={(event) => updateField('degree', event.target.value)} />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="app-field-label">Field of study</span>
                    <input className="app-input" value={draft.fieldOfStudy} onChange={(event) => updateField('fieldOfStudy', event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="app-field-label">Graduation year</span>
                    <input className="app-input" value={draft.graduationYear} onChange={(event) => updateField('graduationYear', event.target.value)} />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="app-field-label">Certifications</span>
                  <textarea className="app-input min-h-28" value={draft.certifications} onChange={(event) => updateField('certifications', event.target.value)} />
                </label>

                <label className="space-y-2">
                  <span className="app-field-label">Current learning focus</span>
                  <textarea className="app-input min-h-28" value={draft.learningFocus} onChange={(event) => updateField('learningFocus', event.target.value)} />
                </label>
              </div>
            ) : null}

            {activeSection === 'Visibility' ? (
              <div className="mt-6 space-y-4">
                <ToggleRow
                  title="Public profile"
                  description="Let recruiters and collaborators discover your profile details."
                  checked={draft.publicProfile}
                  onToggle={() => updateField('publicProfile', !draft.publicProfile)}
                />
                <ToggleRow
                  title="Open to work"
                  description="Highlight that you are available for new opportunities."
                  checked={draft.openToWork}
                  onToggle={() => updateField('openToWork', !draft.openToWork)}
                />
                <ToggleRow
                  title="Recruiter messages"
                  description="Allow inbound outreach from recruiters and hiring teams."
                  checked={draft.allowRecruiterMessages}
                  onToggle={() => updateField('allowRecruiterMessages', !draft.allowRecruiterMessages)}
                />
                <ToggleRow
                  title="Show email on profile"
                  description="Make your primary email visible on the profile page."
                  checked={draft.showEmail}
                  onToggle={() => updateField('showEmail', !draft.showEmail)}
                />
                <ToggleRow
                  title="Show phone on profile"
                  description="Display your phone number only when you want direct contact."
                  checked={draft.showPhone}
                  onToggle={() => updateField('showPhone', !draft.showPhone)}
                />

                <label className="space-y-2">
                  <span className="app-field-label">Profile strength note</span>
                  <textarea
                    className="app-input min-h-28"
                    value={draft.profileStrengthNotes}
                    onChange={(event) => updateField('profileStrengthNotes', event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            {activeSection === 'Notifications' ? (
              <div className="mt-6 space-y-4">
                <ToggleRow
                  title="Analysis completion updates"
                  description="Receive updates when resume and job match analysis is ready."
                  checked={draft.notificationAnalysisUpdates}
                  onToggle={() => updateField('notificationAnalysisUpdates', !draft.notificationAnalysisUpdates)}
                />
                <ToggleRow
                  title="New opportunity nudges"
                  description="Get nudges when your profile data aligns with new opportunities."
                  checked={draft.notificationOpportunityNudges}
                  onToggle={() => updateField('notificationOpportunityNudges', !draft.notificationOpportunityNudges)}
                />
                <ToggleRow
                  title="Security and account alerts"
                  description="Keep critical account and access notifications enabled."
                  checked={draft.notificationSecurityAlerts}
                  onToggle={() => updateField('notificationSecurityAlerts', !draft.notificationSecurityAlerts)}
                />
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm leading-7 text-[var(--muted-strong)]">
                  These notification preferences are now saved with the rest of your profile settings for authenticated users.
                </div>
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
                  The redesigned Aptico UI preserves hierarchy, card depth, and readability across both themes and screen sizes while staying close to your Settings reference.
                </div>
              </div>
            ) : null}

            {statusMessage ? (
              <div className="mt-8 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4 text-sm text-[var(--accent-strong)]">
                {statusMessage}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="app-button" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save settings'}
              </button>
              <button type="button" className="app-button-secondary" onClick={() => setDraft(profile)}>
                Revert edits
              </button>
              <button type="button" className="app-button-secondary" onClick={() => void handleReset()} disabled={isSaving}>
                Reset to defaults
              </button>
              <button type="button" className="app-button-secondary" onClick={() => setActiveSection('Theme')}>
                Theme controls
              </button>
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
