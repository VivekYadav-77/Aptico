import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchJobs } from '../api/jobsApi.js';
import AppShell from '../components/AppShell.jsx';
import { selectCurrentAnalysis } from '../store/historySlice.js';

const JOB_TYPE_OPTIONS = [
  { label: 'Remote', value: 'remote', icon: 'wifi' },
  { label: 'Hybrid', value: 'hybrid', icon: 'sync_desktop' },
  { label: 'Full-time', value: 'full-time', icon: 'work' },
  { label: 'Remote Internship', value: 'internship-remote', icon: 'school' },
  { label: 'Onsite Internship', value: 'internship-onsite', icon: 'workspace_premium' }
];

const FOCUS_TAGS = [
  { label: 'Best matches', value: 'best-match' },
  { label: 'Remote ready', value: 'remote' },
  { label: 'High pay', value: 'salary' },
  { label: 'Verified first', value: 'verified' }
];

function isRemoteType(jobType) {
  return jobType === 'remote' || jobType === 'internship-remote';
}

function normalizeInternshipType(jobType) {
  if (jobType === 'internship-remote' || jobType === 'internship-onsite' || jobType === 'internship') {
    return 'internship';
  }

  return jobType;
}

function formatPostedDate(postedAt) {
  if (!postedAt) {
    return 'Date unavailable';
  }

  const postedDate = new Date(postedAt);

  if (Number.isNaN(postedDate.getTime())) {
    return 'Date unavailable';
  }

  const diffDays = Math.max(0, Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) {
    return 'Posted today';
  }

  if (diffDays === 1) {
    return 'Posted 1 day ago';
  }

  return `Posted ${diffDays} days ago`;
}

function getCompensationLabel(job) {
  return job.stipend || job.salary || 'Compensation not listed';
}

function getMatchScore(job, analysisTerms) {
  const haystack = `${job.title || ''} ${job.description || ''} ${job.company || ''} ${job.location || ''}`.toLowerCase();
  const skills = analysisTerms.filter(Boolean);
  const hits = skills.filter((skill) => haystack.includes(skill.toLowerCase())).length;
  const base = 58 + hits * 10;
  const remoteBoost = /remote/i.test(job.location || '') ? 6 : 0;
  const verifiedBoost = job.isScam ? -18 : 8;

  return Math.max(42, Math.min(98, base + remoteBoost + verifiedBoost));
}

function getMatchTone(score) {
  if (score >= 85) {
    return {
      label: 'High match',
      className: 'border-emerald-500/25 bg-emerald-500/12 text-emerald-200'
    };
  }

  if (score >= 70) {
    return {
      label: 'Good match',
      className: 'border-cyan-500/25 bg-cyan-500/12 text-cyan-200'
    };
  }

  return {
    label: 'Stretch',
    className: 'border-amber-500/25 bg-amber-500/12 text-amber-200'
  };
}

function renderSourceTone(source) {
  return source ? source.replace(/[-_]/g, ' ') : 'Unknown source';
}

