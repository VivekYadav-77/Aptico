import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { getSquadLeaderboard } from '../api/squadApi.js';

const REWARD_PREVIEW = {
  1: { label: 'Gold', icon: 'workspace_premium', xp: 300, tone: 'text-amber-300', border: 'border-amber-400/40' },
  2: { label: 'Silver', icon: 'military_tech', xp: 200, tone: 'text-slate-200', border: 'border-slate-300/40' },
  3: { label: 'Bronze', icon: 'emoji_events', xp: 100, tone: 'text-orange-300', border: 'border-orange-400/40' }
};

const BREAKDOWN_LABELS = {
  application: 'Applications',
  weekly_goal: 'Weekly goals',
  signal_drop: 'Signal drops',
  accolade: 'Sparks',
  sticker_drop: 'Stickers',
  quick_signal: 'Quick signals',
  text_message: 'Comms',
  archetype_selected: 'Roles',
  synergy_burst: 'Synergy',
  ping: 'Pings'
};

function getCurrentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function clampPeriod(value) {
  const currentPeriod = getCurrentPeriod();
  return value && value <= currentPeriod ? value : currentPeriod;
}

function formatPeriod(period) {
  if (!period) return 'This month';
  const date = new Date(`${period}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function ReviewBadge({ status }) {
  const copy =
    status === 'published'
      ? 'Rewards published'
      : status === 'partial_review'
        ? 'Some rewards need review'
        : status === 'needs_review'
          ? 'Needs review'
      : status === 'provisional'
        ? 'Pending admin review'
        : 'Live scoring';

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-strong)]">
      <span className="material-symbols-outlined text-[16px]">{status === 'published' ? 'verified' : status === 'provisional' ? 'hourglass_top' : 'bolt'}</span>
      {copy}
    </span>
  );
}

function RewardStatus({ entry }) {
  const status = entry?.rewardStatus || 'live';
  const labels = {
    live: 'Live',
    pending: 'Pending',
    auto_approved: 'Auto-approved',
    needs_review: 'Needs review',
    published: 'Published',
    not_reward_rank: 'No reward'
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
      status === 'published' || status === 'auto_approved'
        ? 'bg-emerald-500/12 text-emerald-300'
        : status === 'needs_review'
          ? 'bg-amber-500/12 text-amber-300'
          : 'bg-[var(--panel)] text-[var(--muted-strong)]'
    }`}>
      {labels[status] || status}
    </span>
  );
}

function RankDelta({ entry }) {
  if (!entry) return null;
  const nextRankDelta = Number(entry.nextRankDelta || 0);
  const previousRankDelta = Number(entry.previousRankDelta || 0);

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted-strong)]">
      {entry.rank > 1 ? <span>{nextRankDelta} behind #{entry.rank - 1}</span> : <span>Top ranked</span>}
      {previousRankDelta ? <span>{previousRankDelta} ahead of #{entry.rank + 1}</span> : null}
    </div>
  );
}

function PodiumCard({ entry, rank }) {
  const reward = REWARD_PREVIEW[rank];
  return (
    <article className={`relative overflow-hidden rounded-3xl border ${reward.border} bg-[var(--panel-soft)] p-6 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${reward.tone}`}>{reward.label} squad</p>
          <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--text)]">{entry?.squadName || 'Awaiting contender'}</h2>
        </div>
        <span className={`material-symbols-outlined text-4xl ${reward.tone}`}>{reward.icon}</span>
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-black text-[var(--text)]">{entry?.qualityScore || 0}</p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-strong)]">quality score</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-[var(--text)]">+{reward.xp} XP</p>
          <p className="text-xs text-[var(--muted-strong)]">profile sticker</p>
        </div>
      </div>
    </article>
  );
}

