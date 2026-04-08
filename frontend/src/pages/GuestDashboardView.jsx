import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

const previewMetrics = [
  ['Impact', '88%'],
  ['Skills', '74%'],
  ['Network', '92%']
];

const predictedOpportunities = [
  {
    title: 'Senior Systems Architect',
    company: 'Stripe',
    location: 'San Francisco, CA',
    score: 82,
    stroke: 'var(--accent)',
    borderClass: 'border-[var(--accent)]'
  },
  {
    title: 'Lead Growth Engineer',
    company: 'Vercel',
    location: 'Remote',
    score: 45,
    stroke: '#f59e0b',
    borderClass: 'border-amber-500/70'
  },
  {
    title: 'Product Designer II',
    company: 'Airbnb',
    location: 'Tokyo, JP',
    score: null,
    stroke: 'var(--muted)',
    borderClass: 'border-[var(--border)] opacity-50 blur-[1px]'
  }
];

const featureRows = [
  ['AI Resume Analysis', 'Basic match score', 'Deep behavioral audit'],
  ['Daily Job Leads', '3 matches', 'Unlimited and priority feed'],
  ['Skill Gap Intelligence', 'Unavailable', 'Step-by-step roadmap'],
  ['Direct Networking', 'Unavailable', 'Internal referrals']
];

function OpportunityCard({ title, company, location, score, stroke, borderClass }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = score === null ? circumference : circumference * (1 - score / 100);

  return (
    <div
      className={`rounded-2xl border-l-4 bg-[var(--panel)] p-6 transition-colors hover:bg-[var(--panel-soft)] ${borderClass}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-[var(--text)]">{title}</h4>
          <p className="mt-1 text-sm font-medium text-[var(--muted-strong)]">
            {company} - {location}
          </p>
        </div>

        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={radius} fill="transparent" stroke="rgba(113,113,122,0.28)" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="transparent"
              stroke={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>
          <span className="absolute text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            {score === null ? '??%' : `${score}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function GuestDashboardView() {
  return (
    <AppShell
      title="Guest dashboard"
      description="A richer guest-mode preview based on your Guest Dashboard reference, showing the product promise clearly while keeping locked value, urgency, and upgrade paths front and center."
      banner={
        <div className="border-b border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--warning-text)]">
          Guest mode: progress will not be saved. Create an account to keep your work and unlock full Aptico intelligence.
        </div>
      }
      actions={
        <>
          <Link to="/auth" className="app-button">
            Upload resume
          </Link>
          <Link to="/" className="app-button-secondary">
            Back to landing
          </Link>
        </>
      }
    >
      <section className="space-y-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="app-kicker text-[var(--accent-strong)]">Guest dashboard</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[var(--text)] sm:text-5xl">See the power of Aptico</h2>
            <p className="mt-4 text-sm leading-8 text-[var(--muted-strong)]">
              Explore analysis previews, predicted opportunities, and premium career intelligence before you create an account.
            </p>
          </div>

          <Link to="/auth" className="app-button px-8 py-4">
            <span className="material-symbols-outlined text-[20px]">upload</span>
            Upload resume
          </Link>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="app-panel relative min-h-[500px] overflow-hidden">
            <div className="mb-8">
              <p className="app-kicker">Intelligence module</p>
              <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text)]">Resume Match Analysis</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <span className="material-symbols-outlined text-[20px]">person_search</span>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded-full bg-[var(--panel-strong)]" />
                  <div className="h-4 w-1/2 rounded-full bg-[var(--panel-strong)]" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {previewMetrics.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                    <p className="app-field-label">{label}</p>
                    <p className="mt-3 font-mono text-2xl font-bold text-[var(--accent-strong)]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="h-2 w-full rounded-full bg-[var(--panel-strong)]" />
                <div className="h-2 w-full rounded-full bg-[var(--panel-strong)]" />
                <div className="h-2 w-2/3 rounded-full bg-[var(--panel-strong)]" />
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-[color:rgba(19,19,21,0.45)] p-6 backdrop-blur-md dark:bg-[color:rgba(19,19,21,0.62)]">
              <div className="max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center shadow-[0_22px_50px_rgba(0,0,0,0.24)]">
                <span className="material-symbols-outlined text-5xl text-[var(--accent)]">lock_open</span>
                <h4 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-[var(--text)]">Unlock detailed insights</h4>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                  Create a free account to view your full resume analysis, competitive scores, and AI guidance.
                </p>
                <Link to="/auth" className="app-button mt-6 w-full justify-center">
                  Sign up to view
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="app-kicker">Predicted opportunities</p>
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                Live feed
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
              </span>
            </div>

            <div className="space-y-4">
              {predictedOpportunities.map((job) => (
                <OpportunityCard key={job.title} {...job} />
              ))}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-5">
              <p className="app-field-label">Why this matters</p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">
                Aptico can turn your resume, goals, and signals into sharper opportunity matches once your account is active and your data is saved.
              </p>
            </div>
          </section>
        </div>

        <section className="app-panel">
          <div className="text-center">
            <h3 className="text-3xl font-black tracking-[-0.04em] text-[var(--text)]">What you unlock</h3>
            <p className="mt-3 text-sm font-medium text-[var(--muted-strong)]">Professional tools for career mastery</p>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--panel-soft)]">
                  <th className="px-6 py-4 app-field-label">Feature</th>
                  <th className="px-6 py-4 app-field-label">Guest</th>
                  <th className="px-6 py-4 app-field-label text-[var(--accent-strong)]">Pro member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--panel)]">
                {featureRows.map(([feature, guest, pro]) => (
                  <tr key={feature}>
                    <td className="px-6 py-5 text-sm font-bold text-[var(--text)]">{feature}</td>
                    <td className="px-6 py-5 text-sm text-[var(--muted-strong)]">{guest}</td>
                    <td className="px-6 py-5 text-sm font-medium text-[var(--accent-strong)]">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
