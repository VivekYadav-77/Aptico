import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { deleteAllSavedJobs, deleteSavedJob } from '../api/jobsApi.js';
import { fetchDashboardSummary } from '../api/profileApi.js';
import AppShell from '../components/AppShell.jsx';
import { selectCurrentAnalysis, selectJobSearchState } from '../store/historySlice.js';
import {
  clearSavedJobsDetails,
  getSavedJobsDetailsMap,
  hydrateSavedJobsDetails,
  removeSavedJobDetails
} from '../utils/savedJobsStorage.js';

function formatSavedDate(value) {
  if (!value) return 'Recently saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently saved';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatPostedDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getJobUrl(job) {
  return job.url || '#';
}

export default function SavedJobsPage() {
  const currentAnalysis = useSelector(selectCurrentAnalysis);
  const persistedJobSearchState = useSelector(selectJobSearchState);
  const queryClient = useQueryClient();
  const [detailsVersion, setDetailsVersion] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [deletingSavedJobId, setDeletingSavedJobId] = useState(null);
  const [clearingSavedJobs, setClearingSavedJobs] = useState(false);
  const [savedJobsActionError, setSavedJobsActionError] = useState('');
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const dashboardQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    retry: false
  });

  useEffect(() => {
    if (!dashboardQuery.data?.savedJobs?.length) {
      return;
    }

    hydrateSavedJobsDetails(dashboardQuery.data.savedJobs, persistedJobSearchState?.result?.jobs || []);
    setDetailsVersion((current) => current + 1);
  }, [dashboardQuery.data?.savedJobs, persistedJobSearchState?.result?.jobs]);

  const savedJobs = useMemo(() => {
    const detailsMap = getSavedJobsDetailsMap();

    return (dashboardQuery.data?.savedJobs || []).map((job) => ({
      ...job,
      ...detailsMap[job.id],
      url: detailsMap[job.id]?.url || job.url,
      location: detailsMap[job.id]?.location || job.location,
      source: detailsMap[job.id]?.source || job.source,
      stipend: detailsMap[job.id]?.stipend || job.stipend,
      matchPercent: detailsMap[job.id]?.matchPercent ?? job.matchPercent
    }));
  }, [dashboardQuery.data?.savedJobs, detailsVersion]);

  const selectedJob = useMemo(() => {
    if (!savedJobs.length || !selectedJobId) {
      return null;
    }

    return savedJobs.find((job) => job.id === selectedJobId) || null;
  }, [savedJobs, selectedJobId]);

  useEffect(() => {
    if (selectedJobId && !selectedJob) {
      setSelectedJobId(null);
    }
  }, [selectedJob, selectedJobId]);

  const totalPages = Math.ceil(savedJobs.length / itemsPerPage);
  
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return savedJobs.slice(startIndex, startIndex + itemsPerPage);
  }, [savedJobs, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  async function handleDeleteSavedJob(savedJobId) {
    setDeletingSavedJobId(savedJobId);
    setSavedJobsActionError('');
    try {
      await deleteSavedJob(savedJobId);
      removeSavedJobDetails(savedJobId);
      setDetailsVersion((current) => current + 1);
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (error) {
      setSavedJobsActionError(error.response?.data?.error || 'Could not delete this saved job.');
    } finally {
      setDeletingSavedJobId(null);
    }
  }

  async function handleDeleteAllSavedJobs() {
    setClearingSavedJobs(true);
    setSavedJobsActionError('');
    try {
      await deleteAllSavedJobs();
      clearSavedJobsDetails();
      setDetailsVersion((current) => current + 1);
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (error) {
      setSavedJobsActionError(error.response?.data?.error || 'Could not delete saved jobs.');
    } finally {
      setClearingSavedJobs(false);
    }
  }

  function handleGenerateApplyKit(job) {
    const fullJobDescription = [
      `Job Title: ${job.title || 'Not specified'}`,
      `Company: ${job.company || 'Not specified'}`,
      `Location: ${job.location || 'Not specified'}`,
      `Compensation: ${job.stipend || 'Not specified'}`,
      '',
      'Job Description:',
      job.description || 'Not provided.'
    ].join('\n');

    navigate('/analysis', {
      state: {
        jobDescription: fullJobDescription
      }
    });
  }

  return (
    <AppShell
      title="Saved jobs"
      description="Your saved jobs are back on a dedicated page with fuller job data, saved dates, and an open-details panel."
      actions={
        <>
          <Link to="/dashboard" className="app-button-secondary">Dashboard</Link>
          <Link to="/jobs" className="app-button-secondary">Search jobs</Link>
          {savedJobs.length ? (
            <button type="button" onClick={() => void handleDeleteAllSavedJobs()} disabled={clearingSavedJobs} className="app-button-secondary">
              {clearingSavedJobs ? 'Deleting...' : 'Delete all'}
            </button>
          ) : null}
        </>
      }
    >
      {savedJobsActionError ? (
        <div className="rounded-[1.25rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-rose-300">
          {savedJobsActionError}
        </div>
      ) : null}

      <section className="mt-6 space-y-8">
        {savedJobs.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className="w-full h-full flex flex-col rounded-[1.75rem] border border-[var(--border)] bg-[var(--panel)] p-5 text-left transition hover:scale-[1.02] hover:border-[var(--accent)]/40 hover:bg-[var(--panel-soft)] shadow-sm hover:shadow-md"
                >
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                        {job.source || 'Saved job'}
                      </span>
                      {typeof job.matchPercent === 'number' ? (
                        <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                          Match {job.matchPercent}%
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="line-clamp-2 text-lg font-bold text-[var(--text)] leading-tight">{job.title}</h3>
                      <p className="mt-2 text-sm text-[var(--muted-strong)]">
                        {job.company}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[1rem]">location_on</span>
                        <span className="line-clamp-1">{job.location || 'Location unavailable'}</span>
                      </p>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-[var(--muted-strong)] border-t border-[var(--border)] pt-4 mt-auto">
                      {job.description || 'Full description will appear here for saved jobs created from the newer search flow.'}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between w-full">
                     <span className="text-xs text-[var(--muted-strong)]">Saved {formatSavedDate(job.savedAt)}</span>
                     <span className="material-symbols-outlined text-[var(--accent)]">open_in_new</span>
                  </div>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6 text-sm">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] transition hover:bg-[var(--panel-soft)] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span className="text-[var(--text)] font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] transition hover:bg-[var(--panel-soft)] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="app-panel rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-5 py-10 text-center text-sm leading-7 text-[var(--muted-strong)]">
            No saved jobs yet. Save roles from the search page and they will appear here.
          </div>
        )}
      </section>

      {selectedJob ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-sm"
            onClick={() => setSelectedJobId(null)}
          ></div>
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setSelectedJobId(null)}
              className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--panel-soft)] text-[var(--text)] hover:bg-[var(--border)] transition"
            >
              <span className="material-symbols-outlined text-[1.25rem]">close</span>
            </button>
            <div className="space-y-8 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pr-8">
                <div>
                  <p className="app-kicker">Job Details</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--text)]">{selectedJob.title}</h2>
                  <p className="mt-2 text-base text-[var(--muted-strong)]">
                    {selectedJob.company} · {selectedJob.location || 'Saved job'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteSavedJob(selectedJob.id)}
                  disabled={deletingSavedJobId === selectedJob.id}
                  className="app-button-secondary shrink-0 text-red-500 hover:border-red-500/30 hover:bg-red-500/10"
                >
                  <span className="material-symbols-outlined text-[1.25rem] mr-2">delete</span>
                  {deletingSavedJobId === selectedJob.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="app-chip">{selectedJob.source || 'Saved job'}</span>
                <span className="app-chip">{selectedJob.stipend || 'Compensation not saved'}</span>
                <span className="app-chip">{selectedJob.jobType || 'Type unavailable'}</span>
                <span className="app-chip">Saved {formatSavedDate(selectedJob.savedAt)}</span>
                <span className="app-chip">Posted {formatPostedDate(selectedJob.postedAt)}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                  <p className="app-field-label">Stored details</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                    {typeof selectedJob.matchPercent === 'number' ? `Match ${selectedJob.matchPercent}%` : 'Match not stored yet'}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                  <p className="app-field-label">Saved source</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">{selectedJob.source || 'Saved job'}</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-6">
                <p className="app-field-label">Full description</p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted-strong)]">
                  {selectedJob.description || 'This saved job was created before full description capture was added. New saved jobs now keep their description here.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a href={getJobUrl(selectedJob)} target="_blank" rel="noreferrer" className="app-button">
                  <span className="material-symbols-outlined mr-2">open_in_new</span>
                  Open job link
                </a>
                <button
                  type="button"
                  onClick={() => handleGenerateApplyKit(selectedJob)}
                  className="app-button-secondary bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20 hover:bg-[var(--accent)]/20"
                >
                  <span className="material-symbols-outlined mr-2">work</span>
                  Generate Apply Kit
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
