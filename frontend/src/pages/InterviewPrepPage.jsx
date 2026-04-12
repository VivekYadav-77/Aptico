import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import {
  clearInterviewPrep,
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

function InterviewPrepCard({ analysis, dispatch, openAnalysis }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article className={`app-panel flex flex-col relative transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-xl border-[var(--border-strong)]' : 'hover:border-[var(--border-strong)]'}`}>
      <div 
        className="absolute top-0 left-0 w-1.5 h-full bg-[var(--ui-brand)] transition-opacity duration-300" 
        style={{ opacity: isExpanded ? 1 : 0 }}
      />
      
      <div 
        className={`flex flex-wrap items-start justify-between gap-4 cursor-pointer pl-1 ${isExpanded ? 'pb-2' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <p className="app-kicker">Saved prep set</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--text)] transition-colors">
            {analysis.companyName || analysis.stage1?.companyName || 'Interview prep'}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">{formatDateTime(analysis.createdAt)}</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => openAnalysis(analysis)} className="app-button-secondary">Open workspace</button>
          <button
            type="button"
            onClick={() => dispatch(removeInterviewPrep({ id: analysis.id, localId: analysis.localId }))}
            className="app-button-secondary !text-red-500 hover:!bg-red-500/10 hover:!border-red-500/20"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--panel-soft)] transition-colors focus:outline-none"
            aria-label={isExpanded ? "Collapse details" : "Expand details"}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-300 text-[var(--muted-strong)] ${isExpanded ? 'rotate-180' : ''}`}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
        <div className="overflow-hidden">
          <div className="space-y-6 pb-2 pl-1">
            {analysis.stage2?.interviewQuestions?.length ? (
              <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-6 transition-colors hover:border-[var(--ui-brand)]/20">
                <p className="app-field-label flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--ui-brand)]">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" x2="16" y1="2" y2="6"/>
                    <line x1="8" x2="8" y1="2" y2="6"/>
                    <line x1="3" x2="21" y1="10" y2="10"/>
                    <path d="M8 14h.01"/>
                    <path d="M12 14h.01"/>
                    <path d="M16 14h.01"/>
                    <path d="M8 18h.01"/>
                    <path d="M12 18h.01"/>
                    <path d="M16 18h.01"/>
                  </svg>
                  Interview questions
                </p>
                <ol className="mt-5 grid gap-4">
                  {analysis.stage2.interviewQuestions.map((question, index) => (
                    <li key={`${analysis.id || analysis.localId}-question-${index}`} className="flex gap-4 rounded-[1rem] border border-[var(--border)] bg-[var(--panel)] px-5 py-4 text-sm leading-7 text-[var(--text)] transition-all hover:border-[var(--ui-brand)]/30 hover:bg-[var(--panel-soft)] hover:shadow-sm">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ui-brand)]/10 text-xs font-bold text-[var(--ui-brand)]">
                        {index + 1}
                      </span>
                      <span className="flex-1 mt-0.5">{question}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {analysis.stage2?.salaryCoach ? (
              <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-6 transition-colors hover:border-green-500/20">
                <p className="app-field-label flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                    <path d="M12 18V6"/>
                  </svg>
                  Salary negotiation prep
                </p>
                <div className="mt-5 rounded-[1rem] border border-[var(--border)] bg-[var(--panel)] px-5 py-6 transition-colors hover:bg-[var(--panel-soft)]">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--text)]">
                    {analysis.stage2.salaryCoach}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function InterviewPrepPage() {
  const analysisHistory = useSelector(selectAnalysisHistory);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const interviewPrepItems = analysisHistory.filter((item) => !item.hideInterviewPrep && (item.stage2?.interviewQuestions?.length || item.stage2?.salaryCoach));

  function openAnalysis(analysis) {
    navigate('/analysis-history', { state: { openId: analysis.id || analysis.localId } });
  }

  return (
    <AppShell
      title="Interview prep"
      description="All saved interview questions and salary-prep notes live here so you can review them together on a dedicated page."
      actions={
        <>
          <Link to="/dashboard" className="app-button-secondary">Dashboard</Link>
          {interviewPrepItems.length ? (
            <button type="button" onClick={() => dispatch(clearInterviewPrep())} className="app-button-secondary !text-red-500 hover:!bg-red-500/10 hover:!border-red-500/20">Delete all</button>
          ) : null}
        </>
      }
    >
      <section className="space-y-5">
        {interviewPrepItems.length ? (
          interviewPrepItems.map((analysis) => (
            <InterviewPrepCard 
              key={analysis.id || analysis.localId}
              analysis={analysis} 
              dispatch={dispatch} 
              openAnalysis={openAnalysis} 
            />
          ))
        ) : (
          <section className="app-panel">
            <div className="flex flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-5 py-16 text-center text-sm leading-7 text-[var(--muted-strong)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <p className="max-w-md">No interview-prep content has been saved yet.<br/>When analysis generates interview questions, they will appear here automatically.</p>
            </div>
          </section>
        )}
      </section>
    </AppShell>
  );
}
