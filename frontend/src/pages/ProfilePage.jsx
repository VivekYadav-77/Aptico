import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppShell from '../components/AppShell.jsx';
import { useProfileSettings } from '../hooks/useProfileSettings.js';
import { selectAuth } from '../store/authSlice.js';
import { selectCurrentAnalysis } from '../store/historySlice.js';
import ResumeTemplate from '../components/ResumeTemplate.jsx';

// Reusable SVG icons
const Icons = {
  MapPin: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Mail: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Phone: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  Link: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  CheckCircle: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Star: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  Briefcase: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  GraduationCap: ({className = "w-4 h-4"}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
};

function AnimatedSection({ children, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100 + delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  return (
    <div className={`transition-all duration-700 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {children}
    </div>
  );
}

function InfoCard({ label, value, tone = 'default', icon: Icon }) {
  const toneConfig = {
    default: 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--muted-strong)]',
    accent: 'border-[var(--accent)]/30 bg-[var(--accent-soft)] hover:border-[var(--accent)]/50',
    warning: 'border-[var(--warning-border)] bg-[var(--warning-soft)] hover:border-[var(--warning)]/50'
  };

  const textConfig = {
    default: 'text-[var(--text)]',
    accent: 'text-[var(--accent-strong)]',
    warning: 'text-[var(--warning-text)]'
  };

  return (
    <div className={`group rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${toneConfig[tone]} flex flex-col justify-between min-h-[110px]`}>
      <div className="flex items-center gap-2">
        {Icon && <span className={`p-1.5 rounded-lg bg-[var(--panel-soft)] text-[var(--muted-strong)] group-hover:${textConfig[tone]} transition-colors`}><Icon /></span>}
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">{label}</p>
      </div>
      <p className={`mt-3 text-sm font-semibold leading-relaxed ${textConfig[tone]}`}>{value}</p>
    </div>
  );
}

function ChipList({ items, emptyLabel, accent = false }) {
  if (!items.length) {
    return <p className="text-sm italic text-[var(--muted-strong)]">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={item}
          style={{ animationDelay: `${index * 50}ms` }}
          className={`transition-all duration-300 hover:-translate-y-0.5 cursor-default rounded-xl border px-3.5 py-1.5 text-xs font-semibold ${
            accent
              ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent-strong)] hover:bg-[var(--accent)]/20'
              : 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--text)] hover:border-[var(--muted-strong)] text-[var(--muted)]'
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function formatLabel(value) {
  return `${value || ''}`
    .split('-')
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');
}

export default function ProfilePage() {
  const auth = useSelector(selectAuth);
  const analysis = useSelector(selectCurrentAnalysis);
  const { profile, isLoadingProfile, profileError } = useProfileSettings(auth, analysis);
  
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName?.[0] || 'A'}${profile.lastName?.[0] || 'U'}`.toUpperCase();
  const matchScore = analysis?.confidenceScore ? `${analysis.confidenceScore}%` : 'Pending';
  
  const publicLinks = [profile.website, profile.portfolio, profile.linkedin, profile.github].filter(Boolean);
  
  const printStyles = `
    @media print {
      /* Base resets */
      html, body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; width: 100% !important; height: auto !important; overflow: visible !important; }
      
      /* Hide all web interface components */
      header, nav, aside, footer, .no-print, nav, .app-shell-header, .app-shell-sidebar, [role="navigation"], [role="banner"], button {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Clean page container */
      main { padding: 0 !important; margin: 0 !important; width: 100% !important; display: block !important; }
      .app-page { display: block !important; padding: 0 !important; margin: 0 !important; }
      
      /* Target the resume specifically */
      .resume-print-view {
        display: block !important;
        visibility: visible !important;
        position: relative !important;
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 9999 !important;
      }
    }
  `;

  return (
    <AppShell
      title="Profile Portfolio"
      description="Your professional presence, structured to highlight your best achievements, network, and skills."
      actions={
        <div className="flex gap-3">
          <style>{printStyles}</style>
          <button onClick={() => window.print()} className="app-button-secondary hover:bg-[var(--panel-soft)] transition-colors flex items-center gap-2" title="Export as PDF">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span className="hidden sm:inline">Export Resume</span>
          </button>
          <Link to="/settings" className="app-button-secondary hover:bg-[var(--panel-soft)] transition-colors">
            Edit Information
          </Link>
          <Link to="/jobs" className="app-button shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 transition-shadow">
            View Job Matches
          </Link>
        </div>
      }
    >
      <div className="mx-auto max-w-6xl">
        {isLoadingProfile && (
          <div className="mb-6 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-center text-sm font-medium text-[var(--text)] flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5 text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Synchronizing professional data...
          </div>
        )}

        {profileError && (
          <div className="mb-6 rounded-2xl border-l-4 border-[var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm font-medium text-[var(--warning-text)]">
            <div className="flex items-center gap-2">
              <Icons.CheckCircle className="text-[var(--warning-text)] w-5 h-5" />
              {profileError}
            </div>
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
          {/* Main Content Column */}
          <div className="space-y-8">
            
            {/* Header / Identity Card */}
            <AnimatedSection>
              <article className="app-panel relative overflow-hidden p-0 border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow duration-300">
                {/* Banner Header */}
                <div className="h-40 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent-strong)] to-[var(--accent-soft)] relative">
                  <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[var(--panel)] to-transparent opacity-80"></div>
                </div>
                
                <div className="px-6 sm:px-8 pb-8 relative -mt-16">
                  <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
                    {/* Avatar */}
                    <div className="relative group z-10">
                      <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border-[6px] border-[var(--panel)] bg-gradient-to-br from-[var(--panel-soft)] to-[var(--muted-soft)] text-5xl font-black text-[var(--text)] shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1">
                        {initials}
                      </div>
                      <div className="absolute -bottom-2 -right-2 rounded-full border-[3px] border-[var(--panel)] bg-[var(--accent)] p-2 text-white shadow-sm flex items-center justify-center" title="Verified Professional">
                        <Icons.CheckCircle className="w-4 h-4" />
                      </div>
                    </div>
                    
                    {/* Primary Info */}
                    <div className="flex-1 space-y-1 mb-2 pt-2">
                      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text)]">{fullName}</h1>
                      <p className="text-xl font-medium text-[var(--accent-strong)]">{profile.headline || 'Add your professional headline'}</p>
                      
                      <div className="flex flex-wrap items-center gap-5 mt-4 text-sm text-[var(--muted-strong)] font-medium">
                        {profile.location && (
                          <div className="flex items-center gap-1.5 hover:text-[var(--text)] transition-colors cursor-default">
                            <Icons.MapPin className="w-4 h-4 text-[var(--accent)]" />
                            <span>{profile.location}</span>
                          </div>
                        )}
                        {profile.showEmail && profile.email && (
                          <div className="flex items-center gap-1.5 hover:text-[var(--text)] transition-colors cursor-default">
                            <Icons.Mail className="w-4 h-4 text-[var(--accent)]" />
                            <span>{profile.email}</span>
                          </div>
                        )}
                        {profile.showPhone && profile.phone && (
                          <div className="flex items-center gap-1.5 hover:text-[var(--text)] transition-colors cursor-default">
                            <Icons.Phone className="w-4 h-4 text-[var(--accent)]" />
                            <span>{profile.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-row sm:flex-col gap-2 shrink-0 self-start sm:self-center mt-2 sm:mt-0">
                      {profile.currentStatus && (
                         <div className="flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-2">
                            <div className="w-2 h-2 rounded-full bg-[var(--accent-strong)] animate-pulse"></div>
                            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-strong)]">
                              {formatLabel(profile.currentStatus)}
                            </span>
                         </div>
                      )}
                      {profile.openToWork && (
                        <div className="flex items-center gap-2 rounded-full border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-2">
                          <div className="w-2 h-2 rounded-full bg-[var(--warning-text)]"></div>
                          <span className="text-xs font-bold uppercase tracking-widest text-[var(--warning-text)]">
                            Open to work
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </AnimatedSection>

            {/* About & Summary */}
            <AnimatedSection delay={100}>
              <article className="app-panel border border-[var(--border)] hover:border-[var(--muted-strong)] transition-colors duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-6 w-1.5 rounded-full bg-[var(--accent)]"></div>
                  <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">Professional Overview</h2>
                </div>
                
                <div className="space-y-8">
                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                    <p className="text-[var(--text)] leading-relaxed whitespace-pre-wrap font-medium opacity-90">
                      {profile.bio || 'Provide a compelling professional summary that highlights your unique value proposition, career accomplishments, and future goals.'}
                    </p>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoCard
                      icon={Icons.Briefcase}
                      label="Current Role"
                      value={[profile.currentTitle, profile.currentCompany].filter(Boolean).join(' at ') || 'Not specified'}
                    />
                    <InfoCard
                      icon={Icons.Star}
                      label="Experience"
                      value={profile.yearsExperience ? `${profile.yearsExperience} Years` : 'Not specified'}
                      tone="accent"
                    />
                    <InfoCard
                      icon={Icons.CheckCircle}
                      label="Current Status"
                      value={profile.currentStatus ? formatLabel(profile.currentStatus) : 'Not specified'}
                      tone={profile.currentStatus ? 'accent' : 'default'}
                    />
                    <InfoCard
                      icon={Icons.Briefcase}
                      label="Employment Type"
                      value={profile.employmentType ? formatLabel(profile.employmentType) : 'Not specified'}
                    />
                    <InfoCard
                      icon={Icons.Star}
                      label="Industry"
                      value={profile.industry || 'Not specified'}
                    />
                    <InfoCard
                      icon={Icons.MapPin}
                      label="Availability"
                      value={profile.availability || 'Not specified'}
                      tone={profile.availability ? 'accent' : 'default'}
                    />
                  </div>
                </div>
              </article>
            </AnimatedSection>

            {/* Expertise & Skills */}
            <AnimatedSection delay={200}>
              <article className="app-panel border border-[var(--border)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-6 w-1.5 rounded-full bg-[var(--warning-text)]"></div>
                  <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">Core Competencies</h2>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="group rounded-2xl bg-[var(--panel-soft)] p-6 border border-transparent hover:border-[var(--border)] transition-colors shadow-sm">
                    <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-[var(--muted-strong)] group-hover:text-[var(--text)] transition-colors">Top Skills</h3>
                    {!profile.topSkills.length ? (
                      <p className="text-sm italic text-[var(--muted-strong)]">No skills added yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {profile.topSkills.map((skill, index) => {
                           const level = Math.max(65, 100 - (index * 12)); 
                           return (
                              <div key={skill} className="space-y-1.5 transition-all duration-300 hover:-translate-y-0.5" style={{ animationDelay: `${index * 50}ms` }}>
                                <div className="flex justify-between items-end text-sm">
                                  <span className="font-bold text-[var(--accent-strong)]">{skill}</span>
                                  <span className="text-[10px] uppercase font-black text-[var(--muted-strong)] opacity-60">Demonstrated</span>
                                </div>
                                <div className="h-1.5 w-full bg-[var(--panel)] rounded-full overflow-hidden border border-[var(--border)]">
                                   <div className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] rounded-full transition-all duration-1000 ease-out" style={{ width: `${level}%` }}></div>
                                </div>
                              </div>
                           );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="group rounded-2xl bg-[var(--panel-soft)] p-6 border border-transparent hover:border-[var(--border)] transition-colors shadow-sm">
                    <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-[var(--muted-strong)] group-hover:text-[var(--text)] transition-colors">Tools & Stack</h3>
                    <ChipList items={profile.tools} emptyLabel="No tools added yet." />
                  </div>

                  <div className="group rounded-2xl bg-[var(--panel-soft)] p-6 border border-transparent hover:border-[var(--border)] transition-colors shadow-sm sm:col-span-2 lg:col-span-1">
                    <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-[var(--muted-strong)] group-hover:text-[var(--text)] transition-colors">Languages</h3>
                    <ChipList items={profile.languages} emptyLabel="No languages added yet." />
                  </div>
                </div>
              </article>
            </AnimatedSection>

            {/* Education & Achievements */}
            <AnimatedSection delay={300}>
              <article className="app-panel border border-[var(--border)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-6 w-1.5 rounded-full bg-[var(--success-strong)]"></div>
                  <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">Background & Highlights</h2>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="group rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-[var(--panel-soft)] border border-[var(--border)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] transition-colors">
                        <Icons.GraduationCap className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text)]">Education Activity</h3>
                    </div>
                    
                    <div className="ml-4 pl-6 border-l-2 border-[var(--border)] space-y-5">
                      <div className="relative">
                        <div className="absolute w-3 h-3 rounded-full bg-[var(--accent)] -left-[31px] top-1.5 ring-4 ring-[var(--panel)]"></div>
                        <p className="text-base font-bold text-[var(--text)]">
                          {[profile.degree, profile.fieldOfStudy].filter(Boolean).join(' in ') || 'Degree not specified'}
                        </p>
                        <p className="text-sm text-[var(--accent-strong)] font-semibold mt-1">{profile.school || 'Institution not specified'}</p>
                        {profile.graduationYear && <p className="text-xs font-medium text-[var(--muted-strong)] mt-2 bg-[var(--panel-soft)] inline-block px-2 py-1 rounded-md">Class of {profile.graduationYear}</p>}
                      </div>
                      
                      {profile.learningFocus && (
                        <div className="relative pt-2">
                          <div className="absolute w-2 h-2 rounded-full border-2 border-[var(--muted-strong)] bg-[var(--panel)] -left-[29px] top-4"></div>
                          <p className="text-sm leading-relaxed text-[var(--text)] opacity-80 italic border-l-2 border-[var(--muted-strong)] pl-3">
                            "{profile.learningFocus}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="group rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-[var(--panel-soft)] border border-[var(--border)] group-hover:bg-[var(--warning-soft)] group-hover:text-[var(--warning-text)] transition-colors">
                        <Icons.Star className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text)]">Key Achievements</h3>
                    </div>

                    <div className="space-y-3">
                      {profile.achievements.length ? (
                        profile.achievements.map((item, i) => (
                          <div key={i} className="flex gap-3 items-start p-3 rounded-xl hover:bg-[var(--panel-soft)] transition-colors border border-transparent hover:border-[var(--border)]">
                            <Icons.CheckCircle className="shrink-0 text-[var(--success-strong)] w-5 h-5 mt-0.5" />
                            <p className="text-sm font-medium leading-relaxed text-[var(--text)] opacity-90">
                              {item}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 rounded-xl border border-dashed border-[var(--border)] text-center bg-[var(--panel-soft)]/50 text-[var(--muted-strong)] hover:text-[var(--text)] transition-colors">
                          <p className="font-semibold text-sm mb-1">No achievements listed</p>
                          <p className="text-xs">Highlight impactful wins and metrics in your settings to strengthen your profile.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </AnimatedSection>

          </div>

          {/* Sidebar */}
          <aside className="space-y-6 hidden xl:block">
            <AnimatedSection delay={250}>
              <div className="sticky top-24 space-y-6">
                
                {/* Profile Readiness & Actions */}
                <article className="app-panel border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted-strong)] mb-6 text-center">Dashboard</h3>
                  
                  <div className="space-y-5">
                    <div className="rounded-xl bg-gradient-to-br from-[var(--accent-soft)] to-[var(--panel)] p-5 border border-[var(--accent)]/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                        <Icons.Star className="w-16 h-16" />
                      </div>
                      <p className="text-xs font-bold text-[var(--accent-strong)] mb-2 tracking-wider">DISCOVERY STRENGTH</p>
                      <p className="text-sm font-semibold text-[var(--text)] relative z-10 leading-relaxed">{profile.profileStrengthNotes || 'Moderate'}</p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] p-5 hover:border-[var(--accent)]/50 hover:shadow-md transition-all bg-[var(--panel)]">
                      <p className="text-xs font-bold text-[var(--muted-strong)] mb-2 tracking-wider">MATCH SCORE</p>
                      <div className="flex items-end gap-3">
                        <p className="text-4xl font-black text-[var(--text)] tracking-tighter">{matchScore}</p>
                        <p className="text-xs font-medium text-[var(--muted-strong)] mb-1.5 bg-[var(--panel-soft)] px-2 py-1 rounded">Latest Sync</p>
                      </div>
                    </div>

                    <div className="space-y-1 mt-4 border-t border-[var(--border)] pt-4">
                      <div className="flex items-center justify-between text-sm py-2 group">
                        <span className="text-[var(--muted-strong)] font-medium">Target Role</span>
                        <span className="font-bold text-[var(--text)] text-right max-w-[140px] truncate group-hover:text-[var(--accent)] transition-colors">{profile.targetRole || 'Not Set'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-2 group">
                        <span className="text-[var(--muted-strong)] font-medium">Work Modes</span>
                        <span className="font-bold text-[var(--text)] text-right max-w-[140px] truncate group-hover:text-[var(--accent)] transition-colors">
                          {profile.preferredWorkModes.length ? profile.preferredWorkModes.join(', ') : 'Any'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-2 group">
                        <span className="text-[var(--muted-strong)] font-medium">Visibility</span>
                        <span className="font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors badge">
                          {profile.publicProfile ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Link to="/settings" className="app-button w-full justify-center mt-6 shadow-md hover:shadow-lg">
                    Update Profile
                  </Link>
                </article>

                {/* Network & Links */}
                <article className="app-panel border border-[var(--border)] p-6 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted-strong)] mb-5">Digital Footprint</h3>
                  
                  <div className="space-y-3">
                    {publicLinks.length ? (
                      publicLinks.map((link) => {
                        const url = link.startsWith('http') ? link : `https://${link}`;
                        let domain = 'Website';
                        try {
                           domain = new URL(url).hostname.replace('www.', '');
                        } catch(e) {}
                        return (
                          <a
                            key={link}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex flex-col gap-1 p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-center gap-2 text-[var(--text)] group-hover:text-[var(--accent-strong)]">
                              <Icons.Link className="w-4 h-4" />
                              <span className="font-bold text-sm">{domain}</span>
                            </div>
                            <span className="text-xs font-medium text-[var(--muted-strong)] truncate ml-6 opacity-80 group-hover:opacity-100">{link}</span>
                          </a>
                        );
                      })
                    ) : (
                       <div className="p-5 rounded-xl border border-dashed border-[var(--border)] text-center text-sm text-[var(--muted-strong)] bg-[var(--panel-soft)]">
                         <Icons.Link className="w-5 h-5 mx-auto mb-2 opacity-50" />
                         <p className="font-medium">Connect your portfolio, GitHub, or LinkedIn to increase visibility.</p>
                       </div>
                    )}
                  </div>
                </article>

              </div>
            </AnimatedSection>
          </aside>
        </div>
        
        {/* Professional Resume Template (Hidden on screen, Visible on print) */}
        <ResumeTemplate profile={profile} />
      </div>
    </AppShell>
  );
}

