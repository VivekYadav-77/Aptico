import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from '@/lib/router-compat.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { startBackgroundAnalysis, abortActiveAnalysis, getActiveController } from '../api/analysisManager.js';
import AppShell from '../components/AppShell.jsx';
import { selectAuth } from '../store/authSlice.js';
import {
  selectAnalysis,
  setAnalysisSelectedTab,
  setAnalysisGlobalError,
  hydrateFromWorkspace,
  resetAnalysisLiveState
} from '../store/analysisSlice.js';
import {
  clearAnalysisWorkspace,
  clearCurrentAnalysis,
  clearGeneratedItemsForAnalysis,
  removeAnalysisRecord,
  selectAnalysisWorkspace,
  setAnalysisWorkspace
} from '../store/historySlice.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function formatFileSize(size) {
  if (!size) {
    return '0 KB';
  }
  return `${(size / 1024).toFixed(1)} KB`;
}

function getStepState(step, { hasResume, hasJobDescription, isSubmitting, precheck, stage1, stage2, stage3 }) {
  if (step === 'upload') {
    if (hasResume) return 'complete';
    return 'current';
  }
  if (step === 'parse') {
    if (precheck) return 'complete';
    if (isSubmitting) return 'current';
    return hasResume && hasJobDescription ? 'pending' : 'idle';
  }
  if (step === 'match') {
    if (stage1) return 'complete';
    if (isSubmitting || precheck?.canProceed) return 'current';
    if (precheck && !precheck.canProceed) return 'blocked';
    return 'idle';
  }
  if (step === 'insights') {
    if (stage2 || stage3) return 'current';
    if (stage1) return 'pending';
    return 'idle';
  }
  if (step === 'finalize') {
    if (stage3) return 'complete';
    if (stage2) return 'current';
    return 'idle';
  }
  return 'idle';
}

function ProgressStep({ label, state }) {
  const styles = {
    complete: {
      dot: 'bg-[var(--accent)] shadow-[0_0_10px_rgba(78,222,163,0.45)] border-[var(--accent)]',
      text: 'text-[var(--text)]'
    },
    current: {
      dot: 'border-[var(--accent)] bg-transparent animate-pulse',
      text: 'text-[var(--accent-strong)] font-bold'
    },
    pending: {
      dot: 'border-[var(--border)] bg-[var(--panel-strong)]',
      text: 'text-[var(--muted-strong)]'
    },
    blocked: {
      dot: 'border-[var(--danger-border)] bg-[var(--danger-soft)]',
      text: 'text-rose-300'
    },
    idle: {
      dot: 'border-[var(--border)] bg-transparent',
      text: 'text-[var(--muted)] opacity-70'
    }
  };

  return (
    <div className={`flex items-center gap-3 ${state === 'idle' ? 'opacity-70' : ''}`}>
      <span className={`h-2.5 w-2.5 rounded-full border ${styles[state].dot}`} />
      <span className={`mono-text text-[11px] uppercase tracking-[0.22em] ${styles[state].text}`}>{label}</span>
    </div>
  );
}

