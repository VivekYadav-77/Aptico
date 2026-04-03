import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios.js';
import { addGeneratedItem, selectHistory } from '../store/historySlice.js';

const CONTENT_TYPES = [
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'cold_email', label: 'Cold Email' },
  { value: 'interview_questions', label: 'Interview Questions' },
  { value: 'learning_path', label: 'Learning Path' },
  { value: 'rejection_reasons', label: 'Rejection Predictor' },
  { value: 'salary_coach', label: 'Salary Coach' }
];

const SOURCE_LABELS = {
  youtube: '▶ YouTube',
  course: '📚 Course',
  docs: '📄 Docs',
  site: '🌐 Site',
  bootcamp: '🏕 Bootcamp'
};

function normalizeGeneratedItem(item) {
  return {
    id: item.id,
    analysisId: item.analysisId,
    contentType: item.contentType,
    jobId: item.jobId || null,
    content: item.content,
    createdAt: item.createdAt
  };
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      /* clipboard may be unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

function parseRejectionReasons(text) {
  const sections = { ats: '', recruiter: '', verdict: '' };
  const raw = String(text || '');

  const atsMatch = raw.match(/ATS SCAN\s*\n([\s\S]*?)(?=RECRUITER SCAN|$)/i);
  const recruiterMatch = raw.match(/RECRUITER SCAN[^\n]*\n([\s\S]*?)(?=VERDICT|$)/i);
  const verdictMatch = raw.match(/VERDICT\s*\n([\s\S]*?)$/i);

  if (atsMatch) sections.ats = atsMatch[1].trim();
  if (recruiterMatch) sections.recruiter = recruiterMatch[1].trim();
  if (verdictMatch) sections.verdict = verdictMatch[1].trim();

  return sections;
}

function parseSalaryCoach(text) {
  const sections = { range: '', why: '', position: '', phrases: '', notToSay: '' };
  const raw = String(text || '');

  const rangeMatch = raw.match(/ESTIMATED RANGE\s*\n([\s\S]*?)(?=WHY THIS RANGE|$)/i);
  const whyMatch = raw.match(/WHY THIS RANGE\s*\n([\s\S]*?)(?=YOUR NEGOTIATION POSITION|$)/i);
  const positionMatch = raw.match(/YOUR NEGOTIATION POSITION\s*\n([\s\S]*?)(?=EXACT PHRASES TO USE|$)/i);
  const phrasesMatch = raw.match(/EXACT PHRASES TO USE\s*\n([\s\S]*?)(?=WHAT NOT TO SAY|$)/i);
  const notToSayMatch = raw.match(/WHAT NOT TO SAY\s*\n([\s\S]*?)$/i);

  if (rangeMatch) sections.range = rangeMatch[1].trim();
  if (whyMatch) sections.why = whyMatch[1].trim();
  if (positionMatch) sections.position = positionMatch[1].trim();
  if (phrasesMatch) sections.phrases = phrasesMatch[1].trim();
  if (notToSayMatch) sections.notToSay = notToSayMatch[1].trim();

  return sections;
}

function getPositionColor(positionText) {
  const lower = positionText.toLowerCase();
  if (lower.startsWith('strong')) return { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300' };
  if (lower.startsWith('weak')) return { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-300' };
  return { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-300' };
}

function extractPhrases(phrasesText) {
  return phrasesText
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

function RejectionPredictorView({ content }) {
  const sections = parseRejectionReasons(content);

  return (
    <div className="grid gap-5">
      {/* ATS SCAN */}
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-rose-300">ATS Scan</h3>
        <pre className="whitespace-pre-wrap text-sm leading-7 text-rose-200">{sections.ats}</pre>
      </div>

      {/* RECRUITER SCAN */}
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-rose-300">Recruiter Scan (first 10 seconds)</h3>
        <pre className="whitespace-pre-wrap text-sm leading-7 text-rose-200">{sections.recruiter}</pre>
      </div>

      {/* VERDICT */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-slate-300">Verdict</h3>
        <p className="text-sm leading-7 text-slate-200">{sections.verdict}</p>
      </div>
    </div>
  );
}

