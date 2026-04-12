import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapAuthSession } from '../api/authApi.js';
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

// SVG Icons
const Icons = {
  Profile: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Career: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Education: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>,
  Visibility: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  Notifications: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  Theme: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
  Save: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  Reset: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Check: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  AlertCircle: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
};

const settingSections = [
  { id: 'Profile', icon: Icons.Profile, description: 'Basic identity & links' },
  { id: 'Career', icon: Icons.Career, description: 'Job status & experience' },
  { id: 'Education', icon: Icons.Education, description: 'Schools & learning' },
  { id: 'Visibility', icon: Icons.Visibility, description: 'Public footprint' },
  { id: 'Notifications', icon: Icons.Notifications, description: 'Alerts & nudges' },
  { id: 'Theme', icon: Icons.Theme, description: 'Display preferences' }
];

function AnimatedFadeIn({ children, id }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, [id]);

  return (
    <div className={`transition-all duration-500 transform ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {children}
    </div>
  );
}

function ToggleRow({ title, description, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-all duration-300 ${
        checked ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)] hover:border-[var(--accent)]/50' : 'border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--muted-strong)]'
      }`}
    >
      <div className="pr-4">
        <p className={`font-bold transition-colors ${checked ? 'text-[var(--text)]' : 'text-[var(--text)]'}`}>{title}</p>
        <p className="mt-1 text-sm text-[var(--muted-strong)] group-hover:text-[var(--muted-strong-hover)]">{description}</p>
      </div>
      <div className={`app-switch shrink-0 ${checked ? 'is-on shadow-md shadow-[var(--accent)]/20' : ''}`} />
    </button>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="space-y-2 block">
      <span className="app-field-label ml-1">{label}</span>
      <select 
        className="app-input w-full cursor-pointer focus:ring-2 focus:ring-[var(--accent)]/20 transition-shadow" 
        value={value} 
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="space-y-2 block">
      <span className="app-field-label ml-1">{label}</span>
      <input 
        type={type} 
        className="app-input w-full focus:ring-2 focus:ring-[var(--accent)]/20 transition-all font-medium" 
        value={value || ''} 
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder, minHeight = "min-h-[120px]" }) {
  return (
    <label className="space-y-2 block">
      <span className="app-field-label ml-1">{label}</span>
      <textarea 
        className={`app-input w-full focus:ring-2 focus:ring-[var(--accent)]/20 transition-all font-medium resize-y ${minHeight}`} 
        value={value || ''} 
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function SettingsWorkspace() {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const analysis = useSelector(selectCurrentAnalysis);
  const { theme, setTheme } = useTheme();
  const { profile, saveProfile, resetProfile, isLoadingProfile, profileError } = useProfileSettings(auth, analysis);
  
  const [activeSection, setActiveSection] = useState('Profile');
  const [draft, setDraft] = useState(profile);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success'|'error', text: '' }
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
    setStatusMessage(null);

    try {
      await saveProfile(draft);
      await bootstrapAuthSession({ dispatch });
      setStatusMessage({ type: 'success', text: 'Profile settings successfully updated and published.' });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.response?.data?.error || 'Could not save profile settings right now.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      await resetProfile();
      setStatusMessage({ type: 'success', text: 'Profile reverted to latest Aptico defaults.' });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.response?.data?.error || 'Could not reset profile settings right now.' });
    } finally {
      setIsSaving(false);
    }
  }

  // Get active section metadata
  const activeSectData = settingSections.find(s => s.id === activeSection);
  const ActiveIcon = activeSectData?.icon || Icons.Profile;

  return (
    <AppShell
      title="Settings Workspace"
      description="Your control center for identity, career trajectory, and visibility. Changes here directly impact your Profile Portfolio."
      actions={
        <div className="flex gap-3">
          <button 
            type="button" 
            className="app-button shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 transition-shadow flex items-center gap-2" 
            onClick={() => void handleSave()} 
            disabled={isSaving}
          >
            {isSaving ? (
               <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             ) : <Icons.Save className="w-4 h-4" />
            }
            {isSaving ? 'Syncing...' : 'Save Updates'}
          </button>
        </div>
      }
    >
      {/* Alert Banner for Status Messages */}
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between text-sm font-semibold animate-fade-in-up ${
          statusMessage.type === 'success' 
            ? 'bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--success-strong)]'
            : 'bg-[var(--warning-soft)] border-[var(--warning-border)] text-[var(--warning-text)]'
        }`}>
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? <Icons.Check className="w-5 h-5" /> : <Icons.AlertCircle className="w-5 h-5" />}
            {statusMessage.text}
          </div>
          <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100 p-1">✕</button>
        </div>
      )}

      <section className="mx-auto max-w-6xl grid gap-8 xl:grid-cols-[280px_1fr]">
        {/* Navigation Sidebar */}
        <aside className="space-y-4">
          <div className="app-panel border border-[var(--border)] shadow-sm sticky top-24 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-[var(--muted-strong)] mb-4 px-2">Configuration</p>
            <nav className="space-y-1.5">
              {settingSections.map(({ id, icon: Icon, description }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`group w-full flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-300 outline-none focus:ring-2 focus:ring-[var(--accent)]/50 ${
                    activeSection === id
                      ? 'bg-[var(--accent)] text-white shadow-md'
                      : 'hover:bg-[var(--panel-soft)] text-[var(--muted-strong)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeSection === id ? 'text-white' : 'text-[var(--muted-strong)] group-hover:text-[var(--text)]'}`} />
                  <div className="text-left flex-1">
                    <p className={`text-sm font-bold ${activeSection === id ? 'text-white' : 'text-[var(--text)]'}`}>{id}</p>
                    <p className={`text-xs mt-0.5 ${activeSection === id ? 'text-white/80' : 'text-[var(--muted-strong)]'}`}>{description}</p>
                  </div>
                  {activeSection === id && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                </button>
              ))}
            </nav>
            
            <div className="mt-8 pt-6 border-t border-[var(--border)] px-2">
              <button 
                type="button" 
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-[var(--warning-text)] hover:text-[var(--warning-strong)] hover:bg-[var(--warning-soft)] py-2 rounded-lg transition-colors" 
                onClick={() => void handleReset()} 
                disabled={isSaving}
              >
                <Icons.Reset className="w-4 h-4" />
                Reset Defaults
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="space-y-6">
          <article className="app-panel border border-[var(--border)] shadow-sm overflow-hidden p-0 relative">
            <div className="h-1 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] w-full block"></div>
            
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--border)]">
                <div className="p-3 bg-[var(--accent-soft)] text-[var(--accent)] rounded-2xl w-14 h-14 flex items-center justify-center">
                  <ActiveIcon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text)] tracking-tight">{activeSection} Configuration</h2>
                  <p className="mt-1 text-sm font-medium text-[var(--muted-strong)]">
                    {activeSectData?.description} — changes made here will reflect instantly on your linked profile.
                  </p>
                </div>
              </div>

              {isLoadingProfile && (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-[var(--muted-strong)] animate-pulse">
                  <div className="w-10 h-10 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin"></div>
                  <p className="font-semibold text-sm">Retrieving profile parameters...</p>
                </div>
              )}

              {profileError && !isLoadingProfile && (
                <div className="p-6 rounded-2xl border-l-4 border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)] flex gap-3 items-start">
                   <Icons.AlertCircle className="w-6 h-6 shrink-0" />
                   <div>
                     <p className="font-bold">Failed to load configuration</p>
                     <p className="text-sm mt-1">{profileError}</p>
                   </div>
                </div>
              )}

              {!isLoadingProfile && !profileError && (
                <AnimatedFadeIn id={activeSection}>
                  
                  {/* --- PROFILE SECTION --- */}
                  {activeSection === 'Profile' && (
                    <div className="space-y-8">
                      <div className="grid gap-6 md:grid-cols-2 bg-[var(--panel-soft)]/50 p-6 rounded-2xl border border-[var(--border)]/50">
                        <InputField label="First Name" value={draft.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
                        <InputField label="Last Name" value={draft.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
                        <div className="md:col-span-2">
                          <InputField label="Professional Headline" value={draft.headline} onChange={(e) => updateField('headline', e.target.value)} placeholder="e.g. Senior Frontend Engineer | React Specialist" />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <InputField type="email" label="Primary Email" value={draft.email} onChange={(e) => updateField('email', e.target.value)} />
                        <InputField type="tel" label="Phone Number" value={draft.phone} onChange={(e) => updateField('phone', e.target.value)} />
                        <InputField label="Location" value={draft.location} onChange={(e) => updateField('location', e.target.value)} placeholder="e.g. San Francisco, CA (or Remote)" />
                      </div>

                      <div className="pt-6 border-t border-[var(--border)]">
                        <h3 className="text-sm font-bold text-[var(--text)] mb-4">Digital Links</h3>
                        <div className="grid gap-6 md:grid-cols-2">
                          <InputField type="url" label="Personal Website" value={draft.website} onChange={(e) => updateField('website', e.target.value)} placeholder="https://" />
                          <InputField type="url" label="Portfolio URL" value={draft.portfolio} onChange={(e) => updateField('portfolio', e.target.value)} placeholder="https://" />
                          <InputField type="url" label="LinkedIn URL" value={draft.linkedin} onChange={(e) => updateField('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
                          <InputField type="url" label="GitHub URL" value={draft.github} onChange={(e) => updateField('github', e.target.value)} placeholder="https://github.com/..." />
                        </div>
                      </div>

                      <div className="pt-6 border-t border-[var(--border)]">
                        <TextAreaField 
                          label="Professional Bio" 
                          value={draft.bio} 
                          onChange={(e) => updateField('bio', e.target.value)} 
                          placeholder="Write a compelling professional summary highlighting your unique value proposition..." 
                          minHeight="min-h-[160px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* --- CAREER SECTION --- */}
                  {activeSection === 'Career' && (
                    <div className="space-y-8">
                      <div className="grid gap-6 md:grid-cols-3 bg-[var(--panel-soft)]/50 p-6 rounded-2xl border border-[var(--border)]/50">
                        <SelectField
                          label="Current Status"
                          value={draft.currentStatus}
                          onChange={(e) => updateField('currentStatus', e.target.value)}
                          options={profileStatusOptions}
                        />
                        <SelectField
                          label="Employment Type"
                          value={draft.employmentType}
                          onChange={(e) => updateField('employmentType', e.target.value)}
                          options={employmentTypeOptions}
                        />
                        <InputField type="number" label="Years of Experience" value={draft.yearsExperience} onChange={(e) => updateField('yearsExperience', e.target.value)} />
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <InputField label="Current Title" value={draft.currentTitle} onChange={(e) => updateField('currentTitle', e.target.value)} placeholder="e.g. Software Engineer" />
                        <InputField label="Current Company" value={draft.currentCompany} onChange={(e) => updateField('currentCompany', e.target.value)} placeholder="e.g. Tech Corp" />
                        <InputField label="Industry" value={draft.industry} onChange={(e) => updateField('industry', e.target.value)} placeholder="e.g. Computer Software" />
                        <InputField label="Target Role" value={draft.targetRole} onChange={(e) => updateField('targetRole', e.target.value)} placeholder="e.g. Engineering Manager" />
                      </div>

                      <div className="pt-6 border-t border-[var(--border)]">
                        <div className="space-y-4">
                          <InputField label="Availability Note" value={draft.availability} onChange={(e) => updateField('availability', e.target.value)} placeholder="e.g. Available immediately, or 2 weeks notice" />
                          
                          <div className="space-y-3">
                            <span className="app-field-label ml-1">Preferred Work Modes</span>
                            <div className="flex flex-wrap gap-3">
                              {workModeOptions.map((option) => {
                                const active = draft.preferredWorkModes.includes(option.value);
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleListValue('preferredWorkModes', option.value)}
                                    className={`rounded-xl border px-5 py-2.5 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${
                                      active
                                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-md shadow-[var(--accent)]/10'
                                        : 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted-strong)] hover:border-[var(--muted-strong)] hover:text-[var(--text)]'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-[var(--border)]">
                        <h3 className="text-sm font-bold text-[var(--text)] mb-4">Expertise & Accomplishments</h3>
                        <div className="grid gap-6 md:grid-cols-2">
                          <TextAreaField label="Top Skills (Comma separated)" value={draft.topSkills.join(', ')} onChange={(e) => updateListField('topSkills', e.target.value)} placeholder="e.g. React, Node.js, Frontend Architecture" />
                          <TextAreaField label="Tools & Stack (Comma separated)" value={draft.tools.join(', ')} onChange={(e) => updateListField('tools', e.target.value)} placeholder="e.g. VS Code, Figma, AWS, Next.js" />
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 mt-6">
                          <TextAreaField label="Languages (Comma separated)" value={draft.languages.join(', ')} onChange={(e) => updateListField('languages', e.target.value)} placeholder="e.g. English (Native), Spanish (Basic)" />
                          <TextAreaField label="Key Achievements (Comma separated)" value={draft.achievements.join(', ')} onChange={(e) => updateListField('achievements', e.target.value)} placeholder="e.g. Increased conversion by 20%, Led team of 5" minHeight="min-h-[120px]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- EDUCATION SECTION --- */}
                  {activeSection === 'Education' && (
                    <div className="space-y-8">
                      <div className="grid gap-6 md:grid-cols-2 bg-[var(--panel-soft)]/50 p-6 rounded-2xl border border-[var(--border)]/50">
                        <InputField label="School or University" value={draft.school} onChange={(e) => updateField('school', e.target.value)} placeholder="e.g. University of Example" />
                        <InputField label="Degree" value={draft.degree} onChange={(e) => updateField('degree', e.target.value)} placeholder="e.g. Bachelor of Science" />
                        <InputField label="Field of Study" value={draft.fieldOfStudy} onChange={(e) => updateField('fieldOfStudy', e.target.value)} placeholder="e.g. Computer Science" />
                        <InputField type="number" label="Graduation Year" value={draft.graduationYear} onChange={(e) => updateField('graduationYear', e.target.value)} placeholder="e.g. 2024" />
                      </div>

                      <div className="pt-2">
                        <TextAreaField label="Certifications (Comma separated)" value={draft.certifications} onChange={(e) => updateField('certifications', e.target.value)} placeholder="e.g. AWS Certified Developer, Google Cloud Engineer" />
                      </div>

                      <div className="pt-2">
                        <TextAreaField label="Current Learning Focus" value={draft.learningFocus} onChange={(e) => updateField('learningFocus', e.target.value)} placeholder="e.g. Currently exploring Rust and WebAssembly..." />
                      </div>
                    </div>
                  )}

                  {/* --- VISIBILITY SECTION --- */}
                  {activeSection === 'Visibility' && (
                    <div className="space-y-5">
                      <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/20 p-5 rounded-2xl mb-8">
                        <h3 className="font-bold text-[var(--accent-strong)] flex items-center gap-2">
                          <Icons.Visibility className="w-5 h-5" /> Let opportunities find you
                        </h3>
                        <p className="text-sm mt-1 font-medium text-[var(--text)] opacity-90">Toggle how your information is displayed to recruiters and visitors on your public links.</p>
                      </div>

                      <div className="grid gap-5">
                        <ToggleRow
                          title="Public Profile View"
                          description="Allow recruiters and external users to view your full profile page."
                          checked={draft.publicProfile}
                          onToggle={() => updateField('publicProfile', !draft.publicProfile)}
                        />
                        <ToggleRow
                          title="Open to Work Status"
                          description="Apply a highlight to your profile indicating you are exploring new roles."
                          checked={draft.openToWork}
                          onToggle={() => updateField('openToWork', !draft.openToWork)}
                        />
                        <ToggleRow
                          title="Recruiter Messages"
                          description="Allow direct inbound outreach from recruiters regarding potential roles."
                          checked={draft.allowRecruiterMessages}
                          onToggle={() => updateField('allowRecruiterMessages', !draft.allowRecruiterMessages)}
                        />
                        
                        <div className="grid gap-5 lg:grid-cols-2 mt-4">
                          <ToggleRow
                            title="Display Email"
                            description="Show email address publicly."
                            checked={draft.showEmail}
                            onToggle={() => updateField('showEmail', !draft.showEmail)}
                          />
                          <ToggleRow
                            title="Display Phone"
                            description="Show phone number publicly."
                            checked={draft.showPhone}
                            onToggle={() => updateField('showPhone', !draft.showPhone)}
                          />
                        </div>
                      </div>

                      <div className="pt-8 border-t border-[var(--border)]">
                        <TextAreaField 
                          label="Custom Profile Strength Notes" 
                          value={draft.profileStrengthNotes} 
                          onChange={(e) => updateField('profileStrengthNotes', e.target.value)} 
                          placeholder="Internal or display notes on your current profile strength..."
                          minHeight="min-h-[100px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* --- NOTIFICATIONS SECTION --- */}
                  {activeSection === 'Notifications' && (
                    <div className="space-y-5">
                      <div className="bg-[var(--panel-soft)] border border-[var(--border)] p-5 rounded-2xl mb-8">
                        <p className="font-bold text-[var(--text)]">Stay in the loop</p>
                        <p className="text-sm mt-1 font-medium text-[var(--muted-strong)]">Control your email and push notification preferences for analysis results and platform nudges.</p>
                      </div>

                      <div className="grid gap-5">
                        <ToggleRow
                          title="Analysis Completion"
                          description="Receive alerts when your resume-to-job analysis finishes processing."
                          checked={draft.notificationAnalysisUpdates}
                          onToggle={() => updateField('notificationAnalysisUpdates', !draft.notificationAnalysisUpdates)}
                        />
                        <ToggleRow
                          title="Opportunity Nudges"
                          description="Receive weekly aggregates of jobs that strongly match your profile."
                          checked={draft.notificationOpportunityNudges}
                          onToggle={() => updateField('notificationOpportunityNudges', !draft.notificationOpportunityNudges)}
                        />
                        <ToggleRow
                          title="Security & Account Alerts"
                          description="Crucial notifications about password changes or login attempts."
                          checked={draft.notificationSecurityAlerts}
                          onToggle={() => updateField('notificationSecurityAlerts', !draft.notificationSecurityAlerts)}
                        />
                      </div>
                    </div>
                  )}

                  {/* --- THEME SECTION --- */}
                  {activeSection === 'Theme' && (
                    <div className="space-y-8">
                       <div className="bg-[var(--panel-soft)] border border-[var(--border)] p-5 rounded-2xl mb-6">
                        <p className="font-bold text-[var(--text)]">Visual Preferences</p>
                        <p className="text-sm mt-1 font-medium text-[var(--muted-strong)]">Customize the look and feel of the platform interface.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-6 max-w-lg">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`relative rounded-2xl border-[3px] overflow-hidden transition-all duration-300 h-32 ${
                            theme === 'light' ? 'border-[var(--accent)] shadow-md shadow-[var(--accent)]/20 shadow-inner' : 'border-transparent bg-[var(--panel-soft)] hover:border-[var(--border)]'
                          }`}
                        >
                          <div className="absolute inset-0 bg-white"></div>
                          <div className="absolute top-4 left-4 right-4 h-4 rounded bg-gray-200"></div>
                          <div className="absolute top-10 left-4 w-1/2 h-16 rounded bg-gray-100"></div>
                          {theme === 'light' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
                              <Icons.Check className="w-10 h-10 text-[var(--accent)] drop-shadow-md" />
                            </div>
                          )}
                          <div className="absolute bottom-3 right-3 font-bold text-gray-800 text-sm">Light</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`relative rounded-2xl border-[3px] overflow-hidden transition-all duration-300 h-32 ${
                            theme === 'dark' ? 'border-[var(--accent)] shadow-md shadow-[var(--accent)]/20 shadow-inner' : 'border-transparent bg-gray-900 hover:border-gray-700'
                          }`}
                        >
                          <div className="absolute inset-0 bg-gray-900"></div>
                          <div className="absolute top-4 left-4 right-4 h-4 rounded bg-gray-800"></div>
                          <div className="absolute top-10 left-4 w-1/2 h-16 rounded bg-gray-800"></div>
                          {theme === 'dark' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-[2px]">
                              <Icons.Check className="w-10 h-10 text-[var(--accent)] drop-shadow-md" />
                            </div>
                          )}
                           <div className="absolute bottom-3 right-3 font-bold text-white text-sm">Dark</div>
                        </button>
                      </div>

                      <div className="flex items-center gap-4 mt-8 pt-6 border-t border-[var(--border)]">
                        <p className="text-sm font-bold text-[var(--text)]">Quick Toggle</p>
                        <ThemeToggle />
                      </div>
                    </div>
                  )}

                </AnimatedFadeIn>
              )}
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
