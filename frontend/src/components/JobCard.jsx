export default function JobCard({
  job,
  onOpenApplyKit,
  onSave,
  isSaving = false,
  saveDisabled = false,
  applyDisabled = false
}) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200">
              {job.source}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
              {job.jobType}
            </span>
            {typeof job.matchPercent === 'number' ? (
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-200">
                Match {job.matchPercent}%
              </span>
            ) : null}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white">{job.title}</h3>
            <p className="mt-1 text-sm text-slate-300">
              {job.company} · {job.location}
            </p>
          </div>

          <p className="text-sm leading-6 text-slate-300">{job.description || 'No description available from this source.'}</p>

          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 px-3 py-1">{job.stipend || 'Comp not listed'}</span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'Date unavailable'}
            </span>
          </div>
        </div>

        <div className="flex min-w-[170px] flex-col gap-3">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-cyan-400 px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-950 transition hover:bg-cyan-300"
          >
            Open role
          </a>
          <button
            type="button"
            disabled={applyDisabled}
            onClick={() => onOpenApplyKit(job)}
            className="rounded-full border border-cyan-500/40 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            Apply kit
          </button>
          <button
            type="button"
            disabled={saveDisabled || isSaving}
            onClick={() => onSave(job)}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            {isSaving ? 'Saving...' : 'Bookmark'}
          </button>
        </div>
      </div>
    </article>
  );
}