function SalaryCoachView({ content }) {
  const sections = parseSalaryCoach(content);
  const positionColors = getPositionColor(sections.position);
  const phrases = extractPhrases(sections.phrases);
  const badPhrases = extractPhrases(sections.notToSay);

  return (
    <div className="grid gap-5">
      {/* ESTIMATED RANGE */}
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Estimated Range</h3>
        <p className="text-lg font-semibold text-emerald-200">{sections.range}</p>
      </div>

      {/* WHY THIS RANGE */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-slate-300">Why This Range</h3>
        <p className="text-sm leading-7 text-slate-200">{sections.why}</p>
      </div>

      {/* YOUR NEGOTIATION POSITION */}
      <div className={`rounded-3xl border ${positionColors.border} ${positionColors.bg} p-5`}>
        <h3 className={`mb-3 text-sm font-bold uppercase tracking-[0.25em] ${positionColors.text}`}>Your Negotiation Position</h3>
        <p className={`text-sm leading-7 ${positionColors.text}`}>{sections.position}</p>
      </div>

      {/* EXACT PHRASES TO USE */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-slate-300">Exact Phrases to Use</h3>
        <div className="grid gap-3">
          {phrases.map((phrase, index) => (
            <div key={`phrase-${index}`} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm leading-6 text-slate-200">
                <span className="mr-2 text-xs font-bold text-cyan-300">{index + 1}.</span>
                {phrase}
              </p>
              <CopyButton text={phrase} label="Copy" />
            </div>
          ))}
        </div>
      </div>

      {/* WHAT NOT TO SAY */}
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-rose-300">What Not to Say</h3>
        <div className="grid gap-2">
          {badPhrases.map((phrase, index) => (
            <p key={`bad-${index}`} className="text-sm leading-6 text-rose-200">
              <span className="mr-2 text-xs font-bold text-rose-400">{index + 1}.</span>
              {phrase}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function LearningPathView({ content }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  function toggleCard(index) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  return (
    <div className="grid gap-4">
      {content.map((item, index) => {
        const isExpanded = expandedIndex === index;

        return (
          <article key={`${item.skill}-${index}`} className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            {/* Card Header — always visible & clickable */}
            <button
              type="button"
              onClick={() => toggleCard(index)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-cyan-200">{item.skill}</p>
                <span className="rounded-full bg-cyan-400/10 px-3 py-0.5 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                  {item.total_honest_hours} hours total
                </span>
              </div>
              <span className="text-xs text-slate-400">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-white/10 p-5 pt-4">
                {/* Sources grouped by type */}
                <div className="mb-5">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Resources</h4>
                  <div className="grid gap-2">
                    {item.sources.map((source, sIndex) => (
                      <div key={`source-${sIndex}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0 text-xs text-slate-400">{SOURCE_LABELS[source.type] || source.type}</span>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-sm text-cyan-300 underline underline-offset-4"
                          >
                            {source.title}
                          </a>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
                            source.free
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {source.free ? 'Free' : 'Paid'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day Plan */}
                <div className="mb-5">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Day Plan</h4>
                  <div className="grid gap-2">
                    {item.day_plan.map((day, dIndex) => (
                      <div key={`day-${dIndex}`} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                        <span className="shrink-0 rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                          Day {day.day}
                        </span>
                        <p className="flex-1 text-sm leading-6 text-slate-200">{day.goal}</p>
                        <span className="shrink-0 text-xs text-slate-400">{day.duration_minutes} min</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Self-study prompt */}
                <div>
                  <p className="mb-2 text-xs text-slate-400">
                    Paste this into Claude, ChatGPT, or Gemini to get a personal tutor
                  </p>
                  <div className="relative rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-300">{item.self_study_prompt}</pre>
                    <div className="mt-3 flex justify-end">
                      <CopyButton text={item.self_study_prompt} label="Copy prompt" />
                    </div>
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

export default function ApplyKitModal({ isOpen, onClose, job, analysisId }) {
  const dispatch = useDispatch();
  const history = useSelector(selectHistory);
  const [activeType, setActiveType] = useState('cover_letter');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const currentItem = useMemo(() => {
    const exactMatch = history.generatedItems.find(
      (item) =>
        item.analysisId === analysisId &&
        item.contentType === activeType &&
        item.jobId === (job?.id || null)
    );

    if (exactMatch) {
      return exactMatch;
    }

    return history.generatedItems.find(
      (item) => item.analysisId === analysisId && item.contentType === activeType
    );
  }, [activeType, analysisId, history.generatedItems, job?.id]);

  if (!isOpen || !job) {
    return null;
  }

  async function handleGenerate(contentType) {
    if (!analysisId) {
      setError('Run a resume analysis first so Aptico can generate context-aware output.');
      return;
    }

    setActiveType(contentType);
    setIsLoading(true);
    setError('');
    setStatus('');

    try {
      const response = await api.post('/api/generate', {
        analysis_id: analysisId,
        content_type: contentType,
        job_id: job.id || null,
        job_title: job.title,
        company: job.company,
        job_description: job.description,
        url: job.url
      });

      const generatedItem = normalizeGeneratedItem(response.data.data);
      dispatch(addGeneratedItem(generatedItem));
      setStatus(`${CONTENT_TYPES.find((item) => item.value === contentType)?.label || 'Content'} generated.`);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not generate content.');
    } finally {
      setIsLoading(false);
    }
  }

  async function copyCurrentOutput() {
    if (!currentItem) {
      return;
    }

    const copyValue =
      typeof currentItem.content === 'string' ? currentItem.content : JSON.stringify(currentItem.content, null, 2);

    try {
      await navigator.clipboard.writeText(copyValue);
      setStatus('Copied to clipboard.');
    } catch (error) {
      setError('Could not copy the generated content.');
    }
  }

  function renderContent() {
    if (!currentItem) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-8 text-sm text-slate-400">
          Choose a generation type to create context-aware application content for this role.
        </div>
      );
    }

    if (currentItem.contentType === 'rejection_reasons') {
      return <RejectionPredictorView content={currentItem.content} />;
    }

    if (currentItem.contentType === 'salary_coach') {
      return <SalaryCoachView content={currentItem.content} />;
    }

    if (currentItem.contentType === 'learning_path') {
      return <LearningPathView content={currentItem.content} />;
    }

    if (currentItem.contentType === 'interview_questions') {
      return (
        <ol className="grid gap-3">
          {currentItem.content.map((question, index) => (
            <li key={`${question}-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
              {index + 1}. {question}
            </li>
          ))}
        </ol>
      );
    }

    return (
      <pre className="whitespace-pre-wrap rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-200">
        {currentItem.content}
      </pre>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-900 p-6 text-slate-100 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Apply Kit</p>
            <h2 className="text-2xl font-semibold text-white">{job.title}</h2>
            <p className="text-sm text-slate-300">
              {job.company} · {job.location}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {CONTENT_TYPES.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={isLoading}
              onClick={() => {
                void handleGenerate(item.value);
              }}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${
                activeType === item.value
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {isLoading && activeType === item.value ? 'Generating...' : item.label}
            </button>
          ))}
        </div>

        {status ? (
          <div className="mt-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Generated output</p>
              <p className="mt-1 text-sm text-slate-300">
                {analysisId
                  ? 'Stored in generated_content and persisted in UI history.'
                  : 'Run a resume analysis before generating application assets.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void copyCurrentOutput();
              }}
              disabled={!currentItem}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
            >
              Copy
            </button>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
