import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from '@/lib/router-compat.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { startBackgroundAnalysis, abortActiveAnalysis, getActiveController } from '../api/analysisManager.js';
import DiffViewer from '../components/DiffViewer.jsx';
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
  clearAnalysisHistory,
  removeAnalysisRecord,
  selectAnalysisHistory,
  selectAnalysisWorkspace,
  setAnalysisWorkspace
} from '../store/historySlice.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const INSIGHT_TABS = [
  { id: 1, label: 'Gap analysis', shortLabel: 'Gaps' },
  { id: 2, label: 'Bullet rewrite', shortLabel: 'Rewrite' },
  { id: 3, label: 'Seniority', shortLabel: 'Level' },
  { id: 4, label: 'Interview prep', shortLabel: 'Prep' },
  { id: 5, label: 'Risk flags', shortLabel: 'Risks' },
  { id: 6, label: 'Salary coach', shortLabel: 'Salary' },
  { id: 7, label: 'Learning path', shortLabel: 'Learn' },
  { id: 8, label: 'Outreach', shortLabel: 'Reach' }
];

const SOURCE_LABELS = {
  youtube: 'YouTube',
  course: 'Course',
  docs: 'Docs',
  site: 'Site',
  bootcamp: 'Bootcamp',
  github: 'GitHub'
};

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
}

