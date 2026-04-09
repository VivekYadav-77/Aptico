import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios.js';
import { fetchDashboardSummary } from '../api/profileApi.js';
import AppShell from '../components/AppShell.jsx';
import { selectAuth } from '../store/authSlice.js';
import { selectCurrentAnalysis } from '../store/historySlice.js';

const recentAnalysesFallback = [
  { role: 'Sr. Product Designer', time: '2h ago', company: 'Stripe', score: 94, tone: 'good' },
  { role: 'Creative Lead', time: 'Yesterday', company: 'Airbnb', score: 78, tone: 'warning' },
  { role: 'Staff Architect', time: '3d ago', company: 'Linear', score: 88, tone: 'good' }
];

const savedJobsFallback = [
  { title: 'Cloud Infrastructure', company: 'Amazon', location: 'Seattle (Remote)', icon: 'cloud' },
  { title: 'Senior Fintech Lead', company: 'Revolut', location: 'London', icon: 'payments' },
  { title: 'UI Systems Architect', company: 'Vercel', location: 'New York', icon: 'bolt' }
];

const recommendationsFallback = [
  "Add 'Distributed Systems' to your profile. It's a high-priority signal for many senior platform roles.",
  'Refresh your portfolio and public links so recruiters can validate your strongest work instantly.',
  'Schedule system design prep this week if you are actively targeting staff or lead positions.'
];

const skillProgressFallback = [
  ['Technical Project Management', 92],
  ['Next.js Framework Architect', 65],
  ['AI Engineering Fundamentals', 41]
];

const activityFallback = [
  ['Interview completed', 'Stripe - Round 2 (Technical)', 'Today, 10:45 AM', true],
  ['Resume updated', 'v2.4.1 production export', 'Yesterday, 04:12 PM', false],
  ['Analysis generated', 'Senior designer role at Vercel', 'Oct 24, 2024', false]
];

function GaugeCard({ score }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.max(0, Math.min(score, 100));
  const dashOffset = circumference * (1 - normalizedScore / 100);

  return (
    <article className="app-panel flex flex-col items-center justify-center text-center">
      <p className="app-kicker">Resume health score</p>
      <div className="relative mt-6 flex h-40 w-40 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="transparent" stroke="rgba(113,113,122,0.25)" strokeWidth="8" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="var(--accent)"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth="8"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="mono-text text-4xl font-bold text-[var(--text)]">{normalizedScore}%</span>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-1">
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        <span className="mono-text text-[12px] uppercase tracking-tight text-[var(--accent-strong)]">Healthy</span>
      </div>
    </article>
  );
}