export default function AnalysisWorkspace() {
  const auth = useSelector(selectAuth);
  const persistedWorkspace = useSelector(selectAnalysisWorkspace);
  const analysisState = useSelector(selectAnalysis);
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileMeta, setSelectedFileMeta] = useState(persistedWorkspace?.selectedFileMeta || null);
  const location = useLocation();
  const [jobDescription, setJobDescription] = useState(location.state?.jobDescription ?? persistedWorkspace?.jobDescription ?? '');
  const navigate = useNavigate();

  // Force job description update on navigation if it's provided in state,
  // and clear any existing active analysis so the user gets a fresh workspace.
  useEffect(() => {
    if (location.state?.jobDescription) {
      setJobDescription(location.state.jobDescription);
      
      // Clear out any old analysis results 
      dispatch(clearAnalysisWorkspace());
      dispatch(resetAnalysisLiveState());
      
      // Remove the jobDescription from the route state so it doesn't persist on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, dispatch, navigate, location.pathname]);

  // Read live analysis state from Redux
  const isSubmitting = analysisState.isSubmitting;
  const globalError = analysisState.globalError;
  const precheck = analysisState.precheck;
  const stage1 = analysisState.stage1;
  const stage2 = analysisState.stage2;
  const stage3 = analysisState.stage3;

  const setGlobalError = useCallback((msg) => dispatch(setAnalysisGlobalError(msg)), [dispatch]);

  // On mount: hydrate Redux live state from persisted workspace if no active stream
  useEffect(() => {
    const hasActiveStream = getActiveController() !== null;
    if (!hasActiveStream && persistedWorkspace && !analysisState.stage1) {
      dispatch(hydrateFromWorkspace(persistedWorkspace));
    }
  }, [dispatch, persistedWorkspace, analysisState.stage1]);

  const activeFileMeta = selectedFile ? { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type } : selectedFileMeta;

  const progressSteps = [
    { key: 'upload', label: 'Upload' },
    { key: 'parse', label: 'Parse' },
    { key: 'match', label: 'Match' },
    { key: 'insights', label: 'Insights' },
    { key: 'finalize', label: 'Finalize' }
  ];

  const handleAnalyze = useCallback(
    (event) => {
      event.preventDefault();
      setGlobalError('');

      if (!selectedFile && !selectedFileMeta) {
        setGlobalError('Please choose a PDF or DOCX resume first.');
        return;
      }

      if (selectedFile && selectedFile.size > MAX_FILE_BYTES) {
        setGlobalError('File must be under 5 MB.');
        return;
      }

      const fileMeta = selectedFile ? { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type } : selectedFileMeta;
      setSelectedFileMeta(fileMeta);

      startBackgroundAnalysis(
        { file: selectedFile, jobDescription },
        { selectedFileMeta: fileMeta }
      );
    },
    [jobDescription, selectedFile, selectedFileMeta, setGlobalError]
  );

  return (
    <AppShell
      title="AI Command Center"
      description="Initialize analysis sequence to align your resume against the target telemetry."
      actions={
        <>
          <Link to="/dashboard" className="app-button-secondary">Main dashboard</Link>
          <Link to="/analysis-history" className="app-button-secondary">Analyzed history</Link>
          <Link to="/jobs" className="app-button-secondary">Job search</Link>
        </>
      }
    >
      <section className="mx-auto max-w-6xl grid gap-8 xl:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden xl:block h-fit sticky top-24">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl">
            <h3 className="app-field-label mb-6">Sequence Status</h3>
            <div className="space-y-5">
              {progressSteps.map((step) => (
                <ProgressStep
                  key={step.key}
                  label={step.label}
                  state={getStepState(step.key, {
                    hasResume: Boolean(activeFileMeta),
                    hasJobDescription: Boolean(jobDescription.trim()),
                    isSubmitting,
                    precheck,
                    stage1,
                    stage2,
                    stage3
                  })}
                />
              ))}
            </div>
          </div>
        </aside>

        <section className="w-full">
          {isSubmitting ? (
            <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-[var(--border)] bg-[var(--panel)] p-16 shadow-2xl min-h-[500px]">
              <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[var(--accent)]/30 animate-[spin_4s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border border-[var(--accent)]/50 animate-[spin_3s_linear_infinite_reverse]" />
                <div className="absolute inset-6 rounded-full bg-[var(--accent)]/10 animate-pulse" />
                <span className="material-symbols-outlined relative z-10 text-4xl text-[var(--accent)]">radar</span>
              </div>
              <h2 className="mb-2 text-2xl font-black text-[var(--text)] tracking-tight">Processing Telemetry</h2>
              <p className="max-w-md text-center text-sm leading-6 text-[var(--muted-strong)]">
                Aptico is extracting semantic vectors from your resume and aligning them against the job parameters.
              </p>
              
              <div className="mt-8 w-64 overflow-hidden rounded-full bg-[var(--panel-strong)] p-1">
                 <div className="h-1 w-1/3 rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(78,222,163,0.5)] animate-[slide_1.5s_ease-in-out_infinite_alternate]" />
              </div>
            </div>
          ) : (stage1 || precheck || stage2 || stage3) ? (
            <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-[var(--border)] bg-[var(--panel)] p-16 shadow-2xl text-center min-h-[500px]">
               <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                  <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)] animate-ping opacity-20" />
                  <span className="material-symbols-outlined text-4xl text-[var(--accent-strong)]">verified</span>
               </div>
               <h3 className="mb-3 text-3xl font-black text-[var(--text)]">Alignment Complete</h3>
               <p className="mb-8 max-w-sm text-base text-[var(--muted-strong)]">
                  The data stream has been fully processed. Your tactical report is ready.
               </p>
               <div className="flex flex-col items-center gap-4">
                 <button
                    type="button"
                    onClick={() => navigate('/analysis-history', { state: { openId: persistedWorkspace?.id || persistedWorkspace?.localId } })}
                    className="rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-black uppercase tracking-widest text-[#003824] shadow-[0_0_20px_rgba(78,222,163,0.3)] transition hover:scale-[1.02]"
                 >
                    View Tactical Report
                 </button>
                 <button
                    type="button"
                    onClick={() => {
                       dispatch(clearAnalysisWorkspace());
                       dispatch(resetAnalysisLiveState());
                       setSelectedFile(null);
                       setSelectedFileMeta(null);
                       setJobDescription('');
                    }}
                    className="text-xs font-bold uppercase tracking-widest text-[var(--muted-strong)] hover:text-[var(--text)] transition-colors"
                 >
                    Start New Analysis
                 </button>
               </div>
            </div>
          ) : (
            <div className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--panel)] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-[radial-gradient(circle_at_top_right,rgba(78,222,163,0.05),transparent_70%)] pointer-events-none" />
              
              <form className="relative z-10 space-y-8" onSubmit={handleAnalyze}>
                {globalError ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm font-medium text-rose-300">
                    <span className="material-symbols-outlined text-rose-400">warning</span>
                    {globalError}
                  </div>
                ) : null}

                <div className="grid gap-6 md:grid-cols-2">
                  <label className="group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-[var(--border)] bg-[var(--panel-soft)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] || null;
                        setSelectedFile(nextFile);
                        setSelectedFileMeta(nextFile ? { name: nextFile.name, size: nextFile.size, type: nextFile.type } : null);
                      }}
                      className="sr-only"
                    />
                    
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] shadow-xl transition-all group-hover:border-[var(--accent)] group-hover:text-[var(--accent-strong)] group-hover:shadow-[0_0_25px_rgba(78,222,163,0.15)]">
                      <span className="material-symbols-outlined text-4xl text-[var(--muted)] group-hover:text-[var(--accent-strong)] transition-colors">upload_file</span>
                    </div>
                    
                    <div className="text-center px-6">
                      <p className="text-lg font-bold text-[var(--text)] group-hover:text-[var(--accent-strong)] transition-colors">
                        {activeFileMeta ? 'Resume Attached' : 'Load Resume File'}
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted-strong)]">
                        {activeFileMeta
                          ? `${activeFileMeta.name} (${formatFileSize(activeFileMeta.size)})`
                          : 'Drop a PDF or DOCX file here.'}
                      </p>
                    </div>
                    
                    {activeFileMeta && (
                      <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[#003824]">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </div>
                    )}
                  </label>

                  <div className="flex flex-col rounded-[2rem] border border-[var(--border)] bg-[#0d0e10] p-6 shadow-inner focus-within:border-[var(--accent)] transition-colors">
                    <div className="mb-4 flex items-center gap-2 text-[var(--muted-strong)]">
                      <span className="material-symbols-outlined text-[18px]">terminal</span>
                      <span className="app-field-label">Target Parameters</span>
                    </div>
                    <textarea
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      className="flex-1 resize-none bg-transparent text-sm leading-7 text-zinc-300 outline-none placeholder:text-zinc-600 font-mono"
                      placeholder="Paste the raw job description here... (Command+V)"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--panel-strong)]">
                       <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">security</span>
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-strong)]">Secure Processing</span>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="group relative flex items-center justify-center gap-2 rounded-full bg-[var(--text)] px-8 py-3.5 text-sm font-black uppercase tracking-widest text-[var(--panel)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Initialize Sequence
                    <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}
