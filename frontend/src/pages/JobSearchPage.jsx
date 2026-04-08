import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchJobs } from '../api/jobsApi.js';
import JobSearchResultCard from '../components/JobSearchResultCard.jsx';
import { selectCurrentAnalysis } from '../store/historySlice.js';

const JOB_TYPE_OPTIONS = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Full-time', value: 'full-time' },
  { label: 'Remote Internship', value: 'internship-remote' },
  { label: 'Onsite Internship', value: 'internship-onsite' }
];

function isRemoteType(jobType) {
  return jobType === 'remote' || jobType === 'internship-remote';
}

function LoadingSpinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950" />;
}

export default function JobSearchPage() {
  const currentAnalysis = useSelector(selectCurrentAnalysis);
  const [formState, setFormState] = useState({
    query: '',
    jobType: 'full-time',
    location: 'India',
    useAnalysis: false
  });
  const [submittedSearch, setSubmittedSearch] = useState(null);

  const matchedSkills = useMemo(
    () => (Array.isArray(currentAnalysis?.matchedSkills) ? currentAnalysis.matchedSkills.filter(Boolean).slice(0, 3) : []),
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

  const hasAnalysisContext = Boolean(currentAnalysis && (matchedSkills.length || currentAnalysis.companyName || currentAnalysis.summary));

  useEffect(() => {
    if (isRemoteType(formState.jobType) && formState.location !== 'Remote') {
      setFormState((previous) => ({ ...previous, location: 'Remote' }));
      return;
    }

    if (!isRemoteType(formState.jobType) && formState.location === 'Remote') {
      setFormState((previous) => ({ ...previous, location: 'India' }));
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
    message: null,
    sourcesUsed: [],
    cachedSources: [],
    matchedSkills: []
  };

  const cachedSourceSet = useMemo(() => new Set(result.cachedSources || []), [result.cachedSources]);

  function updateField(field, value) {
    setFormState((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  function buildSearchPayload() {
    const resolvedQuery = formState.useAnalysis ? analysisSearchText.trim() : formState.query.trim();
    const resolvedLocation = isRemoteType(formState.jobType) ? 'Remote' : formState.location.trim() || 'India';

    return {
      query: resolvedQuery,
      jobType: formState.jobType,
      location: resolvedLocation,
      useAnalysis: formState.useAnalysis
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = buildSearchPayload();
    setSubmittedSearch({ ...payload, submittedAt: Date.now() });
  }

  function handleRetry() {
    if (!submittedSearch) {
      return;
    }

    setSubmittedSearch({
      ...submittedSearch,
      submittedAt: Date.now()
    });
  }

  const infoSkills = result.matchedSkills?.length ? result.matchedSkills : matchedSkills;
  const hasResults = result.jobs.length > 0;
  const showAnalysisPill = Boolean(submittedSearch?.useAnalysis && infoSkills.length);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Aptico Job Search</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Search across multiple job platforms</h1>
            <p className="text-sm text-slate-300">Find remote, hybrid, full-time, and internship roles from the new routed job source stack.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard" className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200">
              Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {hasAnalysisContext ? (
              <label className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/50 px-5 py-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Use my analyzed skills and role automatically</p>
                  <p className="text-xs text-slate-400">Switch this on to search with your latest stored analysis context.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formState.useAnalysis}
                  onChange={(event) => updateField('useAnalysis', event.target.checked)}
                  className="h-5 w-5 rounded border border-slate-600 bg-slate-900 text-cyan-400"
                />
              </label>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              {!formState.useAnalysis ? (
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Role / keyword</span>
                  <input
                    value={formState.query}
                    onChange={(event) => updateField('query', event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    placeholder="e.g. React Developer, Data Analyst"
                    required
                  />
                </label>
              ) : (
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-100">
                  Searching with your latest analysis context: {analysisSearchText || 'analysis-derived terms'}
                </div>
              )}

              {!isRemoteType(formState.jobType) ? (
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Location</span>
                  <input
                    value={formState.location}
                    onChange={(event) => updateField('location', event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    placeholder="e.g. Bangalore, Mumbai, Remote"
                    required
                  />
                </label>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4 text-sm text-slate-300">
                  Location is set to Remote for this job type.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <span className="block text-xs uppercase tracking-[0.22em] text-slate-400">Job type</span>
              <div className="flex flex-wrap gap-3">
                {JOB_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('jobType', option.value)}
                    className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${
                      formState.jobType === option.value
                        ? 'bg-cyan-400 text-slate-950'
                        : 'border border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={jobsQuery.isFetching || (formState.useAnalysis ? !analysisSearchText.trim() : !formState.query.trim())}
              className="inline-flex items-center gap-3 rounded-full bg-cyan-400 px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {jobsQuery.isFetching ? (
                <>
                  <LoadingSpinner />
                  Searching across multiple platforms...
                </>
              ) : (
                'Find Jobs'
              )}
            </button>
          </form>
        </section>

        {jobsQuery.error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            {jobsQuery.error.response?.data?.error || 'Could not load jobs.'}
          </div>
        ) : null}

        {submittedSearch ? (
          <section className="space-y-5">
            {showAnalysisPill ? (
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                Searched using your resume skills: {infoSkills.join(', ')}
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 px-5 py-4 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span className="font-medium text-white">Results from:</span>
                {(result.sourcesUsed || []).map((source) => (
                  <span key={source} className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                    {source}
                    {cachedSourceSet.has(source) ? ' (cached)' : ''}
                  </span>
                ))}
              </div>
            </div>

            {result.exhausted ? (
              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                {hasResults
                  ? 'Some sources are temporarily limited. Showing available results. Try again in a few minutes.'
                  : 'All job sources are currently at their limits. Please try again in 10-15 minutes.'}
              </div>
            ) : null}

            {hasResults ? (
              <div className="grid gap-5">
                {result.jobs.map((job) => (
                  <JobSearchResultCard key={job.id} job={job} />
                ))}
              </div>
            ) : result.exhausted ? (
              <div className="rounded-[2rem] border border-dashed border-amber-500/30 bg-amber-500/5 px-6 py-12 text-center">
                <p className="text-base font-medium text-amber-100">All job sources are currently at their limits. Please try again in 10-15 minutes.</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-5 rounded-full border border-amber-400/40 px-5 py-2 text-xs uppercase tracking-[0.22em] text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/10"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center text-sm text-slate-400">
                No results found. Try a different role or location.
              </div>
            )}
          </section>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center text-sm text-slate-400">
            Use the search form above to find jobs across the routed sources.
          </div>
        )}
      </div>
    </main>
  );
}
