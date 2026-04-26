import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { getMySquad, joinSquad, logSquadApplications, pingSquad } from '../api/squadApi.js';

const SQUAD_EXPLAINER_KEY = 'aptico-squad-explainer-dismissed';

function ProgressRing({ totalApps, weeklyGoal, progressPercent }) {
  const safeGoal = Math.max(1, Number(weeklyGoal) || 1);
  const radius = 116;
  const circumference = 2 * Math.PI * radius;
  const normalizedPercent = Math.max(0, Math.min(100, Number(progressPercent) || 0));
  const dashOffset = circumference * (1 - normalizedPercent / 100);

  return (
    <div className="relative mx-auto flex h-[290px] w-[290px] items-center justify-center sm:h-[340px] sm:w-[340px]">
      <div className="absolute inset-7 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(78,222,163,0.24),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02))]" />
      <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="140" cy="140" r={radius} fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="16" />
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
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="relative z-10 text-center">
        <p className="app-kicker">Squad velocity</p>
        <div className="mt-4 text-5xl font-black tracking-[-0.06em] text-[var(--text)] sm:text-6xl">{totalApps}</div>
        <p className="mt-2 text-sm uppercase tracking-[0.22em] text-[var(--muted)]">of {safeGoal} apps</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
          <span className="material-symbols-outlined text-[18px]">trending_up</span>
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

export default function SquadDashboard() {
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
        <div className="mb-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)]">
          {toast}
        </div>
      ) : null}
      {error ? (
        <div className="mb-6 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
          {error}
        </div>
      ) : null}

      {showExplainer ? (
        <div className="relative mb-6 overflow-hidden rounded-[1.6rem] border border-blue-500/25 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(16,185,129,0.08))] p-5 sm:p-6">
          <button
            type="button"
            onClick={dismissExplainer}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--muted-strong)] transition hover:text-[var(--text)]"
            aria-label="Dismiss explainer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">What is a Job Hunt Squad?</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text)]">
            You get matched with <strong>3 anonymous teammates</strong>. Nobody knows each other&apos;s names, only aliases.
            Together, you share one weekly goal: send a set number of job applications.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted-strong)]">
            Track the progress bar, spot momentum streaks, ping teammates who fall behind pace, and <strong>earn bonus
            XP</strong> when the squad hits the goal together.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="app-panel h-[420px]" />
          <div className="app-panel h-[420px]" />
        </div>
      ) : squadData ? (
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <article className="app-panel relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,222,163,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(78,222,163,0.08),transparent_28%)]" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="app-kicker">Anonymous squad</p>
                    <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--text)] sm:text-4xl">{squadData.squad.squadName}</h2>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted-strong)]">
                      Week of {formatWeekOf(squadData.squad.weekOf)} to {formatWeekOf(meta?.weekEnd)}. Your alias is{' '}
                      <span className="font-bold text-[var(--text)]">{squadData.me?.alias}</span>, and only the shared output matters.
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel)] px-4 py-4 shadow-[0_18px_30px_rgba(0,0,0,0.08)]">
                    <p className="app-kicker">Members</p>
                    <p className="mt-2 text-3xl font-black text-[var(--text)]">{squadData.squad.memberCount}/4</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{meta?.formationLabel}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4">
                    <p className="app-kicker">Pace</p>
                    <p className="mt-2 text-2xl font-black text-[var(--text)]">
                      {meta?.paceGap >= 0 ? `+${meta?.paceGap || 0}` : meta?.paceGap || 0}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">apps vs target by now</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4">
                    <p className="app-kicker">Time left</p>
                    <p className="mt-2 text-2xl font-black text-[var(--text)]">{meta?.daysRemaining || 0} day{meta?.daysRemaining === 1 ? '' : 's'}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">until weekly lock</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4">
                    <p className="app-kicker">Recovery rate</p>
                    <p className="mt-2 text-2xl font-black text-[var(--text)]">{meta?.appsPerDayNeeded || 0}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">apps needed per day</p>
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

                <div className="mt-8 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4">
                    <p className="app-kicker">Your apps</p>
                    <p className="mt-2 text-2xl font-black text-[var(--text)]">{squadData.me?.appsSentThisWeek || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4">
                    <p className="app-kicker">Your fair share left</p>
                    <p className="mt-2 text-2xl font-black text-[var(--text)]">{squadData.me?.fairShareRemaining || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4">
                    <p className="app-kicker">Your daily target</p>
                    <p className="mt-2 text-2xl font-black text-[var(--text)]">{squadData.me?.dailyTargetFromHere || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4">
                    <p className="app-kicker">Squad interviews</p>
                    <p className="mt-2 text-2xl font-black text-[var(--text)]">{squadData.squad.totalInterviews || 0}</p>
                  </div>
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

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                    <p className="app-kicker">{milestone.label}</p>
                    <p className="mt-3 text-3xl font-black text-[var(--text)]">{milestone.appsNeeded}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">apps needed</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">{milestone.description}</p>
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
                    <div key={`${event.type}-${event.createdAt}-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">{event.message}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{event.type.replaceAll('_', ' ')}</p>
                        </div>
                        <p className="text-xs text-[var(--muted)]">{formatDateTime(event.createdAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm text-[var(--muted-strong)]">
                    Squad activity will start appearing here as members join, log output, and ping for recovery.
                  </div>
                )}
              </div>
            </article>
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

              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="app-kicker">Contribution balance meter</p>
                    <h3 className="mt-2 text-xl font-black text-[var(--text)]">{balance?.label || 'Forming rhythm'}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{balance?.description}</p>
                  </div>
                  <div className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-black text-[var(--text)]">
                    {balance?.score || 0}/100
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {squadData.members.map((member, index) => (
                  <div
                    key={member.alias}
                    className={`rounded-2xl border px-4 py-4 transition ${
                      member.isCurrentUser
                        ? 'border-[var(--accent)]/35 bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--panel-soft)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--panel)] text-sm font-black text-[var(--text)]">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-[var(--text)]">
                              {member.alias} {member.isCurrentUser ? '(You)' : ''}
                            </p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                              {member.interviewsThisWeek} interviews this week
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-[var(--text)]">{member.appsSentThisWeek}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{member.sharePercent}% of squad output</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      <span>{member.paceDelta >= 0 ? `Ahead by ${member.paceDelta}` : `${Math.abs(member.paceDelta)} behind pace`}</span>
                      <span>Anonymous momentum trail</span>
                    </div>
                    <TrailDots trail={member.dailyTrail} />
                  </div>
                ))}
              </div>

                <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="app-kicker">Log output</p>
                <div className="mt-3 grid gap-3">
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-[var(--text)]">Company Name</span>
                    <input
                      type="text"
                      value={applicationForm.companyName}
                      onChange={(event) =>
                        setApplicationForm((current) => ({
                          ...current,
                          companyName: event.target.value
                        }))
                      }
                      placeholder="Acme Labs"
                      className="app-input"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-[var(--text)]">Role Title</span>
                    <input
                      type="text"
                      value={applicationForm.roleTitle}
                      onChange={(event) =>
                        setApplicationForm((current) => ({
                          ...current,
                          roleTitle: event.target.value
                        }))
                      }
                      placeholder="Frontend Engineer"
                      className="app-input"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-[var(--text)]">Job Link <span className="text-[var(--muted)]">(optional)</span></span>
                    <input
                      type="url"
                      value={applicationForm.jobUrl}
                      onChange={(event) =>
                        setApplicationForm((current) => ({
                          ...current,
                          jobUrl: event.target.value
                        }))
                      }
                      placeholder="https://company.com/careers/job-id"
                      className="app-input"
                    />
                  </label>
                  <button type="button" onClick={handleLogApps} className="app-button sm:self-start" disabled={loggingApps}>
                    {loggingApps ? 'Updating...' : 'Submit'}
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-semibold text-[var(--warning-text)]">
                  These entries are permanently visible to recruiters on your public profile. Ensure your data is accurate.
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Current squad total</p>
                    <p className="mt-2 text-xl font-black text-[var(--text)]">{squadData.squad.totalApps}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Expected by now</p>
                    <p className="mt-2 text-xl font-black text-[var(--text)]">{meta?.expectedAppsByNow || 0}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--muted-strong)]">
                  Ping is available when teammates fall behind real weekly pace.{' '}
                  {laggingCount
                    ? `${laggingCount} member${laggingCount > 1 ? 's are' : ' is'} currently behind.`
                    : 'Everyone is on pace right now.'}
                </p>
              </div>
            </article>

            <article className="app-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="app-kicker">Ping feedback</p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">Did the nudge create movement?</h2>
                </div>
                <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {pingStatus?.totalPingsThisWeek || 0} pings this week
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="app-kicker">Last ping sent</p>
                  <p className="mt-3 text-lg font-black text-[var(--text)]">
                    {pingStatus?.lastPingAt ? formatDateTime(pingStatus.lastPingAt) : 'No pings yet'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
                    Use this to judge whether nudges are helping or whether the squad needs direct output from the members already in motion.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="app-kicker">Movement after ping</p>
                  <p className="mt-3 text-3xl font-black text-[var(--text)]">{pingStatus?.appsAfterLastPing || 0}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
                    Applications logged after the most recent anonymous nudge. This closes the feedback loop that the old dashboard was missing.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-4xl">
          <article className="app-panel relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(78,222,163,0.2),transparent_38%),linear-gradient(145deg,rgba(78,222,163,0.08),transparent)]" />
            <div className="relative mx-auto max-w-2xl">
              <p className="app-kicker">Anonymous team challenge</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] text-[var(--text)] sm:text-5xl">Join a squad and chase the weekly goal together.</h2>
              <p className="mt-5 text-sm leading-8 text-[var(--muted-strong)] sm:text-base">
                You&apos;ll be placed in a 4-person anonymous squad. Each member gets a random alias, no names, no photos,
                no profiles. The only thing that matters is making progress together toward a shared weekly applications target.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={handleJoinSquad} className="app-button" disabled={joining}>
                  <span className="material-symbols-outlined text-[18px]">group_add</span>
                  {joining ? 'Matching...' : 'Join a squad now'}
                </button>
              </div>
              <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                  <span className="material-symbols-outlined text-[var(--accent-strong)]">visibility_off</span>
                  <p className="mt-2 text-sm font-bold text-[var(--text)]">Fully anonymous</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">Random alias only. No names, avatars, or profiles are ever shared.</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                  <span className="material-symbols-outlined text-[var(--accent-strong)]">flag</span>
                  <p className="mt-2 text-sm font-bold text-[var(--text)]">Shared weekly goal</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">The squad has one combined target. Everyone contributes to a single weekly unlock.</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                  <span className="material-symbols-outlined text-[var(--accent-strong)]">military_tech</span>
                  <p className="mt-2 text-sm font-bold text-[var(--text)]">Earn bonus XP</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">When the squad hits the goal, every member gets Resilience XP automatically.</p>
                </div>
              </div>
            </div>
          </article>
        </section>
      )}
    </AppShell>
  );
}
