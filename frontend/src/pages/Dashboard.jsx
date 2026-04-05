import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { streamAnalysis } from '../api/analyzeApi.js';
import Gauge from '../components/Gauge.jsx';
import DiffViewer from '../components/DiffViewer.jsx';
import { selectAuth } from '../store/authSlice.js';
import { setCurrentAnalysis } from '../store/historySlice.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const SOURCE_LABELS = {
  youtube: '▶ YouTube',
  course: '📚 Course',
  docs: '📄 Docs',
  site: '🌐 Site',
  bootcamp: '🏕 Bootcamp',
  github: '🐙 GitHub'
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function SkeletonBlock({ lines = 3 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg bg-white/10"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

// ─── Collapsible Card ────────────────────────────────────────────────────────

function CollapsibleCard({ title, badge, badgeColor = 'cyan', children, defaultExpanded = true, featureNumber }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const badgeClasses = {
    cyan: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
    amber: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
    rose: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
    emerald: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
    violet: 'bg-violet-400/10 text-violet-300 border-violet-400/20',
    sky: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
    pink: 'bg-pink-400/10 text-pink-300 border-pink-400/20',
    indigo: 'bg-indigo-400/10 text-indigo-300 border-indigo-400/20'
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-4 p-6 text-left transition hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-3 min-w-0">
          {featureNumber != null && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-slate-300">
              {featureNumber}
            </span>
          )}
          <h2 className="text-lg font-semibold text-white truncate">{title}</h2>
          {badge && (
            <span className={`shrink-0 rounded-full border px-3 py-0.5 text-[10px] uppercase tracking-[0.2em] ${badgeClasses[badgeColor] || badgeClasses.cyan}`}>
              {badge}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-slate-400 transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>
          ▼
        </span>
      </button>
      <div
        className="transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: expanded ? '5000px' : '0', opacity: expanded ? 1 : 0 }}
      >
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </section>
  );
}

// ─── Error Card ──────────────────────────────────────────────────────────────

function StageErrorCard({ message }) {
  return (
    <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-6 text-sm text-rose-200">
      {message}
    </div>
  );
}

// ─── Precheck Failed Card ────────────────────────────────────────────────────

function PrecheckFailedCard({ score, reason }) {
  return (
    <section className="rounded-[2rem] border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent p-8 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-rose-500/20 mb-6">
        <span className="text-4xl font-bold text-rose-400">{score}</span>
      </div>
      <h2 className="text-2xl font-semibold text-white mb-3">Low Compatibility Detected</h2>
      <p className="mx-auto max-w-lg text-sm leading-7 text-slate-300">{reason}</p>
      <p className="mt-4 text-xs text-slate-500 uppercase tracking-[0.2em]">Analysis halted — background and job description are not aligned</p>
    </section>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ ready, total = 8 }) {
  const pct = Math.round((ready / total) * 100);
  return (
    <div className="sticky top-0 z-30 rounded-2xl border border-white/10 bg-slate-900/90 px-5 py-3 backdrop-blur">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Insights progress</span>
        <span className="text-xs font-medium text-cyan-300">{ready} of {total} ready</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Feature Renderers ───────────────────────────────────────────────────────

function InterviewQuestionsView({ questions }) {
  return (
    <ol className="grid gap-3">
      {questions.map((q, i) => (
        <li key={`iq-${i}`} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
          <span className="mr-2 text-xs font-bold text-cyan-300">{i + 1}.</span>{q}
        </li>
      ))}
    </ol>
  );
}

function parseRejectionReasons(text) {
  const sections = { ats: [], recruiter: [], verdict: '' };
  const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const splitBullets = (block) =>
    block.trim().split('\n')
      .map(l => l.replace(/^\s*[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);

  const atsMatch = raw.match(/ATS\s+SCAN[:\s-]*\n?([\s\S]*?)(?=RECRUITER\s+SCAN|VERDICT|$)/i);
  const recruiterMatch = raw.match(/RECRUITER\s+SCAN[^\n]*[:\s-]*\n?([\s\S]*?)(?=VERDICT|ATS\s+SCAN|$)/i);
  const verdictMatch = raw.match(/VERDICT[:\s-]*\n?([\s\S]*?)$/i);

  if (atsMatch) {
    sections.ats = splitBullets(atsMatch[1]);
  }
  if (recruiterMatch) {
    sections.recruiter = splitBullets(recruiterMatch[1]);
  }
  if (verdictMatch) {
    sections.verdict = verdictMatch[1].trim();
  }

  if (!sections.ats.length && !sections.recruiter.length && !sections.verdict) {
    sections.verdict = raw.split('\n').map(l => l.trim()).filter(Boolean).join(' ');
  }

  return sections;
}

function RejectionPredictorView({ content }) {
  const sections = parseRejectionReasons(content);
  return (
    <div className="grid gap-5">
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-rose-300">ATS Scan</h3>
        {sections.ats.length ? (
          <div className="grid gap-2">
            {sections.ats.map((point, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/30 text-[9px] font-bold text-rose-300">{i + 1}</span>
                <p className="text-sm leading-6 text-rose-200">{point}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-rose-300/60">No ATS issues detected.</p>
        )}
      </div>

      <div className="rounded-3xl border border-orange-500/30 bg-orange-500/10 p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-orange-300">Recruiter Scan (first 10 seconds)</h3>
        {sections.recruiter.length ? (
          <div className="grid gap-2">
            {sections.recruiter.map((point, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-500/30 text-[9px] font-bold text-orange-300">{i + 1}</span>
                <p className="text-sm leading-6 text-orange-200">{point}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-orange-300/60">No immediate visual issues detected.</p>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-300">Verdict</h3>
        <p className="text-sm leading-7 text-slate-200">{sections.verdict || 'No verdict available.'}</p>
      </div>
    </div>
  );
}

function parseSalaryCoach(text) {
  const sections = { range: '', why: '', position: '', phrases: [], notToSay: [] };
  const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const splitList = (block) =>
    block.trim().split('\n')
      .map(l => l.replace(/^\s*[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
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

function getPositionColor(positionText) {
  const lower = positionText.toLowerCase();
  if (lower.startsWith('strong')) return { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300' };
  if (lower.startsWith('weak')) return { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-300' };
  return { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-300' };
}

function extractPhrases(phrasesText) {
  return phrasesText.split('\n').map((line) => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* clipboard may be unavailable */ }
  }
  return (
    <button type="button" onClick={handleCopy} className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500">
      {copied ? 'Copied!' : label}
    </button>
  );
}

function SalaryCoachView({ content }) {
  const sections = parseSalaryCoach(content);
  const positionColors = getPositionColor(sections.position);

  return (
    <div className="grid gap-5">
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="mb-1 text-xs uppercase tracking-[0.25em] text-emerald-400">Estimated Range</p>
        <p className="text-2xl font-bold text-emerald-200">{sections.range || '—'}</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-300">Why This Range</h3>
        <p className="text-sm leading-7 text-slate-200">{sections.why || '—'}</p>
      </div>

      <div className={`rounded-3xl border ${positionColors.border} ${positionColors.bg} p-5`}>
        <h3 className={`mb-3 text-xs font-bold uppercase tracking-[0.25em] ${positionColors.text}`}>Your Negotiation Position</h3>
        <p className={`text-sm leading-7 font-medium ${positionColors.text}`}>{sections.position || '—'}</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-slate-300">Exact Phrases to Use</h3>
        <div className="grid gap-3">
          {sections.phrases.length ? sections.phrases.map((phrase, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm leading-6 text-slate-200">
                <span className="mr-2 text-xs font-bold text-cyan-300">{i + 1}.</span>{phrase}
              </p>
              <CopyButton text={phrase} />
            </div>
          )) : <p className="text-sm text-slate-500">No phrases available.</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-rose-300">What Not to Say</h3>
        <div className="grid gap-2">
          {sections.notToSay.length ? sections.notToSay.map((phrase, i) => (
            <div key={i} className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/30 text-[9px] font-bold text-rose-400">✕</span>
              <p className="text-sm leading-6 text-rose-200">{phrase}</p>
            </div>
          )) : <p className="text-sm text-rose-400/60">No bad phrases listed.</p>}
        </div>
      </div>
    </div>
  );
}


function LearningPathView({ content }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(null);

  function toggleCard(index) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  function getHourColor(hours) {
    if (hours <= 20) return { bar: 'bg-emerald-400', label: 'text-emerald-300', badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' };
    if (hours <= 50) return { bar: 'bg-amber-400', label: 'text-amber-300', badge: 'bg-amber-400/10 text-amber-300 border-amber-400/20' };
    return { bar: 'bg-rose-400', label: 'text-rose-300', badge: 'bg-rose-400/10 text-rose-300 border-rose-400/20' };
  }

  const DIFFICULTY_COLORS = {
    Beginner: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    Intermediate: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    Advanced: 'border-rose-400/30 bg-rose-400/10 text-rose-300'
  };

  async function handleCopyPrompt(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(index);
      setTimeout(() => setCopiedPrompt(null), 1500);
    } catch (e) {}
  }

  return (
    <div className="grid gap-4">
      {content.map((item, index) => {
        const isExpanded = expandedIndex === index;
        const hourColors = getHourColor(item.total_honest_hours);
        const maxHours = Math.max(...content.map(c => c.total_honest_hours), 1);
        const barWidth = Math.round((item.total_honest_hours / maxHours) * 100);
        const resources = item.resources || item.sources;
        const dayPlan = item.day_bootcamp || item.day_plan;
        const tutorPrompt = item.ai_tutor_prompt || item.self_study_prompt;

        return (
          <article key={`${item.skill}-${index}`} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60">
            <button
              type="button"
              onClick={() => toggleCard(index)}
              className="flex w-full flex-col gap-3 p-5 text-left transition hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-400/10">
                    <span className="text-xs font-bold text-sky-300">{index + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{item.skill}</p>
                  {item.difficulty && (
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${DIFFICULTY_COLORS[item.difficulty] || DIFFICULTY_COLORS.Intermediate}`}>
                      {item.difficulty}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full border px-3 py-0.5 text-[10px] uppercase tracking-[0.15em] ${hourColors.badge}`}>
                    {item.total_honest_hours}h
                  </span>
                  <span className="text-xs text-slate-500">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
              {item.why_learn_first && (
                <p className="text-xs leading-5 text-slate-400 pl-11">{item.why_learn_first}</p>
              )}
              <div className="w-full">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Time investment</span>
                  <span className={`text-[10px] font-medium ${hourColors.label}`}>{item.total_honest_hours} hours</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${hourColors.bar} transition-all duration-500`} style={{ width: `${barWidth}%` }} />
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-white/10 space-y-5 p-5">
                <div>
                  <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Resources</h4>
                  <div className="grid gap-2">
                    {resources.map((source, sIndex) => (
                      <a
                        key={sIndex}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="shrink-0 text-xs text-slate-400">{SOURCE_LABELS[source.type] || source.type}</span>
                            <span className="truncate text-sm text-cyan-300">{source.title}</span>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${source.free ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                            {source.free ? 'Free' : 'Paid'}
                          </span>
                        </div>
                        {source.why && (
                          <p className="text-[11px] leading-4 text-slate-500 pl-0">{source.why}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Day-by-day bootcamp</h4>
                  <div className="grid gap-2">
                    {dayPlan.map((day, dIndex) => (
                      <div key={dIndex} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-6 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400/10">
                            <span className="text-[10px] font-bold text-sky-300">D{day.day}</span>
                          </div>
                          <p className="flex-1 text-sm leading-6 text-slate-200">{day.focus || day.goal}</p>
                          {day.duration_minutes && (
                            <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">{day.duration_minutes}m</span>
                          )}
                        </div>
                        {day.tasks && day.tasks.length > 0 && (
                          <ul className="mt-2 ml-[3.25rem] space-y-1">
                            {day.tasks.map((task, tIdx) => (
                              <li key={tIdx} className="text-xs leading-5 text-slate-300 before:content-['→_'] before:text-sky-400">{task}</li>
                            ))}
                          </ul>
                        )}
                        {day.practice_question && (
                          <div className="mt-2 ml-[3.25rem] rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-violet-400 mb-1">Practice question</p>
                            <p className="text-xs leading-5 text-violet-200">{day.practice_question}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {item.projects && item.projects.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Projects</h4>
                    <div className="grid gap-2">
                      {item.projects.map((proj, pIdx) => (
                        <div key={pIdx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm font-medium text-white">{proj.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-300">{proj.description}</p>
                          {proj.github_search && (
                            <a
                              href={`https://github.com/search?q=${encodeURIComponent(proj.github_search)}&type=repositories`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
                            >
                              🐙 Search GitHub
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">AI tutor prompt</h4>
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(tutorPrompt, index)}
                      className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
                    >
                      {copiedPrompt === index ? 'Copied!' : 'Copy prompt'}
                    </button>
                  </div>
                  <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-sky-400 mb-2">Paste into ChatGPT · Claude · Gemini</p>
                    <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-300">{tutorPrompt}</pre>
                  </div>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
function ColdEmailView({ content }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('email');

  const lines = String(content || '').trim().split('\n');
  const subjectLine = lines.find(l => /^subject:/i.test(l.trim()));
  const bodyLines = subjectLine
    ? lines.filter(l => l !== subjectLine)
    : lines;
  const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '').trim() : null;
  const body = bodyLines.join('\n').trim();

  const dmVersion = body
    .split('\n')
    .filter(Boolean)
    .slice(0, 4)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300) + (body.length > 300 ? '...' : '');

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['email', 'dm'].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition ${activeTab === tab ? 'border-indigo-400/40 bg-indigo-400/10 text-indigo-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
          >
            {tab === 'email' ? '✉ Full Email' : '💬 DM Version'}
          </button>
        ))}
      </div>

      {activeTab === 'email' && (
        <div className="rounded-3xl border border-indigo-400/20 bg-indigo-400/5 p-5 space-y-4">
          {subject && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Subject line</p>
              <p className="text-sm font-medium text-white">{subject}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">Email body</p>
            <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{body}</pre>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleCopy(subject ? `Subject: ${subject}\n\n${body}` : body)}
              className="rounded-full border border-slate-700 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-indigo-400 hover:text-indigo-300"
            >
              {copied ? 'Copied!' : 'Copy email'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'dm' && (
        <div className="rounded-3xl border border-violet-400/20 bg-violet-400/5 p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400">Shortened for LinkedIn · Twitter DM · WhatsApp</p>
          <p className="text-sm leading-7 text-slate-200">{dmVersion}</p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleCopy(dmVersion)}
              className="rounded-full border border-slate-700 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-violet-400 hover:text-violet-300"
            >
              {copied ? 'Copied!' : 'Copy DM'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Fade-in wrapper ─────────────────────────────────────────────────────────

function FadeIn({ children, visible }) {
  return (
    <div
      className="transition-opacity duration-300 ease-in"
      style={{ opacity: visible ? 1 : 0, display: visible ? 'block' : 'none' }}
    >
      {children}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const auth = useSelector(selectAuth);
  const dispatch = useDispatch();
  const abortRef = useRef(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // SSE result state
  const [precheck, setPrecheck] = useState(null);
  const [stage1, setStage1] = useState(null);
  const [stage2, setStage2] = useState(null);
  const [stage3, setStage3] = useState(null);
  const [stageErrors, setStageErrors] = useState({});
  const [analysisId, setAnalysisId] = useState(null);
  const [isDone, setIsDone] = useState(false);

  // Loading states per stage
  const [loadingStages, setLoadingStages] = useState({ precheck: false, stage1: false, stage2: false, stage3: false });

  const modeLabel = useMemo(() => {
    if (auth.isAuthenticated) return auth.user?.email || 'Authenticated session';
    if (auth.guestMode) return 'Guest mode';
    return 'Anonymous session';
  }, [auth.guestMode, auth.isAuthenticated, auth.user]);

  // Count ready features
  const readyFeatures = useMemo(() => {
    let count = 0;
    if (stage1) count += 3;
    if (stage2) count += 3;
    if (stage3) count += 2;
    return count;
  }, [stage1, stage2, stage3]);

  const hasStarted = precheck !== null || loadingStages.precheck;

  const handleAnalyze = useCallback((event) => {
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

    // Reset all state
    setPrecheck(null);
    setStage1(null);
    setStage2(null);
    setStage3(null);
    setStageErrors({});
    setAnalysisId(null);
    setIsDone(false);
    setIsSubmitting(true);
    setLoadingStages({ precheck: true, stage1: false, stage2: false, stage3: false });

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = streamAnalysis(
      { file: selectedFile, jobDescription },
      {
        onPrecheck(data) {
          setPrecheck(data);
          setLoadingStages((prev) => ({
            ...prev,
            precheck: false,
            stage1: data.canProceed ? true : false
          }));
        },
        onStage1(data) {
          setStage1(data);
          setLoadingStages((prev) => ({
            ...prev,
            stage1: false,
            stage2: true,
            stage3: true
          }));
          // Dispatch to Redux for history
          dispatch(setCurrentAnalysis({
            id: null,
            companyName: data.companyName,
            confidenceScore: data.confidenceScore,
            summary: data.summary
          }));
        },
        onStage2(data) {
          setStage2(data);
          setLoadingStages((prev) => ({ ...prev, stage2: false }));
        },
        onStage3(data) {
          setStage3(data);
          setLoadingStages((prev) => ({ ...prev, stage3: false }));
        },
        onAnalysisId(data) {
          setAnalysisId(data.id);
          dispatch(setCurrentAnalysis({
            id: data.id,
            companyName: stage1?.companyName || null,
            confidenceScore: stage1?.confidenceScore || 0,
            summary: stage1?.summary || ''
          }));
        },
        onError(errorMsg, stageName) {
          if (stageName) {
            setStageErrors((prev) => ({ ...prev, [stageName]: errorMsg }));
            setLoadingStages((prev) => ({ ...prev, [stageName]: false }));
          } else {
            setGlobalError(errorMsg);
          }
        },
        onDone() {
          setIsDone(true);
          setIsSubmitting(false);
          setLoadingStages({ precheck: false, stage1: false, stage2: false, stage3: false });
        }
      }
    );

    abortRef.current = controller;
  }, [selectedFile, jobDescription, dispatch, stage1]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_38%),linear-gradient(180deg,_#020617_0%,_#020617_35%,_#0f172a_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Aptico Analysis Lab</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Resume confidence analysis</h1>
            <p className="text-sm text-slate-300">Upload a PDF resume, paste a job description, and inspect all 8 AI-driven insights in real time.</p>
          </div>
          <div className="flex flex-col items-start gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Current mode</span>
            <span className="font-medium text-white">{modeLabel}</span>
            <Link to="/auth" className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200">
              Auth screen
            </Link>
            <Link to="/jobs" className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200">
              Job search
            </Link>
          </div>
        </header>

        {/* ── Form + Gauge ───────────────────────────────────────────────── */}
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <form className="space-y-6" onSubmit={handleAnalyze}>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="block rounded-3xl border border-dashed border-slate-700 bg-slate-950/50 p-6 transition hover:border-cyan-400">
                  <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Resume (PDF / DOCX)</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <p className="mt-4 text-sm text-slate-400">
                    {selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024).toFixed(1)} KB` : 'Choose a file under 5 MB.'}
                  </p>
                </label>
                <label className="block rounded-3xl border border-white/10 bg-slate-950/50 p-6">
                  <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Job description</span>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="mt-4 h-48 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    placeholder="Paste the target job description here..."
                    maxLength={10000}
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {isSubmitting ? 'Analyzing...' : 'Analyze resume'}
              </button>
            </form>
            {globalError ? (
              <div className="mt-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{globalError}</div>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <div className="flex h-full flex-col items-center justify-center gap-6 rounded-3xl border border-white/10 bg-slate-950/50 p-6 text-center">
              <Gauge value={stage1?.confidenceScore || 0} />
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Analysis summary</p>
                <h2 className="text-2xl font-semibold text-white">{stage1?.companyName || 'Awaiting analysis result'}</h2>
                <p className="max-w-md text-sm leading-6 text-slate-300">
                  {stage1?.summary || 'Your structured analysis will appear here once the resume and job description are submitted.'}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ── Results Area ────────────────────────────────────────────────── */}
        {hasStarted && (
          <div className="space-y-6">
            {/* Progress bar */}
            {!isDone && precheck?.canProceed && (
              <ProgressBar ready={readyFeatures} />
            )}

            {/* Precheck card (failed) */}
            {precheck && !precheck.canProceed && (
              <FadeIn visible={true}>
                <PrecheckFailedCard score={precheck.score} reason={precheck.reason} />
              </FadeIn>
            )}

            {/* Precheck card (passed) */}
            {precheck?.canProceed && (
              <FadeIn visible={true}>
                <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 px-6 py-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                    <span className="text-lg font-bold text-emerald-400">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-300">Compatibility check passed — score: {precheck.score}/100</p>
                    <p className="text-xs text-slate-400">{precheck.reason}</p>
                  </div>
                </div>
              </FadeIn>
            )}

            {/* ── Stage 1 — Features 1, 2, 3 ─────────────────────────────── */}
            {(stage1 || loadingStages.stage1) && (
              <FadeIn visible={true}>
                <div className="space-y-6">
                  {/* Feature 1: Gap Analysis */}
                  <CollapsibleCard title="Resume & JD Gap Analysis" badge="Feature 1" badgeColor="cyan" featureNumber={1}>
                    {stage1 ? (
                      <div className="grid gap-4">
                        {(stage1.keywordMismatches || []).length ? (
                          stage1.keywordMismatches.map((item, i) => (
                            <article key={`kw-${i}`} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                              <p className="text-sm font-medium text-cyan-300">{item.keyword}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-200">{item.jobRequirement}</p>
                              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">Resume evidence</p>
                              <p className="mt-1 text-sm leading-6 text-slate-300">{item.resumeEvidence}</p>
                              <p className="mt-3 text-xs text-slate-500">{item.importance}</p>
                            </article>
                          ))
                        ) : (
                          <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-6 text-sm text-slate-400">
                            No significant keyword mismatches found.
                          </div>
                        )}
                      </div>
                    ) : <SkeletonBlock lines={5} />}
                  </CollapsibleCard>

                  {/* Feature 2: Bullet Rewriter */}
                  <CollapsibleCard title="Resume Bullet Rewriter" badge="Feature 2" badgeColor="emerald" featureNumber={2}>
                    {stage1 ? <DiffViewer items={stage1.rewriteSuggestions || []} /> : <SkeletonBlock lines={4} />}
                  </CollapsibleCard>

                  {/* Feature 3: Seniority Alignment */}
                  <CollapsibleCard title="Seniority Alignment" badge="Feature 3" badgeColor="amber" featureNumber={3}>
                    {stage1 ? (
                      <div className="grid gap-4">
                        {(stage1.seniorityMismatches || []).length ? (
                          stage1.seniorityMismatches.map((item, i) => (
                            <article key={`sm-${i}`} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                              <p className="text-sm font-medium text-amber-300">{item.topic}</p>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resume level</p>
                                  <p className="mt-2 text-sm text-slate-200">{item.resumeLevel}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Target level</p>
                                  <p className="mt-2 text-sm text-slate-200">{item.targetLevel}</p>
                                </div>
                              </div>
                              <p className="mt-4 text-sm leading-6 text-slate-300">{item.explanation}</p>
                            </article>
                          ))
                        ) : (
                          <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-6 text-sm text-slate-400">
                            No seniority gaps detected.
                          </div>
                        )}
                      </div>
                    ) : <SkeletonBlock lines={4} />}
                  </CollapsibleCard>
                </div>
              </FadeIn>
            )}

            {stageErrors.stage1 && <StageErrorCard message={stageErrors.stage1} />}

            {/* ── Stage 2 — Features 4, 5, 6 ─────────────────────────────── */}
            {(stage2 || loadingStages.stage2) && (
              <FadeIn visible={true}>
                <div className="space-y-6">
                  {/* Feature 4: Interview Questions */}
                  <CollapsibleCard title="Interview Question Predictor" badge="Feature 4" badgeColor="violet" featureNumber={4}>
                    {stage2 ? <InterviewQuestionsView questions={stage2.interviewQuestions} /> : <SkeletonBlock lines={5} />}
                  </CollapsibleCard>

                  {/* Feature 5: Rejection Predictor */}
                  <CollapsibleCard title="Rejection Reason Predictor" badge="Feature 5" badgeColor="rose" featureNumber={5}>
                    {stage2 ? <RejectionPredictorView content={stage2.rejectionReasons} /> : <SkeletonBlock lines={5} />}
                  </CollapsibleCard>

                  {/* Feature 6: Salary Coach */}
                  <CollapsibleCard title="Salary Negotiation Coach" badge="Feature 6" badgeColor="emerald" featureNumber={6}>
                    {stage2 ? <SalaryCoachView content={stage2.salaryCoach} /> : <SkeletonBlock lines={5} />}
                  </CollapsibleCard>
                </div>
              </FadeIn>
            )}

            {stageErrors.stage2 && <StageErrorCard message={stageErrors.stage2} />}

            {/* ── Stage 3 — Features 7, 8 ─────────────────────────────────── */}
            {(stage3 || loadingStages.stage3) && (
              <FadeIn visible={true}>
                <div className="space-y-6">
                  {/* Feature 7: Skill Gap Learning Path */}
                  <CollapsibleCard title="Skill Gap Learning Path" badge="Feature 7" badgeColor="sky" featureNumber={7}>
                    {stage3 ? <LearningPathView content={stage3.learningPath} /> : <SkeletonBlock lines={5} />}
                  </CollapsibleCard>

                  {/* Feature 8: Cold Email Generator */}
                  <CollapsibleCard title="Cold Email & DM Generator" badge="Feature 8" badgeColor="indigo" featureNumber={8}>
                    {stage3 ? <ColdEmailView content={stage3.coldEmail} /> : <SkeletonBlock lines={4} />}
                  </CollapsibleCard>
                </div>
              </FadeIn>
            )}

            {stageErrors.stage3 && <StageErrorCard message={stageErrors.stage3} />}
          </div>
        )}
      </div>
    </main>
  );
}
