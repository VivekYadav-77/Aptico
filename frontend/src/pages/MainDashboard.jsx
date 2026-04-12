import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios.js';
import { deleteAllSavedJobs, deleteSavedJob } from '../api/jobsApi.js';
import { fetchDashboardSummary } from '../api/profileApi.js';
import AppShell from '../components/AppShell.jsx';
import { selectAuth } from '../store/authSlice.js';
import {
  clearAnalysisHistory,
  clearInterviewPrep,
  removeAnalysisRecord,
  removeInterviewPrep,
  selectAnalysisHistory,
  setAnalysisWorkspace,
  setCurrentAnalysis,
  selectCurrentAnalysis
} from '../store/historySlice.js';

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
  const analysisHistory = useSelector(selectAnalysisHistory);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [expandedJobId, setExpandedJobId] = useState(null);
  const [followUpScriptsByJob, setFollowUpScriptsByJob] = useState({});
  const [loadingJobId, setLoadingJobId] = useState(null);
  const [followUpError, setFollowUpError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const [savedJobsActionError, setSavedJobsActionError] = useState('');
  const [deletingSavedJobId, setDeletingSavedJobId] = useState(null);
  const [clearingSavedJobs, setClearingSavedJobs] = useState(false);

  const name = auth.user?.name?.split(' ')[0] || (auth.guestMode ? 'Explorer' : 'there');
  const matchedSkills = currentAnalysis?.matchedSkills?.slice(0, 6) || [];
  const score = currentAnalysis?.confidenceScore || 82;
  
  const quickActions = [
    ['Continue last analysis', 'play_circle', '/analysis/latest'],
    ['Upload new resume', 'upload_file', '/analysis'],
    ['View saved jobs', 'bookmark', '/saved-jobs'],
    ['Interview prep', 'forum', '/interview-prep']
  ];
  
  const dashboardQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    enabled: auth.isAuthenticated,
    retry: false
  });

  const interviewPrepItems = analysisHistory.filter((item) => !item.hideInterviewPrep && (item.stage2?.interviewQuestions?.length || item.stage2?.salaryCoach));

  function continueAnalysis(analysis) {
    if (!analysis) return;
    navigate('/analysis-history', { state: { openId: analysis.id || analysis.localId } });
  }

  async function handleDeleteSavedJob(savedJobId) {
    setDeletingSavedJobId(savedJobId);
    setSavedJobsActionError('');
    try {
      await deleteSavedJob(savedJobId);
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (error) {
      setSavedJobsActionError(error.response?.data?.error || 'Could not delete this saved job.');
    } finally {
      setDeletingSavedJobId(null);
    }
  }

  async function handleDeleteAllSavedJobs() {
    setClearingSavedJobs(true);
    setSavedJobsActionError('');
    try {
      await deleteAllSavedJobs();
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (error) {
      setSavedJobsActionError(error.response?.data?.error || 'Could not delete saved jobs.');
    } finally {
      setClearingSavedJobs(false);
    }
  }

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
    const historyAnalyses = analysisHistory.slice(0, 3).map((analysis) => {
      const score = analysis.confidenceScore || 0;
      return {
        id: analysis.id,
        localId: analysis.localId,
        role: analysis.jobTitle || analysis.stage1?.jobTitle || 'Analysis',
        time: formatRelativeTime(analysis.createdAt),
        company: analysis.companyName || analysis.stage1?.companyName || 'Aptico',
        score,
        tone: score >= 85 ? 'good' : 'warning',
        fullAnalysis: analysis
      };
    });

    if (historyAnalyses.length) {
      return historyAnalyses;
    }

    if (currentAnalysis) {
      return [
        {
          role: currentAnalysis.jobTitle || currentAnalysis.companyName || 'Latest analysis',
          time: 'Latest',
          company: currentAnalysis.companyName || 'Aptico workspace',
          score,
          tone: score >= 85 ? 'good' : 'warning',
          fullAnalysis: currentAnalysis
        }
      ];
    }

    return [];
  }, [analysisHistory, currentAnalysis, score]);

  const savedJobs = useMemo(() => {
    const apiSavedJobs = (dashboardQuery.data?.savedJobs || []).map((job) => ({
      originalId: job.id,
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

  const acquiredSkills = useMemo(() => {
    const skillsSet = new Set();
    if (currentAnalysis?.matchedSkills) {
      currentAnalysis.matchedSkills.forEach((s) => skillsSet.add(s));
    }
    analysisHistory.forEach((historyItem) => {
      if (historyItem.matchedSkills) {
        historyItem.matchedSkills.forEach((s) => skillsSet.add(s));
      }
    });
    return Array.from(skillsSet);
  }, [currentAnalysis, analysisHistory]);

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

      <section className="mt-6 grid gap-6 2xl:grid-cols-4 xl:grid-cols-2 lg:grid-cols-2">
        <article className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="app-kicker">Recent analyses</p>
            <div className="flex items-center gap-2">
              {analysisHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(clearAnalysisHistory())}
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)] hover:text-rose-400 transition"
                >
                  Clear All
                </button>
              )}
              <Link to="/analysis-history" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] hover:underline">
                 See more
              </Link>
            </div>
          </div>
          {recentAnalyses.length > 0 ? (
            <div className="app-panel overflow-hidden p-0">
              <div className="divide-y divide-[var(--border)]">
                {recentAnalyses.map((item) => (
                  <div key={`${item.id || item.role}-${item.company}`} className="group flex flex-wrap items-center justify-between gap-2 px-5 py-4 transition hover:bg-[var(--panel-soft)]">
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text)]">{item.role}</p>
                      <p className="mt-1 text-[11px] text-[var(--muted-strong)]">
                        {item.time} - {item.company}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.fullAnalysis && (
                        <div className="hidden gap-2 md:flex opacity-0 transition-opacity group-hover:opacity-100">
                          <button type="button" onClick={() => continueAnalysis(item.fullAnalysis)} className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] hover:underline">Continue</button>
                          <button type="button" onClick={() => dispatch(removeAnalysisRecord({ id: item.fullAnalysis.id, localId: item.fullAnalysis.localId }))} className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 hover:underline">Delete</button>
                        </div>
                      )}
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
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm text-[var(--muted-strong)] leading-6">
              No recent analyses. Upload a resume to get started.
            </div>
          )}
        </article>

        <article className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="app-kicker">Saved jobs</p>
            <div className="flex items-center gap-2">
              {savedJobs.length > 0 && !savedJobs[0].id.startsWith('fallback-') && (
                <button 
                  type="button" 
                  onClick={() => void handleDeleteAllSavedJobs()} 
                  disabled={clearingSavedJobs}
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)] hover:text-rose-400 transition"
                >
                  {clearingSavedJobs ? 'Deleting...' : 'Delete All'}
                </button>
              )}
              <Link to="/saved-jobs">
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)] hover:text-[var(--text)] transition">arrow_forward</span>
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            {savedJobsActionError ? (
              <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
                {savedJobsActionError}
              </div>
            ) : null}
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
                  <Link to="/saved-jobs" className="flex min-w-0 flex-1 items-center gap-4">
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
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        void handleToggleFollowUp(job);
                      }}
                      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text)] transition hover:border-[var(--accent)]/30"
                    >
                      Scripts
                    </button>
                    {job.originalId && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteSavedJob(job.originalId)}
                        disabled={deletingSavedJobId === job.originalId}
                        className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text)] transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        {deletingSavedJobId === job.originalId ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
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
            <p className="app-kicker">Interview prep</p>
            <div className="flex items-center gap-2">
              {interviewPrepItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(clearInterviewPrep())}
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)] hover:text-rose-400 transition"
                >
                  Clear All
                </button>
              )}
              <Link to="/interview-prep" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] hover:underline">
                 See more
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            {interviewPrepItems.length ? (
              interviewPrepItems.slice(0, 1).map((item) => (
                <article
                  key={item.id || item.localId}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 transition hover:border-[var(--accent)]/30 hover:bg-[var(--panel-soft)] flex flex-wrap items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[var(--text)]">{item.companyName || item.stage1?.companyName || 'Analysis prep'}</p>
                    <p className="mt-1 text-[11px] text-[var(--muted-strong)]">{formatRelativeTime(item.createdAt)}</p>
                    <div className="mt-2 text-[11px] text-[var(--muted)] truncate">
                       {item.stage2?.salaryCoach ? 'Includes salary data' : 'Includes interview Qs'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link to="/interview-prep" className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text)] transition hover:border-[var(--accent)]/30 text-center">Open</Link>
                    <button type="button" onClick={() => dispatch(removeInterviewPrep({ id: item.id, localId: item.localId }))} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text)] transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400">Delete</button>
                  </div>
                </article>
              ))
            ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm text-[var(--muted-strong)] leading-6">
                  No interview prep saved yet. Run an analysis to generate prep materials.
                </div>
            )}
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
          <div className="mt-6 flex flex-wrap gap-2">
            {(acquiredSkills.length > 0
              ? acquiredSkills
              : ['Technical Project Management', 'Next.js Framework Architect', 'AI Engineering Fundamentals']
            ).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--panel)]"
              >
                {skill}
              </span>
            ))}
          </div>
        </article>

      </section>
    </AppShell>
  );
}
