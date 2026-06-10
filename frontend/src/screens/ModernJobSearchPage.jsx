import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@/lib/router-compat.jsx';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios.js';
import { fetchJobs } from '../api/jobsApi.js';
import AppShell from '../components/AppShell.jsx';
import ContainedSelect from '../components/ContainedSelect.jsx';
import { selectAuth } from '../store/authSlice.js';
import { clearJobSearchState, selectCurrentAnalysis, selectJobSearchState, setJobSearchState } from '../store/historySlice.js';
import { saveSavedJobDetails } from '../utils/savedJobsStorage.js';
import { getRequestErrorMessage } from '../utils/requestError.js';

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

const STIPEND_BENCHMARK_ROWS = [
  ['Tech Dev', 'Tier 1 (Bengaluru, Mumbai etc.)', '₹10,000-₹15,000+'],
  ['Tech Dev', 'Tier 2 cities', '₹6,000-₹10,000'],
  ['Tech Dev', 'Remote', '₹8,000-₹12,000'],
  ['Design', 'Tier 1', '₹8,000-₹12,000'],
  ['Design', 'Tier 2', '₹5,000-₹8,000'],
  ['Marketing', 'Tier 1', '₹5,000-₹8,000'],
  ['Marketing', 'Tier 2', '₹3,000-₹5,000'],
  ['Finance', 'Tier 1', '₹8,000-₹12,000'],
  ['General', 'Tier 1', '₹4,000-₹6,000'],
  ['General', 'Tier 2', '₹3,000-₹5,000']
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

function getMatchTone(score, color) {
  if (color === 'green' || score >= 85) {
    return {
      label: 'High match',
      className: 'border-emerald-500/25 bg-emerald-500/12 text-emerald-200'
    };
  }

  if (color === 'amber' || score >= 70) {
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

function getSignalClasses(color) {
  if (color === 'green') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
  }

  if (color === 'amber') {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
  }

  if (color === 'red') {
    return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  }

  if (color === 'purple') {
    return 'border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200';
  }

  return 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted-strong)]';
}

function getStatCardClasses(color) {
  return `group rounded-[2rem] border px-5 py-5 transition-all hover:shadow-lg ${getSignalClasses(color)}`;
}

function getProgressBarClasses(color) {
  if (color === 'green') {
    return 'bg-emerald-400';
  }

  if (color === 'amber') {
    return 'bg-amber-400';
  }

  return 'bg-rose-400';
}

