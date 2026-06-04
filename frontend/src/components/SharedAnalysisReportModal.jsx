import { useMemo, useState } from 'react';

const reportTabs = [
  ['gap', 'analytics', 'Gap Analysis'],
  ['rewrite', 'edit_note', 'Bullet Rewrite'],
  ['seniority', 'trending_up', 'Seniority'],
  ['interview', 'psychology', 'Interview Prep'],
  ['risks', 'warning', 'Risk Flags'],
  ['salary', 'payments', 'Salary Coach'],
  ['learning', 'school', 'Learning Path'],
  ['outreach', 'mail', 'Outreach']
];

const sourceLabels = {
  youtube: 'YouTube',
  course: 'Course',
  docs: 'Docs',
  site: 'Site',
  bootcamp: 'Bootcamp',
  github: 'GitHub'
};

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function EmptyReportSection({ message }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel-soft)] p-6 text-center text-sm text-[var(--muted-strong)]">
      {message}
    </div>
  );
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(/\n|\u2022|-/).map((item) => item.trim()).filter(Boolean);
}

function renderTextBlock(value, fallback) {
  if (!value) return <EmptyReportSection message={fallback} />;
  if (typeof value === 'string') {
    return <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text)]">{value}</p>;
  }
  return <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-xs leading-6 text-[var(--text)]">{JSON.stringify(value, null, 2)}</pre>;
}