function formatRelativeTime(value) {
  if (!value) {
    return 'Recent';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recent';
  }

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function formatScriptDate(value) {
  if (!value) {
    return 'a later date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'a later date';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function MainDashboard() {
  const auth = useSelector(selectAuth);
  const currentAnalysis = useSelector(selectCurrentAnalysis);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [followUpScriptsByJob, setFollowUpScriptsByJob] = useState({});
  const [loadingJobId, setLoadingJobId] = useState(null);
  const [followUpError, setFollowUpError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const name = auth.user?.name?.split(' ')[0] || (auth.guestMode ? 'Explorer' : 'there');
  const matchedSkills = currentAnalysis?.matchedSkills?.slice(0, 6) || [];
  const score = currentAnalysis?.confidenceScore || 82;
  const quickActions = [
    ['Continue last analysis', 'play_circle', '/analysis'],
    ['Upload new resume', 'upload_file', '/analysis'],
    ['View saved jobs', 'bookmark', '/jobs'],
    ['Interview prep', 'forum', '/analysis']
  ];
  const dashboardQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    enabled: auth.isAuthenticated,
    retry: false
  });

  async function handleCopy(text, key) {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch (error) {
      setFollowUpError('Could not copy to clipboard.');
    }
  }

  async function handleToggleFollowUp(job) {
    const nextExpanded = expandedJobId === job.id ? null : job.id;
    setExpandedJobId(nextExpanded);
    setFollowUpError('');

    if (nextExpanded !== job.id || followUpScriptsByJob[job.id]) {
      return;
    }

    setLoadingJobId(job.id);

    try {
      const response = await api.post('/api/jobs/follow-up-scripts', {
        jobTitle: job.title,
        companyName: job.company,
        appliedDate: job.savedAt || new Date().toISOString(),
        userName: auth.user?.name || undefined
      });

      setFollowUpScriptsByJob((current) => ({
        ...current,
        [job.id]: response.data?.data?.scripts || []
      }));
    } catch (error) {
      setFollowUpError(error.response?.data?.error || 'Could not load follow-up scripts.');
    } finally {
      setLoadingJobId(null);
    }
  }

  const recentAnalyses = useMemo(() => {
    const apiAnalyses = (dashboardQuery.data?.recentAnalyses || []).map((item) => ({
      role: item.role,
      time: formatRelativeTime(item.createdAt),
      company: item.company,
      score: item.score,
      tone: item.score >= 85 ? 'good' : 'warning'
    }));

    if (apiAnalyses.length) {
      return apiAnalyses;
    }

    if (currentAnalysis) {
      return [
        {
          role: currentAnalysis.jobTitle || currentAnalysis.companyName || 'Latest analysis',
          time: 'Latest',
          company: currentAnalysis.companyName || 'Aptico workspace',
          score,
          tone: score >= 85 ? 'good' : 'warning'
        },
        ...recentAnalysesFallback.slice(0, 2)
      ];
    }

    return recentAnalysesFallback;
  }, [currentAnalysis, dashboardQuery.data?.recentAnalyses, score]);

  const savedJobs = useMemo(() => {
    const apiSavedJobs = (dashboardQuery.data?.savedJobs || []).map((job) => ({
      id: `saved-${job.id}`,
      title: job.title,
      company: job.company,
      location: job.location,
      icon: 'bookmark',
      url: job.url,
      source: job.source,
      savedAt: job.savedAt
    }));

    return apiSavedJobs.length
      ? apiSavedJobs
      : savedJobsFallback.map((job) => ({
          ...job,
          id: `fallback-${job.title}-${job.company}`
        }));
  }, [dashboardQuery.data?.savedJobs]);

  const recommendations = dashboardQuery.data?.recommendations?.length
    ? dashboardQuery.data.recommendations
    : matchedSkills.length
      ? [
          `Feature '${matchedSkills[0]}' more clearly in your profile and resume summary to improve recruiter discovery.`,
          'Use your latest matched skills to tighten targeting before your next job search session.',
          'Review your portfolio and outreach assets so the strongest signals from analysis also show up publicly.'
        ]
      : recommendationsFallback;

  const activity = useMemo(() => {
    const apiActivity = (dashboardQuery.data?.activity || []).map((item, index) => [
      item.title,
      item.subtitle,
      formatRelativeTime(item.createdAt),
      index === 0
    ]);

    return apiActivity.length ? apiActivity : activityFallback;
  }, [dashboardQuery.data?.activity]);

  return (
    <AppShell
      title={`Welcome back${auth.user?.name ? `, ${auth.user.name}` : auth.guestMode ? ', guest explorer' : ''}`}
      description="Your main dashboard is now shaped as the premium first screen after login: a stronger welcome, fast next actions, health signals, intelligence recommendations, and momentum tracking in one place."
      actions={
        <>
          <Link to="/analysis" className="app-button">
            Continue analysis
          </Link>
          <Link to="/jobs" className="app-button-secondary">
            Search jobs
          </Link>
        </>
      }
    >
      {dashboardQuery.error ? (
        <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">
          {dashboardQuery.error.response?.data?.error || 'Could not load your latest dashboard data, so Aptico is showing safe fallback content.'}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="app-panel relative overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[var(--accent-soft)] blur-3xl" />
          <div className="relative">
            <p className="app-kicker">Command center</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
              Welcome back, {name}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-8 text-[var(--muted-strong)]">
              Your career trajectory is building momentum. Jump back into analysis, sharpen your profile, and move on the highest-signal opportunities next.
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {quickActions.map(([label, icon, to]) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 transition hover:border-[var(--accent)]/40 hover:bg-[var(--panel)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[var(--accent-strong)]">{icon}</span>
                    <span className="mono-text text-[11px] uppercase tracking-[0.18em] text-[var(--text)]">{label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[var(--muted)]">chevron_right</span>
                </Link>
              ))}
            </div>
          </div>
        </article>

        <GaugeCard score={score} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <article className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="app-kicker">Recent analyses</p>
            <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">more_horiz</span>
          </div>
          <div className="app-panel overflow-hidden p-0">
            <div className="divide-y divide-[var(--border)]">
              {recentAnalyses.map((item) => (
                <div key={`${item.role}-${item.company}`} className="flex items-center justify-between px-5 py-4 transition hover:bg-[var(--panel-soft)]">
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text)]">{item.role}</p>
                    <p className="mt-1 text-[11px] text-[var(--muted-strong)]">
                      {item.time} - {item.company}
                    </p>
                  </div>
                  <span
                    className={`mono-text rounded-md border px-2 py-1 text-[12px] ${
                      item.tone === 'good'
                        ? 'border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {item.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="app-kicker">Saved jobs</p>
            <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">arrow_forward</span>
          </div>
          <div className="space-y-3">
            {followUpError ? (
              <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
                {followUpError}
              </div>
            ) : null}
            {savedJobs.map((job) => (
              <article
                key={`${job.id || job.title}-${job.company}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 transition hover:border-[var(--accent)]/30 hover:bg-[var(--panel-soft)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link to="/jobs" className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--panel-soft)]">
                      <span className="material-symbols-outlined text-[var(--muted)]">{job.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[var(--text)]">{job.title}</p>
                      <p className="mt-1 text-[11px] text-[var(--muted-strong)]">
                        {job.company} - {job.location}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleFollowUp(job);
                    }}
                    className="rounded-full border border-[var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text)] transition hover:border-[var(--accent)]/30"
                  >
                    Follow-up Scripts
                  </button>
                </div>

                {expandedJobId === job.id ? (
                  <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
                    {loadingJobId === job.id ? (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm text-[var(--muted-strong)]">
                        Loading follow-up scripts...
                      </div>
                    ) : (
                      (followUpScriptsByJob[job.id] || []).map((script) => (
                        <div key={`${job.id}-${script.day}`} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--text)]">
                            Day {script.day} - Send on {formatScriptDate(script.sendOn)}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-[var(--text)]">{script.subject}</p>
                          <textarea
                            readOnly
                            value={script.body}
                            className="mt-3 h-36 w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-xs leading-6 text-[var(--muted-strong)] outline-none"
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void handleCopy(script.body, `${job.id}-${script.day}-body`);
                              }}
                              className="rounded-full border border-[var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text)] transition hover:border-[var(--accent)]/30"
                            >
                              {copiedKey === `${job.id}-${script.day}-body` ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleCopy(script.subject, `${job.id}-${script.day}-subject`);
                              }}
                              className="rounded-full border border-[var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text)] transition hover:border-[var(--accent)]/30"
                            >
                              {copiedKey === `${job.id}-${script.day}-subject` ? 'Copied!' : 'Copy Subject'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </article>

        <article className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="app-kicker">AI recommendations</p>
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]/30" />
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]/30" />
            </div>
          </div>
          <article className="app-panel border-[var(--accent)]/20 bg-[var(--accent-soft)]/40">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-[20px] text-[var(--accent-strong)]">auto_awesome</span>
              <div className="space-y-4">
                {recommendations.map((item) => (
                  <p key={item} className="text-[13px] leading-7 text-[var(--text)]">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </article>
        </article>
      </section>

      <section className="mt-10 grid gap-10 border-t border-[var(--border)]/60 pt-10 xl:grid-cols-2">
        <article>
          <p className="app-kicker">Skill acquisition</p>
          <div className="mt-6 space-y-6">
            {(matchedSkills.length
              ? matchedSkills.slice(0, 3).map((skill, index) => [skill, [92, 68, 44][index] || 40])
              : skillProgressFallback
            ).map(([label, value]) => (
              <div key={label} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-bold text-[var(--text)]">{label}</span>
                  <span className="mono-text text-[12px] text-[var(--muted-strong)]">{value}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-strong)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article>
          <p className="app-kicker">Activity timeline</p>
          <div className="relative mt-6 space-y-8 pl-8">
            <div className="absolute bottom-0 left-[3px] top-0 w-px bg-[var(--border)]" />
            {activity.map(([title, subtitle, time, isActive]) => (
              <div key={`${title}-${time}`} className="relative">
                <div
                  className={`absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[var(--bg)] ${
                    isActive ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
                  }`}
                />
                <div>
                  <p className="text-[13px] font-bold text-[var(--text)]">{title}</p>
                  <p className="mt-1 text-[11px] text-[var(--muted-strong)]">{subtitle}</p>
                  <p className="mono-text mt-1 text-[10px] text-[var(--muted)]">{time}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
