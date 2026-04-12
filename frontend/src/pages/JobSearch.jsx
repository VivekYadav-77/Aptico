import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios.js';
import ApplyKitModal from '../components/ApplyKitModal.jsx';
import JobCard from '../components/JobCard.jsx';
import { selectAuth } from '../store/authSlice.js';
import { selectCurrentAnalysis } from '../store/historySlice.js';
import { saveSavedJobDetails } from '../utils/savedJobsStorage.js';

const FILTER_OPTIONS = ['All', 'Full Time', 'Contract', 'Internship'];

export default function JobSearch() {
  const auth = useSelector(selectAuth);
  const currentAnalysis = useSelector(selectCurrentAnalysis);
  const [query, setQuery] = useState('software engineer');
  const [location, setLocation] = useState('remote');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savingUrl, setSavingUrl] = useState('');
  const [activeJob, setActiveJob] = useState(null);

  const filteredJobs = useMemo(() => {
    if (selectedFilter === 'All') {
      return jobs;
    }

    const normalizedFilter = selectedFilter.toLowerCase();
    return jobs.filter((job) => job.jobType.toLowerCase().includes(normalizedFilter.replace(' ', '_')) || job.jobType.toLowerCase().includes(normalizedFilter));
  }, [jobs, selectedFilter]);

  async function handleSearch(event) {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setStatus('');

    try {
      const response = await api.get('/api/jobs', {
        params: {
          q: query,
          location
        }
      });

      setJobs(response.data.data.jobs || []);
      setMeta(response.data.data.meta || null);
      setStatus(response.data.data.cached ? 'Loaded from Redis cache.' : 'Fetched fresh job listings.');
    } catch (requestError) {
      setJobs([]);
      setMeta(null);
      setError(requestError.response?.data?.error || 'Could not load jobs.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(job) {
    setSavingUrl(job.url);
    setError('');
    setStatus('');

    try {
      const response = await api.post('/api/jobs/save', {
        title: job.title,
        company: job.company,
        source: job.source,
        url: job.url,
        stipend: job.stipend,
        matchPercent: job.matchPercent
      });

      saveSavedJobDetails(response.data?.data?.id, {
        description: job.description || '',
        location: job.location || '',
        jobType: job.jobType || '',
        postedAt: job.postedAt || null,
        source: job.source || '',
        url: job.url || '',
        stipend: job.stipend || null,
        matchPercent: job.matchPercent ?? null
      });

      setStatus(`Bookmarked ${job.title}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not save job.');
    } finally {
      setSavingUrl('');
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-10 text-[var(--text)]">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">Aptico Job Search</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Multi-source role discovery</h1>
            <p className="text-sm text-[var(--muted-strong)]">Search across the configured sources, see match percentages when analysis exists, and bookmark roles to your account.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard" className="rounded-full border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]">
              Dashboard
            </Link>
            <Link to="/auth" className="rounded-full border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]">
              Auth
            </Link>
          </div>
        </header>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-6">
          <form className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_auto]" onSubmit={handleSearch}>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Role or keyword</span>
              <div className="relative flex items-center">
                {/* Search Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="pointer-events-none absolute left-3.5 h-4 w-4 shrink-0 text-[var(--accent-strong)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="app-input"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="frontend developer"
                  required
                />
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Location</span>
              <div className="relative flex items-center">
                {/* Location / Map-pin Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="pointer-events-none absolute left-3.5 h-4 w-4 shrink-0 text-[var(--accent-strong)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z" />
                  <circle cx="12" cy="8" r="2" />
                </svg>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="app-input"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="remote"
                  required
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="app-button self-end disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Searching...' : 'Search jobs'}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedFilter(option)}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${
                  selectedFilter === option
                    ? 'bg-[var(--accent)] text-slate-950'
                    : 'border border-[var(--border)] text-[var(--muted-strong)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-[var(--muted-strong)]">
            <span className="rounded-full border border-[var(--border)] px-3 py-1">
              Session: {auth.isAuthenticated ? auth.user?.email || 'Signed in' : auth.guestMode ? 'Guest mode' : 'Anonymous'}
            </span>
            {meta?.usedFallback ? <span className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-soft)] px-3 py-1 text-[var(--warning-text)]">DDGS fallback used</span> : null}
            {meta?.sources?.map((source) => (
              <span key={source.source} className="rounded-full border border-[var(--border)] px-3 py-1">
                {source.source}: {source.ok ? `${source.count} jobs` : 'failed'}
              </span>
            ))}
          </div>
        </section>

        {status ? (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-700 dark:text-emerald-200">{status}</div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-700 dark:text-rose-200">{error}</div>
        ) : null}

        <section className="grid gap-5">
          {filteredJobs.length ? (
            filteredJobs.map((job) => (
              <JobCard
                key={`${job.sourceKey}-${job.id}`}
                job={job}
                onOpenApplyKit={setActiveJob}
                onSave={handleSave}
                isSaving={savingUrl === job.url}
                saveDisabled={!auth.isAuthenticated}
                applyDisabled={!currentAnalysis?.id}
              />
            ))
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-6 py-12 text-center text-sm text-[var(--muted-strong)]">
              Search for a role to load jobs from the configured sources.
            </div>
          )}
        </section>

        <ApplyKitModal
          isOpen={Boolean(activeJob)}
          onClose={() => setActiveJob(null)}
          job={activeJob}
          analysisId={currentAnalysis?.id || null}
        />
      </div>
    </main>
  );
}
