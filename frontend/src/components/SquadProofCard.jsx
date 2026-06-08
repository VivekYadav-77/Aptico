import { useState } from 'react';
import { Link } from '@/lib/router-compat.jsx';
import { getSquadRewardHistory } from '../api/squadApi.js';

function formatRank(rank) {
  return rank ? `#${rank}` : '-';
}

function formatScore(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString() : '0';
}

function formatPeriod(value) {
  if (!value) return 'Monthly history';
  const date = new Date(`${value}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildClaimedHistoryFallback(history = [], { currentSquad = 'Winning squad', squadId = '', currentRank = null } = {}) {
  const entries = (history || [])
    .filter((item) => item?.period && item?.rank)
    .map((item) => ({
      squadId: item.squadId || '',
      squadName: item.squadName || currentSquad,
      period: item.period,
      rank: Number(item.rank || 0),
      qualityScore: null,
      reviewStatus: 'verified',
      reward: {
        rank: Number(item.rank || 0),
        stickerId: item.stickerId || '',
        title: item.title || 'Monthly Squad Reward',
        xpBonus: Number(item.xpBonus || 0),
        approvedAt: item.claimedAt || '',
        mode: 'claimed'
      }
    }));
  const hasCurrentPeriod = entries.some((entry) => entry.period === getCurrentPeriod());

  if (currentRank && !hasCurrentPeriod) {
    entries.unshift({
      squadId,
      squadName: currentSquad,
      period: getCurrentPeriod(),
      rank: Number(currentRank),
      qualityScore: null,
      reviewStatus: 'live',
      reward: null
    });
  }

  return {
    squadId: entries[0]?.squadId || squadId,
    squadName: entries[0]?.squadName || currentSquad,
    bestRank: entries.length ? Math.min(...entries.map((entry) => entry.rank || 999)) : null,
    podiumFinishes: entries.filter((entry) => entry.rank > 0 && entry.rank <= 3).length,
    rewardWins: entries.filter((entry) => entry.reward).length,
    latest: entries[0] || null,
    entries
  };
}

export default function SquadProofCard({ summary = null, history = [] }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyState, setHistoryState] = useState({ loading: false, error: '', data: null });
  const latest = summary?.latest || history?.[0] || null;
  const totalClaimed = Number(summary?.totalClaimed || history?.length || 0);
  const bestRank = summary?.bestRank || (history?.length ? Math.min(...history.map((item) => Number(item.rank || 99))) : null);
  const currentSquad = summary?.currentSquad || latest?.squadName || 'No active squad yet';
  const squadId = summary?.currentSquadId || latest?.squadId || null;
  const currentRank = summary?.currentSquadRank || null;
  const statusTitle = latest
    ? `${latest.title} earned`
    : currentRank
      ? `Live at ${formatRank(currentRank)}`
      : 'Building monthly proof';
  const statusCopy = latest
    ? `Rank #${latest.rank} monthly squad. Earned ${latest.periodLabel || latest.period} with ${latest.squadName}.`
    : currentRank
      ? `${currentSquad} is currently placed ${formatRank(currentRank)} on the monthly leaderboard. Claimable rewards appear here after verified month-end results.`
      : 'This squad has not claimed a monthly reward yet. Live rank and proof history update from leaderboard activity.';
  const metrics = [
    { label: 'Current squad', value: currentSquad, icon: 'groups' },
    { label: 'Current rank', value: formatRank(currentRank), icon: 'leaderboard' },
    { label: 'Best finish', value: formatRank(bestRank), icon: 'military_tech' },
    { label: 'Claimed rewards', value: String(totalClaimed), icon: 'verified' }
  ];

  if (!totalClaimed && !summary?.currentSquad) {
    return null;
  }

  async function openHistory() {
    setHistoryOpen(true);
    const fallback = buildClaimedHistoryFallback(history, { currentSquad, squadId, currentRank });
    if (!squadId) {
      setHistoryState({ loading: false, error: '', data: fallback });
      return;
    }
    if (historyState.data || historyState.loading) return;
    setHistoryState({ loading: true, error: '', data: null });
    try {
      const response = await getSquadRewardHistory(squadId, { limit: 12 });
      const apiHistory = response?.data || response || null;
      const mergedHistory = apiHistory?.entries?.length ? apiHistory : fallback;
      setHistoryState({ loading: false, error: '', data: mergedHistory });
    } catch (error) {
      if (fallback.entries.length) {
        setHistoryState({ loading: false, error: '', data: fallback });
      } else {
        setHistoryState({
          loading: false,
          error: error?.response?.data?.message || error?.message || 'Could not load squad history.',
          data: null
        });
      }
    }
  }

  const historyEntries = historyState.data?.entries || [];

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-4 backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Squad Performance</p>
              <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-400">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                Verified
              </span>
            </div>
            <h3 className="mt-2 text-base font-black leading-snug text-[var(--text)]">Verified squad contribution</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted-strong)]">
              Verified squad participation, leaderboard position, and monthly reward history.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)]/65 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="material-symbols-outlined flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[17px] text-[var(--accent-strong)]">
                  {metric.icon}
                </span>
                <p className="min-w-0 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">{metric.label}</p>
              </div>
              <p className="min-w-0 max-w-[58%] truncate text-right text-sm font-black leading-5 text-[var(--text)]" title={metric.value}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div className={`rounded-xl border p-4 ${latest ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-[var(--border)] bg-[var(--panel)]/55'}`}>
            <p className="text-sm font-black leading-5 text-[var(--text)]">{statusTitle}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
              {statusCopy} Verified through clean monthly contribution.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Link
              to="/squad-leaderboard"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)] px-4 py-3 text-sm font-black text-[var(--accent-contrast)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">leaderboard</span>
              View Leaderboard
            </Link>
            <button
              type="button"
              onClick={openHistory}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm font-black text-[var(--text)] shadow-sm transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--panel-soft)]"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              View History
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-[var(--muted-strong)]">
          Awarded for consistent, clean contribution to a top monthly squad. Private scoring rules and integrity checks stay protected.
        </p>
      </section>

      {historyOpen ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" onClick={() => setHistoryOpen(false)}>
          <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Squad History</p>
                <h3 className="mt-1 text-xl font-black text-[var(--text)]">{currentSquad}</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">Monthly rank history, podium finishes, and reward status.</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted-strong)] transition-colors hover:text-[var(--text)]"
                aria-label="Close squad history"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="max-h-[calc(86vh-110px)] overflow-y-auto p-5">
              {historyState.loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]" />
                  ))}
                </div>
              ) : historyState.error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
                  {historyState.error}
                </div>
              ) : historyEntries.length ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/60 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Best finish</p>
                      <p className="mt-2 text-2xl font-black text-[var(--text)]">{formatRank(historyState.data?.bestRank)}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/60 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Podiums</p>
                      <p className="mt-2 text-2xl font-black text-[var(--text)]">{historyState.data?.podiumFinishes || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/60 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Reward wins</p>
                      <p className="mt-2 text-2xl font-black text-[var(--text)]">{historyState.data?.rewardWins || 0}</p>
                    </div>
                  </div>

                  {historyEntries.map((entry) => (
                    <div key={`${entry.period}-${entry.rank}`} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/45 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-[var(--text)]">{formatPeriod(entry.period)}</p>
                          <p className="mt-1 text-xs font-bold text-[var(--muted-strong)]">
                            Rank {formatRank(entry.rank)}
                            {entry.reviewStatus === 'live'
                              ? ' - live monthly placement'
                              : entry.qualityScore == null
                                ? ' - verified monthly proof'
                                : ` - ${formatScore(entry.qualityScore)} quality score`}
                          </p>
                        </div>
                        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${entry.reward ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400' : 'border-[var(--border)] bg-[var(--panel)] text-[var(--muted-strong)]'}`}>
                          {entry.reward ? 'Rewarded' : entry.reviewStatus === 'live' ? 'Live' : entry.reviewStatus || 'No reward'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/50 p-8 text-center">
                  <p className="text-sm font-black text-[var(--text)]">No completed squad history yet</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">
                    Monthly finishes will appear here after leaderboard periods are scored.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
