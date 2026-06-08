import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { getSquadLeaderboard, getSquadRewardHistory } from '../api/squadApi.js';

const REWARD_PREVIEW = {
  1: {
    label: 'Gold',
    title: 'Apex Crown',
    icon: 'workspace_premium',
    xp: 300,
    tone: 'text-amber-300',
    bar: 'bg-amber-300',
    border: 'border-amber-400/45',
    soft: 'bg-amber-400/10'
  },
  2: {
    label: 'Silver',
    title: 'Silver Surge',
    icon: 'military_tech',
    xp: 200,
    tone: 'text-slate-200',
    bar: 'bg-slate-200',
    border: 'border-slate-300/45',
    soft: 'bg-slate-300/10'
  },
  3: {
    label: 'Bronze',
    title: 'Bronze Spark',
    icon: 'emoji_events',
    xp: 100,
    tone: 'text-orange-300',
    bar: 'bg-orange-300',
    border: 'border-orange-400/45',
    soft: 'bg-orange-400/10'
  }
};

const BREAKDOWN_LABELS = {
  application: 'Applications',
  weekly_goal: 'Weekly goals',
  signal_drop: 'Signals',
  accolade: 'Sparks',
  sticker_drop: 'Stickers',
  quick_signal: 'Quick signals',
  text_message: 'Comms',
  archetype_selected: 'Roles',
  synergy_burst: 'Synergy',
  ping: 'Pings'
};

const REVIEW_LABELS = {
  published: { label: 'Rewards published', icon: 'verified', tone: 'text-emerald-300' },
  partial_review: { label: 'Some rewards need review', icon: 'rule', tone: 'text-amber-300' },
  needs_review: { label: 'Needs integrity review', icon: 'policy', tone: 'text-amber-300' },
  provisional: { label: 'Pending review', icon: 'hourglass_top', tone: 'text-sky-300' },
  active: { label: 'Live scoring', icon: 'bolt', tone: 'text-[var(--accent-strong)]' }
};

const STATUS_LABELS = {
  live: 'Live',
  pending: 'Pending',
  auto_approved: 'Auto-approved',
  needs_review: 'Needs review',
  published: 'Published',
  not_reward_rank: 'No reward'
};

function getCurrentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function getPreviousPeriod(period) {
  const safePeriod = period || getCurrentPeriod();
  const date = new Date(`${safePeriod}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
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

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function getTopBreakdown(breakdown = {}, limit = 4) {
  return Object.entries(breakdown)
    .map(([key, value]) => ({
      key,
      label: BREAKDOWN_LABELS[key] || key.replace(/_/g, ' '),
      points: toNumber(value?.eligiblePoints),
      count: toNumber(value?.count)
    }))
    .filter((item) => item.count > 0 || item.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

function ReviewBadge({ status }) {
  const state = REVIEW_LABELS[status] || REVIEW_LABELS.active;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted-strong)]">
      <span className={`material-symbols-outlined text-[16px] ${state.tone}`}>{state.icon}</span>
      {state.label}
    </span>
  );
}

function RewardStatus({ entry }) {
  const status = entry?.rewardStatus || 'live';
  const tone =
    status === 'published' || status === 'auto_approved'
      ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-300'
      : status === 'needs_review'
        ? 'border-amber-400/30 bg-amber-500/12 text-amber-300'
        : status === 'pending'
          ? 'border-sky-400/30 bg-sky-500/12 text-sky-300'
          : 'border-[var(--border)] bg-[var(--panel)] text-[var(--muted-strong)]';

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${tone}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function RankDelta({ entry, compact = false }) {
  if (!entry) return null;
  const nextRankDelta = toNumber(entry.nextRankDelta);
  const previousRankDelta = toNumber(entry.previousRankDelta);

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'text-[11px]' : 'text-xs'} font-bold text-[var(--muted-strong)]`}>
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1">
        <span className="material-symbols-outlined text-[14px]">{entry.rank > 1 ? 'north' : 'workspace_premium'}</span>
        {entry.rank > 1 ? `${nextRankDelta} behind #${entry.rank - 1}` : 'Top ranked'}
      </span>
      {previousRankDelta ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1">
          <span className="material-symbols-outlined text-[14px]">south</span>
          {previousRankDelta} ahead of #{entry.rank + 1}
        </span>
      ) : null}
    </div>
  );
}

