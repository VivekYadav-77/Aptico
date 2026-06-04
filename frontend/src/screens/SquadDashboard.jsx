import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import AppShell from '../components/AppShell.jsx';
import SquadCommsHub from '../components/SquadCommsHub.jsx';
import { getMySquad, joinSquad, logSquadApplications, pingSquad } from '../api/squadApi.js';
import { updateAuthUser } from '../store/authSlice.js';

const SQUAD_EXPLAINER_KEY = 'aptico-squad-explainer-dismissed';

function ProgressRing({ totalApps, weeklyGoal, progressPercent }) {
  const safeGoal = Math.max(1, Number(weeklyGoal) || 1);
  const radius = 116;
  const circumference = 2 * Math.PI * radius;
  const normalizedPercent = Math.max(0, Math.min(100, Number(progressPercent) || 0));
  const dashOffset = circumference * (1 - normalizedPercent / 100);

  return (
    <div className="relative mx-auto flex h-[290px] w-[290px] items-center justify-center sm:h-[340px] sm:w-[340px] group">
      <div className="absolute inset-7 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(78,222,163,0.3),transparent_40%),linear-gradient(145deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))] blur-md transition-all duration-700 group-hover:scale-105 group-hover:opacity-80" />
      <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full -rotate-90 drop-shadow-[0_0_15px_rgba(78,222,163,0.4)]">
        <circle cx="140" cy="140" r={radius} fill="transparent" stroke="var(--border)" strokeWidth="12" />
        <circle
          cx="140"
          cy="140"
          r={radius}
          fill="transparent"
          stroke="var(--accent)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="relative z-10 text-center flex flex-col items-center justify-center transition-transform duration-500 group-hover:scale-105">
        <p className="app-kicker text-[var(--accent)] drop-shadow-md">Squad velocity</p>
        <div className="mt-2 text-6xl font-black tracking-[-0.06em] text-[var(--text)] drop-shadow-xl">{totalApps}</div>
        <p className="mt-1 text-xs uppercase font-bold tracking-[0.25em] text-[var(--muted-strong)]">of {safeGoal} apps</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[var(--accent-strong)] backdrop-blur-md shadow-[0_0_20px_rgba(78,222,163,0.2)]">
          <span className="material-symbols-outlined text-[16px] animate-bounce">trending_up</span>
          {normalizedPercent}% complete
        </div>
      </div>
    </div>
  );
}