function formatFileSize(size) {
  if (!size) {
    return '0 KB';
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

function parseRiskItems(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.filter(Boolean).map((item) => String(item).trim());
  }

  return String(input)
    .split(/\n|\u2022|-/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSalaryCoach(text) {
  const sections = { range: '', why: '', position: '', phrases: [], notToSay: [] };
  const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const splitList = (block) =>
    block
      .trim()
      .split('\n')
      .map((line) => line.replace(/^\s*[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);

  const rangeMatch = raw.match(/ESTIMATED\s+RANGE[:\s-]*\n?([\s\S]*?)(?=WHY\s+THIS\s+RANGE|$)/i);
  const whyMatch = raw.match(/WHY\s+THIS\s+RANGE[:\s-]*\n?([\s\S]*?)(?=YOUR\s+NEGOTIATION\s+POSITION|$)/i);
  const positionMatch = raw.match(/YOUR\s+NEGOTIATION\s+POSITION[:\s-]*\n?([\s\S]*?)(?=EXACT\s+PHRASES\s+TO\s+USE|$)/i);
  const phrasesMatch = raw.match(/EXACT\s+PHRASES\s+TO\s+USE[:\s-]*\n?([\s\S]*?)(?=WHAT\s+NOT\s+TO\s+SAY|$)/i);
  const notToSayMatch = raw.match(/WHAT\s+NOT\s+TO\s+SAY[:\s-]*\n?([\s\S]*?)$/i);

  if (rangeMatch) sections.range = rangeMatch[1].trim().split('\n').filter(Boolean).join(' ');
  if (whyMatch) sections.why = whyMatch[1].trim();
  if (positionMatch) sections.position = positionMatch[1].trim().split('\n').filter(Boolean).join(' ');
  if (phrasesMatch) sections.phrases = splitList(phrasesMatch[1]);
  if (notToSayMatch) sections.notToSay = splitList(notToSayMatch[1]);

  return sections;
}

function parseOutreachContent(content) {
  if (!content) {
    return { coldEmail: '', coverLetter: '' };
  }

  if (typeof content === 'string') {
    return { coldEmail: content, coverLetter: '' };
  }

  return {
    coldEmail: content.coldEmail || content.cold_email || '',
    coverLetter: content.coverLetter || content.cover_letter || ''
  };
}

function getQuestionPriority(index) {
  if (index === 0) {
    return { label: 'High likelihood', className: 'bg-[var(--danger-soft)] text-rose-300 border-[var(--danger-border)]' };
  }

  if (index <= 2) {
    return { label: 'Medium likelihood', className: 'bg-[var(--warning-soft)] text-[var(--warning-text)] border-[var(--warning-border)]' };
  }

  return { label: 'Likely follow-up', className: 'bg-[var(--accent-soft)] text-[var(--accent-strong)] border-[var(--border)]' };
}

function getPositionColor(positionText) {
  const lower = String(positionText || '').toLowerCase();

  if (lower.startsWith('strong')) return { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300' };
  if (lower.startsWith('weak')) return { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-300' };

  return { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-300' };
}

function getHourColor(hours) {
  const safeHours = Number(hours || 0);

  if (safeHours <= 20) return { bar: 'bg-emerald-400', label: 'text-emerald-300', badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' };
  if (safeHours <= 50) return { bar: 'bg-amber-400', label: 'text-amber-300', badge: 'bg-amber-400/10 text-amber-300 border-amber-400/20' };

  return { bar: 'bg-rose-400', label: 'text-rose-300', badge: 'bg-rose-400/10 text-rose-300 border-rose-400/20' };
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

function FeatureButton({ active, ready, label, shortLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-bold tracking-wide transition-all duration-300 ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent)] text-[#003824] shadow-[0_0_15px_rgba(78,222,163,0.25)] scale-105'
          : ready
            ? 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--panel)]'
            : 'border-[var(--border)] bg-transparent text-[var(--muted)] opacity-60'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full transition-all duration-300 ${
          active ? 'bg-[#003824]' : ready ? 'bg-[var(--accent)] shadow-[0_0_8px_rgba(78,222,163,0.4)]' : 'border border-[var(--muted)]'
        }`}
      />
      <span>{label}</span>
      <span className={`hidden rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] sm:inline transition-colors ${active ? 'bg-[#003824]/10' : 'bg-[var(--bg)]'}`}>
        {shortLabel}
      </span>
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-8 py-16 text-center shadow-inner">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--panel)] border border-[var(--border)] shadow-xl">
        <span className="material-symbols-outlined text-4xl text-[var(--muted)]">history_toggle_off</span>
      </div>
      <h3 className="mb-2 text-xl font-bold text-[var(--text)]">No Data Available</h3>
      <p className="max-w-md text-sm leading-7 text-[var(--muted-strong)]">{message}</p>
    </div>
  );
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

function ScoreRing({ value }) {
  const normalizedValue = clampPercent(value);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" className="fill-none text-[var(--panel-strong)]" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          className="fill-none text-[var(--accent)] transition-all duration-700"
        />
      </svg>
      <div className="text-center">
        <span className="mono-text block text-4xl font-bold text-[var(--text)]">{normalizedValue}</span>
        <span className="app-field-label">Match score</span>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, tone = 'accent' }) {
  const safeValue = clampPercent(value);
  const barTone = tone === 'warning' ? 'bg-amber-400' : tone === 'danger' ? 'bg-rose-400' : 'bg-[var(--accent)]';
  const valueTone = tone === 'warning' ? 'text-amber-300' : tone === 'danger' ? 'text-rose-300' : 'text-[var(--accent)]';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 mono-text text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        <span>{label}</span>
        <span className={valueTone}>{safeValue}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-strong)]">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
function InsightContent({ selectedTab, stage1, stage2, stage3, loadingStates }) {
  if (loadingStates[selectedTab]) {
    return <EmptyState message="This insight is still processing. Keep the workspace open while Aptico streams the result." />;
  }

  if (selectedTab === 1) {
    const mismatches = stage1?.keywordMismatches || [];

    return mismatches.length ? (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="group rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 transition-all hover:border-rose-500/40 hover:shadow-[0_4px_20px_rgba(244,63,94,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10"><span className="material-symbols-outlined text-[16px] text-rose-400">warning</span></span>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-rose-300">Missing signals</p>
            </div>
            <p className="text-3xl font-black text-[var(--text)]">{mismatches.length}</p>
          </div>
          <div className="group rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 transition-all hover:border-emerald-500/40 hover:shadow-[0_4px_20px_rgba(16,185,129,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10"><span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span></span>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-300">Matched skills</p>
            </div>
            <p className="text-3xl font-black text-[var(--text)]">{stage1?.skillsPresent?.length || 0}</p>
          </div>
          <div className="group rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-5 transition-all hover:border-[var(--accent)]/40 hover:shadow-[0_4px_20px_rgba(78,222,163,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/10"><span className="material-symbols-outlined text-[16px] text-[var(--accent-strong)]">speed</span></span>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--accent-strong)]">Confidence</p>
            </div>
            <p className="text-3xl font-black text-[var(--text)]">{clampPercent(stage1?.confidenceScore)}%</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] shadow-lg">
          <div className="hidden md:grid grid-cols-[minmax(140px,0.8fr)_1fr_1fr] bg-[var(--panel-strong)] px-6 py-4 text-[10px] uppercase tracking-[0.22em] font-bold text-[var(--muted)]">
            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">key</span>Skill</span>
            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">work</span>Job needs</span>
            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">description</span>Resume evidence</span>
          </div>
          <div className="divide-y divide-[var(--border)] bg-[var(--panel)]">
            {mismatches.map((item, index) => (
              <article key={`${item.keyword}-${index}`} className="group/row grid gap-4 px-6 py-5 md:grid-cols-[minmax(140px,0.8fr)_1fr_1fr] transition-colors hover:bg-[var(--panel-soft)]">
                <div>
                  <p className="font-bold text-[var(--text)] group-hover/row:text-[var(--accent-strong)] transition-colors">{item.keyword}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                    Gap detected
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[var(--muted-strong)]">{item.jobRequirement || 'No requirement details were returned.'}</p>
                <p className="text-sm leading-relaxed text-[var(--text)]">{item.resumeEvidence || 'No resume evidence was found for this item.'}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <EmptyState message="Run an analysis to see job-to-resume gaps." />
    );
  }

  if (selectedTab === 2) {
    return stage1?.rewriteSuggestions?.length ? <DiffViewer items={stage1.rewriteSuggestions} /> : <EmptyState message="Rewrite suggestions will appear here." />;
  }

  if (selectedTab === 3) {
    return stage1?.seniorityMismatches?.length ? (
      <div className="grid gap-5">
        {stage1.seniorityMismatches.map((item, index) => (
          <article key={`${item.topic}-${index}`} className="group rounded-[2rem] border border-[var(--border)] bg-[var(--panel-soft)] p-6 transition-all hover:border-amber-500/30 hover:shadow-[0_4px_20px_rgba(245,158,11,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="material-symbols-outlined text-[18px] text-amber-400">trending_up</span>
                </span>
                <p className="text-lg font-black text-[var(--text)]">{item.topic}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
                <span className="material-symbols-outlined text-[12px]">swap_vert</span>
                Level delta
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50 rounded-r" />
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">person</span>Your Level</p>
                <p className="text-sm leading-relaxed font-medium text-[var(--text)]">{item.resumeLevel}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]/50 rounded-r" />
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">flag</span>Target Level</p>
                <p className="text-sm leading-relaxed font-medium text-[var(--text)]">{item.targetLevel}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-[var(--muted-strong)] border-t border-[var(--border)] pt-5">{item.explanation}</p>
          </article>
        ))}
      </div>
    ) : (
      <EmptyState message="Seniority alignment results will appear here." />
    );
  }

  if (selectedTab === 4) {
    return stage2?.interviewQuestions?.length ? (
      <ol className="grid gap-4">
        {stage2.interviewQuestions.map((question, index) => {
          const priority = getQuestionPriority(index);

          return (
            <li key={`${question}-${index}`} className="group flex flex-col gap-4 rounded-[2rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5 lg:flex-row lg:items-center lg:justify-between transition-all hover:border-[var(--accent)]/30 hover:shadow-[0_4px_20px_rgba(78,222,163,0.06)]">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 font-mono text-sm font-black text-[var(--accent-strong)]">{String(index + 1).padStart(2, '0')}</span>
                <p className="text-sm leading-relaxed text-[var(--text)] pt-2">{question}</p>
              </div>
              <span className={`inline-flex w-fit flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${priority.className}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                {priority.label}
              </span>
            </li>
          );
        })}
      </ol>
    ) : (
      <EmptyState message="Interview questions will appear here." />
    );
  }

  if (selectedTab === 5) {
    const riskItems = parseRiskItems(stage2?.rejectionReasons);

    return riskItems.length ? (
      <div className="rounded-[2rem] border border-rose-500/20 bg-gradient-to-b from-rose-500/5 to-transparent p-6">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-rose-500/15">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <span className="material-symbols-outlined text-2xl text-rose-400">shield</span>
          </span>
          <div>
            <h4 className="text-lg font-black text-[var(--text)]">Rejection Risk Analysis</h4>
            <p className="text-sm text-[var(--muted-strong)]">These are the blockers Aptico identified from the current resume-job pairing.</p>
          </div>
        </div>
        <div className="space-y-3">
          {riskItems.map((risk, index) => (
            <article key={`${risk}-${index}`} className="group flex items-start gap-4 rounded-xl border border-rose-500/15 bg-[var(--panel)]/50 p-5 transition-all hover:border-rose-500/30 hover:bg-rose-500/5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-rose-500/10 mt-0.5">
                <span className="material-symbols-outlined text-[18px] text-rose-400">error</span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-relaxed text-[var(--text)]">{risk}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Address before applying
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    ) : (
      <EmptyState message="Rejection risk insights will appear here." />
    );
  }

  if (selectedTab === 6) {
    return stage2?.salaryCoach ? <SalaryCoachView content={stage2.salaryCoach} /> : <EmptyState message="Salary coaching will appear here." />;
  }

  if (selectedTab === 7) {
    return stage3?.learningPath?.length ? <LearningPathView content={stage3.learningPath} /> : <EmptyState message="Skill-learning guidance will appear here." />;
  }

  return stage3?.coldEmail || stage3?.coverLetter ? (
    <OutreachView content={{ coldEmail: stage3?.coldEmail, coverLetter: stage3?.coverLetter }} />
  ) : (
    <EmptyState message="Cold email and outreach copy will appear here." />
  );
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      // Clipboard may be unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
        copied
          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent-strong)] shadow-[0_0_10px_rgba(78,222,163,0.15)]'
          : 'border-[var(--border)] text-[var(--muted-strong)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)] hover:bg-[var(--accent)]/5'
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
      {copied ? 'Copied!' : label}
    </button>
  );
}

function SalaryCoachView({ content }) {
  const sections = parseSalaryCoach(content);
  const positionColors = getPositionColor(sections.position);

  return (
    <div className="grid gap-6">
      <div className="rounded-[2rem] border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-transparent p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <span className="material-symbols-outlined text-3xl text-emerald-400 mb-3">payments</span>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-300 mb-2">Estimated compensation range</p>
          <p className="text-3xl font-black text-[var(--text)]">{sections.range || 'Not provided'}</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel-soft)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--panel)] border border-[var(--border)]">
            <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">info</span>
          </span>
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)]">Why this range</h4>
        </div>
        <p className="text-sm leading-relaxed text-[var(--text)]">{sections.why || 'No explanation returned from the backend.'}</p>
      </div>

      <div className={`rounded-[2rem] border p-6 ${positionColors.border} ${positionColors.bg}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${positionColors.bg} border ${positionColors.border}`}>
            <span className={`material-symbols-outlined text-[16px] ${positionColors.text}`}>gavel</span>
          </span>
          <h4 className={`text-[10px] uppercase tracking-[0.2em] font-bold ${positionColors.text}`}>Your negotiation position</h4>
        </div>
        <p className={`text-sm leading-relaxed font-medium ${positionColors.text}`}>{sections.position || 'No position guidance returned.'}</p>
      </div>

      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel-soft)] p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <span className="material-symbols-outlined text-[16px] text-[var(--accent-strong)]">format_quote</span>
          </span>
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)]">Exact phrases to use</h4>
        </div>
        <div className="grid gap-3">
          {sections.phrases.length ? (
            sections.phrases.map((phrase, index) => (
              <div key={`${phrase}-${index}`} className="group flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 transition-all hover:border-[var(--accent)]/30">
                <p className="text-sm leading-relaxed text-[var(--text)]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[10px] font-black text-[var(--accent-strong)] mr-3">{index + 1}</span>
                  {phrase}
                </p>
                <CopyButton text={phrase} />
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted-strong)]">No ready-to-use phrases were returned.</p>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-rose-500/20 bg-gradient-to-b from-rose-500/5 to-transparent p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20">
            <span className="material-symbols-outlined text-[16px] text-rose-400">block</span>
          </span>
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-rose-300">What not to say</h4>
        </div>
        <div className="grid gap-3">
          {sections.notToSay.length ? (
            sections.notToSay.map((phrase, index) => (
              <div key={`${phrase}-${index}`} className="rounded-xl border border-rose-500/15 bg-[var(--panel)]/50 p-4 text-sm leading-relaxed text-[var(--text)] transition-all hover:border-rose-500/30">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10 text-[10px] font-black text-rose-400 mr-3">{index + 1}</span>
                {phrase}
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted-strong)]">No restricted phrases were returned.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function LearningPathView({ content }) {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const maxHours = Math.max(...content.map((item) => Number(item.total_honest_hours || item.hours || 0)), 1);

  return (
    <div className="grid gap-5">
      {content.map((item, index) => {
        const isExpanded = expandedIndex === index;
        const hours = Number(item.total_honest_hours || item.hours || 0);
        const resources = item.resources || item.sources || [];
        const dayPlan = item.day_bootcamp || item.day_plan || [];
        const tutorPrompt = item.ai_tutor_prompt || item.self_study_prompt || item.bootcamp_prompt || '';
        const missingSkill = item.missing_skill || item.skill_gap || item.reason || item.summary;
        const daysRequired = item.days_required || item.estimated_days || dayPlan.length || (hours ? Math.ceil(hours / 2) : null);
        const hourColors = getHourColor(hours);
        const barWidth = Math.round((hours / maxHours) * 100);

        return (
          <article key={`${item.skill}-${index}`} className={`min-w-0 overflow-hidden rounded-[1.5rem] border transition-all sm:rounded-[2rem] ${isExpanded ? 'border-[var(--accent)]/30 shadow-[0_4px_20px_rgba(78,222,163,0.06)] bg-[var(--panel)]' : 'border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--accent)]/20'}`}>
            <button
              type="button"
              onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
              className="flex w-full min-w-0 flex-col gap-4 p-4 text-left transition-colors sm:p-6"
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors ${isExpanded ? 'bg-[var(--accent)] border-[var(--accent)] text-[#003824]' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--accent-strong)]'}`}>
                    <span className="material-symbols-outlined text-[20px]">school</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-black leading-snug text-[var(--text)] [overflow-wrap:break-word] sm:text-lg">{item.skill}</p>
                    {missingSkill ? <p className="mt-1 text-sm leading-relaxed text-[var(--muted-strong)] [overflow-wrap:break-word] sm:truncate">{missingSkill}</p> : null}
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 pl-[3.25rem] sm:w-auto sm:flex-shrink-0 sm:justify-end sm:gap-3 sm:pl-0">
                  {daysRequired ? (
                    <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--muted-strong)]">
                      {daysRequired}d
                    </span>
                  ) : null}
                  <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-bold ${hourColors.badge}`}>{hours || 0}h</span>
                  <span className={`ml-auto material-symbols-outlined transition-transform duration-300 text-[var(--muted)] sm:ml-0 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)]">
                  <span>Time investment</span>
                  <span className={hourColors.label}>{hours || 0} hours</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-strong)]">
                  <div className={`h-full rounded-full ${hourColors.bar} transition-all duration-500`} style={{ width: `${barWidth}%` }} />
                </div>
              </div>
            </button>

            {isExpanded ? (
              <div className="space-y-5 border-t border-[var(--border)] p-4 animate-in slide-in-from-top-2 duration-200 sm:space-y-6 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 relative overflow-hidden sm:p-5">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50 rounded-r" />
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)] mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">psychology</span>Skill Gap</p>
                    <p className="text-sm leading-relaxed text-[var(--text)]">{missingSkill || 'No missing-skill summary was returned.'}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 relative overflow-hidden sm:p-5">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]/50 rounded-r" />
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)] mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">calendar_month</span>Duration</p>
                    <p className="text-sm leading-relaxed text-[var(--text)]">{daysRequired ? `${daysRequired} days estimated` : 'No estimate returned'}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20"><span className="material-symbols-outlined text-[14px] text-[var(--accent-strong)]">link</span></span>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)]">References</h4>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {resources.length ? (
                      resources.map((resource, resourceIndex) => (
                        <a
                          key={`${resource.title || resource.url}-${resourceIndex}`}
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group/ref flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 transition-all hover:border-[var(--accent)]/40 hover:shadow-[0_4px_15px_rgba(78,222,163,0.06)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[var(--text)] group-hover/ref:text-[var(--accent-strong)] transition-colors">{resource.title || 'Untitled reference'}</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">{SOURCE_LABELS[resource.type] || resource.type || 'Reference'}</p>
                            </div>
                            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em] ${resource.free ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                              {resource.free ? 'Free' : 'Paid'}
                            </span>
                          </div>
                          {resource.why ? <p className="text-xs leading-5 text-[var(--muted-strong)]">{resource.why}</p> : null}
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--muted-strong)]">No references were returned.</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20"><span className="material-symbols-outlined text-[14px] text-violet-400">fitness_center</span></span>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)]">7 Day Bootcamp</h4>
                  </div>
                  <div className="grid gap-3">
                    {dayPlan.length ? (
                      dayPlan.map((day, dayIndex) => (
                        <div key={`${day.day || dayIndex}-${dayIndex}`} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 transition-all hover:border-violet-500/20">
                          <div className="flex items-start gap-4">
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 font-mono text-[10px] font-black text-violet-400">
                              D{day.day || dayIndex + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[var(--text)]">{day.focus || day.goal || 'Study block'}</p>
                              {day.tasks?.length ? (
                                <div className="mt-2 space-y-1.5">
                                  {day.tasks.map((task, taskIndex) => (
                                    <p key={`${task}-${taskIndex}`} className="text-xs leading-5 text-[var(--muted-strong)] flex items-start gap-2">
                                      <span className="text-[var(--accent)] mt-0.5">›</span>
                                      {task}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                              {day.practice_question ? <p className="mt-2 text-xs leading-5 font-semibold text-[var(--accent-strong)]">{day.practice_question}</p> : null}
                            </div>
                            {day.duration_minutes ? <span className="text-[10px] font-bold text-[var(--muted)] bg-[var(--panel)] px-2 py-1 rounded-full">{day.duration_minutes}m</span> : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--muted-strong)]">No bootcamp plan was returned.</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20"><span className="material-symbols-outlined text-[14px] text-sky-400">build</span></span>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)]">Project Suggestions</h4>
                  </div>
                  <div className="grid gap-3">
                    {item.projects?.length ? (
                      item.projects.map((project, projectIndex) => (
                        <div key={`${project.title}-${projectIndex}`} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-5 transition-all hover:border-sky-500/20">
                          <p className="text-sm font-bold text-[var(--text)]">{project.title}</p>
                          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">{project.description}</p>
                          {project.github_search ? (
                            <a
                              href={`https://github.com/search?q=${encodeURIComponent(project.github_search)}&type=repositories`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
                            >
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                              GitHub References
                            </a>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--muted-strong)]">No project suggestions were returned.</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20"><span className="material-symbols-outlined text-[14px] text-[var(--accent-strong)]">smart_toy</span></span>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted)]">AI Tutor Prompt</h4>
                    </div>
                    {tutorPrompt ? <CopyButton text={tutorPrompt} label="Copy prompt" /> : null}
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[#0d0e10] p-5 shadow-inner">
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300 font-mono">{tutorPrompt || 'No AI prompt was returned.'}</pre>
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function OutreachView({ content }) {
  const [activeTab, setActiveTab] = useState('coldEmail');
  const { coldEmail, coverLetter } = parseOutreachContent(content);
  const tabs = [
    { id: 'coldEmail', label: 'Cold email', icon: 'mail', value: coldEmail },
    { id: 'coverLetter', label: 'Cover letter', icon: 'draft', value: coverLetter }
  ].filter((tab) => tab.value);
  const activeValue = tabs.find((tab) => tab.id === activeTab)?.value || tabs[0]?.value || '';
  const activeIcon = tabs.find((tab) => tab.id === activeTab)?.icon || tabs[0]?.icon || 'mail';

  if (!tabs.length) {
    return <EmptyState message="Cold email and cover letter content will appear here." />;
  }

  return (
    <div className="space-y-5">
      <div className="inline-flex gap-2 p-1.5 rounded-xl bg-[var(--panel-strong)] border border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all duration-300 ${activeTab === tab.id ? 'bg-[var(--accent)] text-[#003824] shadow-[0_0_15px_rgba(78,222,163,0.2)]' : 'text-[var(--muted-strong)] hover:text-[var(--text)] hover:bg-[var(--panel)]'}`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-[2rem] border border-[var(--border)] bg-[#0d0e10] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
              <span className="material-symbols-outlined text-[16px] text-[var(--accent-strong)]">{activeIcon}</span>
            </span>
            <div>
              <p className="text-sm font-bold text-zinc-200">{activeTab === 'coverLetter' ? 'Cover Letter' : 'Cold Email'}</p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Generated output</p>
            </div>
          </div>
          <CopyButton text={activeValue} label={`Copy ${activeTab === 'coverLetter' ? 'letter' : 'email'}`} />
        </div>
        <div className="p-6">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 font-mono">{activeValue}</pre>
        </div>
      </div>
    </div>
  );
}


export default function AnalysisHistoryPage() {
  const analysisHistory = useSelector(selectAnalysisHistory);
  const dispatch = useDispatch();
  const location = useLocation();
  const [expandedId, setExpandedId] = useState(location.state?.openId || null);

  return (
    <AppShell
      title="Analysis history"
      description="Review all your past resume-to-job matches and tailored AI insights here. Access any report at any time."
      actions={
        <>
          <Link to="/analysis" className="app-button">New analysis</Link>
          <Link to="/dashboard" className="app-button-secondary">Main dashboard</Link>
          {analysisHistory.length > 0 && (
            <button type="button" onClick={() => dispatch(clearAnalysisHistory())} className="app-button-secondary !text-red-500 hover:!bg-red-500/10 hover:!border-red-500/20">
              Clear All
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {analysisHistory.length === 0 ? (
           <EmptyState message="No analysis history found. Start by running a new analysis." />
        ) : (
          analysisHistory.map(analysis => (
            <AnalysisHistoryCard 
               key={analysis.id || analysis.localId} 
               analysis={analysis} 
               isExpanded={expandedId === (analysis.id || analysis.localId)}
               onToggle={() => setExpandedId(expandedId === (analysis.id || analysis.localId) ? null : (analysis.id || analysis.localId))}
               dispatch={dispatch}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}

function AnalysisHistoryCard({ analysis, isExpanded, onToggle, dispatch }) {
  const [selectedTab, setSelectedTab] = useState(1);
  const { stage1, stage2, stage3, precheck } = analysis;

  const readyTabs = useMemo(() => ({
    1: Boolean(stage1), 2: Boolean(stage1), 3: Boolean(stage1),
    4: Boolean(stage2), 5: Boolean(stage2), 6: Boolean(stage2),
    7: Boolean(stage3), 8: Boolean(stage3)
  }), [stage1, stage2, stage3]);

  const loadingStates = {}; 

  const scoreValue = stage1?.confidenceScore || precheck?.score || 0;
  const mismatchCount = stage1?.keywordMismatches?.length || 0;
  const matchedSkills = Array.isArray(analysis.matchedSkills) ? analysis.matchedSkills : (stage1?.skillsPresent || []);
  const skillsCoverage = matchedSkills.length + mismatchCount > 0 ? (matchedSkills.length / (matchedSkills.length + mismatchCount)) * 100 : stage1 ? 100 : 0;
  const seniorityScore = stage1?.seniorityMismatches?.length ? 100 - Math.min(80, stage1.seniorityMismatches.length * 25) : stage1 ? 88 : 0;
  const keywordScore = stage1 ? clampPercent((clampPercent(stage1.confidenceScore) + clampPercent(skillsCoverage)) / 2) : 0;
  const topMissingSkills = useMemo(() => (stage1?.keywordMismatches || []).map((item) => item.keyword).filter(Boolean).slice(0, 4), [stage1]);

  return (
    <div className={`group rounded-[2rem] border transition-all overflow-hidden flex flex-col ${isExpanded ? 'border-[var(--accent)]/50 shadow-[0_0_40px_rgba(78,222,163,0.05)] bg-[var(--panel)]' : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent)]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-0.5'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-8 cursor-pointer relative" onClick={onToggle}>
         <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
         <div className="relative z-10 flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-3 mb-2">
               <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <span className="material-symbols-outlined text-[14px]">analytics</span>
               </span>
               <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--muted-strong)]">Saved sequence</p>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-[var(--text)] truncate">{analysis.companyName || stage1?.companyName || 'Role Analysis'}</h3>
            <p className="mt-1 text-sm font-medium text-[var(--muted-strong)] truncate">
              <span className="text-[var(--text)]">{stage1?.jobTitle || analysis.jobTitle || 'Target Role'}</span>
              <span className="mx-2 opacity-30">•</span>
              <span className="font-mono text-xs">{new Date(analysis.createdAt).toLocaleString()}</span>
            </p>
         </div>
         
          <div className="relative z-10 flex items-center gap-6 mt-4 sm:mt-0 sm:pl-4 sm:border-l border-[var(--border)]">
            <div className="flex flex-col items-end justify-center">
               <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold mb-0.5">Match score</span>
               <div className="flex items-baseline gap-1">
                 <span className="text-3xl font-black text-[var(--accent)]">{scoreValue}</span>
                 <span className="text-sm font-bold text-[var(--accent)]">%</span>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); dispatch(removeAnalysisRecord({ id: analysis.id, localId: analysis.localId })); }} 
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted-strong)] hover:bg-rose-500/10 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Delete record"
               >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
               </button>
               
               <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isExpanded ? 'bg-[var(--accent)] text-[#003824]' : 'bg-[var(--panel-strong)] text-[var(--text)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent-strong)]'}`}>
                 <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                   expand_more
                 </span>
               </div>
            </div>
         </div>
       </div>

       {isExpanded && (
          <div className="relative border-t border-[var(--border)] p-4 sm:p-10 bg-[var(--panel-soft)] overflow-hidden animate-in slide-in-from-top-2 duration-300">
            <div className="absolute top-0 right-0 p-32 bg-[radial-gradient(circle_at_top_right,rgba(78,222,163,0.08),transparent_60%)] pointer-events-none" />
            
            <div className="relative z-10 space-y-10">
              <div className="flex flex-col lg:flex-row gap-10 lg:items-center">
                <div className="flex-shrink-0 flex items-center justify-center">
                  <ScoreRing value={scoreValue} />
                </div>

                <div className="flex-1 min-w-0 space-y-6">
                  <div>
                    <p className="app-kicker flex items-center gap-2">
                       <span className="material-symbols-outlined text-[16px]">summarize</span>
                       Executive Brief
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text)]">
                      {stage1?.companyName || 'Target Organization'}
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-[var(--muted-strong)] max-w-2xl">
                      {analysis.summary || stage1?.summary || 'No summary generated.'}
                    </p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-3 pt-6 border-t border-[var(--border)]">
                    <SummaryMetric label="Hard skills" value={skillsCoverage} />
                    <SummaryMetric label="Experience" value={seniorityScore} tone={seniorityScore < 55 ? 'warning' : 'accent'} />
                    <SummaryMetric label="Keywords" value={keywordScore} tone={keywordScore < 55 ? 'warning' : 'accent'} />
                  </div>

                  {matchedSkills.length > 0 || topMissingSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {(matchedSkills.length ? matchedSkills : topMissingSkills).slice(0, 8).map((skill) => (
                        <span key={skill} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 font-mono text-[11px] font-semibold text-[var(--accent-strong)] shadow-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {precheck && !precheck.canProceed ? (
                <div className="rounded-[1.5rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-6 shadow-inner">
                  <p className="app-kicker flex items-center gap-2 text-rose-300">
                     <span className="material-symbols-outlined text-[16px]">block</span>
                     Compatibility check
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[var(--text)]">{precheck.score}/100 compatibility</h3>
                  <p className="mt-3 text-base leading-relaxed text-[var(--muted-strong)]">{precheck.reason}</p>
                </div>
              ) : null}

              {precheck?.canProceed || stage1 || stage2 || stage3 ? (
                <div className="pt-2">
                  <div className="flex flex-wrap gap-3 p-1.5 rounded-2xl bg-[var(--panel-strong)]/50 backdrop-blur-sm border border-[var(--border)] mb-8 w-fit max-w-full overflow-x-auto">
                    {INSIGHT_TABS.map((tab) => (
                      <FeatureButton
                        key={tab.id}
                        active={selectedTab === tab.id}
                        ready={readyTabs[tab.id]}
                        label={tab.label}
                        shortLabel={tab.shortLabel}
                        onClick={() => setSelectedTab(tab.id)}
                      />
                    ))}
                  </div>

                  <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-xl sm:rounded-[2rem] sm:p-8">
                    <div className="mb-8 border-b border-[var(--border)] pb-4 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                         <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </span>
                      <div>
                        <h3 className="text-xl font-black text-[var(--text)] tracking-tight">{INSIGHT_TABS.find((tab) => tab.id === selectedTab)?.label}</h3>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Active Module</p>
                      </div>
                    </div>

                    <InsightContent selectedTab={selectedTab} stage1={stage1} stage2={stage2} stage3={stage3} loadingStates={loadingStates} />
                  </div>
                </div>
              ) : null}
            </div>
         </div>
       )}
    </div>
  );
}