export default function ModernJobSearchPage() {
  const auth = useSelector(selectAuth);
  const currentAnalysis = useSelector(selectCurrentAnalysis);
  const persistedJobSearchState = useSelector(selectJobSearchState);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    query: persistedJobSearchState?.formState?.query || '',
    jobType: persistedJobSearchState?.formState?.jobType || 'full-time',
    location: persistedJobSearchState?.formState?.location || 'India',
    useAnalysis: persistedJobSearchState?.formState?.useAnalysis || false
  });
  const [submittedSearch, setSubmittedSearch] = useState(persistedJobSearchState?.submittedSearch || null);
  const [activeFocus, setActiveFocus] = useState(persistedJobSearchState?.activeFocus || 'best-match');
  const [localSearch, setLocalSearch] = useState(persistedJobSearchState?.localSearch || '');
  const [selectedJobId, setSelectedJobId] = useState(persistedJobSearchState?.selectedJobId || null);
  const [statusMessage, setStatusMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingJobId, setSavingJobId] = useState(null);
  const [savedJobIds, setSavedJobIds] = useState(() => new Set(persistedJobSearchState?.savedJobIds || []));
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
    retry: false
  });

  const persistedResult = persistedJobSearchState?.result || null;
  const result = jobsQuery.data || persistedResult || {
    jobs: [],
    exhausted: false,
    sourcesUsed: [],
    cachedSources: [],
    matchedSkills: [],
    dashboardStats: null
  };

  useEffect(() => {
    if (!submittedSearch && !(result.jobs || []).length && !localSearch && activeFocus === 'best-match') {
      return;
    }

    dispatch(
      setJobSearchState({
        formState,
        submittedSearch,
        activeFocus,
        localSearch,
        selectedJobId,
        result,
        savedJobIds: Array.from(savedJobIds)
      })
    );
  }, [activeFocus, dispatch, formState, localSearch, result, selectedJobId, submittedSearch, savedJobIds]);

  const enrichedJobs = useMemo(() => {
    const analysisTerms = result.matchedSkills?.length ? result.matchedSkills : matchedSkills;

    return (result.jobs || []).map((job, index) => ({
      ...job,
      matchScore: job.match?.matchScore ?? getMatchScore(job, analysisTerms),
      normalizedType: normalizeInternshipType(job.jobType),
      compensation: getCompensationLabel(job),
      postedLabel: formatPostedDate(job.postedAt),
      priorityIndex: index,
      tone: getMatchTone(job.match?.matchScore ?? getMatchScore(job, analysisTerms), job.match?.matchColor)
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

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearch, activeFocus, deferredLocalSearch]);

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil((filteredJobs?.length || 0) / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const selectedJob = useMemo(() => {
    if (!selectedJobId || !filteredJobs.length) {
      return null;
    }

    return filteredJobs.find((job) => job.id === selectedJobId) || null;
  }, [filteredJobs, selectedJobId]);

  useEffect(() => {
    if (selectedJobId && !selectedJob) {
      setSelectedJobId(null);
    }
  }, [selectedJob, selectedJobId]);

  const sourceCount = (result.sourcesUsed || []).length;
  const cachedSourceCount = (result.cachedSources || []).length;
  const averageMatch = filteredJobs.length
    ? Math.round(filteredJobs.reduce((sum, job) => sum + job.matchScore, 0) / filteredJobs.length)
    : 0;
  const dashboardStats = result.dashboardStats || {
    freshJobs: enrichedJobs.filter((job) => job.applyWindow?.daysLive !== null && job.applyWindow?.daysLive <= 7).length,
    ghostAlertCount: enrichedJobs.filter((job) => (job.ghost?.ghostScore || 0) > 50).length,
    averageGhostRisk: Math.round(enrichedJobs.reduce((sum, job) => sum + (job.ghost?.ghostScore || 0), 0) / (enrichedJobs.length || 1)),
    strongMatchCount: enrichedJobs.filter((job) => (job.match?.matchScore || 0) >= 70).length,
    exploitationCount: enrichedJobs.filter((job) => job.stipendFairness?.fairnessLabel === 'Exploitation Risk').length
  };
  const isInternshipSearch = submittedSearch?.jobType?.includes('internship');
  const sourceSummary = (result.sourcesUsed || []).join(', ');

  function updateField(field, value) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSelectedJobId(null);
    setStatusMessage('');
    setActionError('');
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

  function handleClearSearchWorkspace() {
    setFormState({
      query: '',
      jobType: 'full-time',
      location: 'India',
      useAnalysis: false
    });
    setSubmittedSearch(null);
    setActiveFocus('best-match');
    setLocalSearch('');
    setSelectedJobId(null);
    setStatusMessage('');
    setActionError('');
    setShowBenchmarks(false);
    setSavedJobIds(new Set());
    dispatch(clearJobSearchState());
  }

  async function handleSaveToPipeline(job) {
    if (!auth.isAuthenticated) {
      setActionError('Sign in to save jobs to your pipeline.');
      return;
    }

    if (savedJobIds.has(job.id)) {
      setStatusMessage(`${job.title} is already saved.`);
      return;
    }

    setSavingJobId(job.id);
    setActionError('');
    setStatusMessage('');

    try {
      const response = await api.post('/api/jobs/save', {
        title: job.title,
        company: job.company,
        source: job.source,
        url: job.applyUrl,
        stipend: job.stipend || null,
        matchPercent: job.match?.matchScore ?? job.matchScore
      });

      saveSavedJobDetails(response.data?.data?.id, {
        description: job.description || '',
        location: job.location || '',
        jobType: job.jobType || job.normalizedType || '',
        postedAt: job.postedAt || null,
        source: job.source || '',
        url: job.applyUrl || job.url || '',
        stipend: job.stipend || job.salary || null,
        matchPercent: job.match?.matchScore ?? job.matchScore ?? null
      });

      setSavedJobIds((prev) => {
        const next = new Set(prev);
        next.add(job.id);
        return next;
      });

      setStatusMessage(`${job.title} was saved to your pipeline.`);
    } catch (requestError) {
      setActionError(getRequestErrorMessage(requestError, 'Could not save job.'));
    } finally {
      setSavingJobId(null);
    }
  }

  function handleSkillClick(skill) {
    navigate('/analysis', {
      state: {
        prompt: `Show me the learning path for ${skill}`,
        focus: 'learning-path',
        skill
      }
    });
  }

  return (
    <AppShell
      title="Job search"
      description="A sharper discovery workspace for finding better-fit roles faster, with stronger search guidance, live filters, and a focused detail view."
      actions={
        <>
          <Link to="/analysis" className="app-button-secondary">Analysis</Link>
          <Link to="/profile" className="app-button-secondary">Profile</Link>
          {(submittedSearch || (result.jobs || []).length) ? (
            <button type="button" onClick={handleClearSearchWorkspace} className="app-button-secondary">
              Remove content
            </button>
          ) : null}
        </>
      }
    >
      <section className="app-panel relative overflow-hidden mb-6 py-8 px-6 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(78,222,163,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(113,161,255,0.06),transparent_55%)] pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3 mb-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                <span className="material-symbols-outlined text-[20px] text-[var(--accent-strong)]">travel_explore</span>
              </span>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted-strong)]">Discovery Engine</p>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text)]">
              Discover roles with stronger context, less scrolling, and faster decision-making.
            </h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {(analysisHighlights.length ? analysisHighlights : ['Analysis-guided search', 'Remote-aware filtering', 'Source transparency']).map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-strong)]">{item}</span>
              ))}
            </div>
          </div>
          
          <div className="grid w-full shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto lg:gap-4">
            {[
              ['Live sources', String(sourceCount || 0), 'cloud_sync'],
              ['Visible roles', String(filteredJobs.length || 0), 'work'],
              ['Avg. fit', averageMatch ? `${averageMatch}%` : '--', 'speed']
            ].map(([label, value, icon]) => (
              <div key={label} className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 transition-all hover:border-[var(--accent)]/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[14px] text-[var(--muted)]">{icon}</span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
                </div>
                <p className="text-2xl font-black tracking-tight text-[var(--text)]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <form className="app-panel py-6 px-6 sm:px-8 space-y-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--panel-strong)] border border-[var(--border)]">
                <span className="material-symbols-outlined text-[16px] text-[var(--accent-strong)]">tune</span>
              </span>
              <h3 className="text-lg font-black tracking-tight text-[var(--text)]">Search Criteria</h3>
            </div>
            {analysisSearchText ? (
              <label className="flex items-center gap-3 cursor-pointer select-none group sm:justify-end">
                <span className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent-strong)] transition-colors">Use analysis context</span>
                <button
                  type="button"
                  onClick={() => updateField('useAnalysis', !formState.useAnalysis)}
                  className={`app-switch ${formState.useAnalysis ? 'is-on' : ''}`}
                  aria-pressed={formState.useAnalysis}
                  aria-label="Toggle analysis context"
                />
              </label>
            ) : null}
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {!formState.useAnalysis ? (
              <label className="flex-1 space-y-2 block">
                <span className="app-field-label">Role or keywords</span>
                <div className="relative mt-2">
                  <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] text-[18px]">search</span>
                  <input
                    value={formState.query}
                    onChange={(event) => updateField('query', event.target.value)}
                    className="app-input text-sm w-full"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="React developer, designer..."
                    required
                  />
                </div>
              </label>
            ) : (
              <div className="flex-1 min-w-0 rounded-[1.25rem] border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 min-h-[44px] flex items-center text-sm leading-6 text-[var(--accent-strong)]">
                <span className="truncate">Searching with: {analysisSearchText}</span>
              </div>
            )}

            {!isRemoteType(formState.jobType) ? (
              <label className="flex-1 space-y-2 block">
                <span className="app-field-label">Location</span>
                <div className="relative mt-2">
                  <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] text-[18px]">location_on</span>
                  <input
                    value={formState.location}
                    onChange={(event) => updateField('location', event.target.value)}
                    className="app-input text-sm w-full"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Bangalore, Mumbai, Pune"
                  />
                </div>
              </label>
            ) : (
              <div className="flex-1 rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 min-h-[44px] flex items-center text-sm text-[var(--muted-strong)]">
                Remote search is active.
              </div>
            )}

            <div className="flex-1 space-y-2 block">
              <span className="app-field-label">Job type</span>
              <ContainedSelect
                className="mt-2"
                value={formState.jobType}
                onChange={(nextValue) => updateField('jobType', nextValue)}
                options={JOB_TYPE_OPTIONS}
              />
            </div>

            <button
              type="submit"
              disabled={jobsQuery.isFetching || (formState.useAnalysis ? !analysisSearchText.trim() : !formState.query.trim())}
              className="app-button justify-center shrink-0 w-full md:w-auto h-[44px]"
            >
              <span className="material-symbols-outlined text-[18px]">{jobsQuery.isFetching ? 'progress_activity' : 'travel_explore'}</span>
              {jobsQuery.isFetching ? 'Searching jobs...' : 'Find jobs'}
            </button>
          </div>
        </form>

        <main className="min-w-0 w-full space-y-5">
          {statusMessage ? (
            <div className="rounded-[1.25rem] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {statusMessage}
            </div>
          ) : null}

          {actionError ? (
            <div className="rounded-[1.25rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-rose-300">
              {actionError}
            </div>
          ) : null}

          {jobsQuery.error ? (
            <div className="rounded-[1.25rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-rose-300">
              {getRequestErrorMessage(jobsQuery.error, 'Could not load jobs.')}
            </div>
          ) : null}

          <section className="app-panel space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex w-full gap-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--panel-strong)]/50 p-1.5 pb-2 hide-scrollbar md:w-auto md:flex-wrap md:overflow-visible md:pb-1.5">
                {FOCUS_TAGS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveFocus(option.value)}
                    className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold tracking-wide transition-all duration-300 ${
                      activeFocus === option.value
                        ? 'bg-[var(--accent)] text-[#003824] shadow-[0_0_15px_rgba(78,222,163,0.2)]'
                        : 'text-[var(--muted-strong)] hover:text-[var(--text)] hover:bg-[var(--panel)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:max-w-[15rem]">
                <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-[18px]">manage_search</span>
                <input
                  value={localSearch}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  className="app-input text-sm py-2.5 w-full"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Refine visible results"
                />
              </div>
            </div>
          </section>

          {submittedSearch ? (
            filteredJobs.length ? (
              <>
                {result.jobs.length ? (
                  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className={getStatCardClasses('green')}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15"><span className="material-symbols-outlined text-[16px] text-emerald-400">fiber_new</span></span>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Fresh Listings</p>
                      </div>
                      <p className="text-3xl font-black tracking-tight">{dashboardStats.freshJobs}</p>
                      <p className="mt-1 text-xs opacity-80">Posted in last 7 days</p>
                    </div>

                    <div className={getStatCardClasses(dashboardStats.averageGhostRisk >= 50 ? 'red' : 'amber')}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-current/10"><span className="material-symbols-outlined text-[16px]">visibility_off</span></span>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Ghost Risk</p>
                      </div>
                      <p className="text-3xl font-black tracking-tight">{dashboardStats.averageGhostRisk}%</p>
                      <p className="mt-1 text-xs opacity-80">{dashboardStats.ghostAlertCount} listings flagged</p>
                    </div>

                    {submittedSearch.useAnalysis ? (
                      <div className={getStatCardClasses('purple')}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-500/15"><span className="material-symbols-outlined text-[16px] text-fuchsia-300">auto_awesome</span></span>
                          <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Strong Matches</p>
                        </div>
                        <p className="text-3xl font-black tracking-tight">{dashboardStats.strongMatchCount}</p>
                        <p className="mt-1 text-xs opacity-80">Profile fit 70%+</p>
                      </div>
                    ) : null}

                    {isInternshipSearch ? (
                      <div className={getStatCardClasses('red')}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15"><span className="material-symbols-outlined text-[16px] text-rose-300">warning</span></span>
                          <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Exploitation Alerts</p>
                        </div>
                        <p className="text-3xl font-black tracking-tight">{dashboardStats.exploitationCount}</p>
                        <p className="mt-1 text-xs opacity-80">Unfair stipend detected</p>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section className="space-y-3">
                    {result.exhausted ? (
                      <div className="rounded-[1.25rem] border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
                        Some sources are limited right now. Aptico is showing the results that were still available.
                      </div>
                    ) : null}

                    {paginatedJobs.map((job) => {
                      const isSelected = selectedJob?.id === job.id;

                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => setSelectedJobId(job.id)}
                          className={`group/card w-full rounded-[2rem] border p-5 text-left transition-all duration-200 ${
                            isSelected
                              ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)] shadow-[0_8px_30px_rgba(78,222,163,0.08)] ring-1 ring-[var(--accent)]'
                              : 'border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-soft)] hover:border-[var(--accent)]/30 hover:-translate-y-0.5 hover:shadow-lg'
                          }`}
                        >
                          {job.isScam ? (
                            <div
                              title="Shows patterns common in fraudulent job postings"
                              className="mb-3 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-400"
                            >
                              <span className="material-symbols-outlined text-[16px]">shield</span>
                              Unverified listing - verify before applying
                            </div>
                          ) : null}

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex min-w-0 items-center gap-4">
                                <div className={`min-w-[52px] shrink-0 rounded-xl border px-2.5 py-2 text-center flex flex-col justify-center items-center transition-colors ${
                                  job.matchScore >= 85 ? 'border-emerald-500/25 bg-emerald-500/10' : job.matchScore >= 70 ? 'border-cyan-500/25 bg-cyan-500/10' : 'border-amber-500/25 bg-amber-500/10'
                                }`}>
                                  <p className={`text-lg font-black tracking-tight ${
                                    job.matchScore >= 85 ? 'text-emerald-400' : job.matchScore >= 70 ? 'text-cyan-400' : 'text-amber-400'
                                  }`}>{job.matchScore}</p>
                                  <p className="text-[9px] uppercase font-bold text-[var(--muted)] tracking-wider">Fit</p>
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-base font-black tracking-tight text-[var(--text)] truncate group-hover/card:text-[var(--accent-strong)] transition-colors">{job.title}</h4>
                                  <p className="text-sm font-medium text-[var(--muted-strong)] truncate mt-0.5">
                                    {job.company} · {job.location}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                               <div className="hidden md:flex flex-wrap items-center justify-end gap-2 max-w-[400px]">
                                 <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] py-1 px-2.5 text-[10px] font-bold text-[var(--muted-strong)]">
                                   <span className="material-symbols-outlined text-[12px]">payments</span>
                                   {job.compensation}
                                 </span>
                                 <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] py-1 px-2.5 text-[10px] font-bold text-[var(--muted-strong)]">
                                   <span className="material-symbols-outlined text-[12px]">schedule</span>
                                   {job.postedLabel}
                                 </span>
                                 {job.isScam ? (
                                   <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-400">
                                     <span className="material-symbols-outlined text-[12px]">error</span>
                                     Verify
                                   </span>
                                 ) : null}
                               </div>
                               <span className="material-symbols-outlined text-[var(--muted)] transition-transform group-hover/card:translate-x-1">chevron_right</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {totalPages > 1 && (
                      <div className="mt-6 flex flex-col items-stretch gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 app-button-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => prev - 1)}
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                          Previous
                        </button>
                        <span className="text-center text-sm font-bold text-[var(--muted-strong)]">
                          Page <span className="text-[var(--text)]">{currentPage}</span> of <span className="text-[var(--text)]">{totalPages}</span>
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 app-button-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                        >
                          Next
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    )}
                </section>

                {selectedJobId && selectedJob ? (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity" onClick={() => setSelectedJobId(null)} />
                    <div className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--bg)] rounded-[2rem] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden z-10">
                      <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-[var(--panel-soft)] shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(78,222,163,0.06),transparent_60%)] pointer-events-none" />
                        <div className="relative flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                            <span className="material-symbols-outlined text-[16px] text-[var(--accent-strong)]">work</span>
                          </span>
                          <h3 className="text-lg font-black tracking-tight text-[var(--text)] truncate pr-4">Role Details</h3>
                        </div>
                        <button type="button" onClick={() => setSelectedJobId(null)} className="relative flex items-center justify-center h-9 w-9 rounded-xl hover:bg-[var(--panel-strong)] transition text-[var(--muted-strong)] hover:text-[var(--text)]">
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </header>
                      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                        {selectedJob.isScam ? (
                          <div title="Shows patterns common in fraudulent job postings" className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-400">
                            <span className="material-symbols-outlined text-[18px]">shield</span>
                            Unverified listing - verify before applying
                          </div>
                        ) : null}

                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {renderSourceTone(selectedJob.source) && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-[var(--muted-strong)] font-bold">
                                  <span className="material-symbols-outlined text-[12px]">language</span>
                                  {renderSourceTone(selectedJob.source)}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold ${selectedJob.tone.className}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                {selectedJob.tone.label}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-xl font-black tracking-tight text-[var(--text)]">{selectedJob.title}</h3>
                              <p className="text-sm font-medium text-[var(--muted-strong)] mt-1.5">
                                {selectedJob.company} · {selectedJob.location}
                              </p>
                            </div>
                          </div>

                          <div className={`min-w-[72px] shrink-0 rounded-2xl border px-3 py-3 text-center ${selectedJob.match?.matchColor === 'green' ? 'border-emerald-500/25 bg-emerald-500/10' : selectedJob.match?.matchColor === 'amber' ? 'border-amber-500/25 bg-amber-500/10' : 'border-rose-500/25 bg-rose-500/10'}`}>
                            <p className={`text-3xl font-black tracking-tight ${selectedJob.match?.matchColor === 'green' ? 'text-emerald-400' : selectedJob.match?.matchColor === 'amber' ? 'text-amber-400' : 'text-rose-400'}`}>
                              {selectedJob.matchScore}%
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--muted)] mt-1">Match</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="app-chip">{selectedJob.compensation}</span>
                          <span className="app-chip">{selectedJob.postedLabel}</span>
                          <span title={selectedJob.applyWindow?.windowMessage} className={`rounded-full border px-3 py-1 text-xs ${getSignalClasses(selectedJob.applyWindow?.windowColor)}`}>
                            {selectedJob.applyWindow?.windowLabel}
                          </span>
                          {selectedJob.ghost?.ghostScore > 25 ? (
                            <span title={`Ghost Score: ${selectedJob.ghost.ghostScore}/100`} className={`rounded-full border px-3 py-1 text-xs ${getSignalClasses(selectedJob.ghost.ghostColor)}`}>
                              {selectedJob.ghost.ghostLabel}
                            </span>
                          ) : null}
                          <span title={selectedJob.responseLikelihood?.likelihoodTip} className={`rounded-full border px-3 py-1 text-xs ${getSignalClasses(selectedJob.responseLikelihood?.likelihoodColor)}`}>
                            {selectedJob.responseLikelihood?.likelihoodLabel}
                          </span>
                          {selectedJob.stipendFairness ? (
                            <span title={selectedJob.stipendFairness.fairnessMessage} className={`rounded-full border px-3 py-1 text-xs ${getSignalClasses(selectedJob.stipendFairness.fairnessColor)}`}>
                              {selectedJob.stipendFairness.fairnessLabel}
                            </span>
                          ) : null}
                        </div>

                        {selectedJob.match ? (
                          <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wider whitespace-nowrap">Your Fit</span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--panel-strong)]">
                                <div className={`h-full rounded-full ${getProgressBarClasses(selectedJob.match.matchColor)}`} style={{ width: `${selectedJob.match.matchScore}%` }} />
                              </div>
                            </div>

                            {selectedJob.match.missingFromThisJob?.length ? (
                              <div className="mt-4 space-y-2.5">
                                <p className="text-xs text-[var(--text)] font-medium">Missing Skills:</p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedJob.match.missingFromThisJob.map((skill) => (
                                    <button
                                      key={skill}
                                      type="button"
                                      onClick={() => handleSkillClick(skill)}
                                      className="rounded-[0.5rem] border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 transition hover:border-cyan-400/40"
                                    >
                                      {skill}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-3.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-strong)] mb-1.5">Apply Window</p>
                            <p className="text-sm leading-6 text-[var(--text)]">{selectedJob.applyWindow?.windowMessage}</p>
                          </div>
                          <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-3.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-strong)] mb-1.5">Response Signal</p>
                            <p className="text-sm leading-6 text-[var(--text)]">{selectedJob.responseLikelihood?.likelihoodTip}</p>
                          </div>
                        </div>

                        {selectedJob.stipendFairness ? (
                          <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-3.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-strong)] mb-1.5">Stipend Fairness</p>
                            <p className="text-sm leading-6 text-[var(--text)]">{selectedJob.stipendFairness.fairnessMessage}</p>
                          </div>
                        ) : null}

                        <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-strong)] mb-3">Role Summary</p>
                          <div className="text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap max-h-[22rem] overflow-y-auto pr-2 custom-scrollbar">
                            {selectedJob.description || 'No description was provided by this source.'}
                          </div>
                        </div>

                        {matchedSkills.length ? (
                          <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-strong)] mb-3">Matched Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {matchedSkills.map((skill) => (
                                <span key={skill} className="app-chip py-1 text-[11px]">{skill}</span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <a href={selectedJob.applyUrl} target="_blank" rel="noreferrer" className="app-button flex-1 justify-center py-2.5 shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            Apply
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              void handleSaveToPipeline(selectedJob);
                            }}
                            disabled={!auth.isAuthenticated || savingJobId === selectedJob.id || savedJobIds.has(selectedJob.id)}
                            className="app-button-secondary flex-1 justify-center py-2.5 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[18px]">{(savingJobId === selectedJob.id || savedJobIds.has(selectedJob.id)) ? 'bookmark_added' : 'bookmark'}</span>
                            {savingJobId === selectedJob.id ? 'Saving...' : savedJobIds.has(selectedJob.id) ? 'Saved' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {isInternshipSearch ? (
                  <section className="app-panel mt-6 space-y-4">
                    <button type="button" onClick={() => setShowBenchmarks((current) => !current)} className="flex items-center gap-3 text-left text-sm font-semibold text-[var(--text)]">
                      <span className="material-symbols-outlined text-[18px]">{showBenchmarks ? 'expand_less' : 'expand_more'}</span>
                      Show Stipend Benchmarks
                    </button>

                    {showBenchmarks ? (
                      <div className="space-y-4 rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5 mt-3">
                        <h3 className="text-base font-bold text-[var(--text)]">Internship Stipend Benchmarks - India 2025</h3>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-[var(--border)] text-sm text-[var(--muted-strong)]">
                            <thead>
                              <tr className="text-left text-[var(--text)]">
                                <th className="pb-3 pr-4 font-semibold">Role Category</th>
                                <th className="pb-3 pr-4 font-semibold">City Tier</th>
                                <th className="pb-3 font-semibold">Fair Range (₹/month)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {STIPEND_BENCHMARK_ROWS.map(([role, tier, range]) => (
                                <tr key={`${role}-${tier}`}>
                                  <td className="py-2.5 pr-4">{role}</td>
                                  <td className="py-2.5 pr-4">{tier}</td>
                                  <td className="py-2.5">{range}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <p className="text-xs text-[var(--muted-strong)] leading-relaxed">Listings below minimum are flagged as Exploitation Risk in the search results.</p>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </>
            ) : jobsQuery.isFetching ? (
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel-soft)] px-6 py-16 text-center flex flex-col items-center justify-center space-y-5">
                <span className="material-symbols-outlined animate-spin text-4xl text-[var(--accent)]">progress_activity</span>
                <div>
                  <p className="text-base font-bold text-[var(--text)]">Searching active sources...</p>
                  <p className="text-sm text-[var(--muted-strong)] mt-1">This may take a moment</p>
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-[var(--border)] px-6 py-16 text-center flex flex-col items-center justify-center">
                {result.exhausted ? (
                  <div className="space-y-4">
                    <span className="material-symbols-outlined text-4xl text-[var(--muted)]">cloud_off</span>
                    <p className="text-base font-bold text-[var(--text)]">Sources temporarily limited</p>
                    <p className="text-sm text-[var(--muted-strong)]">Please retry in a few minutes.</p>
                    <button type="button" onClick={handleRetry} className="app-button-secondary mx-auto mt-2">
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      Retry search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="material-symbols-outlined text-4xl text-[var(--muted)]">search_off</span>
                    <p className="text-base font-bold text-[var(--text)]">No results found</p>
                    <p className="text-sm text-[var(--muted-strong)] max-w-md">Try a broader title, a different focus, or clear the local refinement box.</p>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[var(--border)] px-6 py-16 text-center flex flex-col items-center justify-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--panel)] border border-[var(--border)] shadow-xl">
                <span className="material-symbols-outlined text-3xl text-[var(--muted)]">explore</span>
              </div>
              <p className="text-base font-bold text-[var(--text)]">Ready to Discover</p>
              <p className="text-sm text-[var(--muted-strong)] max-w-md">Start a search to pull jobs from the routed Aptico sources.</p>
            </div>
          )}

          {submittedSearch && cachedSourceCount ? (
            <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--muted-strong)] mt-4 inline-block">
              {cachedSourceCount} source{cachedSourceCount > 1 ? 's were' : ' was'} served from cache.
            </div>
          ) : null}
        </main>
      </div>
    </AppShell>
  );
}