function Breakdown({ breakdown = {} }) {
  const rows = Object.entries(breakdown)
    .map(([key, value]) => ({
      key,
      label: BREAKDOWN_LABELS[key] || key.replace(/_/g, ' '),
      points: Number(value?.eligiblePoints || 0),
      count: Number(value?.count || 0)
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 4);

  if (!rows.length) {
    return <p className="text-sm text-[var(--muted-strong)]">No score events yet.</p>;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {rows.map((item) => (
        <span key={item.key} className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs font-bold text-[var(--muted-strong)]">
          {item.label}: {item.points}
        </span>
      ))}
    </div>
  );
}

export default function SquadLeaderboardPage() {
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadLeaderboard() {
      setLoading(true);
      setError('');
      try {
        const leaderboardResponse = await getSquadLeaderboard({ period, limit: 50 });

        if (!isActive) return;
        setLeaderboard(leaderboardResponse.data || null);
      } catch (apiError) {
        if (isActive) {
          setError(apiError.response?.data?.error || 'Could not load the squad leaderboard.');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadLeaderboard();
    return () => {
      isActive = false;
    };
  }, [period]);

  const entries = leaderboard?.entries || [];
  const podium = useMemo(() => leaderboard?.podium?.length ? leaderboard.podium : [entries[0], entries[1], entries[2]], [entries, leaderboard?.podium]);
  const myRank = leaderboard?.myRank || null;
  const shouldPinMyRank = myRank && !entries.some((entry) => entry.squadId === myRank.squadId);
  const currentPeriod = getCurrentPeriod();

  return (
    <AppShell
      title="Squad Leaderboard"
      description="Monthly squad rankings use quality-weighted points, caps, and admin-reviewed rewards."
      actions={
        <label className="flex items-center gap-2 text-sm font-bold text-[var(--muted-strong)]">
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          <input
            type="month"
            value={period}
            max={currentPeriod}
            onChange={(event) => setPeriod(clampPeriod(event.target.value))}
            className="app-input h-10 w-40"
          />
        </label>
      }
    >
      {error ? <div className="mb-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-bold text-rose-300">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div className="space-y-6">
          <article className="app-panel">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="app-kicker">Monthly race</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--text)]">{formatPeriod(period)}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-strong)]">
                  Valid applications carry the most weight. Comms, sparks, pings, roles, and synergy help only within capped, auditable limits.
                </p>
              </div>
              <ReviewBadge status={leaderboard?.reviewStatus || 'active'} />
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {podium.map((entry, index) => (
                <PodiumCard key={entry?.squadId || `empty-${index}`} entry={entry} rank={index + 1} />
              ))}
            </div>
          </article>

          <article className="app-panel">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="app-kicker">Rankings</p>
                <h2 className="mt-3 text-2xl font-black text-[var(--text)]">Quality score table</h2>
              </div>
              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)]">
                {leaderboard?.totalSquads || entries.length} squads
              </span>
            </div>

            {shouldPinMyRank ? (
              <article className="mt-6 rounded-3xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Your squad position</p>
                    <h3 className="mt-2 text-lg font-black text-[var(--text)]">#{myRank.rank} {myRank.squadName}</h3>
                    <RankDelta entry={myRank} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RewardStatus entry={myRank} />
                    <span className="app-chip">{myRank.qualityScore} score</span>
                  </div>
                </div>
              </article>
            ) : null}

            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 text-center text-sm text-[var(--muted-strong)]">Loading leaderboard...</div>
              ) : entries.length ? (
                entries.map((entry) => (
                  <article key={entry.squadId} className={`rounded-3xl border p-5 ${entry.isCurrentUserSquad ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--panel-soft)]'}`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--panel)] text-lg font-black text-[var(--text)]">{entry.rank}</span>
                          <div>
                            <h3 className="text-lg font-black text-[var(--text)]">
                              {entry.squadName} {entry.isCurrentUserSquad ? <span className="ml-2 text-xs text-[var(--accent-strong)]">Your squad</span> : null}
                            </h3>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)]">
                              {entry.activeMemberCount} active members - {entry.suspiciousEventCount} flags
                            </p>
                          </div>
                        </div>
                        <RankDelta entry={entry} />
                        <Breakdown breakdown={entry.breakdown} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[420px]">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
                          <p className="text-xl font-black text-[var(--text)]">{entry.eligiblePoints}</p>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)]">eligible</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
                          <p className="text-xl font-black text-rose-300">-{entry.spamPenalty}</p>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)]">penalty</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
                          <p className="text-xl font-black text-[var(--accent-strong)]">{entry.qualityScore}</p>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)]">score</p>
                        </div>
                        <div className="col-span-3 flex justify-end">
                          <RewardStatus entry={entry} />
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-8 text-center text-sm text-[var(--muted-strong)]">
                  No squad score events for this month yet.
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="space-y-6">
          <article className="app-panel">
            <p className="app-kicker">Your squad</p>
            {myRank ? (
              <>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-[var(--text)]">{myRank.squadName}</h2>
                    <p className="mt-1 text-sm text-[var(--muted-strong)]">Current monthly rank</p>
                  </div>
                  <span className="text-5xl font-black text-[var(--accent-strong)]">#{myRank.rank}</span>
                </div>
                <RankDelta entry={myRank} />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                    <p className="text-2xl font-black text-[var(--text)]">{myRank.qualityScore}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)]">score</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                    <p className="text-2xl font-black text-[var(--text)]">{myRank.activeMemberCount}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)]">active</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm leading-7 text-[var(--muted-strong)]">Join a squad and log valid activity to appear in the monthly rankings.</p>
            )}
          </article>

          <article className="app-panel">
            <p className="app-kicker">Reward preview</p>
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((rank) => {
                const reward = REWARD_PREVIEW[rank];
                return (
                  <div key={rank} className={`rounded-2xl border ${reward.border} bg-[var(--panel-soft)] p-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-2xl ${reward.tone}`}>{reward.icon}</span>
                        <div>
                          <p className="font-black text-[var(--text)]">Rank {rank} - {reward.label}</p>
                          <p className="text-xs text-[var(--muted-strong)]">Sticker, title, +{reward.xp} XP</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
