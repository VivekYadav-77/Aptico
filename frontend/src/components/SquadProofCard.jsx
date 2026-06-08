function formatRank(rank) {
  return rank ? `#${rank}` : '-';
}

export default function SquadProofCard({ summary = null, history = [], compact = false }) {
  const latest = summary?.latest || history?.[0] || null;
  const totalClaimed = Number(summary?.totalClaimed || history?.length || 0);
  const bestRank = summary?.bestRank || (history?.length ? Math.min(...history.map((item) => Number(item.rank || 99))) : null);
  const currentSquad = summary?.currentSquad || latest?.squadName || 'No active squad yet';

  if (!totalClaimed && !summary?.currentSquad) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Squad Proof</p>
          <h3 className="mt-2 text-base font-black text-[var(--text)]">Verified monthly squad contribution</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
            Recruiter-safe proof of clean, consistent contribution to a top monthly squad.
          </p>
        </div>
        {totalClaimed ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-400">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            Verified
          </span>
        ) : null}
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[minmax(0,1.35fr)_minmax(96px,0.8fr)_minmax(112px,0.9fr)]'}`}>
        <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--panel)]/65 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--muted)] sm:tracking-[0.12em]">Current squad</p>
          <p className="mt-1 break-words text-sm font-black leading-5 text-[var(--text)]">{currentSquad}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--panel)]/65 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--muted)] sm:tracking-[0.12em]">Best finish</p>
          <p className="mt-1 text-sm font-black text-[var(--text)]">{formatRank(bestRank)}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--panel)]/65 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--muted)] sm:tracking-[0.12em]">Claimed rewards</p>
          <p className="mt-1 text-sm font-black text-[var(--text)]">{totalClaimed}</p>
        </div>
      </div>

      {latest ? (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--panel)]/75 p-4">
          <p className="text-sm font-black text-[var(--text)]">{latest.title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
            Rank #{latest.rank} monthly squad. Earned {latest.periodLabel || latest.period} with {latest.squadName}. Verified through clean monthly contribution.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-xs leading-5 text-[var(--muted-strong)]">
          Squad reward proof appears here after a monthly squad reward is claimed.
        </p>
      )}
    </section>
  );
}
