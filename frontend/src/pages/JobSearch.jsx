import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios.js';
import ApplyKitModal from '../components/ApplyKitModal.jsx';
import JobCard from '../components/JobCard.jsx';
import { selectAuth } from '../store/authSlice.js';
import { selectCurrentAnalysis } from '../store/historySlice.js';

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
      await api.post('/api/jobs/save', {
        title: job.title,
        company: job.company,
        source: job.source,
        url: job.url,
        stipend: job.stipend,
        matchPercent: job.matchPercent
      });

      setStatus(`Bookmarked ${job.title}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not save job.');
    } finally {
      setSavingUrl('');
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Aptico Job Search</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Multi-source role discovery</h1>
            <p className="text-sm text-slate-300">Search across the configured sources, see match percentages when analysis exists, and bookmark roles to your account.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard" className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200">
              Dashboard
            </Link>
            <Link to="/auth" className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200">
              Auth
            </Link>
          </div>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <form className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_auto]" onSubmit={handleSearch}>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Role or keyword</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                placeholder="frontend developer"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Location</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                placeholder="remote"
                required
              />
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
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
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 px-3 py-1">
              Session: {auth.isAuthenticated ? auth.user?.email || 'Signed in' : auth.guestMode ? 'Guest mode' : 'Anonymous'}
            </span>
            {meta?.usedFallback ? <span className="rounded-full border border-amber-400/30 px-3 py-1 text-amber-200">DDGS fallback used</span> : null}
            {meta?.sources?.map((source) => (
              <span key={source.source} className="rounded-full border border-white/10 px-3 py-1">
                {source.source}: {source.ok ? `${source.count} jobs` : 'failed'}
              </span>
            ))}
          </div>
        </section>

        {status ? (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">{status}</div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div>
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
            <div className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center text-sm text-slate-400">
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
