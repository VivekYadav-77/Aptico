import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getResilienceDetails } from '../api/socialApi.js';

const DAYS_OF_WEEK = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function intensityClass(count) {
  if (count >= 5) return 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]';
  if (count >= 3) return 'bg-emerald-400/85';
  if (count >= 1) return 'bg-emerald-300/70';
  return 'bg-[var(--panel-soft)] border border-[var(--border)]/40';
}

function formatMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

function AnimatedSection({ children, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 80 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`transform transition-all duration-700 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
      {children}
    </div>
  );
}

function GitHubHeatmap({ heatmap = [], selectedDate, onCellClick }) {
  if (!heatmap.length) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/50 py-12 text-sm text-[var(--muted-strong)]">
        No activity data yet.
      </div>
    );
  }

  // Arrange heatmap into weeks (columns) of 7 days (rows, Mon-Sun)
  const firstDate = new Date(heatmap[0].date + 'T00:00:00Z');
  const startDow = firstDate.getUTCDay(); // 0=Sun..6=Sat
  // Shift to Mon-based: Mon=0..Sun=6
  const mondayShift = startDow === 0 ? 6 : startDow - 1;

  // Pad leading empties so week columns align
  const padded = Array.from({ length: mondayShift }, () => null).concat(heatmap);
  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  // Pad last week
  const lastWeek = weeks[weeks.length - 1];
  while (lastWeek.length < 7) lastWeek.push(null);

  // Derive month labels
  const monthLabels = [];
  let lastMonth = '';
  weeks.forEach((week, weekIdx) => {
    const firstDay = week.find((d) => d !== null);
    if (firstDay) {
      const m = formatMonthLabel(firstDay.date);
      if (m !== lastMonth) {
        monthLabels.push({ weekIdx, label: m });
        lastMonth = m;
      }
    }
  });

  const currentMonth = new Date().getUTCMonth();
  const currentYear = new Date().getUTCFullYear();

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60 p-5 backdrop-blur-sm">
      {/* Month labels row */}
      <div className="mb-2 flex pl-10" style={{ gap: 0 }}>
        {weeks.map((week, weekIdx) => {
          const found = monthLabels.find((m) => m.weekIdx === weekIdx);
          return (
            <div key={weekIdx} className="flex-shrink-0" style={{ width: 14, marginRight: 3 }}>
              {found ? (
                <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                  {found.label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Grid: 7 rows x N week-columns */}
      <div className="flex gap-0">
        {/* Day-of-week labels */}
        <div className="mr-2 flex flex-col justify-between" style={{ height: 7 * 14 + 6 * 3 }}>
          {DAYS_OF_WEEK.map((label, i) => (
            <span key={i} className="flex h-[14px] items-center text-[10px] font-semibold text-[var(--muted)]">
              {label}
            </span>
          ))}
        </div>

        {/* Cells */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => {
            // Check if this week falls in the current month to highlight it
            const isCurrentMonth = week.some((d) => {
              if (!d) return false;
              const dateObj = new Date(d.date + 'T00:00:00Z');
              return dateObj.getUTCMonth() === currentMonth && dateObj.getUTCFullYear() === currentYear;
            });

            return (
              <div 
                key={wi} 
                className={`flex flex-col gap-[3px] rounded-[4px] transition-all ${isCurrentMonth ? 'bg-emerald-500/5 ring-1 ring-emerald-500/20' : ''}`}
              >
                {week.map((day, di) => {
                  const isSelected = day && selectedDate === day.date;
                  return (
                    <div
                      key={di}
                      title={day ? `${day.date}: ${day.count} activit${day.count === 1 ? 'y' : 'ies'}` : ''}
                      onClick={() => day && onCellClick(day.date)}
                      className={`h-[14px] w-[14px] rounded-[3px] transition-all duration-200 ${day ? intensityClass(day.count) : 'bg-transparent'} ${day ? 'hover:scale-125 hover:ring-2 hover:ring-[var(--accent)]/40 cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-emerald-400 scale-110 shadow-[0_0_10px_rgba(52,211,153,0.6)]' : ''}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-2 text-[10px] font-semibold text-[var(--muted)]">
        <span>Less</span>
        <div className="h-[12px] w-[12px] rounded-[3px] border border-[var(--border)]/40 bg-[var(--panel-soft)]" />
        <div className="h-[12px] w-[12px] rounded-[3px] bg-emerald-300/70" />
        <div className="h-[12px] w-[12px] rounded-[3px] bg-emerald-400/85" />
        <div className="h-[12px] w-[12px] rounded-[3px] bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-[var(--panel)]/70 p-5 backdrop-blur-sm transition-all duration-300 hover:border-[var(--accent)]/40 hover:shadow-md">
      {/* 1. Placed the icon and label in a flex row so they sit side-by-side */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
          {label}
        </p>
      </div>
      {/* 2. Value sits clearly below the label/icon */}
      <p className="text-3xl font-black tracking-tight text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}

function ApplicationCard({ item, isSelected, innerRef }) {
  return (
    <div 
      ref={innerRef}
      className={`group flex items-start gap-4 rounded-xl border px-5 py-4 backdrop-blur-sm transition-all duration-300 ${
        isSelected 
          ? 'border-emerald-500 bg-emerald-500/10 ring-4 ring-emerald-500/20' 
          : 'border-[var(--border)] bg-[var(--panel)]/70 hover:border-emerald-500/30 hover:shadow-sm'
      }`}
    >
      <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
        isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20'
      }`}>
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-black text-[var(--text)]">{item.companyName}</p>
          <span className="text-[var(--muted)]">·</span>
          <p className="text-sm font-semibold text-[var(--muted-strong)]">{item.roleTitle}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-[var(--muted)]">{item.dateLabel}</span>
          {item.jobUrl ? (
            <a
              href={item.jobUrl.startsWith('http') ? item.jobUrl : `https://${item.jobUrl}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--panel-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent-strong)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Job
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RejectionCard({ item, isLast, isSelected, innerRef }) {
  const stageColors = {
    resume: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    first_round: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    hiring_manager: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
    final: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
  };
  const stageStyle = stageColors[item.stageRejected] || stageColors.resume;

  return (
    <div ref={innerRef} className="relative flex items-stretch gap-4 pl-4 sm:pl-8">
      {/* Vertical timeline line */}
      {!isLast && (
        <div className="absolute left-[35px] top-10 bottom-[-16px] w-[2px] bg-dashed-line border-l-2 border-dashed border-[var(--border)] sm:left-[51px]" />
      )}
      
      {/* Node/Icon */}
      <div className={`relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--bg)] shadow-sm transition-all ${
        isSelected ? 'bg-rose-500 text-white scale-110' : 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20'
      }`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>

      {/* Card Content */}
      <div className={`group min-w-0 flex-1 rounded-xl border px-5 py-4 backdrop-blur-sm transition-all duration-300 mb-4 ${
        isSelected 
          ? 'border-rose-500 bg-rose-500/10 ring-4 ring-rose-500/20 shadow-lg' 
          : 'border-[var(--border)] bg-[var(--panel)]/70 hover:border-rose-500/30 hover:shadow-sm'
      }`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-black text-[var(--text)]">{item.companyName}</p>
          <span className="text-[var(--muted)]">·</span>
          <p className="text-sm font-semibold text-[var(--muted-strong)]">{item.roleTitle}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold capitalize ${stageStyle}`}>
            {item.stageLabel}
          </span>
          <span className="text-xs font-medium text-[var(--muted)]">{item.dateLabel}</span>
          {item.jobUrl ? (
            <a
              href={item.jobUrl.startsWith('http') ? item.jobUrl : `https://${item.jobUrl}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--panel-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent-strong)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Job
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ResilienceDetailsPage() {
  const { username } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const initialTab = location.state?.activeTab || 'applications';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDate, setSelectedDate] = useState(null);
  const itemRefs = useRef({});

  const selectedItemKey = location.state?.selectedItemKey;

  // Sync tab with location state (e.g. when navigating from Profile)
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Handle auto-scroll to selected item
  useEffect(() => {
    if (selectedItemKey && data) {
      const timer = setTimeout(() => {
        const element = itemRefs.current[selectedItemKey];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 600); // Wait for entrance animations to finish
      return () => clearTimeout(timer);
    }
  }, [selectedItemKey, data, activeTab]);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError('');

    getResilienceDetails(username)
      .then((result) => setData(result))
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('Profile not found.');
        } else if (err.response?.status === 403) {
          setError('This resilience portfolio is private.');
        } else {
          setError('Could not load resilience details.');
        }
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--panel-soft)]" />
          <div className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--panel)]" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-12 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">{error}</h1>
          <Link to={`/u/${username}`} className="app-button mt-8 inline-flex w-full justify-center">
            Back to Profile
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const { applicationHistory = [], rejectionJourney = [], stats = {}, heatmap = [] } = data;

  // Filter lists based on selectedDate
  const filteredApps = selectedDate 
    ? applicationHistory.filter(item => new Date(item.createdAt).toISOString().split('T')[0] === selectedDate)
    : applicationHistory;
    
  const filteredRejections = selectedDate
    ? rejectionJourney.filter(item => new Date(item.createdAt).toISOString().split('T')[0] === selectedDate)
    : rejectionJourney;

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Nav bar */}
        <AnimatedSection delay={0}>
          <div className="flex items-center justify-between">
            <Link
              to={`/u/${username}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)]/50 px-3 py-1.5 text-sm font-bold text-[var(--muted-strong)] backdrop-blur-md transition-colors hover:text-[var(--text)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Profile
            </Link>
          </div>
        </AnimatedSection>

        {/* Hero section */}
        <AnimatedSection delay={80}>
          <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)]/80 p-8 shadow-sm backdrop-blur-xl sm:p-10">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/5 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              {data.avatar_url ? (
                <img src={data.avatar_url} alt="" className="h-16 w-16 rounded-2xl border-2 border-[var(--border)] object-cover shadow-lg" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-2xl font-black text-white shadow-lg">
                  {(data.name || username || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[var(--text)] sm:text-4xl">
                  Proof of Resilience
                </h1>
                <p className="mt-1 text-base font-bold text-[var(--accent-strong)]">
                  {data.name || username} {data.headline ? `· ${data.headline}` : ''}
                </p>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <AnimatedSection delay={160}><StatCard label="Total Applications" value={stats.totalApplications || 0} icon="📄" /></AnimatedSection>
          <AnimatedSection delay={240}><StatCard label="Total Rejections" value={stats.totalRejections || 0} icon="💪" /></AnimatedSection>
          <AnimatedSection delay={320}><StatCard label="7-Day Average" value={stats.currentDailyAverage || 0} icon="📊" /></AnimatedSection>
          <AnimatedSection delay={400}><StatCard label="Longest Streak" value={`${stats.longestStreak || 0}d`} icon="🔥" /></AnimatedSection>
        </div>

        {/* Full Heatmap */}
        <AnimatedSection delay={480}>
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-6 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              <h2 className="text-xl font-black tracking-tight text-[var(--text)]">Daily Activity — Last 365 Days</h2>
            </div>
            <GitHubHeatmap 
              heatmap={heatmap} 
              selectedDate={selectedDate} 
              onCellClick={(date) => setSelectedDate(date === selectedDate ? null : date)} 
            />
          </section>
        </AnimatedSection>

        {/* Tabs */}
        <AnimatedSection delay={560}>
          <section>
            <div className="mb-6 flex gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60 p-1.5 backdrop-blur-sm">
              <button
                onClick={() => setActiveTab('applications')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-black tracking-tight transition-all ${activeTab === 'applications' ? 'bg-emerald-500/15 text-emerald-700 shadow-sm dark:text-emerald-400' : 'text-[var(--muted-strong)] hover:text-[var(--text)]'}`}
              >
                Applications ({applicationHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('rejections')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-black tracking-tight transition-all ${activeTab === 'rejections' ? 'bg-rose-500/15 text-rose-700 shadow-sm dark:text-rose-400' : 'text-[var(--muted-strong)] hover:text-[var(--text)]'}`}
              >
                Rejections ({rejectionJourney.length})
              </button>
            </div>

            {selectedDate && (
              <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Showing entries for {new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="font-bold text-[var(--muted-strong)] transition-colors hover:text-[var(--text)]"
                >
                  Clear Filter ✕
                </button>
              </div>
            )}

            {activeTab === 'applications' ? (
              <div className="space-y-3">
                {filteredApps.length ? (
                  filteredApps.map((item, idx) => {
                      const key = `${item.companyName}-${item.dateLabel}`;
                      return (
                        <AnimatedSection key={`${key}-${idx}`} delay={idx * 80}>
                          <ApplicationCard 
                            item={item} 
                            isSelected={selectedItemKey === key}
                            innerRef={el => itemRefs.current[key] = el}
                          />
                        </AnimatedSection>
                      );
                    })
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/50 py-12 text-center text-sm font-medium text-[var(--muted-strong)]">
                    {selectedDate ? "No applications on this date." : "No applications logged yet. Start logging on your dashboard!"}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2">
                {filteredRejections.length ? (
                  filteredRejections.map((item, idx) => {
                      const key = `${item.companyName}-${item.dateLabel}`;
                      return (
                        <AnimatedSection key={`${key}-${idx}`} delay={idx * 80}>
                          <RejectionCard 
                            item={item} 
                            isLast={idx === filteredRejections.length - 1} 
                            isSelected={selectedItemKey === key}
                            innerRef={el => itemRefs.current[key] = el}
                          />
                        </AnimatedSection>
                      );
                    })
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/50 py-12 text-center text-sm font-medium text-[var(--muted-strong)]">
                    {selectedDate ? "No rejections on this date." : "No rejections logged yet. Every rejection fuels your level!"}
                  </div>
                )}
              </div>
            )}
          </section>
        </AnimatedSection>
      </div>
    </main>
  );
}
