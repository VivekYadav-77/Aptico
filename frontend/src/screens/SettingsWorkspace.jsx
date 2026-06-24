import React, { useEffect, useState } from 'react';
import { useSearchParams } from '@/lib/router-compat.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapAuthSession } from '../api/authApi.js';
import AppShell from '../components/AppShell.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import YourActivityPanel from '../components/YourActivityPanel.jsx';
import { useTheme } from '../app/theme.jsx';
import {
  employmentTypeOptions,
  getCareerProfileCopy,
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
  AlertCircle: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Featured: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Award: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  Certificate: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
};

const settingSections = [
  { id: 'Profile', icon: Icons.Profile, description: 'Basic identity & links' },
  { id: 'Your Activity', icon: Icons.Featured, description: 'Likes, comments & replies' },
  { id: 'Career', icon: Icons.Career, description: 'Job status & experience' },
  { id: 'Experience', icon: Icons.Career, description: 'Work history entries' },
  { id: 'Education', icon: Icons.Education, description: 'Schools & learning' },
  { id: 'Licenses', icon: Icons.Certificate, description: 'Certifications & credentials' },
  { id: 'Featured', icon: Icons.Featured, description: 'Showcase your best work' },
  { id: 'Top Projects', icon: Icons.Featured, description: 'Your three strongest builds' },
  { id: 'Honors', icon: Icons.Award, description: 'Awards & recognition' },
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
    <div className={`transition-all duration-700 ease-out transform ${show ? 'opacity-100 translate-y-0 blur-none scale-100' : 'opacity-0 translate-y-6 blur-[2px] scale-[0.98]'}`}>
      {children}
    </div>
  );
}

