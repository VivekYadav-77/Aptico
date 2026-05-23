import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@/lib/router-compat.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios.js';
import { deleteAllSavedJobs, deleteSavedJob } from '../api/jobsApi.js';
import { fetchDashboardSummary } from '../api/profileApi.js';
import AppShell from '../components/AppShell.jsx';
import RejectionModal from '../components/RejectionModal.jsx';
import { selectAuth, updateAuthUser } from '../store/authSlice.js';
import {
  clearAnalysisHistory,
  clearInterviewPrep,
  removeAnalysisRecord,
  removeInterviewPrep,
  selectAnalysisHistory,
  setCurrentAnalysis,
  selectCurrentAnalysis
} from '../store/historySlice.js';



function NeonGauge({ score }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.max(0, Math.min(score, 100));
  const dashOffset = circumference * (1 - normalizedScore / 100);

  return (
    <div className="relative flex flex-col items-center justify-center p-6 group">
      <div className="absolute inset-0 bg-[var(--accent)]/5 rounded-3xl blur-xl transition duration-500 group-hover:bg-[var(--accent)]/10" />
      <div className="relative flex h-40 w-40 items-center justify-center z-10">
        <div className="absolute inset-0 rounded-full bg-[var(--accent)]/10 blur-2xl animate-pulse"></div>
        <svg className="h-full w-full -rotate-90 drop-shadow-[0_0_12px_rgba(78,222,163,0.5)]" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="transparent" stroke="rgba(113,113,122,0.15)" strokeWidth="12" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="var(--accent)"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth="12"
            className="transition-all duration-[2000ms] ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-[var(--text)] drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
            {score === 0 ? '--' : normalizedScore}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-1.5 z-10 shadow-[0_0_15px_rgba(78,222,163,0.2)]">
        <div className={`h-2 w-2 rounded-full bg-[var(--accent)] ${score > 0 ? 'animate-ping' : ''}`} />
        <span className="mono-text text-[11px] font-bold uppercase tracking-widest text-[var(--accent-strong)]">
          {score > 0 ? 'Match Resonance' : 'Calibration Required'}
        </span>
      </div>
    </div>
  );
}