function parseSalaryCoach(text) {
  const sections = { range: '', why: '', position: '', phrases: [], notToSay: [] };
  const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const splitList = (block) =>
    block
      .trim()
      .split('\n')
      .map((line) => line.replace(/^\s*[-*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
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
  if (!content) return { coldEmail: '', coverLetter: '' };
  if (typeof content === 'string') return { coldEmail: content, coverLetter: '' };
  return {
    coldEmail: content.coldEmail || content.cold_email || '',
    coverLetter: content.coverLetter || content.cover_letter || ''
  };
}

function GapAnalysisTab({ stage1 }) {
  const mismatches = stage1?.keywordMismatches || [];
  const matched = stage1?.skillsPresent || [];

  return (
    <div className="space-y-5">
      {stage1?.summary ? <p className="text-sm leading-7 text-[var(--text)]">{stage1.summary}</p> : null}
      {matched.length ? (
        <div>
          <p className="app-field-label">Matched skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {matched.slice(0, 14).map((skill) => <span key={skill} className="app-chip">{skill}</span>)}
          </div>
        </div>
      ) : null}
      {mismatches.length ? (
        <div>
          <p className="app-field-label">Keyword gaps</p>
          <div className="mt-3 grid gap-3">
            {mismatches.map((item, index) => (
              <article key={`${item.keyword || 'gap'}-${index}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                <p className="font-black text-[var(--text)]">{item.keyword || 'Skill gap'}</p>
                {item.jobRequirement ? <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{item.jobRequirement}</p> : null}
                {item.resumeEvidence ? <p className="mt-2 text-sm leading-6 text-[var(--text)]">Resume signal: {item.resumeEvidence}</p> : null}
              </article>
            ))}
          </div>
        </div>
      ) : <EmptyReportSection message="No gap analysis details were shared." />}
    </div>
  );
}

function RewriteTab({ stage1 }) {
  const rewrites = stage1?.rewriteSuggestions || [];
  if (!rewrites.length) return <EmptyReportSection message="No bullet rewrite suggestions were shared." />;

  return (
    <div className="grid gap-3">
      {rewrites.map((item, index) => (
        <article key={index} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          {item.original || item.before ? <p className="text-sm leading-6 text-[var(--muted-strong)]">{item.original || item.before}</p> : null}
          {item.rewritten || item.suggestion || item.improved || item.after ? <p className="mt-3 text-sm font-semibold leading-6 text-[var(--text)]">{item.rewritten || item.suggestion || item.improved || item.after}</p> : null}
          {item.reason ? <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">{item.reason}</p> : null}
        </article>
      ))}
    </div>
  );
}

function SeniorityTab({ stage1 }) {
  const items = stage1?.seniorityMismatches || [];
  if (!items.length) return <EmptyReportSection message="No seniority mismatches were shared." />;

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <article key={`${item.topic || 'seniority'}-${index}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <p className="font-black text-[var(--text)]">{item.topic || 'Seniority signal'}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <p className="text-sm leading-6 text-[var(--muted-strong)]">{item.resumeLevel || 'Resume level not specified.'}</p>
            <p className="text-sm leading-6 text-[var(--text)]">{item.targetLevel || 'Target level not specified.'}</p>
          </div>
          {item.explanation ? <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">{item.explanation}</p> : null}
        </article>
      ))}
    </div>
  );
}

function InterviewTab({ stage2 }) {
  const questions = stage2?.interviewQuestions || [];
  if (!questions.length) return <EmptyReportSection message="No interview prep questions were shared." />;

  return (
    <ol className="grid gap-3">
      {questions.map((question, index) => (
        <li key={`${question}-${index}`} className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <span className="font-mono text-sm font-black text-[var(--accent-strong)]">{String(index + 1).padStart(2, '0')}</span>
          <p className="text-sm leading-6 text-[var(--text)]">{question}</p>
        </li>
      ))}
    </ol>
  );
}

function RiskTab({ stage2 }) {
  const risks = normalizeList(stage2?.rejectionReasons);
  if (!risks.length) return <EmptyReportSection message="No risk flags were shared." />;

  return (
    <div className="grid gap-3">
      {risks.map((risk, index) => (
        <div key={`${risk}-${index}`} className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-[var(--text)]">{risk}</div>
      ))}
    </div>
  );
}

function SalaryTab({ stage2 }) {
  if (!stage2?.salaryCoach) return <EmptyReportSection message="No salary coaching was shared." />;
  const sections = parseSalaryCoach(stage2.salaryCoach);
  const parsedAny = Boolean(sections.range || sections.why || sections.position || sections.phrases.length || sections.notToSay.length);

  if (!parsedAny) return renderTextBlock(stage2.salaryCoach, 'No salary coaching was shared.');

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Estimated compensation range</p>
        <p className="mt-2 text-2xl font-black text-[var(--text)]">{sections.range || 'Not provided'}</p>
      </section>
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
        <p className="app-field-label">Why this range</p>
        <p className="mt-2 text-sm leading-7 text-[var(--text)]">{sections.why || 'No explanation returned.'}</p>
      </section>
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
        <p className="app-field-label">Negotiation position</p>
        <p className="mt-2 text-sm font-semibold leading-7 text-[var(--text)]">{sections.position || 'No position guidance returned.'}</p>
      </section>
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
        <p className="app-field-label">Exact phrases to use</p>
        <div className="mt-3 grid gap-2">
          {sections.phrases.length ? sections.phrases.map((phrase, index) => (
            <p key={`${phrase}-${index}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 text-sm leading-6 text-[var(--text)]">{phrase}</p>
          )) : <p className="text-sm text-[var(--muted-strong)]">No ready-to-use phrases were returned.</p>}
        </div>
      </section>
      <section className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4">
        <p className="app-field-label text-rose-500">What not to say</p>
        <div className="mt-3 grid gap-2">
          {sections.notToSay.length ? sections.notToSay.map((phrase, index) => (
            <p key={`${phrase}-${index}`} className="rounded-lg border border-rose-500/20 bg-[var(--panel)] p-3 text-sm leading-6 text-[var(--text)]">{phrase}</p>
          )) : <p className="text-sm text-[var(--muted-strong)]">No restricted phrases were returned.</p>}
        </div>
      </section>
    </div>
  );
}

function LearningTab({ stage3 }) {
  const items = stage3?.learningPath || [];
  if (!items.length) return <EmptyReportSection message="No learning path was shared." />;

  return (
    <div className="grid gap-5">
      {items.map((item, index) => {
        const resources = item.resources || item.sources || [];
        const dayPlan = item.day_bootcamp || item.day_plan || [];
        const prompt = item.ai_tutor_prompt || item.self_study_prompt || '';

        return (
        <article key={`${item.skill || item.topic || index}-${index}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-black text-[var(--text)]">{item.skill || item.topic || item.title || `Learning item ${index + 1}`}</p>
              {item.why_learn_first || item.why_it_matters || item.reason ? <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{item.why_learn_first || item.why_it_matters || item.reason}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {item.difficulty ? <span className="app-chip">{item.difficulty}</span> : null}
              {item.total_honest_hours ? <span className="app-chip">{item.total_honest_hours}h</span> : null}
            </div>
          </div>

          {resources.length ? (
            <div className="mt-5">
              <p className="app-field-label">References</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {resources.map((resource, resourceIndex) => (
                  <a key={`${resource.title || resource.url}-${resourceIndex}`} href={resource.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 transition hover:border-[var(--accent)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[var(--text)]">{resource.title || 'Learning resource'}</p>
                        <p className="mt-1 text-xs text-[var(--muted-strong)]">{sourceLabels[resource.type] || resource.type || 'Reference'}</p>
                      </div>
                      <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--muted-strong)]">{resource.free ? 'Free' : 'Paid'}</span>
                    </div>
                    {resource.why ? <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">{resource.why}</p> : null}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {dayPlan.length ? (
            <div className="mt-5">
              <p className="app-field-label">Study plan</p>
              <div className="mt-3 grid gap-2">
                {dayPlan.map((day, dayIndex) => (
                  <div key={`${day.day || dayIndex}-${dayIndex}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                    <p className="text-sm font-black text-[var(--text)]">Day {day.day || dayIndex + 1}: {day.focus || day.goal || 'Study block'}</p>
                    {day.tasks?.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[var(--muted-strong)]">
                        {day.tasks.map((task, taskIndex) => <li key={`${task}-${taskIndex}`}>{task}</li>)}
                      </ul>
                    ) : null}
                    {day.duration_minutes ? <p className="mt-2 text-xs text-[var(--muted-strong)]">{day.duration_minutes} minutes</p> : null}
                    {day.practice_question ? <p className="mt-2 text-xs font-semibold leading-5 text-[var(--accent-strong)]">{day.practice_question}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {item.projects?.length ? (
            <div className="mt-5">
              <p className="app-field-label">Projects</p>
              <div className="mt-3 grid gap-2">
                {item.projects.map((project, projectIndex) => (
                  <div key={`${project.title}-${projectIndex}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                    <p className="text-sm font-bold text-[var(--text)]">{project.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{project.description}</p>
                    {project.github_search ? <p className="mt-2 text-xs font-semibold text-[var(--accent-strong)]">Search: {project.github_search}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {prompt ? (
            <div className="mt-5">
              <p className="app-field-label">AI tutor prompt</p>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[#0d0e10] p-4 text-xs leading-6 text-zinc-300">{prompt}</pre>
            </div>
          ) : null}
        </article>
      );
      })}
    </div>
  );
}

function OutreachTab({ stage3 }) {
  const [active, setActive] = useState('coldEmail');
  const { coldEmail, coverLetter } = parseOutreachContent({ coldEmail: stage3?.coldEmail, coverLetter: stage3?.coverLetter });
  const tabs = [
    ['coldEmail', 'Cold email', coldEmail],
    ['coverLetter', 'Cover letter', coverLetter]
  ].filter(([, , value]) => value);
  const activeValue = tabs.find(([id]) => id === active)?.[2] || tabs[0]?.[2] || '';

  if (!tabs.length) return <EmptyReportSection message="No outreach content was shared." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setActive(id)} className={active === id ? 'app-button px-3 py-2' : 'app-button-secondary px-3 py-2'}>
            {label}
          </button>
        ))}
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[#0d0e10] p-5 text-sm leading-7 text-zinc-300">{activeValue}</pre>
    </div>
  );
}

function TabContent({ activeTab, snapshot }) {
  if (activeTab === 'gap') return <GapAnalysisTab stage1={snapshot.stage1} />;
  if (activeTab === 'rewrite') return <RewriteTab stage1={snapshot.stage1} />;
  if (activeTab === 'seniority') return <SeniorityTab stage1={snapshot.stage1} />;
  if (activeTab === 'interview') return <InterviewTab stage2={snapshot.stage2} />;
  if (activeTab === 'risks') return <RiskTab stage2={snapshot.stage2} />;
  if (activeTab === 'salary') return <SalaryTab stage2={snapshot.stage2} />;
  if (activeTab === 'learning') return <LearningTab stage3={snapshot.stage3} />;
  return <OutreachTab stage3={snapshot.stage3} />;
}

export default function SharedAnalysisReportModal({ open, onClose, report }) {
  const [activeTab, setActiveTab] = useState('gap');
  const snapshot = report || {};
  const score = clampPercent(snapshot.confidenceScore || snapshot.stage1?.confidenceScore || snapshot.precheck?.score);
  const matchedSkills = useMemo(() => {
    return Array.isArray(snapshot.matchedSkills) && snapshot.matchedSkills.length ? snapshot.matchedSkills : snapshot.stage1?.skillsPresent || [];
  }, [snapshot]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-0 sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close full report" onClick={onClose} />
      <section className="relative flex h-full w-full flex-col overflow-hidden border border-[var(--border)] bg-[var(--panel)] shadow-2xl sm:h-[92vh] sm:max-w-5xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--panel-soft)] p-5">
          <div>
            <p className="app-kicker">Shared analysis report</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--text)]">{snapshot.companyName || snapshot.stage1?.companyName || 'Role Analysis'}</h2>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">{snapshot.jobTitle || snapshot.stage1?.jobTitle || 'Target Role'}</p>
          </div>
          <button type="button" className="app-icon-button" onClick={onClose} aria-label="Close full report">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <aside className="space-y-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                <p className="text-4xl font-black text-[var(--accent-strong)]">{score}%</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[var(--muted-strong)]">Readiness</p>
              </div>
              {matchedSkills.length ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="app-field-label">Signals</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {matchedSkills.slice(0, 8).map((skill) => <span key={skill} className="app-chip">{skill}</span>)}
                  </div>
                </div>
              ) : null}
            </aside>

            <main className="min-w-0">
              <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-2">
                {reportTabs.map(([id, icon, label]) => (
                  <button key={id} type="button" onClick={() => setActiveTab(id)} className={activeTab === id ? 'app-button whitespace-nowrap px-3 py-2' : 'app-button-secondary whitespace-nowrap px-3 py-2'}>
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
                <TabContent activeTab={activeTab} snapshot={snapshot} />
              </div>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
