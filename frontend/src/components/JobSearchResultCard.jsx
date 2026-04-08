function formatPostedDate(postedAt) {
  if (!postedAt) {
    return 'Date unavailable';
  }

  const postedDate = new Date(postedAt);
  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return '1 day ago';
  }

  return `${diffDays} days ago`;
}

const JOB_TYPE_STYLES = {
  remote: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  hybrid: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  'full-time': 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  internship: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200'
};

const JOB_TYPE_LABELS = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  'full-time': 'Full-time',
  internship: 'Internship'
};

export default function JobSearchResultCard({ job }) {
  const compensation = job.stipend || job.salary || 'Compensation not listed';
  const jobTypeClass = JOB_TYPE_STYLES[job.jobType] || JOB_TYPE_STYLES['full-time'];
  const jobTypeLabel = JOB_TYPE_LABELS[job.jobType] || 'Full-time';

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70 backdrop-blur">
      {job.isScam ? (
        <div
          title="This listing shows patterns common in scam jobs. Verify before applying."
          className="border-b border-rose-500/30 bg-rose-500/15 px-5 py-3 text-sm font-medium text-rose-200"
        >
          Warning: Unverified listing
        </div>
      ) : null}

      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${jobTypeClass}`}>
              {jobTypeLabel}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
              via {job.source}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white">{job.title}</h3>
            <p className="mt-1 text-sm text-slate-300">{job.company}</p>
            <p className="mt-1 text-sm text-slate-400">{job.location}</p>
          </div>

          <p className="text-sm leading-6 text-slate-300">
            {job.description || 'No description was provided by this source.'}
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 px-3 py-1">{compensation}</span>
            <span className="rounded-full border border-white/10 px-3 py-1">{formatPostedDate(job.postedAt)}</span>
          </div>
        </div>

        <div className="flex min-w-[170px] flex-col gap-3">
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-cyan-400 px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-950 transition hover:bg-cyan-300"
          >
            View &amp; Apply
          </a>
        </div>
      </div>
    </article>
  );
}