function ScoreBar({ value, max, tone = 'bg-[var(--accent)]', label = 'Score', delay = 0 }) {
  const safeMax = Math.max(1, toNumber(max));
  const width = Math.max(4, Math.min(100, Math.round((toNumber(value) / safeMax) * 100)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--muted-strong)]">
        <span>{label}</span>
        <span>{toNumber(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--panel)]">
        <div
          className={`h-full rounded-full ${tone} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
          style={{ width: `${width}%`, transitionDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}

function BreakdownChips({ breakdown = {}, maxScore = 1 }) {
  const rows = getTopBreakdown(breakdown);
  if (!rows.length) {
    return <p className="text-sm text-[var(--muted-strong)]">No score events yet.</p>;
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map((item) => (
        <div key={item.key} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
          <ScoreBar value={item.points} max={maxScore} label={item.label} tone="bg-[var(--accent)]" />
        </div>
      ))}
    </div>
  );
}

function LeaderboardHero({ leaderboard, myRank, period, currentPeriod, onPeriodChange }) {
  const totalSquads = toNumber(leaderboard?.totalSquads || leaderboard?.entries?.length);
  const visibleSquads = toNumber(leaderboard?.entries?.length);
  const publishedCount = toNumber(leaderboard?.autoFinalize?.publishedCount);
  const needsReviewCount = toNumber(leaderboard?.autoFinalize?.needsReviewCount);

  const stats = [
    { label: 'Ranked squads', value: totalSquads || visibleSquads || '0', icon: 'groups' },
    { label: 'Visible table', value: visibleSquads || '0', icon: 'leaderboard' },
    { label: 'Your rank', value: myRank ? `#${myRank.rank}` : '-', icon: 'person_pin_circle' },
    { label: 'Reward state', value: needsReviewCount ? `${needsReviewCount} review` : publishedCount ? `${publishedCount} published` : 'Live', icon: 'verified' }
  ];

  return (
    <section className="app-panel animate-fade-in-up overflow-hidden">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr] xl:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="app-kicker">Monthly squad race</p>
            <ReviewBadge status={leaderboard?.reviewStatus || 'active'} />
          </div>
          <h2 className="mt-4 text-3xl font-black text-[var(--text)] sm:text-4xl">{formatPeriod(period)}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-strong)]">
            A recruiter-friendly leaderboard where rank is earned through quality-weighted activity, visible proof signals, capped low-proof actions, and integrity review.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm font-bold text-[var(--muted-strong)]">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <input
              type="month"
              value={period}
              max={currentPeriod}
              onChange={(event) => onPeriodChange(clampPeriod(event.target.value))}
              className="app-input h-10 w-full min-w-36 sm:w-40"
            />
          </label>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted-strong)]">Reward places</p>
            <p className="mt-1 text-sm font-black text-[var(--text)]">Top 3 only</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.label} className={`rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 ${index === 0 ? 'animate-fade-in-up' : `animate-fade-in-up-delay-${Math.min(index, 3)}`}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted-strong)]">{stat.label}</p>
              <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">{stat.icon}</span>
            </div>
            <p className="mt-3 text-2xl font-black text-[var(--text)]">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PodiumCard({ entry, rank, maxScore }) {
  const reward = REWARD_PREVIEW[rank];
  const isGold = rank === 1;

  return (
    <article
      className={`relative flex min-h-64 flex-col justify-between overflow-hidden rounded-xl border ${reward.border} ${reward.soft} p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${isGold ? 'lg:-mt-6 lg:min-h-72' : 'lg:mt-8'} animate-fade-in-up`}
    >
      <div className="absolute right-4 top-4 text-7xl font-black text-[var(--text)] opacity-[0.03]">#{rank}</div>
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${reward.border} bg-[var(--panel)]`}>
            <span className={`material-symbols-outlined text-3xl ${reward.tone}`}>{reward.icon}</span>
          </span>
          <p className={`mt-4 text-xs font-black uppercase tracking-[0.18em] ${reward.tone}`}>{reward.title}</p>
          <h3 className="mt-2 text-xl font-black text-[var(--text)]">{entry?.squadName || 'Awaiting contender'}</h3>
        </div>
        <RewardStatus entry={entry} />
      </div>

      <div className="relative mt-8 space-y-4">
        <ScoreBar value={entry?.qualityScore || 0} max={maxScore} label="Quality score" tone={reward.bar} delay={rank * 80} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-3xl font-black text-[var(--text)]">{entry?.qualityScore || 0}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-strong)]">score</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-[var(--text)]">+{reward.xp} XP</p>
            <p className="text-xs text-[var(--muted-strong)]">title + sticker</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function PodiumStage({ podium, maxScore }) {
  const displayOrder = [2, 1, 3];
  const byRank = new Map(podium.map((entry, index) => [entry?.rank || index + 1, entry]));

  return (
    <section className="app-panel animate-fade-in-up-delay-1">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="app-kicker">Reward podium</p>
          <h2 className="mt-3 text-2xl font-black text-[var(--text)]">Top squads this month</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[var(--muted-strong)]">
          Only the top three receive digital rewards. Suspicious winners can be held for review before rewards publish.
        </p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3 lg:items-end">
        {displayOrder.map((rank) => (
          <PodiumCard key={rank} entry={byRank.get(rank)} rank={rank} maxScore={maxScore} />
        ))}
      </div>
    </section>
  );
}

