import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { streamAnalysis } from '../api/analyzeApi.js';
import DiffViewer from '../components/DiffViewer.jsx';
import AppShell from '../components/AppShell.jsx';
import { selectAuth } from '../store/authSlice.js';
import { clearCurrentAnalysis, setCurrentAnalysis } from '../store/historySlice.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const WORKSPACE_STORAGE_KEY = 'aptico-analysis-workspace';
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

function readWorkspaceState() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
}

function saveWorkspaceState(state) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures so the analysis flow stays responsive.
  }
}

function clearWorkspaceState() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch (error) {
    // Ignore storage failures so the clear action still resets the UI.
  }
}

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
      className={`group flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent)] text-slate-950'
          : ready
            ? 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--text)] hover:border-[var(--accent)]'
            : 'border-[var(--border)] bg-transparent text-[var(--muted)]'
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          active ? 'bg-slate-950' : ready ? 'bg-[var(--accent)] shadow-[0_0_10px_rgba(78,222,163,0.45)]' : 'border border-[var(--muted)]'
        }`}
      />
      <span>{label}</span>
      <span className={`hidden rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] sm:inline ${active ? 'bg-slate-950/10' : 'bg-black/5 dark:bg-white/5'}`}>
        {shortLabel}
      </span>
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-5 py-10 text-sm leading-7 text-[var(--muted-strong)]">
      {message}
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
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
            <p className="app-field-label">Missing signals</p>
            <p className="mt-2 text-2xl font-bold text-[var(--text)]">{mismatches.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
            <p className="app-field-label">Matched skills</p>
            <p className="mt-2 text-2xl font-bold text-[var(--text)]">{stage1?.skillsPresent?.length || 0}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
            <p className="app-field-label">Confidence</p>
            <p className="mt-2 text-2xl font-bold text-[var(--text)]">{clampPercent(stage1?.confidenceScore)}%</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)]">
          <div className="grid grid-cols-[minmax(120px,0.8fr)_1fr_1fr] bg-[var(--panel-strong)] px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            <span>Skill</span>
            <span>Job needs</span>
            <span>Resume evidence</span>
          </div>
          <div className="divide-y divide-[var(--border)] bg-[var(--panel)]">
            {mismatches.map((item, index) => (
              <article key={`${item.keyword}-${index}`} className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(120px,0.8fr)_1fr_1fr]">
                <div>
                  <p className="font-semibold text-[var(--text)]">{item.keyword}</p>
                  <span className="mt-2 inline-flex rounded-full border border-[var(--danger-border)] bg-[var(--danger-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">
                    Needs attention
                  </span>
                </div>
                <p className="text-sm leading-7 text-[var(--muted-strong)]">{item.jobRequirement || 'No requirement details were returned.'}</p>
                <p className="text-sm leading-7 text-[var(--text)]">{item.resumeEvidence || 'No resume evidence was found for this item.'}</p>
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
      <div className="grid gap-4">
        {stage1.seniorityMismatches.map((item, index) => (
          <article key={`${item.topic}-${index}`} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-semibold text-[var(--text)]">{item.topic}</p>
              <span className="app-chip">Level alignment</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <p className="app-field-label">Resume level</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text)]">{item.resumeLevel}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <p className="app-field-label">Target level</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text)]">{item.targetLevel}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">{item.explanation}</p>
          </article>
        ))}
      </div>
    ) : (
      <EmptyState message="Seniority alignment results will appear here." />
    );
  }

  if (selectedTab === 4) {
    return stage2?.interviewQuestions?.length ? (
      <ol className="grid gap-3">
        {stage2.interviewQuestions.map((question, index) => {
          const priority = getQuestionPriority(index);

          return (
            <li key={`${question}-${index}`} className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="mono-text mt-0.5 text-sm font-bold text-[var(--accent-strong)]">{String(index + 1).padStart(2, '0')}</span>
                <p className="text-sm leading-7 text-[var(--text)]">{question}</p>
              </div>
              <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${priority.className}`}>
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
      <div className="rounded-[1.5rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-5">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-rose-300">warning</span>
          <div>
            <p className="app-field-label">Rejection risk analysis</p>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">These are the blockers Aptico sees from the current resume-job pairing.</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {riskItems.map((risk, index) => (
            <article key={`${risk}-${index}`} className="rounded-2xl border border-[var(--danger-border)] bg-black/10 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-0.5 text-rose-300">cancel</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{risk}</p>
                  <span className="mt-2 inline-flex rounded-full bg-[var(--danger-soft)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-300">
                    Review before applying
                  </span>
                </div>
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
      className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

function SalaryCoachView({ content }) {
  const sections = parseSalaryCoach(content);
  const positionColors = getPositionColor(sections.position);

  return (
    <div className="grid gap-5">
      <div className="rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="app-field-label text-emerald-300">Estimated range</p>
        <p className="mt-2 text-2xl font-bold text-[var(--text)]">{sections.range || 'Not provided'}</p>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5">
        <h4 className="app-field-label">Why this range</h4>
        <p className="mt-3 text-sm leading-7 text-[var(--text)]">{sections.why || 'No explanation returned from the backend.'}</p>
      </div>

      <div className={`rounded-[1.5rem] border p-5 ${positionColors.border} ${positionColors.bg}`}>
        <h4 className={`app-field-label ${positionColors.text}`}>Your negotiation position</h4>
        <p className={`mt-3 text-sm leading-7 font-medium ${positionColors.text}`}>{sections.position || 'No position guidance returned.'}</p>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5">
        <h4 className="app-field-label">Exact phrases to use</h4>
        <div className="mt-4 grid gap-3">
          {sections.phrases.length ? (
            sections.phrases.map((phrase, index) => (
              <div key={`${phrase}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <p className="text-sm leading-6 text-[var(--text)]">
                  <span className="mr-2 text-xs font-bold text-[var(--accent-strong)]">{index + 1}.</span>
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

      <div className="rounded-[1.5rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-5">
        <h4 className="app-field-label text-rose-300">What not to say</h4>
        <div className="mt-4 grid gap-2">
          {sections.notToSay.length ? (
            sections.notToSay.map((phrase, index) => (
              <div key={`${phrase}-${index}`} className="rounded-2xl border border-[var(--danger-border)] bg-black/10 px-4 py-3 text-sm leading-6 text-[var(--text)]">
                <span className="mr-2 text-xs font-bold text-rose-300">{index + 1}.</span>
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
    <div className="grid gap-4">
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
          <article key={`${item.skill}-${index}`} className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)]">
            <button
              type="button"
              onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
              className="flex w-full flex-col gap-3 p-5 text-left transition hover:bg-black/5 dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-[var(--text)]">{item.skill}</p>
                  {missingSkill ? <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">{missingSkill}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  {daysRequired ? (
                    <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                      {daysRequired} days
                    </span>
                  ) : null}
                  <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${hourColors.badge}`}>{hours || 0}h</span>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  <span>Time investment</span>
                  <span className={hourColors.label}>{hours || 0} hours</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-strong)]">
                  <div className={`h-full rounded-full ${hourColors.bar}`} style={{ width: `${barWidth}%` }} />
                </div>
              </div>
            </button>

            {isExpanded ? (
              <div className="space-y-5 border-t border-[var(--border)] p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                    <p className="app-field-label">What is missing</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text)]">{missingSkill || 'No missing-skill summary was returned.'}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                    <p className="app-field-label">Days required</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text)]">{daysRequired ? `${daysRequired} days` : 'No estimate returned'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="app-field-label">References</h4>
                  <div className="mt-3 grid gap-2">
                    {resources.length ? (
                      resources.map((resource, resourceIndex) => (
                        <a
                          key={`${resource.title || resource.url}-${resourceIndex}`}
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 transition hover:border-[var(--accent)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--text)]">{resource.title || 'Untitled reference'}</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">{SOURCE_LABELS[resource.type] || resource.type || 'Reference'}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${resource.free ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
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
                  <h4 className="app-field-label">7 day bootcamp</h4>
                  <div className="mt-3 grid gap-2">
                    {dayPlan.length ? (
                      dayPlan.map((day, dayIndex) => (
                        <div key={`${day.day || dayIndex}-${dayIndex}`} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                          <div className="flex items-start gap-3">
                            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                              Day {day.day || dayIndex + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[var(--text)]">{day.focus || day.goal || 'Study block'}</p>
                              {day.tasks?.length ? (
                                <div className="mt-2 space-y-1">
                                  {day.tasks.map((task, taskIndex) => (
                                    <p key={`${task}-${taskIndex}`} className="text-xs leading-5 text-[var(--muted-strong)]">{task}</p>
                                  ))}
                                </div>
                              ) : null}
                              {day.practice_question ? <p className="mt-2 text-xs leading-5 text-[var(--accent-strong)]">{day.practice_question}</p> : null}
                            </div>
                            {day.duration_minutes ? <span className="text-[10px] text-[var(--muted)]">{day.duration_minutes}m</span> : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--muted-strong)]">No bootcamp plan was returned.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="app-field-label">Project suggestions</h4>
                  <div className="mt-3 grid gap-3">
                    {item.projects?.length ? (
                      item.projects.map((project, projectIndex) => (
                        <div key={`${project.title}-${projectIndex}`} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                          <p className="text-sm font-semibold text-[var(--text)]">{project.title}</p>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{project.description}</p>
                          {project.github_search ? (
                            <a
                              href={`https://github.com/search?q=${encodeURIComponent(project.github_search)}&type=repositories`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex rounded-full border border-[var(--border)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)] transition hover:border-[var(--accent)]"
                            >
                              Open GitHub references
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
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="app-field-label">AI tutor prompt</h4>
                    {tutorPrompt ? <CopyButton text={tutorPrompt} label="Copy prompt" /> : null}
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                    <pre className="whitespace-pre-wrap text-xs leading-6 text-[var(--text)]">{tutorPrompt || 'No AI prompt was returned.'}</pre>
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
    { id: 'coldEmail', label: 'Cold email', value: coldEmail },
    { id: 'coverLetter', label: 'Cover letter', value: coverLetter }
  ].filter((tab) => tab.value);
  const activeValue = tabs.find((tab) => tab.id === activeTab)?.value || tabs[0]?.value || '';

  if (!tabs.length) {
    return <EmptyState message="Cold email and cover letter content will appear here." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${activeTab === tab.id ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'border-[var(--border)] text-[var(--muted-strong)]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[#0f1011] p-5 text-zinc-200">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="app-field-label">{activeTab === 'coverLetter' ? 'Cover letter' : 'Cold email'}</p>
            <p className="mt-1 text-xs text-zinc-500">Showing the full backend response for this outreach asset.</p>
          </div>
          <CopyButton text={activeValue} label={`Copy ${activeTab === 'coverLetter' ? 'letter' : 'email'}`} />
        </div>
        <pre className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">{activeValue}</pre>
      </div>
    </div>
  );
}

export default function AnalysisWorkspace() {
  const auth = useSelector(selectAuth);
  const dispatch = useDispatch();
  const abortRef = useRef(null);
  const fileInputRef = useRef(null);
  const latestAnalysisSnapshotRef = useRef(null);
  const persistedWorkspace = useMemo(() => readWorkspaceState(), []);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileMeta, setSelectedFileMeta] = useState(persistedWorkspace?.selectedFileMeta || null);
  const [jobDescription, setJobDescription] = useState(persistedWorkspace?.jobDescription || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [selectedTab, setSelectedTab] = useState(persistedWorkspace?.selectedTab || 1);
  const [precheck, setPrecheck] = useState(persistedWorkspace?.precheck || null);
  const [stage1, setStage1] = useState(persistedWorkspace?.stage1 || null);
  const [stage2, setStage2] = useState(persistedWorkspace?.stage2 || null);
  const [stage3, setStage3] = useState(persistedWorkspace?.stage3 || null);
  const [loadingStages, setLoadingStages] = useState({ precheck: false, stage1: false, stage2: false, stage3: false });

  useEffect(() => {
    saveWorkspaceState({
      selectedFileMeta,
      jobDescription,
      selectedTab,
      precheck,
      stage1,
      stage2,
      stage3
    });
  }, [jobDescription, precheck, selectedFileMeta, selectedTab, stage1, stage2, stage3]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const modeLabel = useMemo(() => {
    if (auth.isAuthenticated) return auth.user?.email || 'Authenticated session';
    if (auth.guestMode) return 'Guest mode';
    return 'Visitor session';
  }, [auth.guestMode, auth.isAuthenticated, auth.user]);

  const readyTabs = useMemo(
    () => ({
      1: Boolean(stage1),
      2: Boolean(stage1),
      3: Boolean(stage1),
      4: Boolean(stage2),
      5: Boolean(stage2),
      6: Boolean(stage2),
      7: Boolean(stage3),
      8: Boolean(stage3)
    }),
    [stage1, stage2, stage3]
  );

  const tabLoading = useMemo(
    () => ({
      1: loadingStages.stage1,
      2: loadingStages.stage1,
      3: loadingStages.stage1,
      4: loadingStages.stage2,
      5: loadingStages.stage2,
      6: loadingStages.stage2,
      7: loadingStages.stage3,
      8: loadingStages.stage3
    }),
    [loadingStages.stage1, loadingStages.stage2, loadingStages.stage3]
  );

  const availableTab = useMemo(() => INSIGHT_TABS.find((tab) => readyTabs[tab.id])?.id || 1, [readyTabs]);
  const activeFileMeta = selectedFile ? { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type } : selectedFileMeta;
  const hasAnyContent = Boolean(activeFileMeta || jobDescription.trim() || precheck || stage1 || stage2 || stage3);
  const scoreValue = stage1?.confidenceScore || precheck?.score || 0;
  const mismatchCount = stage1?.keywordMismatches?.length || 0;
  const matchedSkills = stage1?.skillsPresent || [];
  const skillsCoverage = matchedSkills.length + mismatchCount > 0 ? (matchedSkills.length / (matchedSkills.length + mismatchCount)) * 100 : stage1 ? 100 : 0;
  const seniorityScore = stage1?.seniorityMismatches?.length ? 100 - Math.min(80, stage1.seniorityMismatches.length * 25) : stage1 ? 88 : 0;
  const keywordScore = stage1 ? clampPercent((clampPercent(stage1.confidenceScore) + clampPercent(skillsCoverage)) / 2) : 0;
  const topMissingSkills = useMemo(
    () => (stage1?.keywordMismatches || []).map((item) => item.keyword).filter(Boolean).slice(0, 4),
    [stage1]
  );

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

      if (!selectedFile) {
        setGlobalError('Please choose a PDF or DOCX resume first.');
        return;
      }

      if (selectedFile.size > MAX_FILE_BYTES) {
        setGlobalError('File must be under 5 MB.');
        return;
      }

      setPrecheck(null);
      setStage1(null);
      setStage2(null);
      setStage3(null);
      setSelectedTab(1);
      setIsSubmitting(true);
      setLoadingStages({ precheck: true, stage1: false, stage2: false, stage3: false });
      setSelectedFileMeta({ name: selectedFile.name, size: selectedFile.size, type: selectedFile.type });
      latestAnalysisSnapshotRef.current = null;

      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = streamAnalysis(
        { file: selectedFile, jobDescription },
        {
          onPrecheck(data) {
            setPrecheck(data);
            setLoadingStages((current) => ({ ...current, precheck: false, stage1: data.canProceed }));
          },
          onStage1(data) {
            setStage1(data);
            setSelectedTab(1);
            setLoadingStages((current) => ({ ...current, stage1: false, stage2: true, stage3: true }));
            latestAnalysisSnapshotRef.current = {
              companyName: data.companyName,
              matchedSkills: data.skillsPresent || [],
              confidenceScore: data.confidenceScore,
              summary: data.summary
            };
            dispatch(
              setCurrentAnalysis({
                id: null,
                companyName: data.companyName,
                matchedSkills: data.skillsPresent || [],
                confidenceScore: data.confidenceScore,
                summary: data.summary
              })
            );
          },
          onAnalysisId(data) {
            const snapshot = latestAnalysisSnapshotRef.current || {};
            dispatch(
              setCurrentAnalysis({
                id: data.id,
                companyName: snapshot.companyName || null,
                matchedSkills: snapshot.matchedSkills || [],
                confidenceScore: snapshot.confidenceScore || 0,
                summary: snapshot.summary || ''
              })
            );
          },
          onStage2(data) {
            setStage2(data);
            setSelectedTab((current) => (current <= 3 ? 4 : current));
            setLoadingStages((current) => ({ ...current, stage2: false }));
          },
          onStage3(data) {
            setStage3(data);
            setSelectedTab((current) => (current <= 6 ? 7 : current));
            setLoadingStages((current) => ({ ...current, stage3: false }));
          },
          onDone() {
            setIsSubmitting(false);
            setLoadingStages({ precheck: false, stage1: false, stage2: false, stage3: false });
          },
          onError(message) {
            setGlobalError(message);
            setIsSubmitting(false);
            setLoadingStages({ precheck: false, stage1: false, stage2: false, stage3: false });
          }
        }
      );

      abortRef.current = controller;
    },
    [dispatch, jobDescription, selectedFile]
  );

  const handleClearContent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSelectedFile(null);
    setSelectedFileMeta(null);
    setJobDescription('');
    setIsSubmitting(false);
    setGlobalError('');
    setSelectedTab(1);
    setPrecheck(null);
    setStage1(null);
    setStage2(null);
    setStage3(null);
    setLoadingStages({ precheck: false, stage1: false, stage2: false, stage3: false });
    latestAnalysisSnapshotRef.current = null;
    clearWorkspaceState();
    dispatch(clearCurrentAnalysis());

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [dispatch]);

  return (
    <AppShell
      title="AI analysis workspace"
      description="The analysis result no longer lands as one overwhelming wall. Aptico now surfaces the eight outcomes in a cleaner workspace while keeping your current result set available even when you move between routes."
      actions={
        <>
          <Link to="/dashboard" className="app-button-secondary">Main dashboard</Link>
          <Link to="/jobs" className="app-button-secondary">Job search</Link>
          {hasAnyContent ? (
            <button type="button" onClick={handleClearContent} className="app-button-secondary">
              Remove content
            </button>
          ) : null}
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[180px_minmax(0,1fr)_260px]">
        <aside className="app-panel h-fit xl:sticky xl:top-24">
          <div className="space-y-4">
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
        </aside>

        <section className="space-y-6">
          <article className="app-panel">
            <form className="space-y-5" onSubmit={handleAnalyze}>
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="group relative flex min-h-56 cursor-pointer flex-col justify-between rounded-[1.5rem] border-2 border-dashed border-[var(--border)] bg-[var(--panel-soft)] p-5 transition hover:border-[var(--accent)]">
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
                  <div>
                    <span className="app-field-label">Resume upload</span>
                    <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] transition group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
                      <span className="material-symbols-outlined text-[28px]">upload_file</span>
                    </div>
                    <p className="mt-5 text-lg font-semibold text-[var(--text)]">
                      {activeFileMeta ? activeFileMeta.name : 'Drop resume or click to browse'}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                      {activeFileMeta
                        ? `${formatFileSize(activeFileMeta.size)} - ${activeFileMeta.type || 'Document ready for analysis'}`
                        : 'Use the same Aptico labels and flow, but with the cleaner upload card design from the reference workspace.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="mono-text text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">PDF or DOCX - Max 5 MB</span>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--text)]">Choose file</span>
                  </div>
                </label>

                <label className="flex min-h-56 flex-col rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                  <span className="app-field-label">Job description</span>
                  <textarea
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)}
                    className="mt-4 min-h-[188px] w-full resize-none border-none bg-transparent p-0 text-sm leading-7 text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                    placeholder="Paste the target job description here..."
                    required
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={isSubmitting} className="app-button min-w-[220px]">
                  {isSubmitting ? 'Analyzing...' : 'Analyze alignment'}
                </button>
                <span className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-strong)]">{modeLabel}</span>
                {stage1 || stage2 || stage3 ? (
                  <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
                    Cached until removed
                  </span>
                ) : null}
              </div>
            </form>

            {globalError ? (
              <div className="mt-5 rounded-[1.25rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-rose-300">
                {globalError}
              </div>
            ) : null}
          </article>

          <article className="app-panel">
            <div className="rounded-[1.5rem] bg-[var(--panel-soft)] p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                <div className="flex justify-center">
                  <ScoreRing value={scoreValue} />
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <p className="app-kicker">Analysis summary</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[var(--text)]">
                      {stage1?.companyName || 'Awaiting a target role'}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                      {stage1?.summary || 'Upload a resume and job description to unlock the Aptico insight tags below.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <SummaryMetric label="Hard skills" value={skillsCoverage} />
                    <SummaryMetric label="Experience" value={seniorityScore} tone={seniorityScore < 55 ? 'warning' : 'accent'} />
                    <SummaryMetric label="Keywords" value={keywordScore} tone={keywordScore < 55 ? 'warning' : 'accent'} />
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                    {(matchedSkills.length ? matchedSkills : topMissingSkills).slice(0, 6).map((skill) => (
                      <span key={skill} className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 font-mono text-[10px] text-[var(--accent-strong)]">
                        {skill}
                      </span>
                    ))}
                    {!matchedSkills.length && !topMissingSkills.length ? (
                      <span className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 font-mono text-[10px] text-[var(--muted)]">
                        Skills will appear after analysis
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </article>
          {precheck && !precheck.canProceed ? (
            <div className="rounded-[1.5rem] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-6">
              <p className="app-kicker">Compatibility check</p>
              <h3 className="mt-2 text-2xl font-bold text-[var(--text)]">{precheck.score}/100 compatibility</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">{precheck.reason}</p>
            </div>
          ) : null}

          {precheck?.canProceed || stage1 || stage2 || stage3 ? (
            <section className="app-panel">
              <div className="flex flex-wrap gap-3">
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

              <div className="mt-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="app-kicker">Selected insight</p>
                    <h3 className="mt-2 text-2xl font-bold text-[var(--text)]">{INSIGHT_TABS.find((tab) => tab.id === selectedTab)?.label}</h3>
                  </div>
                  <button type="button" onClick={() => setSelectedTab(availableTab)} className="app-button-secondary">
                    Jump to latest ready
                  </button>
                </div>

                <InsightContent selectedTab={selectedTab} stage1={stage1} stage2={stage2} stage3={stage3} loadingStates={tabLoading} />
              </div>
            </section>
          ) : null}
        </section>

        <aside className="hidden space-y-6 xl:block">
          <article className="app-panel">
            <div className="flex items-center justify-between gap-3">
              <span className="app-field-label">Status</span>
              <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                {stage3 ? 'Ready' : stage1 || stage2 ? 'In progress' : 'Waiting'}
              </span>
            </div>

            <div className="mt-5 space-y-1">
              <h3 className="text-sm font-bold text-[var(--text)]">{stage1?.companyName || 'Target role pending'}</h3>
              <p className="text-xs text-[var(--muted)]">{activeFileMeta?.name || 'Resume not uploaded yet'}</p>
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <p className="app-field-label">Top missing skills</p>
              <div className="mt-3 space-y-2">
                {topMissingSkills.length ? (
                  topMissingSkills.map((skill) => (
                    <div key={skill} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      <span className="mono-text text-[11px] text-[var(--text)]">{skill}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs leading-6 text-[var(--muted-strong)]">Missing skills will surface here after match analysis runs.</p>
                )}
              </div>
            </div>
          </article>

          <article className="rounded-[0.75rem] border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
            <p className="app-field-label text-[var(--accent-strong)]">Quick tip</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text)]">
              {stage1?.summary || 'Keep the workspace content in place while you move across routes. Use Remove content only when you want to reset both the pasted job description and the streamed analysis result.'}
            </p>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