function ResilienceHUD({ xp, flashXp }) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const level = Math.floor(safeXp / 1000) + 1;
  const currentLevelXp = safeXp % 1000;
  const progressPercent = (currentLevelXp / 1000) * 100;
  const xpToNextLevel = 1000 - currentLevelXp || 1000;

  return (
    <div className="relative p-6 group">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl transition duration-500 group-hover:bg-[var(--accent)]/20" />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="app-kicker text-[10px]">Resilience Protocol</p>
            <h2 className="mt-1 text-4xl font-black tracking-[-0.05em] text-[var(--text)] drop-shadow-md">Lvl {level}</h2>
          </div>
          <div className="text-right">
             <p className="mono-text text-xl font-bold text-[var(--accent-strong)]">{safeXp} XP</p>
             {flashXp ? <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-strong)] animate-pulse">+{flashXp} UP</p> : null}
          </div>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--muted-strong)]">
            <span>{currentLevelXp} / 1000</span>
            <span>Next: Lvl {level + 1}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--panel-strong)] shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#71a1ff] shadow-[0_0_10px_rgba(78,222,163,0.5)] transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResonanceTrendChart({ history }) {
  if (!history || history.length < 2) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-xl">
        <span className="material-symbols-outlined mb-2 text-3xl text-[var(--muted)] opacity-30">show_chart</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-strong)]">Awaiting Telemetry</p>
      </div>
    );
  }

  const scores = history.slice(0, 10).reverse().map((h) => h.confidenceScore || 0);
  const width = 400;
  const height = 150;
  const padding = 20;

  const points = scores.map((score, index) => {
    const x = padding + (index / (scores.length - 1)) * (width - padding * 2);
    const y = height - padding - (score / 100) * (height - padding * 2);
    return { x, y, score };
  });

  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const areaD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  return (
    <div className="relative w-full rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-xl group mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="app-kicker text-[11px]">Resonance Trend</p>
        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)] animate-pulse">Live</span>
      </div>
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '400/150' }}>
        <style>
          {`@keyframes drawLine { to { stroke-dashoffset: 0; } }`}
        </style>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible drop-shadow-[0_0_15px_rgba(78,222,163,0.15)]">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <line x1="0" y1={padding} x2={width} y2={padding} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1={height - padding} x2={width} y2={height - padding} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />

          <path d={areaD} fill="url(#trendGradient)" className="animate-fade-in-up" />
          
          <path
            d={pathD}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: 'drawLine 2s ease-out forwards' }}
          />

          {points.map((p, i) => (
            <g key={i} className="group/dot cursor-pointer transition-transform duration-300 hover:scale-150 origin-center" style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
              <circle cx={p.x} cy={p.y} r="3" fill="var(--panel)" stroke="var(--accent)" strokeWidth="2" className="transition-colors duration-300 group-hover/dot:fill-[var(--accent)]" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" className="pointer-events-none fill-[var(--text)] text-[10px] font-bold opacity-0 transition-opacity duration-300 group-hover/dot:opacity-100 drop-shadow-md">
                {p.score}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function ActivityPulseGraph({ activity }) {
  const pulseData = Array.from({ length: 7 }, () => 0);
  
  const now = new Date();
  (activity || []).forEach((item) => {
    const d = new Date(item.createdAt || Date.now());
    const diffTime = Math.abs(now - d);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      pulseData[6 - diffDays] += 1;
    }
  });

  const maxPulse = Math.max(...pulseData, 1);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl">
       <p className="app-kicker mb-4 text-[11px]">Telemetry Pulse</p>
       <div className="flex h-20 items-end justify-between gap-1.5">
          {pulseData.map((val, i) => {
            const heightPercent = Math.max((val / maxPulse) * 100, 15);
            return (
              <div key={i} className="group relative flex w-full flex-col justify-end h-full">
                <div 
                  className="w-full rounded-t-sm bg-[#71a1ff]/40 transition-all duration-500 ease-out group-hover:bg-[#71a1ff] shadow-[0_0_10px_rgba(113,161,255,0)] group-hover:shadow-[0_0_15px_rgba(113,161,255,0.4)]"
                  style={{ height: `${heightPercent}%` }}
                />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 z-10 pointer-events-none">
                   <span className="rounded bg-[var(--panel-strong)] px-2 py-0.5 text-[9px] font-bold text-[var(--text)] shadow-lg">{val}</span>
                </div>
              </div>
            );
          })}
       </div>
       <div className="mt-3 flex justify-between text-[8px] font-bold uppercase tracking-widest text-[var(--muted-strong)]">
          <span>7d ago</span>
          <span>Today</span>
       </div>
    </div>
  );
}

function formatRelativeTime(value) {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function formatScriptDate(value) {
  if (!value) return 'a later date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'a later date';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [xpFlash, setXpFlash] = useState(0);

  const name = auth.user?.name?.split(' ')[0] || (auth.guestMode ? 'Explorer' : 'there');
  const matchedSkills = currentAnalysis?.matchedSkills?.slice(0, 6) || [];
  const score = useMemo(() => {
    if (currentAnalysis?.confidenceScore) return currentAnalysis.confidenceScore;
    if (analysisHistory.length > 0) {
      const validScores = analysisHistory.map(h => h.confidenceScore).filter(s => typeof s === 'number');
      if (validScores.length > 0) {
        return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
      }
    }
    return 0;
  }, [currentAnalysis, analysisHistory]);
  const resilienceXp = auth.user?.resilienceXp || 0;
  
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
    if (nextExpanded !== job.id || followUpScriptsByJob[job.id]) return;
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
    if (historyAnalyses.length) return historyAnalyses;
    if (currentAnalysis) {
      return [{
        role: currentAnalysis.jobTitle || currentAnalysis.companyName || 'Latest analysis',
        time: 'Latest',
        company: currentAnalysis.companyName || 'Aptico workspace',
        score,
        tone: score >= 85 ? 'good' : 'warning',
        fullAnalysis: currentAnalysis
      }];
    }
    return [];
  }, [analysisHistory, currentAnalysis, score]);

  const savedJobs = useMemo(() => {
    return (dashboardQuery.data?.savedJobs || []).map((job) => ({
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
  }, [dashboardQuery.data?.savedJobs]);

  const recommendations = useMemo(() => {
    if (dashboardQuery.data?.recommendations?.length) {
      return dashboardQuery.data.recommendations;
    }
    if (matchedSkills.length > 0) {
      return [
        `Feature '${matchedSkills[0]}' more clearly in your profile and resume summary to improve recruiter discovery.`,
        'Use your latest matched skills to tighten targeting before your next job search session.',
        'Review your portfolio and outreach assets so the strongest signals from analysis also show up publicly.'
      ];
    }
    return [];
  }, [dashboardQuery.data?.recommendations, matchedSkills]);

  const activity = useMemo(() => {
    return (dashboardQuery.data?.activity || []).map((item, index) => [
      item.title,
      item.subtitle,
      formatRelativeTime(item.createdAt),
      index === 0
    ]);
  }, [dashboardQuery.data?.activity]);

  const acquiredSkills = useMemo(() => {
    const skillsSet = new Set();
    if (currentAnalysis?.matchedSkills) currentAnalysis.matchedSkills.forEach((s) => skillsSet.add(s));
    analysisHistory.forEach((historyItem) => {
      if (historyItem.matchedSkills) historyItem.matchedSkills.forEach((s) => skillsSet.add(s));
    });
    return Array.from(skillsSet);
  }, [currentAnalysis, analysisHistory]);

  const intelligenceFeed = useMemo(() => {
    const feed = [];
    recommendations.forEach((rec, idx) => {
      feed.push({ type: 'insight', content: rec, id: `insight-${idx}`, timestamp: Date.now() - (idx * 20000) });
    });
    activity.forEach(([title, subtitle, time, isLatest], idx) => {
      feed.push({ type: 'activity', title, subtitle, time, isLatest, id: `act-${idx}`, timestamp: Date.now() - (idx * 50000 + 10000) });
    });
    recentAnalyses.forEach((analysis, idx) => {
      feed.push({ type: 'analysis', ...analysis, timestamp: Date.now() - (idx * 150000 + 30000) });
    });
    return feed.sort((a, b) => b.timestamp - a.timestamp);
  }, [recommendations, activity, recentAnalyses]);

  function handleRejectionSuccess(payload) {
    setXpFlash(payload?.xpEarned || 0);
    if (payload?.resilienceXp !== undefined) {
      dispatch(updateAuthUser({ resilienceXp: payload.resilienceXp }));
    }
    window.setTimeout(() => setXpFlash(0), 2200);
  }

  return (
    <AppShell
      title={`Command Center`}
      description="The Intelligence HUD. Your career vitals, AI insights, and tactical actions unified into one high-signal interface."
    >
      <div className="min-h-full pb-10">
        
        {/* ── HERO BANNER ── */}
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-[var(--border)] glass bg-black/40 shadow-2xl animate-fade-in-up">
          <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none" />
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-[100px] pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-[#71a1ff]/10 blur-[100px] pointer-events-none" />
          <div className="hud-scanlines absolute inset-0 opacity-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-1.5 backdrop-blur-md mb-6">
                 <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                 <span className="mono-text text-[10px] font-bold uppercase tracking-widest text-[var(--accent-strong)]">System Online</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-[-0.04em] text-[var(--text)]">
                Welcome back, <br/>
                <span className="animate-text-shimmer bg-[linear-gradient(110deg,var(--text),45%,#fff,55%,var(--text))] bg-[length:200%_100%] bg-clip-text text-transparent">{name}</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--muted-strong)]">
                Telemetry indicates steady momentum. Review your AI insights, log recent activity, and proceed with your next tactical objective.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/analysis/latest" className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text)] transition hover:border-[#71a1ff]/50 hover:text-[#71a1ff]">
                  <span className="material-symbols-outlined text-[14px]">history</span>
                  Continue Last Match
                </Link>
                <Link to="/jobs" className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent-strong)]">
                  <span className="material-symbols-outlined text-[14px]">search</span>
                  Search Jobs
                </Link>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
               <button type="button" onClick={() => setIsRejectionModalOpen(true)} className="app-button-secondary border-[var(--accent)]/30 hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 text-[var(--accent-strong)] shadow-[0_0_20px_rgba(78,222,163,0.15)] group">
                  <span className="material-symbols-outlined transition-transform group-hover:scale-110">military_tech</span>
                  Log Rejection
               </button>
               <Link to="/analysis" className="app-button shadow-[0_0_25px_rgba(78,222,163,0.3)]">
                 <span className="material-symbols-outlined">data_thresholding</span>
                 New Analysis
               </Link>
            </div>
          </div>
        </section>

        {dashboardQuery.error ? (
          <div className="mb-6 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">
            {dashboardQuery.error.response?.data?.error || 'Could not establish connection to intelligence servers. Showing local fallback telemetry.'}
          </div>
        ) : null}

        {/* ── 3-COLUMN ASYMMETRIC GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1: VITALS (Left) */}
          <div className="lg:col-span-3 flex flex-col gap-6 animate-fade-in-up-delay-1">
             <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-xl overflow-hidden relative">
               <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50" />
               <NeonGauge score={score} />
             </div>
             
             <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-xl overflow-hidden relative">
               <ResilienceHUD xp={resilienceXp} flashXp={xpFlash} />
             </div>

             <ActivityPulseGraph activity={dashboardQuery.data?.activity || []} />

             <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-xl p-6">
                <p className="app-kicker mb-4">Skill Constellation</p>
                <div className="flex flex-wrap gap-2">
                  {acquiredSkills.length > 0 ? (
                    acquiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--muted-strong)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:text-[var(--text)] hover:shadow-[0_0_15px_rgba(78,222,163,0.15)]"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]/50 mr-2" />
                        {skill}
                      </span>
                    ))
                  ) : (
                    <div className="text-[11px] text-[var(--muted-strong)] text-center py-2 w-full">
                      No skills matched yet. Analyze a job description to calibrate constellation.
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* COLUMN 2: INTELLIGENCE STREAM (Center) */}
          <div className="lg:col-span-6 flex flex-col gap-6 animate-fade-in-up-delay-2">
             <ResonanceTrendChart history={analysisHistory} />
             
             <div className="flex items-center justify-between px-2 mt-2">
                <p className="app-kicker text-[11px] text-[var(--text)] font-black">Intelligence Stream</p>
                <div className="flex gap-1 items-center">
                  <span className="h-1 w-1 rounded-full bg-[var(--accent)] animate-ping" />
                  <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                  <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                </div>
             </div>
             
             <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-xl p-2 min-h-[600px]">
                {/* The vertical timeline line */}
                <div className="absolute left-10 top-8 bottom-8 w-px bg-gradient-to-b from-[var(--accent)]/50 via-[var(--border)] to-transparent" />
                
                <div className="space-y-2 relative z-10">
                  {intelligenceFeed.length > 0 ? (
                    intelligenceFeed.map((item) => {
                      if (item.type === 'insight') {
                        return (
                          <div key={item.id} className="group relative flex items-start gap-4 p-4 rounded-2xl transition hover:bg-[var(--panel-soft)]">
                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 shadow-[0_0_15px_rgba(78,222,163,0.2)]">
                              <span className="material-symbols-outlined text-[16px] text-[var(--accent-strong)]">auto_awesome</span>
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-strong)] mb-1">AI Insight</p>
                               <p className="text-sm font-medium text-[var(--text)] leading-relaxed">{item.content}</p>
                            </div>
                          </div>
                        );
                      }
                      
                      if (item.type === 'activity') {
                        return (
                          <div key={item.id} className="group relative flex items-start gap-4 p-4 rounded-2xl transition hover:bg-[var(--panel-soft)]">
                             <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] ${item.isLatest ? 'border-[var(--accent)] shadow-[0_0_10px_rgba(78,222,163,0.3)]' : ''}`}>
                               <span className="material-symbols-outlined text-[16px] text-[var(--muted-strong)]">{item.isLatest ? 'radio_button_checked' : 'trip_origin'}</span>
                             </div>
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-strong)]">Activity</p>
                                  <span className="text-[10px] text-[var(--muted)]">{item.time}</span>
                                </div>
                                <p className="text-sm font-bold text-[var(--text)]">{item.title}</p>
                                <p className="mt-0.5 text-xs text-[var(--muted-strong)]">{item.subtitle}</p>
                             </div>
                          </div>
                        );
                      }
                      
                      if (item.type === 'analysis') {
                         return (
                           <div key={`analysis-${item.id || item.role}`} className="group relative flex items-start gap-4 p-4 rounded-2xl transition hover:bg-[var(--panel-soft)]">
                             <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#71a1ff]/30 bg-[#71a1ff]/10 shadow-[0_0_15px_rgba(113,161,255,0.2)]">
                               <span className="material-symbols-outlined text-[16px] text-[#71a1ff]">analytics</span>
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                     <p className="text-[10px] font-black uppercase tracking-widest text-[#71a1ff]">Analysis Report</p>
                                     <span className="text-[10px] text-[var(--muted)]">{item.time}</span>
                                  </div>
                                  <span className={`mono-text rounded border px-2 py-0.5 text-[10px] font-bold ${item.tone === 'good' ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent-strong)]' : 'border-amber-500/30 bg-amber-500/10 text-amber-500'}`}>
                                    {item.score}
                                  </span>
                                </div>
                                <p className="text-sm font-bold text-[var(--text)] truncate">{item.role}</p>
                                <p className="mt-0.5 text-xs text-[var(--muted-strong)] truncate">{item.company}</p>
                                
                                {item.fullAnalysis && (
                                  <div className="mt-3 flex gap-2">
                                    <button type="button" onClick={() => continueAnalysis(item.fullAnalysis)} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text)] transition hover:border-[#71a1ff]/50 hover:text-[#71a1ff] hover:shadow-[0_0_10px_rgba(113,161,255,0.15)]">Review</button>
                                  </div>
                                )}
                             </div>
                           </div>
                         );
                      }
                      return null;
                    })
                  ) : (
                    <div className="flex h-[400px] flex-col items-center justify-center text-center p-8">
                       <span className="material-symbols-outlined text-5xl text-[var(--muted)] mb-4 opacity-30">stream</span>
                       <p className="text-sm text-[var(--muted-strong)]">No telemetry received yet. Run an analysis or save a job to populate your intelligence feed.</p>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* COLUMN 3: TACTICAL (Right) */}
          <div className="lg:col-span-3 flex flex-col gap-6 animate-fade-in-up-delay-3">
             <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-xl p-5 flex flex-col max-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <p className="app-kicker">Saved Jobs</p>
                  <Link to="/saved-jobs" className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-strong)] hover:underline">View All</Link>
                </div>
                <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1">
                  {savedJobs.length > 0 ? (
                    savedJobs.map((job) => (
                      <div key={`${job.id || job.title}-${job.company}`} className="group rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 transition hover:border-[var(--accent)]/30 hover:shadow-[0_0_15px_rgba(78,222,163,0.1)]">
                         <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--panel)]">
                               <span className="material-symbols-outlined text-[16px] text-[var(--muted-strong)]">{job.icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="text-[12px] font-bold text-[var(--text)] truncate">{job.title}</p>
                               <p className="text-[10px] text-[var(--muted-strong)] truncate">{job.company}</p>
                            </div>
                         </div>
                          <div className="mt-3 flex gap-2">
                            <button type="button" onClick={() => void handleToggleFollowUp(job)} className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent-strong)]">
                              {expandedJobId === job.id ? 'Close' : 'Scripts'}
                            </button>
                            {job.originalId && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteSavedJob(job.originalId)}
                                disabled={deletingSavedJobId === job.originalId}
                                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text)] transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                              >
                                {deletingSavedJobId === job.originalId ? '...' : 'Delete'}
                              </button>
                            )}
                          </div>
                         {expandedJobId === job.id && (
                           <div className="mt-3 border-t border-[var(--border)] pt-3 max-h-40 overflow-y-auto custom-scrollbar space-y-3">
                              {loadingJobId === job.id ? (
                                <p className="text-[10px] text-center text-[var(--muted-strong)] animate-pulse">Loading...</p>
                              ) : (
                                (followUpScriptsByJob[job.id] || []).map((script) => (
                                  <div key={`${job.id}-${script.day}`} className="rounded-lg bg-[var(--panel)] p-2 border border-[var(--border)]">
                                    <p className="text-[9px] font-black uppercase text-[var(--accent-strong)]">Day {script.day}</p>
                                    <button onClick={() => void handleCopy(script.body, `${job.id}-${script.day}-body`)} className="mt-1 w-full text-left text-[10px] text-[var(--text)] hover:text-[var(--accent-strong)]">
                                      {copiedKey === `${job.id}-${script.day}-body` ? 'Copied!' : 'Copy Body'}
                                    </button>
                                  </div>
                                ))
                              )}
                           </div>
                         )}
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center p-4">
                      <p className="text-[11px] text-[var(--muted-strong)]">No tactical targets acquired.</p>
                    </div>
                  )}
                </div>
             </div>

             <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <p className="app-kicker">Interview Prep</p>
                  <Link to="/interview-prep" className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-strong)] hover:underline">View All</Link>
                </div>
                <div className="space-y-3">
                  {interviewPrepItems.length > 0 ? (
                    interviewPrepItems.slice(0, 2).map((item) => (
                      <div key={item.id || item.localId} className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 transition hover:border-[#71a1ff]/30 hover:shadow-[0_0_15px_rgba(113,161,255,0.1)]">
                         <div className="absolute right-0 top-0 h-16 w-16 bg-[#71a1ff]/5 blur-xl group-hover:bg-[#71a1ff]/10" />
                         <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-2">
                             <span className="material-symbols-outlined text-[14px] text-[#71a1ff]">{item.stage2?.salaryCoach ? 'payments' : 'forum'}</span>
                             <p className="text-[9px] uppercase tracking-widest text-[var(--muted)]">{formatRelativeTime(item.createdAt)}</p>
                           </div>
                           <p className="text-[12px] font-bold text-[var(--text)] truncate">{item.companyName || item.stage1?.companyName || 'Analysis prep'}</p>
                           <Link to="/interview-prep" className="mt-2 inline-block rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--text)] transition hover:border-[#71a1ff]/50 hover:text-[#71a1ff]">Launch</Link>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-24 flex-col items-center justify-center text-center">
                      <p className="text-[11px] text-[var(--muted-strong)]">No prep modules active.</p>
                    </div>
                  )}
                </div>
             </div>

          </div>
        </div>
      </div>
      <RejectionModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onSuccess={handleRejectionSuccess}
      />
    </AppShell>
  );
}
