import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAllSavedJobs, deleteSavedJob } from '../api/jobsApi.js';
import { fetchDashboardSummary } from '../api/profileApi.js';
import AppShell from '../components/AppShell.jsx';
import { selectAuth } from '../store/authSlice.js';
import {
  clearAnalysisHistory,
  clearInterviewPrep,
  removeAnalysisRecord,
  removeInterviewPrep,
  selectAnalysisHistory,
  setAnalysisWorkspace,
  setCurrentAnalysis
} from '../store/historySlice.js';

function formatDateTime(value) {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

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

function SectionHeader({ title, count, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="app-kicker">{title}</p>
        <p className="mt-2 text-sm text-[var(--muted-strong)]">{count}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyPanel({ message }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-5 py-10 text-sm leading-7 text-[var(--muted-strong)]">
      {message}
    </div>
  );
}

function InsightBadge({ children, tone = 'default' }) {
  const tones = {
    default: 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted-strong)]',
    accent: 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]',
    warning: 'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
  };
  return <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${tones[tone]}`}>{children}</span>;
}

function AnalysisSummaryCard({ analysis, onContinue, onDelete }) {
  return (
    <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <InsightBadge tone="accent">{analysis.confidenceScore || 0}% match</InsightBadge>
            <InsightBadge>{formatDateTime(analysis.createdAt)}</InsightBadge>
          </div>
          <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--text)]">
            {analysis.companyName || analysis.stage1?.companyName || 'Latest analysis'}
          </h3>
          <p className="text-sm leading-7 text-[var(--muted-strong)]">
            {analysis.summary || analysis.stage1?.summary || 'This analysis is ready to reopen in the workspace.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onContinue} className="app-button-secondary">Continue</button>
          <button type="button" onClick={onDelete} className="app-button-secondary">Delete</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(analysis.matchedSkills || []).slice(0, 6).map((skill) => (
          <span key={skill} className="app-chip">{skill}</span>
        ))}
        {!(analysis.matchedSkills || []).length ? <span className="app-chip">No matched skills saved</span> : null}
      </div>
    </article>
  );
}

export default function MainDashboardV2() {
  const auth = useSelector(selectAuth);
  const analysisHistory = useSelector(selectAnalysisHistory);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [savedJobsActionError, setSavedJobsActionError] = useState('');
  const [deletingSavedJobId, setDeletingSavedJobId] = useState(null);
  const [clearingSavedJobs, setClearingSavedJobs] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    enabled: auth.isAuthenticated,
    retry: false
  });

  const latestAnalysis = analysisHistory[0] || null;
  const recentAnalyses = analysisHistory.slice(0, 2);
  const interviewPrepItems = analysisHistory.filter((item) => item.stage2?.interviewQuestions?.length || item.stage2?.salaryCoach);
  const savedJobs = dashboardQuery.data?.savedJobs || [];

  function continueAnalysis(analysis) {
    dispatch(setAnalysisWorkspace(analysis));
    dispatch(
      setCurrentAnalysis({
        id: analysis.id,
        localId: analysis.localId,
        createdAt: analysis.createdAt,
        companyName: analysis.companyName || analysis.stage1?.companyName || '',
        matchedSkills: analysis.matchedSkills || [],
        confidenceScore: analysis.confidenceScore || 0,
        summary: analysis.summary || ''
      })
    );
    navigate('/analysis');
  }

  async function handleDeleteSavedJob(savedJobId) {
    setDeletingSavedJobId(savedJobId);
    setSavedJobsActionError('');
    try {
      await deleteSavedJob(savedJobId);
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
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (error) {
      setSavedJobsActionError(error.response?.data?.error || 'Could not delete saved jobs.');
    } finally {
      setClearingSavedJobs(false);
    }
  }

  return (
    <AppShell
      title={`Dashboard${auth.user?.name ? `, ${auth.user.name}` : ''}`}
      description="Your latest analysis, saved jobs, interview prep, and recent analysis details stay organized here, with each dashboard card opening its own dedicated page again."
      actions={
        <>
          <Link to="/analysis" className="app-button">New analysis</Link>
          <Link to="/jobs" className="app-button-secondary">Search jobs</Link>
        </>
      }
    >
      <section className="space-y-6">
        <article className="app-panel">
          <SectionHeader
            title="Command Center"
            count={latestAnalysis ? 'Continue the latest saved analysis only.' : 'Run an analysis to populate the command center.'}
          />

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            {latestAnalysis ? (
              <AnalysisSummaryCard
                analysis={latestAnalysis}
                onContinue={() => continueAnalysis(latestAnalysis)}
                onDelete={() => dispatch(removeAnalysisRecord({ id: latestAnalysis.id, localId: latestAnalysis.localId }))}
              />
            ) : (
              <EmptyPanel message="No saved analysis is available yet. Once you run one, it will stay here until you overwrite it with a newer result or delete it." />
            )}

            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--panel)] p-5">
              <p className="app-kicker">Quick links</p>
              <div className="mt-4 grid gap-3">
                <Link to="/analysis" className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]">Upload new resume</Link>
                <Link to="/analysis/latest" className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]">Continue last analysis</Link>
                <Link to="/saved-jobs" className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]">View saved jobs</Link>
                <Link to="/interview-prep" className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]">Interview prep section</Link>
              </div>
            </div>
          </div>
        </article>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="app-panel">
            <SectionHeader
              title="Interview Prep"
              count={interviewPrepItems.length ? `${interviewPrepItems.length} saved interview-prep entries with dates.` : 'No interview prep has been saved yet.'}
              action={
                <div className="flex flex-wrap gap-2">
                  {interviewPrepItems.length ? <button type="button" onClick={() => dispatch(clearInterviewPrep())} className="app-button-secondary">Delete all</button> : null}
                  <Link to="/interview-prep" className="app-button-secondary">Open page</Link>
                </div>
              }
            />

            <div className="mt-5 space-y-4">
              {interviewPrepItems.length ? (
                interviewPrepItems.slice(0, 2).map((analysis) => (
                  <article key={analysis.id || analysis.localId} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-[var(--text)]">{analysis.companyName || analysis.stage1?.companyName || 'Analysis prep'}</h3>
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">{formatDateTime(analysis.createdAt)}</p>
                      </div>
                      <button type="button" onClick={() => dispatch(removeInterviewPrep({ id: analysis.id, localId: analysis.localId }))} className="app-button-secondary">Delete</button>
                    </div>

                    {analysis.stage2?.salaryCoach ? (
                      <div className="mt-4 rounded-[1.1rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                        <p className="app-field-label">Salary negotiation data</p>
                        <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted-strong)]">{analysis.stage2.salaryCoach}</pre>
                      </div>
                    ) : null}

                    {analysis.stage2?.interviewQuestions?.length ? (
                      <div className="mt-4 rounded-[1.1rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                        <p className="app-field-label">Interview questions</p>
                        <ol className="mt-3 grid gap-2">
                          {analysis.stage2.interviewQuestions.slice(0, 3).map((question, index) => (
                            <li key={`${analysis.id || analysis.localId}-question-${index}`} className="text-sm leading-7 text-[var(--text)]">
                              {index + 1}. {question}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <EmptyPanel message="Interview questions and salary negotiation guidance will appear here for each saved analysis date." />
              )}
            </div>
          </article>

          <article className="app-panel">
            <SectionHeader
              title="Recent Analyses"
              count={recentAnalyses.length ? 'Only the top two latest analyses are kept here and older ones are automatically removed.' : 'No recent analyses yet.'}
              action={
                <div className="flex flex-wrap gap-2">
                  {recentAnalyses.length ? <button type="button" onClick={() => dispatch(clearAnalysisHistory())} className="app-button-secondary">Delete all</button> : null}
                  <Link to="/analysis/latest" className="app-button-secondary">Open latest</Link>
                </div>
              }
            />

            <div className="mt-5 space-y-4">
              {recentAnalyses.length ? (
                recentAnalyses.map((analysis) => (
                  <article key={analysis.id || analysis.localId} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <InsightBadge tone="accent">{analysis.confidenceScore || 0}%</InsightBadge>
                          <InsightBadge>{formatDateTime(analysis.createdAt)}</InsightBadge>
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-[var(--text)]">{analysis.companyName || analysis.stage1?.companyName || 'Saved analysis'}</h3>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">{analysis.summary || analysis.stage1?.summary || 'No summary available.'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => continueAnalysis(analysis)} className="app-button-secondary">Open</button>
                        <button type="button" onClick={() => dispatch(removeAnalysisRecord({ id: analysis.id, localId: analysis.localId }))} className="app-button-secondary">Delete</button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[1.1rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                        <p className="app-field-label">Matched skills</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(analysis.matchedSkills || []).slice(0, 6).map((skill) => (
                            <span key={`${analysis.id || analysis.localId}-${skill}`} className="app-chip">{skill}</span>
                          ))}
                          {!(analysis.matchedSkills || []).length ? <span className="app-chip">No saved skills</span> : null}
                        </div>
                      </div>
                      <div className="rounded-[1.1rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                        <p className="app-field-label">Gap highlights</p>
                        <div className="mt-3 space-y-2">
                          {(analysis.stage1?.keywordMismatches || []).slice(0, 3).map((item) => (
                            <p key={`${analysis.id || analysis.localId}-${item.keyword}`} className="text-sm text-[var(--muted-strong)]">
                              {item.keyword}: {item.importance}
                            </p>
                          ))}
                          {!(analysis.stage1?.keywordMismatches || []).length ? <p className="text-sm text-[var(--muted-strong)]">No saved gap highlights.</p> : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyPanel message="Your top two latest full analysis details will appear here with dates." />
              )}
            </div>
          </article>
        </section>

        <article className="app-panel">
          <SectionHeader
            title="Saved Jobs"
            count={savedJobs.length ? `${savedJobs.length} saved jobs are listed with their saved date and available details.` : 'No saved jobs yet.'}
            action={
              <div className="flex flex-wrap gap-2">
                {savedJobs.length ? (
                  <button type="button" onClick={() => void handleDeleteAllSavedJobs()} disabled={clearingSavedJobs} className="app-button-secondary">
                    {clearingSavedJobs ? 'Deleting...' : 'Delete all'}
                  </button>
                ) : null}
                <Link to="/saved-jobs" className="app-button-secondary">Open page</Link>
              </div>
            }
          />

          {savedJobsActionError ? (
            <div className="mt-4 rounded-[1.2rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-rose-300">
              {savedJobsActionError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {savedJobs.length ? (
              savedJobs.map((job) => (
                <article key={job.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <InsightBadge>{job.source || 'Saved job'}</InsightBadge>
                        <InsightBadge tone="warning">{formatSavedDate(job.savedAt)}</InsightBadge>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-[var(--text)]">{job.title}</h3>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">{job.company}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSavedJob(job.id)}
                      disabled={deletingSavedJobId === job.id}
                      className="app-button-secondary"
                    >
                      {deletingSavedJobId === job.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.1rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                      <p className="app-field-label">Saved source</p>
                      <p className="mt-2 text-sm text-[var(--muted-strong)]">{job.location || `Saved from ${job.source}`}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                      <p className="app-field-label">Stored details</p>
                      <p className="mt-2 text-sm text-[var(--muted-strong)]">
                        {job.stipend || 'Compensation not saved'}
                        {typeof job.matchPercent === 'number' ? ` • Match ${job.matchPercent}%` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link to="/saved-jobs" className="app-button-secondary">Open</Link>
                  </div>
                </article>
              ))
            ) : (
              <EmptyPanel message="Saved jobs will appear here in a compact card layout instead of the long dropdown view." />
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