function ToggleRow({ title, description, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all duration-500 hover:shadow-lg hover:shadow-[var(--accent)]/5 sm:gap-4 sm:rounded-3xl sm:p-5 sm:hover:-translate-y-1 ${
        checked ? 'border-[var(--accent)]/60 bg-gradient-to-r from-[var(--accent-soft)] via-transparent to-transparent shadow-[var(--accent)]/15' : 'border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--muted-strong)] hover:bg-[var(--panel)]'
      }`}
    >
      <div className="min-w-0 flex-1 sm:pr-4">
        <p className={`font-bold transition-colors ${checked ? 'text-[var(--text)]' : 'text-[var(--text)]'}`}>{title}</p>
        <p className="mt-1 text-sm text-[var(--muted-strong)] group-hover:text-[var(--muted-strong-hover)]">{description}</p>
      </div>
      <div className={`app-switch shrink-0 ${checked ? 'is-on shadow-lg shadow-[var(--accent)]/30 scale-105' : ''}`} />
    </button>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="space-y-2 block">
      <span className="app-field-label ml-1">{label}</span>
      <select 
        className="app-input w-full cursor-pointer focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]/60 shadow-sm focus:shadow-md hover:border-[var(--accent)]/40 focus:bg-[var(--accent-soft)]/5 transition-shadow" 
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
        className="app-input w-full focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]/60 shadow-sm focus:shadow-md hover:border-[var(--accent)]/40 focus:bg-[var(--accent-soft)]/5 transition-all font-medium" 
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
        className={`app-input w-full focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]/60 shadow-sm focus:shadow-md hover:border-[var(--accent)]/40 focus:bg-[var(--accent-soft)]/5 transition-all font-medium resize-y ${minHeight}`} 
        value={value || ''} 
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}

function createEmptyExperience() {
  return {
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    description: '',
    isCurrent: false
  };
}

function createEmptyTopProject() {
  return {
    title: '',
    description: '',
    techStack: [],
    githubUrl: '',
    liveUrl: ''
  };
}

export default function SettingsWorkspace() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useSelector(selectAuth);
  const analysis = useSelector(selectCurrentAnalysis);
  const { theme, setTheme } = useTheme();
  const { profile, saveProfile, resetProfile, isLoadingProfile, profileError } = useProfileSettings(auth, analysis);
  
  const [activeSection, setActiveSection] = useState('Profile');
  const [draft, setDraft] = useState(profile);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success'|'error', text: '' }
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const sectionParam = searchParams.get('section');
    if (sectionParam === 'activity') {
      setActiveSection('Your Activity');
    }
  }, [searchParams]);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateListField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  const formatList = (val) => Array.isArray(val) ? val.join(', ') : (val || '');
  const careerCopy = getCareerProfileCopy(draft.currentStatus);

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
      setStatusMessage({ type: 'success', text: 'Profile settings and experience records successfully updated.' });
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
        <div className="flex min-w-0 w-full flex-wrap gap-3 sm:w-auto">
          <button 
            type="button" 
            className="app-button flex w-full items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-strong)] to-[var(--accent)] bg-[length:200%_auto] px-4 py-2.5 font-bold text-white shadow-lg shadow-[var(--accent)]/30 transition-all duration-500 hover:-translate-y-0.5 hover:bg-[position:right_center] hover:shadow-xl hover:shadow-[var(--accent)]/50 sm:w-auto sm:px-6" 
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
        <div className={`mb-6 flex flex-col gap-3 rounded-xl border p-4 text-sm font-semibold animate-fade-in-up sm:flex-row sm:items-center sm:justify-between ${
          statusMessage.type === 'success' 
            ? 'bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--success-strong)]'
            : 'bg-[var(--warning-soft)] border-[var(--warning-border)] text-[var(--warning-text)]'
        }`}>
          <div className="flex min-w-0 items-center gap-3">
            {statusMessage.type === 'success' ? <Icons.Check className="w-5 h-5" /> : <Icons.AlertCircle className="w-5 h-5" />}
            {statusMessage.text}
          </div>
          <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100 p-1">✕</button>
        </div>
      )}

      <section className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        {/* Navigation Sidebar */}
        <aside className="min-w-0 self-start">
          <div className="app-panel h-fit border border-[var(--border)] !p-3 shadow-sm sm:!p-4 lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-widest text-[var(--muted-strong)] mb-4 px-2 hidden lg:block">Configuration</p>
            <nav className="hide-scrollbar flex gap-2 overflow-x-auto pb-2 snap-x lg:flex-col lg:overflow-visible lg:pb-0">
              {settingSections.map(({ id, icon: Icon, description }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveSection(id);
                    if (id === 'Your Activity') {
                      setSearchParams({ section: 'activity' }, { replace: true });
                    } else if (searchParams.get('section')) {
                      setSearchParams({}, { replace: true });
                    }
                  }}
                  className={`group relative flex min-w-[8.5rem] shrink-0 snap-start items-center gap-2 overflow-hidden rounded-xl px-3 py-3 transition-all duration-300 outline-none focus:ring-2 focus:ring-[var(--accent)]/50 sm:min-w-[10rem] lg:min-w-0 lg:w-full lg:gap-4 lg:px-4 lg:py-3.5 ${
                    activeSection === id
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-white shadow-lg shadow-[var(--accent)]/30 border-transparent scale-[1.02] lg:scale-100'
                      : 'hover:bg-[var(--panel-soft)] text-[var(--muted-strong)] hover:text-[var(--text)] border border-[var(--border)] lg:border-transparent hover:shadow-sm hover:border-[var(--accent)]/30'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-transform duration-300 sm:h-5 sm:w-5 ${activeSection === id ? 'text-white scale-110' : 'text-[var(--muted-strong)] group-hover:text-[var(--text)] group-hover:scale-110'}`} />
                  <div className="text-left hidden lg:block flex-1">
                    <p className={`text-sm font-bold ${activeSection === id ? 'text-white' : 'text-[var(--text)]'}`}>{id}</p>
                    <p className={`text-xs mt-0.5 ${activeSection === id ? 'text-white/80' : 'text-[var(--muted-strong)]'}`}>{description}</p>
                  </div>
                  <span className={`block min-w-0 truncate text-sm font-bold lg:hidden ${activeSection === id ? 'text-white' : 'text-[var(--text)]'}`}>{id}</span>
                  {activeSection === id && <span className="hidden lg:block w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.8)] animate-pulse" />}
                </button>
              ))}
            </nav>
            
            <div className="mt-3 hidden border-t border-[var(--border)] px-1 pt-3 sm:px-2 lg:mt-8 lg:block lg:pt-6">
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
        <div className="min-w-0 space-y-6 overflow-hidden">
          <article className="app-panel relative min-w-0 overflow-hidden border border-[var(--border)]/60 bg-gradient-to-b from-[var(--panel)] to-[var(--panel-soft)] p-0 shadow-2xl shadow-[var(--accent)]/5 backdrop-blur-xl transition-all duration-500">
            <div className="h-1.5 bg-gradient-to-r from-[var(--accent)] via-purple-500 to-[var(--accent-strong)] w-full block opacity-90 animate-gradient-x bg-[length:200%_auto]"></div>
            
            <div className="relative p-4 sm:p-6 lg:p-8">
              {/* Subtle decorative background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
              
              <div className="relative z-10 mb-5 flex flex-col gap-3 border-b border-[var(--border)]/60 pb-5 sm:mb-6 sm:flex-row sm:items-center sm:gap-5 sm:pb-6 lg:mb-8 group">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--accent)]/10 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--panel)] p-2.5 text-[var(--accent)] shadow-inner ring-1 ring-white/20 transition-transform duration-500 ease-out group-hover:scale-105 sm:h-14 sm:w-14 sm:p-3 sm:group-hover:rotate-3">
                  <ActiveIcon className="h-6 w-6 drop-shadow-sm sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black tracking-tight text-[var(--text)] sm:text-2xl">{activeSection} Configuration</h2>
                  <p className="mt-1 max-w-full break-words text-sm font-medium text-[var(--muted-strong)]">
                    {activeSectData?.description} - changes made here will reflect instantly on your linked profile.
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
                      <div className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-[var(--border)]/60 bg-gradient-to-br from-[var(--panel-soft)] to-[var(--panel)] p-4 shadow-sm transition-all duration-500 hover:border-[var(--accent)]/20 hover:shadow-lg hover:shadow-[var(--accent)]/5 sm:gap-6 sm:rounded-3xl sm:p-7 md:grid-cols-2">
                        <InputField label="First Name" value={draft.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
                        <InputField label="Last Name" value={draft.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
                        <div className="md:col-span-2">
                          <InputField label="Professional Headline" value={draft.headline} onChange={(e) => updateField('headline', e.target.value)} placeholder="e.g. Senior Frontend Engineer | React Specialist" />
                        </div>
                      </div>

                      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                        <InputField type="email" label="Primary Email" value={draft.email} onChange={(e) => updateField('email', e.target.value)} />
                        <InputField type="tel" label="Phone Number" value={draft.phone} onChange={(e) => updateField('phone', e.target.value)} />
                        <InputField label="Location" value={draft.location} onChange={(e) => updateField('location', e.target.value)} placeholder="e.g. San Francisco, CA (or Remote)" />
                      </div>

                      <div className="pt-6 border-t border-[var(--border)]">
                        <h3 className="text-sm font-bold text-[var(--text)] mb-4">Digital Links</h3>
                        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
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
                      {(draft.currentStatus === 'student' || draft.currentStatus === 'job-seeker') ? (
                        <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4 text-sm text-[var(--accent-strong)]">
                          <p className="font-black">{careerCopy.modeTitle}</p>
                          <p className="mt-1 font-semibold leading-6">{careerCopy.modeDescription}</p>
                        </div>
                      ) : null}
                      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3 bg-gradient-to-br from-[var(--panel-soft)] to-[var(--panel)] p-5 sm:p-7 rounded-3xl border border-[var(--border)]/60 shadow-sm hover:shadow-lg hover:shadow-[var(--accent)]/5 hover:border-[var(--accent)]/20 transition-all duration-500">
                        <SelectField
                          label="Current Status"
                          value={draft.currentStatus}
                          onChange={(e) => updateField('currentStatus', e.target.value)}
                          options={profileStatusOptions}
                        />
                        <SelectField
                          label={careerCopy.employmentTypeLabel}
                          value={draft.employmentType}
                          onChange={(e) => updateField('employmentType', e.target.value)}
                          options={employmentTypeOptions}
                        />
                        <InputField type="text" label={careerCopy.yearsExperienceLabel} value={draft.yearsExperience} onChange={(e) => updateField('yearsExperience', e.target.value)} />
                      </div>

                      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                        <InputField label={careerCopy.currentTitleLabel} value={draft.currentTitle} onChange={(e) => updateField('currentTitle', e.target.value)} placeholder={careerCopy.currentTitlePlaceholder} />
                        <InputField label={careerCopy.currentCompanyLabel} value={draft.currentCompany} onChange={(e) => updateField('currentCompany', e.target.value)} placeholder={careerCopy.currentCompanyPlaceholder} />
                        <InputField label={careerCopy.industryLabel} value={draft.industry} onChange={(e) => updateField('industry', e.target.value)} placeholder={careerCopy.industryPlaceholder} />
                        <InputField label={careerCopy.targetRoleLabel} value={draft.targetRole} onChange={(e) => updateField('targetRole', e.target.value)} placeholder={careerCopy.targetRolePlaceholder} />
                      </div>

                      <div className="pt-6 border-t border-[var(--border)]">
                        <div className="space-y-4">
                          <InputField label={careerCopy.availabilityLabel} value={draft.availability} onChange={(e) => updateField('availability', e.target.value)} placeholder={careerCopy.availabilityPlaceholder} />
                          
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
                        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                          <TextAreaField label="Top Skills (Comma separated)" value={formatList(draft.topSkills)} onChange={(e) => updateListField('topSkills', e.target.value)} placeholder="e.g. React, Node.js, Frontend Architecture" />
                          <TextAreaField label="Tools & Stack (Comma separated)" value={formatList(draft.tools)} onChange={(e) => updateListField('tools', e.target.value)} placeholder="e.g. VS Code, Figma, AWS, Next.js" />
                        </div>
                        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 mt-6">
                          <TextAreaField label="Languages (Comma separated)" value={formatList(draft.languages)} onChange={(e) => updateListField('languages', e.target.value)} placeholder="e.g. English (Native), Spanish (Basic)" />
                          <TextAreaField label="Key Achievements (Comma separated)" value={formatList(draft.achievements)} onChange={(e) => updateListField('achievements', e.target.value)} placeholder="e.g. Increased conversion by 20%, Led team of 5" minHeight="min-h-[120px]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- EDUCATION SECTION --- */}
                  {activeSection === 'Education' && (
                    <div className="space-y-8">
                      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 bg-gradient-to-br from-[var(--panel-soft)] to-[var(--panel)] p-5 sm:p-7 rounded-3xl border border-[var(--border)]/60 shadow-sm hover:shadow-lg hover:shadow-[var(--accent)]/5 hover:border-[var(--accent)]/20 transition-all duration-500">
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
                  {/* --- EXPERIENCE SECTION --- */}
                  {activeSection === 'Experience' && (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-[var(--muted-strong)]">{careerCopy.experienceSectionDescription}</p>
                        <button type="button" className="app-button w-full justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-2 text-sm font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-md sm:w-auto" onClick={() => updateField('experiences', [...(draft.experiences || []), createEmptyExperience()])}>{careerCopy.addExperienceLabel}</button>
                      </div>
                      {(draft.experiences || []).length === 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-gradient-to-b from-[var(--panel-soft)] to-transparent p-6 text-center text-[var(--muted-strong)] transition-all duration-500 hover:border-[var(--accent)]/50 hover:shadow-lg hover:shadow-[var(--accent)]/5 sm:rounded-3xl sm:p-10 group cursor-pointer">
                          <Icons.Career className="w-8 h-8 mx-auto mb-3 opacity-40" />
                          <p className="font-bold text-sm">{careerCopy.emptyExperienceTitle}</p>
                          <p className="text-xs mt-1">{careerCopy.emptyExperienceMessage}</p>
                        </div>
                      )}
                      {(draft.experiences || []).map((exp, idx) => (
                        <div key={exp.id || idx} className="group relative space-y-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--panel-soft)] p-4 shadow-sm transition-all duration-500 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-[var(--accent)]/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 hover:border-[var(--accent)]/40 hover:shadow-xl hover:shadow-[var(--accent)]/10 hover:before:opacity-100 sm:rounded-3xl sm:p-6 sm:before:rounded-3xl sm:hover:-translate-y-1">
                          <button type="button" onClick={() => updateField('experiences', draft.experiences.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-xs font-bold text-[var(--warning-text)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--warning-soft)] px-2 py-1 rounded-lg">Remove</button>
                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                            <InputField label={careerCopy.experienceTitleLabel} value={exp.title} onChange={(e) => { const next = [...draft.experiences]; next[idx] = { ...next[idx], title: e.target.value }; updateField('experiences', next); }} placeholder={careerCopy.experienceTitlePlaceholder} />
                            <InputField label={careerCopy.experienceCompanyLabel} value={exp.company} onChange={(e) => { const next = [...draft.experiences]; next[idx] = { ...next[idx], company: e.target.value }; updateField('experiences', next); }} placeholder={careerCopy.experienceCompanyPlaceholder} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <InputField type="date" label="Start Date" value={exp.startDate} onChange={(e) => { const next = [...draft.experiences]; next[idx] = { ...next[idx], startDate: e.target.value }; updateField('experiences', next); }} />
                              <InputField type="date" label="End Date" value={exp.endDate} onChange={(e) => { const next = [...draft.experiences]; next[idx] = { ...next[idx], endDate: e.target.value }; updateField('experiences', next); }} />
                            </div>
                          </div>
                          <TextAreaField label={careerCopy.experienceDescriptionLabel} value={exp.description} onChange={(e) => { const next = [...draft.experiences]; next[idx] = { ...next[idx], description: e.target.value }; updateField('experiences', next); }} placeholder={careerCopy.experienceDescriptionPlaceholder} minHeight="min-h-[80px]" />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={exp.isCurrent || false} onChange={(e) => { const next = [...draft.experiences]; next[idx] = { ...next[idx], isCurrent: e.target.checked, endDate: e.target.checked ? '' : next[idx].endDate }; updateField('experiences', next); }} className="accent-[var(--accent)]" />
                            <span className="text-sm font-medium text-[var(--text)]">{careerCopy.experienceCurrentLabel}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- LICENSES & CERTIFICATIONS SECTION --- */}
                  {activeSection === 'Licenses' && (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-[var(--muted-strong)]">Add professional licenses and certifications.</p>
                        <button type="button" className="app-button w-full justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-2 text-sm font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-md sm:w-auto" onClick={() => updateField('licenses', [...(draft.licenses || []), { name: '', issuingOrg: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '' }])}>+ Add License</button>
                      </div>
                      {(draft.licenses || []).length === 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-gradient-to-b from-[var(--panel-soft)] to-transparent p-6 text-center text-[var(--muted-strong)] transition-all duration-500 hover:border-[var(--accent)]/50 hover:shadow-lg hover:shadow-[var(--accent)]/5 sm:rounded-3xl sm:p-10 group cursor-pointer">
                          <Icons.Certificate className="w-8 h-8 mx-auto mb-3 opacity-40" />
                          <p className="font-bold text-sm">No licenses or certifications added yet</p>
                          <p className="text-xs mt-1">Click "Add License" to showcase your credentials.</p>
                        </div>
                      )}
                      {(draft.licenses || []).map((lic, idx) => (
                        <div key={idx} className="group relative space-y-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--panel-soft)] p-4 shadow-sm transition-all duration-500 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-[var(--accent)]/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 hover:border-[var(--accent)]/40 hover:shadow-xl hover:shadow-[var(--accent)]/10 hover:before:opacity-100 sm:rounded-3xl sm:p-6 sm:before:rounded-3xl sm:hover:-translate-y-1">
                          <button type="button" onClick={() => updateField('licenses', draft.licenses.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-xs font-bold text-[var(--warning-text)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--warning-soft)] px-2 py-1 rounded-lg">Remove</button>
                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                            <InputField label="Certificate / License Name" value={lic.name} onChange={(e) => { const next = [...draft.licenses]; next[idx] = { ...next[idx], name: e.target.value }; updateField('licenses', next); }} placeholder="e.g. AWS Solutions Architect" />
                            <InputField label="Issuing Organization" value={lic.issuingOrg} onChange={(e) => { const next = [...draft.licenses]; next[idx] = { ...next[idx], issuingOrg: e.target.value }; updateField('licenses', next); }} placeholder="e.g. Amazon Web Services" />
                            <InputField label="Issue Date" value={lic.issueDate} onChange={(e) => { const next = [...draft.licenses]; next[idx] = { ...next[idx], issueDate: e.target.value }; updateField('licenses', next); }} placeholder="e.g. March 2024" />
                            <InputField label="Expiry Date" value={lic.expiryDate} onChange={(e) => { const next = [...draft.licenses]; next[idx] = { ...next[idx], expiryDate: e.target.value }; updateField('licenses', next); }} placeholder="No expiration" />
                            <InputField label="Credential ID" value={lic.credentialId} onChange={(e) => { const next = [...draft.licenses]; next[idx] = { ...next[idx], credentialId: e.target.value }; updateField('licenses', next); }} placeholder="e.g. ABC-123-XYZ" />
                            <InputField label="Credential URL" value={lic.credentialUrl} onChange={(e) => { const next = [...draft.licenses]; next[idx] = { ...next[idx], credentialUrl: e.target.value }; updateField('licenses', next); }} placeholder="https://verify.example.com/..." />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- FEATURED SECTION --- */}
                  {activeSection === 'Featured' && (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-[var(--muted-strong)]">Showcase projects, articles, or achievements visitors should see first.</p>
                        <button type="button" className="app-button w-full justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-2 text-sm font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-md sm:w-auto" onClick={() => updateField('featured', [...(draft.featured || []), { title: '', description: '', link: '', type: 'project' }])}>+ Add Item</button>
                      </div>
                      {(draft.featured || []).length === 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-gradient-to-b from-[var(--panel-soft)] to-transparent p-6 text-center text-[var(--muted-strong)] transition-all duration-500 hover:border-[var(--accent)]/50 hover:shadow-lg hover:shadow-[var(--accent)]/5 sm:rounded-3xl sm:p-10 group cursor-pointer">
                          <Icons.Featured className="w-8 h-8 mx-auto mb-3 opacity-40" />
                          <p className="font-bold text-sm">No featured items yet</p>
                          <p className="text-xs mt-1">Add projects, articles, or posts to highlight on your profile.</p>
                        </div>
                      )}
                      {(draft.featured || []).map((item, idx) => (
                        <div key={idx} className="group relative space-y-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--panel-soft)] p-4 shadow-sm transition-all duration-500 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-[var(--accent)]/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 hover:border-[var(--accent)]/40 hover:shadow-xl hover:shadow-[var(--accent)]/10 hover:before:opacity-100 sm:rounded-3xl sm:p-6 sm:before:rounded-3xl sm:hover:-translate-y-1">
                          <button type="button" onClick={() => updateField('featured', draft.featured.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-xs font-bold text-[var(--warning-text)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--warning-soft)] px-2 py-1 rounded-lg">Remove</button>
                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                            <InputField label="Title" value={item.title} onChange={(e) => { const next = [...draft.featured]; next[idx] = { ...next[idx], title: e.target.value }; updateField('featured', next); }} placeholder="e.g. E-Commerce Platform" />
                            <SelectField label="Type" value={item.type} onChange={(e) => { const next = [...draft.featured]; next[idx] = { ...next[idx], type: e.target.value }; updateField('featured', next); }} options={[{ value: 'project', label: 'Project' }, { value: 'article', label: 'Article' }, { value: 'post', label: 'Post' }, { value: 'link', label: 'External Link' }]} />
                          </div>
                          <TextAreaField label="Description" value={item.description} onChange={(e) => { const next = [...draft.featured]; next[idx] = { ...next[idx], description: e.target.value }; updateField('featured', next); }} placeholder="Brief description of this featured item..." minHeight="min-h-[60px]" />
                          <InputField label="Link URL" value={item.link} onChange={(e) => { const next = [...draft.featured]; next[idx] = { ...next[idx], link: e.target.value }; updateField('featured', next); }} placeholder="https://..." />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- TOP PROJECTS SECTION --- */}
                  {activeSection === 'Top Projects' && (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--muted-strong)]">Use one outcome-focused sentence and up to 4 core technologies per project.</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{(draft.topProjects || []).length}/3 projects added</p>
                        </div>
                        <button
                          type="button"
                          disabled={(draft.topProjects || []).length >= 3}
                          className="app-button w-full justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-2 text-sm font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none sm:w-auto"
                          onClick={() => updateField('topProjects', [...(draft.topProjects || []), createEmptyTopProject()])}
                        >
                          + Add Project
                        </button>
                      </div>

                      {(draft.topProjects || []).length === 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-gradient-to-b from-[var(--panel-soft)] to-transparent p-6 text-center text-[var(--muted-strong)] transition-all duration-500 hover:border-[var(--accent)]/50 hover:shadow-lg hover:shadow-[var(--accent)]/5 sm:rounded-3xl sm:p-10 group">
                          <Icons.Featured className="w-8 h-8 mx-auto mb-3 opacity-40" />
                          <p className="font-bold text-sm">No top projects added yet</p>
                          <p className="text-xs mt-1">Add your strongest project proof for profiles and resume export.</p>
                        </div>
                      )}

                      {(draft.topProjects || []).map((project, idx) => {
                        const descriptionLength = String(project.description || '').length;
                        const resumeDescriptionLength = String(project.resumeDescription || '').length;
                        const techCount = Array.isArray(project.techStack)
                          ? project.techStack.length
                          : String(project.techStack || '').split(',').map((item) => item.trim()).filter(Boolean).length;
                        return (
                          <div key={idx} className="group relative space-y-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--panel-soft)] p-4 shadow-sm transition-all duration-500 hover:border-[var(--accent)]/40 hover:shadow-xl hover:shadow-[var(--accent)]/10 sm:rounded-3xl sm:p-6 sm:hover:-translate-y-1">
                            <button type="button" onClick={() => updateField('topProjects', draft.topProjects.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-xs font-bold text-[var(--warning-text)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--warning-soft)] px-2 py-1 rounded-lg">Remove</button>
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                              <InputField label="Project Title" value={project.title} onChange={(e) => { const next = [...draft.topProjects]; next[idx] = { ...next[idx], title: e.target.value.slice(0, 80) }; updateField('topProjects', next); }} placeholder="e.g. Aptico Job Dashboard" />
                              <InputField label={`Tech Stack (${Math.min(techCount, 4)}/4)`} value={Array.isArray(project.techStack) ? project.techStack.join(', ') : (project.techStack || '')} onChange={(e) => { const next = [...draft.topProjects]; next[idx] = { ...next[idx], techStack: e.target.value.slice(0, 120) }; updateField('topProjects', next); }} placeholder="React, Node.js, MongoDB, Express" />
                            </div>
                            <div>
                              <TextAreaField label="Project Description" value={project.description} onChange={(e) => { const next = [...draft.topProjects]; next[idx] = { ...next[idx], description: e.target.value.replace(/\s+/g, ' ').slice(0, 280) }; updateField('topProjects', next); }} placeholder="Describe the problem, build, and result. Profile cards show a preview; the full text opens in details." minHeight="min-h-[92px]" />
                              <p className={`mt-1 text-right text-[10px] font-bold uppercase tracking-[0.14em] ${descriptionLength >= 250 ? 'text-[var(--warning-text)]' : 'text-[var(--muted)]'}`}>{descriptionLength}/280</p>
                            </div>
                            <div>
                              <TextAreaField label="Resume Description" value={project.resumeDescription || ''} onChange={(e) => { const next = [...draft.topProjects]; next[idx] = { ...next[idx], resumeDescription: e.target.value.replace(/\s+/g, ' ').slice(0, 160) }; updateField('topProjects', next); }} placeholder="One compact result-focused line for resume export." minHeight="min-h-[72px]" />
                              <p className={`mt-1 text-right text-[10px] font-bold uppercase tracking-[0.14em] ${resumeDescriptionLength >= 145 ? 'text-[var(--warning-text)]' : 'text-[var(--muted)]'}`}>{resumeDescriptionLength}/160</p>
                            </div>
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                              <InputField label="GitHub URL" value={project.githubUrl} onChange={(e) => { const next = [...draft.topProjects]; next[idx] = { ...next[idx], githubUrl: e.target.value.slice(0, 240) }; updateField('topProjects', next); }} placeholder="https://github.com/..." />
                              <InputField label="Live Demo URL" value={project.liveUrl} onChange={(e) => { const next = [...draft.topProjects]; next[idx] = { ...next[idx], liveUrl: e.target.value.slice(0, 240) }; updateField('topProjects', next); }} placeholder="https://..." />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* --- HONORS & AWARDS SECTION --- */}
                  {activeSection === 'Honors' && (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-[var(--muted-strong)]">Highlight recognitions, awards, and accomplishments.</p>
                        <button type="button" className="app-button w-full justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-2 text-sm font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-md sm:w-auto" onClick={() => updateField('honorsAwards', [...(draft.honorsAwards || []), { title: '', issuer: '', date: '', description: '' }])}>+ Add Award</button>
                      </div>
                      {(draft.honorsAwards || []).length === 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-gradient-to-b from-[var(--panel-soft)] to-transparent p-6 text-center text-[var(--muted-strong)] transition-all duration-500 hover:border-[var(--accent)]/50 hover:shadow-lg hover:shadow-[var(--accent)]/5 sm:rounded-3xl sm:p-10 group cursor-pointer">
                          <Icons.Award className="w-8 h-8 mx-auto mb-3 opacity-40" />
                          <p className="font-bold text-sm">No honors or awards added yet</p>
                          <p className="text-xs mt-1">Click "Add Award" to showcase your recognitions.</p>
                        </div>
                      )}
                      {(draft.honorsAwards || []).map((award, idx) => (
                        <div key={idx} className="group relative space-y-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--panel-soft)] p-4 shadow-sm transition-all duration-500 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-[var(--accent)]/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 hover:border-[var(--accent)]/40 hover:shadow-xl hover:shadow-[var(--accent)]/10 hover:before:opacity-100 sm:rounded-3xl sm:p-6 sm:before:rounded-3xl sm:hover:-translate-y-1">
                          <button type="button" onClick={() => updateField('honorsAwards', draft.honorsAwards.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-xs font-bold text-[var(--warning-text)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--warning-soft)] px-2 py-1 rounded-lg">Remove</button>
                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                            <InputField label="Award Title" value={award.title} onChange={(e) => { const next = [...draft.honorsAwards]; next[idx] = { ...next[idx], title: e.target.value }; updateField('honorsAwards', next); }} placeholder="e.g. Dean's List" />
                            <InputField label="Issuer" value={award.issuer} onChange={(e) => { const next = [...draft.honorsAwards]; next[idx] = { ...next[idx], issuer: e.target.value }; updateField('honorsAwards', next); }} placeholder="e.g. University of Example" />
                            <InputField label="Date" value={award.date} onChange={(e) => { const next = [...draft.honorsAwards]; next[idx] = { ...next[idx], date: e.target.value }; updateField('honorsAwards', next); }} placeholder="e.g. 2024" />
                          </div>
                          <TextAreaField label="Description" value={award.description} onChange={(e) => { const next = [...draft.honorsAwards]; next[idx] = { ...next[idx], description: e.target.value }; updateField('honorsAwards', next); }} placeholder="Brief description of this recognition..." minHeight="min-h-[60px]" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- YOUR ACTIVITY SECTION --- */}
                  {activeSection === 'Your Activity' && <YourActivityPanel />}

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
                        
                        <div className="grid gap-5 grid-cols-1 lg:grid-cols-2 mt-4">
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

                      {/* Section Visibility Controls */}
                      <div className="pt-8 border-t border-[var(--border)]">
                        <h3 className="text-sm font-bold text-[var(--text)] mb-2">Section Visibility</h3>
                        <p className="text-xs text-[var(--muted-strong)] mb-6">Control who can see each section on your public profile.</p>
                        <div className="space-y-3">
                          {[
                            { key: 'about', label: 'About' },
                            { key: 'featured', label: 'Featured' },
                            { key: 'topProjects', label: 'Top Projects' },
                            { key: 'activity', label: 'Activity' },
                            { key: 'dashboard', label: 'Career Dashboard' },
                            { key: 'experience', label: 'Experience' },
                            { key: 'education', label: 'Education' },
                            { key: 'licenses', label: 'Licenses & Certifications' },
                            { key: 'skills', label: 'Skills' },
                            { key: 'honorsAwards', label: 'Honors & Awards' }, { key: 'digitalFootprint', label: 'Digital Footprint' },
                            { key: 'resiliencePortfolio', label: 'Proof of Resilience' },
                            { key: 'socialNetwork', label: 'Social Network (Followers & Connections)' }
                          ].map(({ key, label }) => {
                            const currentValue = draft.sectionVisibility?.[key] || 'everyone';
                            return (
                              <div key={key} className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 transition-colors hover:border-[var(--muted-strong)] sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                                <span className="text-sm font-bold text-[var(--text)]">{label}</span>
                                <div className="flex w-full overflow-hidden rounded-lg border border-[var(--border)] sm:w-auto">
                                  {[
                                    { value: 'everyone', icon: '🌐', tip: 'Everyone' },
                                    { value: 'connections', icon: '🤝', tip: 'Connections' },
                                    { value: 'only_me', icon: '🔒', tip: 'Only me' }
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      title={opt.tip}
                                      onClick={() => {
                                        const next = { ...(draft.sectionVisibility || {}), [key]: opt.value };
                                        updateField('sectionVisibility', next);
                                      }}
                                      className={`min-w-0 flex-1 px-2 py-2 text-xs font-bold transition-all sm:flex-none sm:px-3 ${currentValue === opt.value ? 'bg-[var(--accent)] text-white' : 'bg-[var(--panel)] text-[var(--muted-strong)] hover:text-[var(--text)] hover:bg-[var(--panel-soft)]'}`}
                                    >
                                      <span className="truncate">{opt.icon}</span><span className="ml-1 hidden md:inline">{opt.tip}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
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

                      <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`relative h-28 overflow-hidden rounded-2xl border-[3px] transition-all duration-500 hover:shadow-xl sm:h-32 sm:rounded-3xl sm:hover:-translate-y-1 ${
                            theme === 'light' ? 'border-[var(--accent)] shadow-lg shadow-[var(--accent)]/30' : 'border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--muted-strong)]'
                          }`}
                        >
                          <div className="absolute inset-0 bg-white"></div>
                          <div className="absolute top-4 left-4 right-4 h-4 rounded-lg bg-gray-200"></div>
                          <div className="absolute top-10 left-4 w-1/2 h-16 rounded-xl bg-gray-100"></div>
                          {theme === 'light' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
                              <Icons.Check className="w-10 h-10 text-[var(--accent)] drop-shadow-md scale-110" />
                            </div>
                          )}
                          <div className="absolute bottom-3 right-3 font-bold text-gray-800 text-sm bg-white/80 px-2 py-1 rounded-md backdrop-blur-sm">Light</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`relative h-28 overflow-hidden rounded-2xl border-[3px] transition-all duration-500 hover:shadow-xl sm:h-32 sm:rounded-3xl sm:hover:-translate-y-1 ${
                            theme === 'dark' ? 'border-[var(--accent)] shadow-lg shadow-[var(--accent)]/30' : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                          }`}
                        >
                          <div className="absolute inset-0 bg-gray-900"></div>
                          <div className="absolute top-4 left-4 right-4 h-4 rounded-lg bg-gray-800"></div>
                          <div className="absolute top-10 left-4 w-1/2 h-16 rounded-xl bg-gray-800"></div>
                          {theme === 'dark' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-[2px]">
                              <Icons.Check className="w-10 h-10 text-[var(--accent)] drop-shadow-md scale-110" />
                            </div>
                          )}
                           <div className="absolute bottom-3 right-3 font-bold text-white text-sm bg-gray-900/80 px-2 py-1 rounded-md backdrop-blur-sm">Dark</div>
                        </button>
                      </div>

                      <div className="mt-8 pt-6 border-t border-[var(--border)]">
                        <SelectField
                          label="Default Resume Template"
                          value={draft.resumeTemplate || 'executive'}
                          onChange={(e) => updateField('resumeTemplate', e.target.value)}
                          options={[
                            { value: 'executive', label: 'Executive (ATS Classic)' },
                            { value: 'modern', label: 'Modern (Professional Two-Column)' },
                            { value: 'minimal', label: 'Minimal (Swiss Clean)' },
                            { value: 'creative', label: 'Creative (Bold Gradient)' },
                            { value: 'technical', label: 'Technical (Developer-Focused)' }
                          ]}
                        />
                      </div>

                      <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:gap-4">
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