function TrailDots({ trail = [] }) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5">
        {trail.map((day) => (
          <div
            key={day.dateKey}
            title={`${day.label}: ${day.count} app${day.count === 1 ? '' : 's'}`}
            className={`h-2.5 flex-1 rounded-full transition ${
              day.active
                ? 'bg-[var(--accent)] shadow-[0_0_0_1px_rgba(78,222,163,0.28)]'
                : day.isToday
                  ? 'bg-white/20'
                  : 'bg-white/8'
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {trail.map((day) => (
          <span key={`${day.dateKey}-label`}>{day.label}</span>
        ))}
      </div>
    </div>
  );
}

function formatWeekOf(value) {
  if (!value) return 'this week';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'this week';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatDateTime(value) {
  if (!value) return 'just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function SquadSkeleton() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] animate-pulse">
      <div className="space-y-6">
        <article className="app-panel rounded-[2.5rem] p-8">
          <div className="h-10 w-48 bg-[var(--panel-strong)] rounded-xl mb-6"></div>
          <div className="h-14 w-full max-w-md bg-[var(--panel-strong)] rounded-2xl mb-4"></div>
          <div className="h-6 w-full max-w-xs bg-[var(--panel-strong)] rounded-lg mb-8"></div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-3xl bg-[var(--panel-strong)]"></div>
            ))}
          </div>
          
          <div className="mt-10 mx-auto h-[290px] w-[290px] sm:h-[340px] sm:w-[340px] rounded-full bg-[var(--panel-strong)]"></div>
          
          <div className="mt-10 grid gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-[var(--panel-strong)]"></div>
            ))}
          </div>
        </article>
      </div>
      <div className="space-y-6">
        <article className="app-panel rounded-[2.5rem] p-8">
          <div className="h-8 w-40 bg-[var(--panel-strong)] rounded-xl mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-[var(--panel-strong)]"></div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export default function SquadDashboard() {
  const dispatch = useDispatch();
  const [squadData, setSquadData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [loggingApps, setLoggingApps] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [applicationForm, setApplicationForm] = useState({
    companyName: '',
    roleTitle: '',
    jobUrl: ''
  });
  const [showExplainer, setShowExplainer] = useState(() => localStorage.getItem(SQUAD_EXPLAINER_KEY) !== 'true');

  const isFormValid = applicationForm.companyName.trim().length >= 3 && applicationForm.roleTitle.trim().length >= 3;

  useEffect(() => {
    if (toast || error) {
      const timer = setTimeout(() => {
        setToast('');
        setError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, error]);

  const laggingCount = useMemo(
    () => (squadData?.members || []).filter((member) => !member.isCurrentUser && member.paceDelta < 0).length,
    [squadData]
  );

  const milestones = squadData?.insights?.milestones || [];
  const recentEvents = squadData?.insights?.recentEvents || [];
  const balance = squadData?.insights?.balance;
  const clutchMode = squadData?.insights?.clutchMode;
  const pingStatus = squadData?.insights?.pingStatus;
  const meta = squadData?.meta;
  const totalPingsThisWeek = Number(pingStatus?.totalPingsThisWeek || 0);
  const appsAfterLastPing = Number(pingStatus?.appsAfterLastPing || 0);
  const hasPingFeedback = Boolean(pingStatus?.lastPingAt);
  const pingCountLabel = `${totalPingsThisWeek} ping${totalPingsThisWeek === 1 ? '' : 's'} this week`;
  const movementUnitLabel = `App${appsAfterLastPing === 1 ? '' : 's'}`;
  const lastPingDescription = hasPingFeedback
    ? 'This is the most recent anonymous nudge sent to teammates who were behind the weekly pace.'
    : 'No anonymous nudges have been sent this week, so feedback will appear after the first ping.';
  const movementDescription = !hasPingFeedback
    ? 'Send a ping when teammates fall behind pace. Applications logged afterward will be counted here.'
    : appsAfterLastPing
      ? `${appsAfterLastPing} application${appsAfterLastPing === 1 ? '' : 's'} logged after the most recent anonymous nudge.`
      : 'No applications have been logged since the most recent anonymous nudge.';

  function dismissExplainer() {
    setShowExplainer(false);
    localStorage.setItem(SQUAD_EXPLAINER_KEY, 'true');
  }

  useEffect(() => {
    getMySquad()
      .then((response) => {
        setSquadData(response.data || null);
      })
      .catch((apiError) => {
        setError(apiError.response?.data?.error || 'Could not load your squad yet.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleJoinSquad() {
    setJoining(true);
    setError('');

    try {
      const response = await joinSquad();
      setSquadData(response.data || null);
      setToast(response.joined ? 'You dropped into a live squad.' : 'Your squad is ready for this week.');
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Could not join a squad right now.');
    } finally {
      setJoining(false);
    }
  }

  async function handleLogApps() {
    const companyName = applicationForm.companyName.trim();
    const roleTitle = applicationForm.roleTitle.trim();
    const jobUrl = applicationForm.jobUrl.trim();

    if (companyName.length < 3 || roleTitle.length < 3) {
      setError('Enter both a company name and a role title with at least 3 characters.');
      return;
    }

    setLoggingApps(true);
    setError('');

    try {
      const response = await logSquadApplications({ companyName, roleTitle, jobUrl });
      setSquadData(response.data || null);

      if (response.resilienceXp !== undefined) {
        dispatch(updateAuthUser({ resilienceXp: response.resilienceXp }));
      }

      setApplicationForm({
        companyName: '',
        roleTitle: '',
        jobUrl: ''
      });
      setToast(
        response.goalRewardGranted
          ? 'Weekly goal reached. Squad XP has been granted.'
          : `${roleTitle} at ${companyName} logged. Squad total is now ${response.data?.squad?.totalApps || 0}.`
      );
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Could not log applications.');
    } finally {
      setLoggingApps(false);
    }
  }

  async function handlePing() {
    setPinging(true);
    setError('');

    try {
      const response = await pingSquad();
      setToast(
        response.notifiedCount
          ? `Anonymous nudge sent to ${response.notifiedCount} squadmate${response.notifiedCount > 1 ? 's' : ''}.`
          : 'No one is behind pace right now.'
      );

      const latest = await getMySquad();
      setSquadData(latest.data || null);
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Could not send a ping.');
    } finally {
      setPinging(false);
    }
  }

  return (
    <AppShell
      title="Squad Dashboard"
      description="Anonymous squads, one shared weekly goal, and zero profile peeking. Keep the bar moving together."
      actions={
        squadData ? (
          <>
            <button type="button" onClick={handlePing} className="app-button-secondary" disabled={pinging || !laggingCount}>
              <span className="material-symbols-outlined text-[18px]">campaign</span>
              {pinging ? 'Pinging...' : 'Ping lagging squadmates'}
            </button>
            <button type="button" onClick={handleLogApps} className="app-button" disabled={loggingApps}>
              <span className="material-symbols-outlined text-[18px]">send</span>
              {loggingApps ? 'Logging...' : 'Log applications'}
            </button>
          </>
        ) : null
      }
    >
      {toast ? (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="rounded-full bg-[var(--accent-strong)] px-6 py-3.5 text-sm font-black text-[var(--panel)] shadow-[0_10px_40px_rgba(78,222,163,0.4)] flex items-center gap-3">
             <span className="material-symbols-outlined text-[20px]">check_circle</span>
             {toast}
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="rounded-full bg-rose-500 px-6 py-3.5 text-sm font-black text-white shadow-[0_10px_40px_rgba(244,63,94,0.4)] flex items-center gap-3">
             <span className="material-symbols-outlined text-[20px]">error</span>
             {error}
          </div>
        </div>
      ) : null}

      {showExplainer ? (
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-blue-500/30 bg-[linear-gradient(135deg,rgba(59,130,246,0.15),rgba(16,185,129,0.1))] p-6 sm:p-8 backdrop-blur-md shadow-[0_8px_30px_rgba(59,130,246,0.12)] animate-fade-in-up">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <button
            type="button"
            onClick={dismissExplainer}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel-strong)]/50 text-[var(--muted-strong)] transition-all hover:bg-[var(--panel)] hover:text-[var(--text)] hover:rotate-90 backdrop-blur-sm z-10"
            aria-label="Dismiss explainer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <span className="material-symbols-outlined">group_work</span>
              </span>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">What is a Job Hunt Squad?</p>
            </div>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text)] font-medium">
              You get matched with <strong className="text-white drop-shadow-md">3 anonymous teammates</strong>. Nobody knows each other&apos;s names, only aliases.
              Together, you share one weekly goal: send a set number of job applications.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)]">
              Track the progress bar, spot momentum streaks, ping teammates who fall behind pace, and <strong className="text-emerald-400 drop-shadow-md">earn bonus
              XP</strong> when the squad hits the goal together.
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <SquadSkeleton />
      ) : squadData ? (
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <article className="app-panel relative overflow-hidden rounded-[2.5rem] border-[var(--border)] shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,222,163,0.2),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(78,222,163,0.1),transparent_30%)] blur-md" />
              <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent-strong)] border border-[var(--accent)]/20 shadow-inner">
                        <span className="material-symbols-outlined">shield</span>
                      </span>
                      <p className="app-kicker !mt-0 text-[var(--accent-strong)] drop-shadow-sm">Anonymous squad</p>
                    </div>
                    <h2 className="text-4xl font-black tracking-[-0.05em] text-transparent bg-clip-text bg-gradient-to-r from-[var(--text)] to-[var(--text)]/70 sm:text-5xl">{squadData.squad.squadName}</h2>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted-strong)] font-medium border-l-2 border-[var(--accent)]/30 pl-4 py-1">
                      Week of {formatWeekOf(squadData.squad.weekOf)} to {formatWeekOf(meta?.weekEnd)}. Your alias is{' '}
                      <span className="font-black text-[var(--text)] bg-[var(--panel-strong)] px-2 py-0.5 rounded-md shadow-sm border border-[var(--border)]">{squadData.me?.alias}</span>, and only the shared output matters.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)]/80 backdrop-blur-md px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center min-w-[140px] hover:-translate-y-1 transition-transform">
                    <p className="app-kicker !mt-0">Members</p>
                    <p className="mt-2 text-4xl font-black text-[var(--text)] drop-shadow-md">{squadData.squad.memberCount}<span className="text-[var(--muted)] text-2xl">/4</span></p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] bg-[var(--panel)] px-3 py-1 rounded-full border border-[var(--border)]">{meta?.formationLabel}</p>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="group rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-[var(--accent)]/30 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--panel)] border border-[var(--border)] relative cursor-help">
                          <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">speed</span>
                          <div className="absolute bottom-[120%] left-1/2 -translate-x-1/2 w-48 p-2.5 rounded-xl bg-[var(--panel-strong)] border border-[var(--border)] text-[11px] font-medium text-[var(--text)] opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl z-20 text-center leading-relaxed pointer-events-none">
                            How many apps the squad is ahead or behind the required trajectory.
                          </div>
                        </div>
                        <p className="app-kicker !mt-0 text-[var(--muted)]">Pace</p>
                      </div>
                      <p className="mt-2 text-3xl font-black text-[var(--text)] drop-shadow-md">
                        {meta?.paceGap >= 0 ? `+${meta?.paceGap || 0}` : meta?.paceGap || 0}
                      </p>
                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)]">apps vs target by now</p>
                    </div>
                  </div>
                  <div className="group rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-500/30 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--panel)] border border-[var(--border)] relative cursor-help">
                          <span className="material-symbols-outlined text-[16px] text-blue-400">timer</span>
                          <div className="absolute bottom-[120%] left-1/2 -translate-x-1/2 w-48 p-2.5 rounded-xl bg-[var(--panel-strong)] border border-[var(--border)] text-[11px] font-medium text-[var(--text)] opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl z-20 text-center leading-relaxed pointer-events-none">
                            Days remaining until the squad's weekly cycle resets and XP is tallied.
                          </div>
                        </div>
                        <p className="app-kicker !mt-0 text-[var(--muted)]">Time left</p>
                      </div>
                      <p className="mt-2 text-3xl font-black text-[var(--text)] drop-shadow-md">{meta?.daysRemaining || 0} <span className="text-lg">day{meta?.daysRemaining === 1 ? '' : 's'}</span></p>
                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)]">until weekly lock</p>
                    </div>
                  </div>
                  <div className="group rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-amber-500/30 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--panel)] border border-[var(--border)] relative cursor-help">
                          <span className="material-symbols-outlined text-[16px] text-amber-400">monitoring</span>
                          <div className="absolute bottom-[120%] left-1/2 -translate-x-1/2 w-48 p-2.5 rounded-xl bg-[var(--panel-strong)] border border-[var(--border)] text-[11px] font-medium text-[var(--text)] opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl z-20 text-center leading-relaxed pointer-events-none">
                            The collective number of apps the squad must log each day to hit the goal.
                          </div>
                        </div>
                        <p className="app-kicker !mt-0 text-[var(--muted)]">Recovery rate</p>
                      </div>
                      <p className="mt-2 text-3xl font-black text-[var(--text)] drop-shadow-md">{meta?.appsPerDayNeeded || 0}</p>
                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)]">apps needed per day</p>
                    </div>
                  </div>
                </div>

                {clutchMode?.active ? (
                  <div className="mt-8 rounded-[1.6rem] border border-amber-400/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(15,23,42,0.18))] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="app-kicker text-amber-300">Stealth clutch mode</p>
                        <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">This week is still savable.</h3>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-strong)]">{clutchMode.message}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Recovery target</p>
                        <p className="mt-2 text-3xl font-black text-[var(--text)]">{clutchMode.recoveryAppsNeeded}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">apps remaining</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-10">
                  <ProgressRing
                    totalApps={squadData.squad.totalApps}
                    weeklyGoal={squadData.squad.weeklyGoal}
                    progressPercent={squadData.squad.progressPercent}
                  />
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Your apps', value: squadData.me?.appsSentThisWeek || 0, icon: 'person', color: 'text-purple-400' },
                    { label: 'Fair share left', value: squadData.me?.fairShareRemaining || 0, icon: 'pie_chart', color: 'text-amber-400' },
                    { label: 'Daily target', value: squadData.me?.dailyTargetFromHere || 0, icon: 'track_changes', color: 'text-blue-400' },
                    { label: 'Squad interviews', value: squadData.squad.totalInterviews || 0, icon: 'forum', color: 'text-emerald-400' }
                  ].map((stat) => (
                     <div key={stat.label} className="group rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden hover:border-[var(--muted-strong)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20 group-hover:scale-110">
                           <span className={`material-symbols-outlined text-[40px] ${stat.color}`}>{stat.icon}</span>
                        </div>
                        <div className="relative z-10">
                          <p className="app-kicker !mt-0 !text-[10px] text-[var(--muted-strong)]">{stat.label}</p>
                          <p className="mt-2 text-3xl font-black text-[var(--text)] drop-shadow-sm">{stat.value}</p>
                        </div>
                     </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="app-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="app-kicker">Anonymous win conditions</p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">Three ways to move the squad this week</h2>
                </div>
                <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  free teamwork loop
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="group rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-[var(--accent)]/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-bl from-[var(--accent)]/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <p className="app-kicker !mt-0 text-[var(--muted-strong)]">{milestone.label}</p>
                      <p className="mt-3 text-4xl font-black text-[var(--text)] drop-shadow-sm">{milestone.appsNeeded}</p>
                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">apps needed</p>
                      <p className="mt-4 text-sm leading-relaxed text-[var(--muted-strong)]">{milestone.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="app-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="app-kicker">Recent squad feed</p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">Anonymous movement, in order</h2>
                </div>
                <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {pingStatus?.appsAfterLastPing || 0} apps after last ping
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {recentEvents.length ? (
                  recentEvents.map((event, index) => (
                    <div key={`${event.type}-${event.createdAt}-${index}`} className="group rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-4 transition-all hover:border-[var(--muted-strong)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--panel)] border border-[var(--border)] shrink-0">
                             <span className="material-symbols-outlined text-[16px] text-[var(--accent)] group-hover:scale-110 transition-transform">bolt</span>
                          </span>
                          <div>
                            <p className="text-sm font-bold text-[var(--text)]">{event.message}</p>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{event.type.replaceAll('_', ' ')}</p>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-strong)] bg-[var(--panel)] px-2 py-1 rounded-md">{formatDateTime(event.createdAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] px-6 py-8 text-center border-dashed">
                    <p className="text-sm font-medium text-[var(--muted-strong)] max-w-md mx-auto">
                      Squad activity will start appearing here as members join, log output, and ping for recovery.
                    </p>
                  </div>
                )}
              </div>
            </article>

            <SquadCommsHub
              squadId={squadData.squad.id}
              myAlias={squadData.me?.alias}
              progressPercent={squadData.squad.progressPercent}
              members={squadData.members}
            />
          </div>

          <div className="space-y-6">
            <article className="app-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="app-kicker">Leaderboard</p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">Alias-only standings</h2>
                </div>
                <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  4 seats max
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-[var(--border)] bg-gradient-to-r from-[var(--panel-soft)] to-[var(--panel)] p-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(78,222,163,0.1),transparent_40%)] pointer-events-none" />
                <div className="relative z-10 flex items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="material-symbols-outlined text-[16px] text-amber-400">balance</span>
                       <p className="app-kicker !mt-0 !text-amber-400">Contribution balance meter</p>
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text)] drop-shadow-sm">{balance?.label || 'Forming rhythm'}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)] max-w-lg">{balance?.description}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-3 shadow-inner shrink-0">
                    <span className="text-3xl font-black text-[var(--text)]">{balance?.score || 0}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)]">/100</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {squadData.members.map((member, index) => (
                  <div
                    key={member.alias}
                    className={`group rounded-3xl border px-5 py-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden ${
                      member.isCurrentUser
                        ? 'border-[var(--accent)]/40 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent-soft)] shadow-[0_0_15px_rgba(78,222,163,0.08)]'
                        : 'border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--muted-strong)]'
                    }`}
                  >
                    {member.isCurrentUser && (
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(78,222,163,0.15),transparent_50%)] pointer-events-none" />
                    )}
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex items-center gap-4">
                          <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ${
                            member.isCurrentUser ? 'bg-[var(--accent)] text-[var(--panel)]' : 'bg-[var(--panel-strong)] text-[var(--text)] border border-[var(--border)]'
                          }`}>
                            <span className="text-xl font-black">{index + 1}</span>
                            {index === 0 && <span className="absolute -top-2 -right-2 text-xl filter drop-shadow-md">👑</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black text-[var(--text)] tracking-tight">
                              {member.alias} {member.isCurrentUser && <span className="ml-2 inline-flex items-center rounded-full bg-[var(--accent)]/20 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-[var(--accent-strong)] border border-[var(--accent)]/30">You</span>}
                            </p>
                            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--muted-strong)] mt-0.5">
                              {member.interviewsThisWeek} interviews
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-3xl font-black tracking-tighter ${member.isCurrentUser ? 'text-[var(--accent-strong)] drop-shadow-md' : 'text-[var(--text)]'}`}>{member.appsSentThisWeek}</p>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)]">{member.sharePercent}% share</p>
                        </div>
                      </div>
                      
                      <div className="h-px w-full bg-[var(--border)]/60 my-1" />
                      
                      <div className="flex flex-col gap-2">
                         <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                           <span className={`inline-flex items-center gap-1 ${member.paceDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                             <span className="material-symbols-outlined text-[14px]">{member.paceDelta >= 0 ? 'trending_up' : 'trending_down'}</span>
                             {member.paceDelta >= 0 ? `Ahead by ${member.paceDelta}` : `${Math.abs(member.paceDelta)} behind pace`}
                           </span>
                           <span>Momentum trail</span>
                         </div>
                         <TrailDots trail={member.dailyTrail} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

                <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-strong)]/30 to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent-strong)] border border-[var(--accent)]/20 shadow-inner">
                        <span className="material-symbols-outlined">edit_square</span>
                      </span>
                      <div>
                        <h3 className="text-xl font-black text-[var(--text)]">Log output</h3>
                        <p className="text-xs uppercase font-bold tracking-[0.15em] text-[var(--muted-strong)] mt-1">Add to squad total</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-5">
                      <label className="group">
                        <span className="mb-2 block text-sm font-bold text-[var(--muted-strong)] group-focus-within:text-[var(--accent-strong)] transition-colors">Company Name</span>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-colors">domain</span>
                          <input
                            type="text"
                            value={applicationForm.companyName}
                            onChange={(event) => setApplicationForm((current) => ({ ...current, companyName: event.target.value }))}
                            placeholder="Acme Labs"
                            className="app-input w-full text-base py-3 transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            style={{ paddingLeft: '3rem' }}
                          />
                        </div>
                      </label>
                      <label className="group">
                        <span className="mb-2 block text-sm font-bold text-[var(--muted-strong)] group-focus-within:text-[var(--accent-strong)] transition-colors">Role Title</span>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-colors">work</span>
                          <input
                            type="text"
                            value={applicationForm.roleTitle}
                            onChange={(event) => setApplicationForm((current) => ({ ...current, roleTitle: event.target.value }))}
                            placeholder="Frontend Engineer"
                            className="app-input w-full text-base py-3 transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            style={{ paddingLeft: '3rem' }}
                          />
                        </div>
                      </label>
                      <label className="group">
                        <span className="mb-2 block text-sm font-bold text-[var(--muted-strong)] group-focus-within:text-[var(--accent-strong)] transition-colors">Job Link <span className="text-[var(--muted)] font-normal text-xs">(optional)</span></span>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-colors">link</span>
                          <input
                            type="url"
                            value={applicationForm.jobUrl}
                            onChange={(event) => setApplicationForm((current) => ({ ...current, jobUrl: event.target.value }))}
                            placeholder="https://company.com/careers/job-id"
                            className="app-input w-full text-base py-3 transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            style={{ paddingLeft: '3rem' }}
                          />
                        </div>
                      </label>
                      <button type="button" onClick={handleLogApps} className="app-button w-full sm:w-auto sm:self-start py-3 px-8 mt-2 shadow-[0_0_20px_rgba(78,222,163,0.15)] hover:shadow-[0_0_30px_rgba(78,222,163,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_0_20px_rgba(78,222,163,0.15)] disabled:hover:-translate-y-0" disabled={loggingApps || !isFormValid}>
                        {loggingApps ? 'Updating...' : 'Submit Output'}
                        <span className="material-symbols-outlined text-[18px] ml-2">{loggingApps ? 'sync' : 'send'}</span>
                      </button>
                    </div>
                <div className="mt-4 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-semibold text-[var(--warning-text)]">
                  These entries are permanently visible to recruiters on your public profile. Ensure your data is accurate.
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-5 py-5 transition-colors hover:border-[var(--accent)]/30">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)]">Current squad total</p>
                    <p className="mt-2 text-3xl font-black text-[var(--text)] drop-shadow-sm">{squadData.squad.totalApps}</p>
                  </div>
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-5 py-5 transition-colors hover:border-[var(--accent)]/30">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)]">Expected by now</p>
                    <p className="mt-2 text-3xl font-black text-[var(--text)] drop-shadow-sm">{meta?.expectedAppsByNow || 0}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--muted-strong)]">
                  Ping is available when teammates fall behind real weekly pace.{' '}
                  {laggingCount
                    ? `${laggingCount} member${laggingCount > 1 ? 's are' : ' is'} currently behind.`
                    : 'Everyone is on pace right now.'}
                </p>
              </div>
            </div>
          </article>

            <article className="app-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="app-kicker">Ping feedback</p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">Did the nudge create movement?</h2>
                </div>
                <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {pingCountLabel}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 transition-all hover:border-[var(--muted-strong)]">
                  <p className="app-kicker !mt-0 text-[var(--muted)]">Last ping sent</p>
                  <p className="mt-4 text-xl font-black text-[var(--text)] drop-shadow-sm">
                    {pingStatus?.lastPingAt ? formatDateTime(pingStatus.lastPingAt) : 'No pings yet'}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">
                    {lastPingDescription}
                  </p>
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 transition-all hover:border-[var(--muted-strong)]">
                  <p className="app-kicker !mt-0 text-[var(--muted)]">Movement after ping</p>
                  <div className="mt-4 flex items-baseline gap-2">
                     <p className="text-4xl font-black text-[var(--text)] drop-shadow-md">{appsAfterLastPing}</p>
                     <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">{movementUnitLabel}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">
                    {movementDescription}
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-4xl animate-fade-in-up">
          <article className="app-panel relative overflow-hidden text-center !p-10 sm:!p-16 border-[var(--border)] shadow-[0_0_50px_rgba(0,0,0,0.2)] rounded-[3rem]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(78,222,163,0.25),transparent_45%),linear-gradient(145deg,rgba(78,222,163,0.08),transparent)] blur-md" />
            
            {/* Ambient animated floating circles */}
            <div className="absolute -left-10 top-20 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-3xl animate-pulse" />
            <div className="absolute -right-10 bottom-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="relative mx-auto max-w-2xl z-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 shadow-[0_0_30px_rgba(78,222,163,0.2)] mb-6">
                <span className="material-symbols-outlined text-[40px] text-[var(--accent-strong)] drop-shadow-md">group_work</span>
              </div>
              <p className="app-kicker text-[var(--accent-strong)] drop-shadow-sm">Anonymous team challenge</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[var(--text)] sm:text-6xl drop-shadow-xl leading-tight">Join a squad and chase the weekly goal together.</h2>
              <p className="mt-6 text-base leading-relaxed text-[var(--muted-strong)] sm:text-lg font-medium max-w-xl mx-auto">
                You&apos;ll be placed in a 4-person anonymous squad. Each member gets a random alias, no names, no photos,
                no profiles. The only thing that matters is making progress together toward a shared weekly target.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button type="button" onClick={handleJoinSquad} className="app-button px-10 py-4 text-lg shadow-[0_0_30px_rgba(78,222,163,0.2)] hover:shadow-[0_0_40px_rgba(78,222,163,0.4)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group" disabled={joining}>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                  <span className="material-symbols-outlined text-[24px] relative z-10">group_add</span>
                  <span className="relative z-10 font-bold">{joining ? 'Matching you now...' : 'Join a squad now'}</span>
                </button>
              </div>
              <div className="mt-12 grid gap-5 text-left sm:grid-cols-3">
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:shadow-xl backdrop-blur-sm group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--panel)] border border-[var(--border)] mb-4 shadow-inner group-hover:bg-[var(--accent)]/10 transition-colors">
                     <span className="material-symbols-outlined text-[20px] text-[var(--accent-strong)]">visibility_off</span>
                  </div>
                  <p className="text-base font-black text-[var(--text)] drop-shadow-sm">Fully anonymous</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">Random alias only. No names, avatars, or profiles are ever shared.</p>
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:shadow-xl backdrop-blur-sm group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--panel)] border border-[var(--border)] mb-4 shadow-inner group-hover:bg-[var(--accent)]/10 transition-colors">
                     <span className="material-symbols-outlined text-[20px] text-[var(--accent-strong)]">flag</span>
                  </div>
                  <p className="text-base font-black text-[var(--text)] drop-shadow-sm">Shared weekly goal</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">The squad has one combined target. Everyone contributes to a single unlock.</p>
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:shadow-xl backdrop-blur-sm group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--panel)] border border-[var(--border)] mb-4 shadow-inner group-hover:bg-[var(--accent)]/10 transition-colors">
                     <span className="material-symbols-outlined text-[20px] text-[var(--accent-strong)]">military_tech</span>
                  </div>
                  <p className="text-base font-black text-[var(--text)] drop-shadow-sm">Earn bonus XP</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">When the squad hits the goal, every member gets Resilience XP automatically.</p>
                </div>
              </div>
            </div>
          </article>
        </section>
      )}
    </AppShell>
  );
}