function PreviousWinnersPanel({ leaderboard, period }) {
  const winners = (leaderboard?.podium || []).filter((entry) => entry?.reward && entry.rank <= 3);

  return (
    <section className="app-panel animate-fade-in-up-delay-1">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-kicker">Earned history</p>
          <h2 className="mt-3 text-2xl font-black text-[var(--text)]">Previous winners</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
            Past winners keep their sticker, title, and XP. The new month starts fresh, so current ranks are live contenders until month end.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted-strong)]">
          <span className="material-symbols-outlined text-[15px] text-[var(--accent-strong)]">history</span>
          {period ? formatPeriod(period) : 'Previous month'}
        </span>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {[1, 2, 3].map((rank) => {
          const reward = REWARD_PREVIEW[rank];
          const winner = winners.find((entry) => entry.rank === rank);
          return (
            <article key={rank} className={`rounded-xl border ${reward.border} ${reward.soft} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-xs font-black uppercase tracking-[0.14em] ${reward.tone}`}>{reward.title}</p>
                  <h3 className="mt-2 truncate text-lg font-black text-[var(--text)]">{winner?.squadName || 'No published winner'}</h3>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">
                    {winner ? `Rank #${rank} - ${winner.qualityScore} score` : 'Rewards appear after month-end approval.'}
                  </p>
                </div>
                <span className={`material-symbols-outlined text-3xl ${reward.tone}`}>{reward.icon}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RankRow({ entry, maxScore, index, onHistory }) {
  const integrityTone = entry.suspiciousEventCount ? 'text-amber-300' : 'text-emerald-300';

  return (
    <article
      className={`group rounded-xl border p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-lg focus-within:border-[var(--accent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        entry.isCurrentUserSquad
          ? 'animate-pulse border-[var(--accent)]/60 bg-[var(--accent)]/10 motion-reduce:animate-none'
          : 'border-[var(--border)] bg-[var(--panel-soft)]'
      }`}
      style={{ animationDuration: entry.isCurrentUserSquad ? '1.4s' : undefined, animationIterationCount: entry.isCurrentUserSquad ? 1 : undefined }}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.52fr)] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-lg font-black text-[var(--text)]">
              {entry.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 max-w-full truncate text-lg font-black text-[var(--text)]">{entry.squadName}</h3>
                {entry.isCurrentUserSquad ? <span className="app-chip">Your squad</span> : null}
                {entry.isRewardRank ? <span className="app-chip">Reward rank</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--muted-strong)]">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">groups</span>
                  {entry.activeMemberCount} active members
                </span>
                <span className={`inline-flex items-center gap-1 ${integrityTone}`}>
                  <span className="material-symbols-outlined text-[14px]">{entry.suspiciousEventCount ? 'policy' : 'verified_user'}</span>
                  {entry.suspiciousEventCount} integrity flags
                </span>
                {entry.reviewReason ? <span className="text-amber-300">{entry.reviewReason.replace(/_/g, ' ')}</span> : null}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <RankDelta entry={entry} compact />
          </div>
        </div>

        <div className="space-y-3">
          <ScoreBar value={entry.qualityScore} max={maxScore} label="Quality score" delay={index * 30} />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
              <p className="text-lg font-black text-[var(--text)]">{entry.eligiblePoints}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-strong)]">eligible</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
              <p className="text-lg font-black text-rose-300">-{entry.spamPenalty}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-strong)]">penalty</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
              <p className="text-lg font-black text-[var(--accent-strong)]">{entry.qualityScore}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-strong)]">score</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <RewardStatus entry={entry} />
            <button type="button" onClick={() => onHistory?.(entry)} className="app-button-secondary !px-3 !py-1.5 text-xs">
              <span className="material-symbols-outlined text-[15px]">history</span>
              History
            </button>
          </div>
        </div>
      </div>

      <BreakdownChips breakdown={entry.breakdown} maxScore={Math.max(1, entry.eligiblePoints)} />
    </article>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl skeleton-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded-full skeleton-shimmer" />
              <div className="h-3 w-1/3 rounded-full skeleton-shimmer" />
            </div>
          </div>
          <div className="mt-4 h-2.5 rounded-full skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-8 text-center">
      <span className="material-symbols-outlined text-5xl text-[var(--muted)]">leaderboard</span>
      <h3 className="mt-4 text-xl font-black text-[var(--text)]">No squad score events yet</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted-strong)]">
        Squads will appear here when members log eligible activity. Rewards remain visible so everyone knows what the monthly race is aiming for.
      </p>
    </div>
  );
}