export default function ModernJobSearchPage() {
  const currentAnalysis = useSelector(selectCurrentAnalysis);
  const [formState, setFormState] = useState({
    query: '',
    jobType: 'full-time',
    location: 'India',
    useAnalysis: false
  });
  const [submittedSearch, setSubmittedSearch] = useState(null);
  const [activeFocus, setActiveFocus] = useState('best-match');
  const [localSearch, setLocalSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const deferredLocalSearch = useDeferredValue(localSearch);

  const matchedSkills = useMemo(
    () => (Array.isArray(currentAnalysis?.matchedSkills) ? currentAnalysis.matchedSkills.filter(Boolean).slice(0, 5) : []),
    [currentAnalysis]
  );

  const analysisSearchText = useMemo(() => {
    if (matchedSkills.length) {
      return matchedSkills.join(' ');
    }

    if (currentAnalysis?.companyName) {
      return currentAnalysis.companyName;
    }

    return currentAnalysis?.summary || '';
  }, [currentAnalysis, matchedSkills]);

  const analysisHighlights = useMemo(
    () =>
      [
        currentAnalysis?.targetRole,
        currentAnalysis?.companyName,
        ...(Array.isArray(currentAnalysis?.matchedSkills) ? currentAnalysis.matchedSkills : [])
      ]
        .filter(Boolean)
        .slice(0, 6),
    [currentAnalysis]
  );

  useEffect(() => {
    if (isRemoteType(formState.jobType) && formState.location !== 'Remote') {
      setFormState((current) => ({ ...current, location: 'Remote' }));
      return;
    }

    if (!isRemoteType(formState.jobType) && formState.location === 'Remote') {
      setFormState((current) => ({ ...current, location: 'India' }));
    }
  }, [formState.jobType, formState.location]);

  const jobsQuery = useQuery({
    queryKey: ['jobs-search', submittedSearch],
    queryFn: () => fetchJobs(submittedSearch),
    enabled: Boolean(submittedSearch),
    retry: false,
    placeholderData: (previousData) => previousData
  });

  const result = jobsQuery.data || {
    jobs: [],
    exhausted: false,
    sourcesUsed: [],
    cachedSources: [],
    matchedSkills: []
  };

  const enrichedJobs = useMemo(() => {
    const analysisTerms = result.matchedSkills?.length ? result.matchedSkills : matchedSkills;

    return (result.jobs || []).map((job, index) => ({
      ...job,
      matchScore: getMatchScore(job, analysisTerms),
      normalizedType: normalizeInternshipType(job.jobType),
      compensation: getCompensationLabel(job),
      postedLabel: formatPostedDate(job.postedAt),
      priorityIndex: index
    }));
  }, [matchedSkills, result.jobs, result.matchedSkills]);

  const filteredJobs = useMemo(() => {
    const searchValue = deferredLocalSearch.trim().toLowerCase();

    return enrichedJobs
      .filter((job) => {
        if (!searchValue) {
          return true;
        }

        const haystack = `${job.title || ''} ${job.company || ''} ${job.location || ''} ${job.description || ''}`.toLowerCase();
        return haystack.includes(searchValue);
      })
      .filter((job) => {
        if (activeFocus === 'remote') {
          return /remote/i.test(job.location || '') || job.normalizedType === 'remote';
        }

        if (activeFocus === 'salary') {
          return Boolean(job.salary || job.stipend);
        }

        if (activeFocus === 'verified') {
          return !job.isScam;
        }

        return true;
      })
      .sort((left, right) => {
        if (activeFocus === 'salary') {
          return Number(Boolean(right.salary || right.stipend)) - Number(Boolean(left.salary || left.stipend)) || right.matchScore - left.matchScore;
        }

        if (activeFocus === 'remote') {
          return Number(/remote/i.test(right.location || '')) - Number(/remote/i.test(left.location || '')) || right.matchScore - left.matchScore;
        }

        if (activeFocus === 'verified') {
          return Number(!right.isScam) - Number(!left.isScam) || right.matchScore - left.matchScore;
        }

        return right.matchScore - left.matchScore || left.priorityIndex - right.priorityIndex;
      });
  }, [activeFocus, deferredLocalSearch, enrichedJobs]);

  const selectedJob = useMemo(() => {
    if (!filteredJobs.length) {
      return null;
    }

    return filteredJobs.find((job) => job.id === selectedJobId) || filteredJobs[0];
  }, [filteredJobs, selectedJobId]);

  useEffect(() => {
    if (selectedJob?.id !== selectedJobId) {
      setSelectedJobId(selectedJob?.id ?? null);
    }
  }, [selectedJob, selectedJobId]);

  const sourceCount = (result.sourcesUsed || []).length;
  const cachedSourceCount = (result.cachedSources || []).length;
  const averageMatch = filteredJobs.length
    ? Math.round(filteredJobs.reduce((sum, job) => sum + job.matchScore, 0) / filteredJobs.length)
    : 0;

  function updateField(field, value) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSelectedJobId(null);
    setSubmittedSearch({
      query: formState.useAnalysis ? analysisSearchText.trim() : formState.query.trim(),
      jobType: formState.jobType,
      location: isRemoteType(formState.jobType) ? 'Remote' : formState.location.trim() || 'India',
      useAnalysis: formState.useAnalysis,
      submittedAt: Date.now()
    });
  }

  function handleRetry() {
    if (!submittedSearch) {
      return;
    }

    setSubmittedSearch((current) => ({
      ...current,
      submittedAt: Date.now()
    }));
  }

  return (
    <AppShell
      title="Job search"
      description="A sharper discovery workspace for finding better-fit roles faster, with stronger search guidance, live filters, and a focused detail view."
      actions={
        <>
          <Link to="/analysis" className="app-button-secondary">Analysis</Link>
          <Link to="/profile" className="app-button-secondary">Profile</Link>
        </>
      }
    >
      <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <article className="app-panel relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(135deg,rgba(78,222,163,0.22),rgba(113,161,255,0.08),transparent)]" />
          <div className="relative space-y-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <p className="app-kicker">Search cockpit</p>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
                  Discover roles with stronger context, less scrolling, and faster decision-making.
                </h2>
                <p className="max-w-xl text-sm leading-7 text-[var(--muted-strong)] sm:text-base">
                  Inspired by your HTML reference, this version adds a richer header, contextual search setup, quick-focus filtering, and a structured job preview panel.
                </p>
              </div>

              <div className="flex shrink-0 gap-3">
                {[
                  ['Live sources', String(sourceCount || 0)],
                  ['Visible roles', String(filteredJobs.length || 0)],
                  ['Avg. fit', averageMatch ? `${averageMatch}%` : '--']
                ].map(([label, value]) => (
                  <div key={label} className="min-w-[6.5rem] rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4">
                    <p className="app-field-label whitespace-nowrap">{label}</p>
                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(analysisHighlights.length ? analysisHighlights : ['Analysis-guided search', 'Remote-aware filtering', 'Source transparency']).map((item) => (
                <span key={item} className="app-chip">{item}</span>
              ))}
            </div>
          </div>
        </article>

        <aside className="app-panel space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="app-kicker">Why this works</p>
              <h3 className="mt-2 text-xl font-bold text-[var(--text)]">Better search UX for job triage</h3>
            </div>
            <span className="material-symbols-outlined rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-[var(--accent-strong)]">
              insights
            </span>
          </div>

          <div className="grid gap-3">
            {[
              ['Analysis mode', 'Turn resume or role analysis into one-click search context.'],
              ['Quick focus views', 'Flip between fit, remote, salary, and verified-first priorities.'],
              ['Detail-first layout', 'Review one role deeply while keeping the results queue nearby.'],
              ['Local refinement', 'Filter fetched roles instantly without firing a new API request.']
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[1.15rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4">
                <p className="font-semibold text-[var(--text)]">{title}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">{copy}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <form className="app-panel space-y-5 xl:sticky xl:top-24 xl:h-fit" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-kicker">Search setup</p>
              <h3 className="mt-2 text-xl font-bold text-[var(--text)]">Tune your job pull</h3>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-xs font-semibold text-[var(--muted-strong)]">
              Multi-source
            </span>
          </div>

          {analysisSearchText ? (
            <label className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-4">
              <div>
                <p className="font-medium text-[var(--text)]">Use my latest analysis context</p>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">Pull matched skills and target role into the search automatically.</p>
              </div>
              <button
                type="button"
                onClick={() => updateField('useAnalysis', !formState.useAnalysis)}
                className={`app-switch ${formState.useAnalysis ? 'is-on' : ''}`}
                aria-pressed={formState.useAnalysis}
                aria-label="Toggle analysis context"
              />
            </label>
          ) : null}

          {!formState.useAnalysis ? (
            <label className="space-y-2">
              <span className="app-field-label">Role or keywords</span>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">search</span>
                <input
                  value={formState.query}
                  onChange={(event) => updateField('query', event.target.value)}
                  className="app-input"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="React developer, product designer, data analyst"
                  required
                />
              </div>
            </label>
          ) : (
            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-4 text-sm leading-7 text-[var(--accent-strong)]">
              Searching with: {analysisSearchText}
            </div>
          )}

          {!isRemoteType(formState.jobType) ? (
            <label className="space-y-2">
              <span className="app-field-label">Location</span>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">location_on</span>
                <input
                  value={formState.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  className="app-input"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="Bangalore, Mumbai, Pune"
                />
              </div>
            </label>
          ) : (
            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm text-[var(--muted-strong)]">
              Remote search is active, so location is automatically set to Remote.
            </div>
          )}

          <div className="space-y-3">
            <span className="app-field-label">Job type</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {JOB_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('jobType', option.value)}
                  className={`flex items-center gap-3 rounded-[1rem] border px-4 py-3 text-left text-xs sm:text-sm transition ${
                    formState.jobType === option.value
                      ? 'border-transparent bg-[var(--accent)] text-slate-950'
                      : 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--text)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{option.icon}</span>
                  <span className="font-semibold">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
            <p className="app-field-label">Quick notes</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Search query</p>
                <p className="mt-1 flex-1 text-sm text-[var(--muted-strong)] pr-2">
                  {formState.useAnalysis ? analysisSearchText || 'Waiting for analysis context' : formState.query || 'Add a role or skill set'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Location mode</p>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">{isRemoteType(formState.jobType) ? 'Remote only' : formState.location || 'India default'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Analysis assist</p>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">{formState.useAnalysis ? 'On' : 'Off'}</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={jobsQuery.isFetching || (formState.useAnalysis ? !analysisSearchText.trim() : !formState.query.trim())}
            className="app-button w-full justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">{jobsQuery.isFetching ? 'progress_activity' : 'travel_explore'}</span>
            {jobsQuery.isFetching ? 'Searching jobs...' : 'Find jobs'}
          </button>
        </form>

        <div className="space-y-5">
          {jobsQuery.error ? (
            <div className="rounded-[1.5rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-rose-300">
              {jobsQuery.error.response?.data?.error || 'Could not load jobs.'}
            </div>
          ) : null}

          <section className="app-panel space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="app-kicker">Result controls</p>
                <h3 className="mt-2 text-xl font-bold text-[var(--text)]">Filter and inspect faster</h3>
              </div>

              <div className="relative w-full lg:max-w-sm">
                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">manage_search</span>
                <input
                  value={localSearch}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  className="app-input"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="Refine visible results"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {FOCUS_TAGS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveFocus(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeFocus === option.value
                      ? 'bg-[var(--accent)] text-slate-950'
                      : 'border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--text)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {submittedSearch ? (
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="app-field-label">Search snapshot</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Role query</p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">{submittedSearch.query || '--'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Job type</p>
                      <p className="mt-1 text-sm capitalize text-[var(--muted-strong)]">{submittedSearch.jobType.replace(/-/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Location</p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">{submittedSearch.location}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Analysis assist</p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">{submittedSearch.useAnalysis ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="app-field-label">Source status</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(result.sourcesUsed || []).length ? (
                      (result.sourcesUsed || []).map((source) => (
                        <span key={source} className="app-chip">
                          {renderSourceTone(source)}
                          {(result.cachedSources || []).includes(source) ? ' cached' : ''}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[var(--muted-strong)]">Sources will appear after the first search.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
          {submittedSearch ? (
            filteredJobs.length ? (
              <section className="grid gap-5 2xl:grid-cols-[0.88fr_1.12fr]">
                <div className="space-y-4">
                  {result.exhausted ? (
                    <div className="rounded-[1.5rem] border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
                      Some sources are limited right now. Aptico is showing the results that were still available.
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {filteredJobs.map((job) => {
                      const tone = getMatchTone(job.matchScore);
                      const isSelected = selectedJob?.id === job.id;

                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => setSelectedJobId(job.id)}
                          className={`w-full rounded-[1.5rem] border p-5 text-left transition ${
                            isSelected
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_14px_30px_rgba(0,0,0,0.08)]'
                              : 'border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-soft)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.className}`}>
                                  {tone.label}
                                </span>
                                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                                  {renderSourceTone(job.source)}
                                </span>
                              </div>
                              <div>
                                <h4 className="text-lg font-bold tracking-[-0.03em] text-[var(--text)]">{job.title}</h4>
                                <p className="mt-1 text-sm text-[var(--muted-strong)]">
                                  {job.company} · {job.location}
                                </p>
                              </div>
                            </div>

                            <div className="min-w-[74px] rounded-[1rem] border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3 text-center">
                              <p className="text-2xl font-black tracking-[-0.04em] text-[var(--text)]">{job.matchScore}</p>
                              <p className="app-field-label mt-1">Fit</p>
                            </div>
                          </div>

                          <p className="mt-4 line-clamp-2 text-sm leading-7 text-[var(--muted-strong)]">
                            {job.description || 'No description was provided by this source.'}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-strong)]">{job.compensation}</span>
                            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-strong)]">{job.postedLabel}</span>
                            {job.isScam ? (
                              <span className="rounded-full border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-1 text-xs text-rose-300">
                                Verify carefully
                              </span>
                            ) : (
                              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                                Lower risk
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <aside className="app-panel h-fit 2xl:sticky 2xl:top-24">
                  {selectedJob ? (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <p className="app-kicker">Selected role</p>
                          <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--text)]">{selectedJob.title}</h3>
                          <p className="text-sm text-[var(--muted-strong)]">
                            {selectedJob.company} · {selectedJob.location}
                          </p>
                        </div>

                        <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-center">
                          <p className="text-3xl font-black tracking-[-0.05em] text-[var(--text)]">{selectedJob.matchScore}</p>
                          <p className="app-field-label mt-1">Match</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="app-chip">{renderSourceTone(selectedJob.source)}</span>
                        <span className="app-chip">{selectedJob.compensation}</span>
                        <span className="app-chip">{selectedJob.postedLabel}</span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                          <p className="app-field-label">Fit signal</p>
                          <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                            {selectedJob.matchScore >= 85
                              ? 'Strong alignment with your current direction and analysis context.'
                              : selectedJob.matchScore >= 70
                                ? 'Worth reviewing closely. The role overlaps with part of your target profile.'
                                : 'More of a stretch role. Review expectations before applying.'}
                          </p>
                        </div>
                        <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                          <p className="app-field-label">Risk check</p>
                          <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                            {selectedJob.isScam
                              ? 'This posting shows patterns common in low-trust listings. Verify the employer and application URL.'
                              : 'No immediate scam flag was surfaced by the source metadata for this listing.'}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                        <p className="app-field-label">Role summary</p>
                        <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">
                          {selectedJob.description || 'No description was provided by this source.'}
                        </p>
                      </div>

                      {matchedSkills.length ? (
                        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                          <p className="app-field-label">Your matched skills</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {matchedSkills.map((skill) => (
                              <span key={skill} className="app-chip">{skill}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-3">
                        <a href={selectedJob.applyUrl} target="_blank" rel="noreferrer" className="app-button">
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          View &amp; apply
                        </a>
                        <button type="button" onClick={() => setLocalSearch(selectedJob.company || '')} className="app-button-secondary">
                          <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                          More from this company
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--muted-strong)]">
                      Select a job to inspect the details panel.
                    </div>
                  )}
                </aside>
              </section>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--muted-strong)]">
                {result.exhausted ? (
                  <>
                    All sources are temporarily limited. Please retry in a few minutes.
                    <div className="mt-5">
                      <button type="button" onClick={handleRetry} className="app-button-secondary">
                        Retry search
                      </button>
                    </div>
                  </>
                ) : (
                  'No roles matched your current search and filter combination. Try a broader title, a different focus, or clear the local refinement box.'
                )}
              </div>
            )
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--muted-strong)]">
              Start a search to pull jobs from the routed Aptico sources and inspect them in the new split-view layout.
            </div>
          )}

          {submittedSearch && cachedSourceCount ? (
            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm text-[var(--muted-strong)]">
              {cachedSourceCount} source{cachedSourceCount > 1 ? 's were' : ' was'} served from cache to keep the experience responsive.
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
