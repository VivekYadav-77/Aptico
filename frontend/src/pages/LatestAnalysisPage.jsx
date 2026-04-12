import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import {
  removeAnalysisRecord,
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

function InsightBadge({ children, tone = 'default' }) {
  const tones = {
    default: 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted-strong)]',
    accent: 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
  };

  return <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${tones[tone]}`}>{children}</span>;
}

export default function LatestAnalysisPage() {
  const analysisHistory = useSelector(selectAnalysisHistory);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const latestAnalysis = analysisHistory[0] || null;

  function handleContinue() {
    if (!latestAnalysis) {
      return;
    }
    navigate('/analysis-history', { state: { openId: latestAnalysis.id || latestAnalysis.localId } });
  }

  return (
    <AppShell
      title="Continue last analysis"
      description="Your most recent saved analysis stays here so you can review it first, then reopen the full workspace when you are ready."
      actions={
        <>
          <Link to="/dashboard" className="app-button-secondary">Dashboard</Link>
          {latestAnalysis ? (
            <button type="button" onClick={handleContinue} className="app-button">Continue analysis</button>
          ) : (
            <Link to="/analysis" className="app-button">Start analysis</Link>
          )}
        </>
      }
    >
      {latestAnalysis ? (
        <section className="app-panel space-y-6">
          <div className="flex flex-wrap gap-2">
            <InsightBadge tone="accent">{latestAnalysis.confidenceScore || 0}% match</InsightBadge>
            <InsightBadge>{formatDateTime(latestAnalysis.createdAt)}</InsightBadge>
          </div>

          <div>
            <p className="app-kicker">Latest saved result</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--text)]">
              {latestAnalysis.companyName || latestAnalysis.stage1?.companyName || 'Latest analysis'}
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-8 text-[var(--muted-strong)]">
              {latestAnalysis.summary || latestAnalysis.stage1?.summary || 'This saved analysis is ready to reopen in the analysis workspace.'}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5">
              <p className="app-field-label">Matched skills</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(latestAnalysis.matchedSkills || []).slice(0, 12).map((skill) => (
                  <span key={skill} className="app-chip">{skill}</span>
                ))}
                {!(latestAnalysis.matchedSkills || []).length ? <span className="app-chip">No saved skills</span> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleContinue} className="app-button">Continue to report</button>
          </div>
        </section>
      ) : (
        <section className="app-panel">
          <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-5 py-10 text-sm leading-7 text-[var(--muted-strong)]">
            No saved analysis is available yet. Run a new analysis and it will appear here automatically.
            <div className="mt-6">
              <Link to="/analysis-history" className="app-button-secondary">See reports</Link>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