function MySquadPanel({ myRank }) {
  return (
    <article className="app-panel">
      <p className="app-kicker">Your squad</p>
      {myRank ? (
        <>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-[var(--text)]">{myRank.squadName}</h2>
              <p className="mt-1 text-sm text-[var(--muted-strong)]">Current monthly rank</p>
            </div>
            <span className="text-5xl font-black text-[var(--accent-strong)]">#{myRank.rank}</span>
          </div>
          <div className="mt-4">
            <RankDelta entry={myRank} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
              <p className="text-2xl font-black text-[var(--text)]">{myRank.qualityScore}</p>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-strong)]">score</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
              <p className="text-2xl font-black text-[var(--text)]">{myRank.activeMemberCount}</p>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-strong)]">active</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <RewardStatus entry={myRank} />
            <span className="app-chip">{myRank.suspiciousEventCount} integrity flags</span>
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm leading-7 text-[var(--muted-strong)]">Join a squad and log valid activity to appear in the monthly rankings.</p>
      )}
    </article>
  );
}

function RewardPreviewPanel() {
  return (
    <article className="app-panel">
      <p className="app-kicker">Reward preview</p>
      <div className="mt-5 space-y-3">
        {[1, 2, 3].map((rank) => {
          const reward = REWARD_PREVIEW[rank];
          return (
            <div key={rank} className={`rounded-xl border ${reward.border} ${reward.soft} p-4`}>
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-2xl ${reward.tone}`}>{reward.icon}</span>
                <div>
                  <p className="font-black text-[var(--text)]">{reward.title}</p>
                  <p className="text-xs text-[var(--muted-strong)]">Sticker, title, +{reward.xp} XP</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function TrustPanel() {
  const points = [
    ['speed', 'Quality-weighted score', 'Rank uses eligible points after penalties, not raw activity volume.'],
    ['lock_clock', 'Capped low-proof actions', 'Light signals and messages help only within daily or weekly limits.'],
    ['policy', 'Integrity flags', 'Suspicious events reduce score and can hold rewards for review.'],
    ['verified', 'Digital rewards', 'Top-three rewards publish only when the winner is clean or approved.'],
    ['calendar_month', 'Consistent claims', 'Members claim rewards through clean monthly contribution, not one-day bursts.']
  ];

  return (
    <article className="app-panel">
      <p className="app-kicker">Quality scoring</p>
      <h2 className="mt-3 text-xl font-black text-[var(--text)]">Credible signals for recruiters</h2>
      <div className="mt-5 space-y-4">
        {points.map(([icon, title, copy]) => (
          <div key={title} className="flex gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[20px] text-[var(--accent-strong)]">{icon}</span>
            <div>
              <p className="font-black text-[var(--text)]">{title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">{copy}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function PinnedMyRank({ myRank }) {
  if (!myRank) return null;
  return (
    <article className="mb-5 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Your squad position</p>
          <h3 className="mt-2 text-lg font-black text-[var(--text)]">#{myRank.rank} {myRank.squadName}</h3>
          <div className="mt-3">
            <RankDelta entry={myRank} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RewardStatus entry={myRank} />
          <span className="app-chip">{myRank.qualityScore} score</span>
        </div>
      </div>
    </article>
  );
}

function SquadHistoryModal({ history, loading, error, onClose }) {
  if (!history && !loading && !error) return null;
  const latest = history?.latest || history?.entries?.[0] || null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="app-kicker">Squad history</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--text)]">{history?.squadName || 'Squad performance'}</h2>
          </div>
          <button type="button" onClick={onClose} className="app-button-secondary !h-10 !w-10 !p-0" aria-label="Close squad history">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-20 rounded-xl skeleton-shimmer" />)}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm font-bold text-rose-300">{error}</div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                <p className="text-2xl font-black text-[var(--text)]">{history?.bestRank ? `#${history.bestRank}` : '-'}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-strong)]">best finish</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                <p className="text-2xl font-black text-[var(--text)]">{history?.podiumFinishes || 0}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-strong)]">podiums</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                <p className="text-2xl font-black text-[var(--text)]">{history?.rewardWins || 0}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-strong)]">rewards</p>
              </div>
            </div>

            {latest ? (
              <div className="mt-4 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Latest monthly performance</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-black text-[var(--text)]">{formatPeriod(latest.period)} - Rank #{latest.rank || '-'}</p>
                    <p className="mt-1 text-sm font-bold text-[var(--muted-strong)]">
                      {latest.qualityScore} quality score - {latest.activeMemberCount} active members
                    </p>
                  </div>
                  {latest.reward ? (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                      <span className="material-symbols-outlined text-[15px]">verified</span>
                      Reward published
                    </span>
                  ) : (
                    <span className="app-chip">{latest.reviewStatus ? latest.reviewStatus.replace(/_/g, ' ') : 'No reward'}</span>
                  )}
                </div>
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {(history?.entries || []).length ? history.entries.map((entry) => (
                <div key={`${entry.period}-${entry.rank}`} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-[var(--text)]">{formatPeriod(entry.period)} · Rank #{entry.rank || '-'}</p>
                      <p className="mt-1 text-xs font-bold text-[var(--muted-strong)]">{entry.qualityScore} score · {entry.activeMemberCount} active members · {entry.suspiciousEventCount} integrity flags</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--muted-strong)]">Reward status: {entry.reward ? 'Published' : (entry.reviewStatus || 'No reward').replace(/_/g, ' ')}</p>
                    </div>
                    {entry.reward ? (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        {entry.reward.title}
                      </span>
                    ) : (
                      <span className="app-chip">No reward</span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 text-center text-sm font-bold text-[var(--muted-strong)]">
                  No monthly history has been cached for this squad yet.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SquadLeaderboardPage() {
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [leaderboard, setLeaderboard] = useState(null);
  const [previousLeaderboard, setPreviousLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyState, setHistoryState] = useState({ loading: false, error: '', data: null });
  const currentPeriod = getCurrentPeriod();

  async function openSquadHistory(entry) {
    if (!entry?.squadId) return;
    setHistoryState({ loading: true, error: '', data: { squadName: entry.squadName, entries: [] } });
    try {
      const response = await getSquadRewardHistory(entry.squadId, { limit: 12 });
      setHistoryState({ loading: false, error: '', data: response.data || null });
    } catch (apiError) {
      setHistoryState({
        loading: false,
        error: apiError.response?.data?.error || 'Could not load squad history.',
        data: { squadName: entry.squadName, entries: [] }
      });
    }
  }

  async function loadLeaderboard() {
    setLoading(true);
    setError('');
    try {
      const previousPeriod = getPreviousPeriod(period);
      const [leaderboardResponse, previousResponse] = await Promise.all([
        getSquadLeaderboard({ period, limit: 50 }),
        previousPeriod ? getSquadLeaderboard({ period: previousPeriod, limit: 3 }).catch(() => ({ data: null })) : Promise.resolve({ data: null })
      ]);
      setLeaderboard(leaderboardResponse.data || null);
      setPreviousLeaderboard(previousResponse.data || null);
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Could not load the squad leaderboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const previousPeriod = getPreviousPeriod(period);
        const [leaderboardResponse, previousResponse] = await Promise.all([
          getSquadLeaderboard({ period, limit: 50 }),
          previousPeriod ? getSquadLeaderboard({ period: previousPeriod, limit: 3 }).catch(() => ({ data: null })) : Promise.resolve({ data: null })
        ]);
        if (!isActive) return;
        setLeaderboard(leaderboardResponse.data || null);
        setPreviousLeaderboard(previousResponse.data || null);
      } catch (apiError) {
        if (isActive) {
          setError(apiError.response?.data?.error || 'Could not load the squad leaderboard.');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, [period]);

  const entries = leaderboard?.entries || [];
  const podium = useMemo(() => (leaderboard?.podium?.length ? leaderboard.podium : [entries[0], entries[1], entries[2]].filter(Boolean)), [entries, leaderboard?.podium]);
  const myRank = leaderboard?.myRank || null;
  const shouldPinMyRank = myRank && !entries.some((entry) => entry.squadId === myRank.squadId);
  const maxScore = Math.max(1, ...entries.map((entry) => toNumber(entry.qualityScore)), ...podium.map((entry) => toNumber(entry?.qualityScore)));

  return (
    <AppShell
      title="Squad Leaderboard"
      description="Monthly squad rankings use quality-weighted points, caps, and integrity-aware rewards."
    >
      <div className="space-y-6">
        <LeaderboardHero leaderboard={leaderboard} myRank={myRank} period={period} currentPeriod={currentPeriod} onPeriodChange={setPeriod} />
        <PreviousWinnersPanel leaderboard={previousLeaderboard} period={getPreviousPeriod(period)} />

        {error ? (
          <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-rose-300">{error}</p>
              <button type="button" onClick={loadLeaderboard} className="app-button-secondary px-4 py-2 text-sm">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Retry
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <div className="xl:hidden">
              <MySquadPanel myRank={myRank} />
            </div>

            <PodiumStage podium={podium} maxScore={maxScore} />

            <section className="app-panel animate-fade-in-up-delay-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="app-kicker">Rankings</p>
                  <h2 className="mt-3 text-2xl font-black text-[var(--text)]">Quality score table</h2>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-strong)]">
                  <span className="material-symbols-outlined text-[15px]">table_rows</span>
                  {leaderboard?.totalSquads || entries.length} squads
                </span>
              </div>

              <div className="mt-6">
                {shouldPinMyRank ? <PinnedMyRank myRank={myRank} /> : null}
                {loading ? (
                  <LeaderboardSkeleton />
                ) : entries.length ? (
                  <div className="space-y-3">
                    {entries.map((entry, index) => (
                      <RankRow key={entry.squadId} entry={entry} maxScore={maxScore} index={index} onHistory={openSquadHistory} />
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>
            </section>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <div className="hidden xl:block">
              <MySquadPanel myRank={myRank} />
            </div>
            <RewardPreviewPanel />
            <TrustPanel />
          </aside>
        </div>
      </div>
      <SquadHistoryModal
        history={historyState.data}
        loading={historyState.loading}
        error={historyState.error}
        onClose={() => setHistoryState({ loading: false, error: '', data: null })}
      />
    </AppShell>
  );
}
