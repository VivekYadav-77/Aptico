import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle.jsx';

const featureRail = [
  {
    title: 'Resume-to-role match scoring',
    copy: 'See how your profile performs against a real job description before you apply.'
  },
  {
    title: '8 focused AI insights',
    copy: 'Gap analysis, rewrites, interview prep, salary coaching, learning paths, and outreach in one flow.'
  },
  {
    title: 'Cross-platform job search',
    copy: 'Search multiple job sources with filters tuned to remote, hybrid, full-time, and internship roles.'
  },
  {
    title: 'Guest-safe exploration',
    copy: 'Let new users try the product without losing clarity about what needs an account.'
  },
  {
    title: 'Admin health visibility',
    copy: 'Track service reliability, session health, usage mix, and moderation actions from one control room.'
  },
  {
    title: 'Dark and light clarity',
    copy: 'Aptico keeps the same information hierarchy and comfort across desktop and mobile in both themes.'
  }
];

const methodologySteps = [
  {
    number: '01',
    title: 'Upload',
    copy: 'Ingest your resume, target role, and supporting experience in one guided workspace.'
  },
  {
    number: '02',
    title: 'Analyze',
    copy: 'Aptico scores fit, exposes gaps, and turns your profile into eight focused AI insights.'
  },
  {
    number: '03',
    title: 'Match',
    copy: 'Carry that intelligence directly into job search so every role is filtered with context.'
  },
  {
    number: '04',
    title: 'Improve',
    copy: 'Use the feedback to strengthen your resume, interview story, and next application cycle.'
  }
];

const mainFeatures = [
  [
    '01',
    'Resume Match Scoring',
    'Measure how closely your resume fits a target role before applying, with a clearer view of strengths and weak spots.'
  ],
  [
    '02',
    '8 AI Career Insights',
    'Turn one analysis into practical outputs for gap discovery, resume rewrites, interview prep, salary coaching, and outreach.'
  ],
  [
    '03',
    'Analysis-Aware Job Search',
    'Search roles using the same matched skills and role context so your applications stay focused from start to finish.'
  ]
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-page">
      <header className="fixed top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--shell)]">
        <div className="flex h-14 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-[-0.05em] text-[var(--text)]">Aptico</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <a className="border-b-2 border-[var(--accent)] pb-1 text-sm font-semibold text-[var(--accent-strong)]">Product</a>
            <a className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)]">Pricing</a>
            <a className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)]">Docs</a>
            <a className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)]">Blog</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <Link to="/auth" className="hidden text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)] sm:inline-flex">Log in</Link>
            <Link to="/auth" className="app-button hidden px-4 py-2 md:inline-flex">Start free</Link>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="app-icon-button md:hidden"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen ? (
          <div className="border-t border-[var(--border)] bg-[var(--shell)] px-6 py-5 md:hidden">
            <nav className="flex flex-col gap-1">
              {[
                ['Product', '#'],
                ['Pricing', '#'],
                ['Docs', '#'],
                ['Blog', '#']
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted-strong)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4">
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="app-button-secondary w-full justify-center"
              >
                Log in
              </Link>
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="app-button w-full justify-center"
              >
                Start free
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main className="px-6 pt-[120px]">
        <section className="mx-auto mb-24 max-w-[720px] text-center">
          <span className="mono-text mb-4 block text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">Beyond the resume</span>
          <h1 className="mb-6 text-5xl font-black leading-[1.06] tracking-[-0.06em] text-[var(--text)] md:text-[56px]">
            Career Intelligence for the Modern Job Seeker
          </h1>
          <p className="mx-auto mb-10 max-w-[600px] text-xl text-[var(--muted)]">
            Aptico transforms your resume, target role, and job search into a structured intelligence system built for action.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/auth" className="app-button px-8 py-3 transition hover:brightness-105">Start Free</Link>
            <Link to="/analysis" className="app-button-secondary px-8 py-3 transition hover:bg-[var(--panel-soft)]">View Demo</Link>
          </div>
        </section>

        <section className="mx-auto mb-24 max-w-6xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] pb-2 shadow-2xl">
          <div className="flex h-8 items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-strong)] px-4">
            <div className="h-2.5 w-2.5 rounded-full bg-[var(--muted)]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[var(--muted)]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[var(--muted)]" />
            <div className="mono-text ml-4 rounded bg-[var(--panel-soft)] px-3 py-1 text-[10px] text-[var(--muted)]">aptico.io/workspace/analysis</div>
          </div>

          <div className="grid gap-6 bg-[var(--bg)] p-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
                <div className="mb-8 flex items-start justify-between">
                  <div>
                    <span className="mono-text text-[10px] uppercase text-[var(--accent)]">Intelligence output</span>
                    <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text)]">System Design Maturity</h3>
                  </div>
                  <span className="mono-text text-2xl font-bold text-[var(--accent)]">94.2%</span>
                </div>
                <div className="h-36 rounded-lg bg-[linear-gradient(135deg,rgba(78,222,163,0.2),rgba(113,161,255,0.08),transparent)]" />
              </div>
            </div>

            <div className="space-y-4 lg:col-span-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
                <span className="mono-text mb-3 block text-[10px] uppercase text-[var(--muted)]">Primary skills</span>
                <div className="space-y-4 text-[11px]">
                  <div>
                    <div className="mono-text flex justify-between"><span>React</span><span className="text-[var(--accent)]">Advanced</span></div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--panel-soft)]"><div className="h-full w-[85%] bg-[var(--accent)]" /></div>
                  </div>
                  <div>
                    <div className="mono-text flex justify-between"><span>Distributed Systems</span><span className="text-[var(--accent)]">Senior</span></div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--panel-soft)]"><div className="h-full w-[92%] bg-[var(--accent)]" /></div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
                <span className="mono-text mb-3 block text-[10px] uppercase text-[var(--muted)]">Growth vector</span>
                <div className="flex h-24 items-end gap-1">
                  <div className="w-full rounded-t-sm bg-[var(--accent-soft)] h-[40%]" />
                  <div className="w-full rounded-t-sm bg-[var(--accent-soft)] h-[60%]" />
                  <div className="w-full rounded-t-sm bg-[var(--accent-soft)] h-[50%]" />
                  <div className="w-full rounded-t-sm bg-[var(--accent-soft)] h-[80%]" />
                  <div className="w-full rounded-t-sm bg-[var(--accent)] h-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mb-24 max-w-6xl space-y-6">
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="app-kicker">Feature rail</p>
              <h2 className="text-3xl font-black tracking-[-0.04em] text-[var(--text)]">Everything Aptico does, arranged in a right-to-left feature stream</h2>
            </div>
            <p className="hidden max-w-sm text-sm leading-7 text-[var(--muted)] lg:block">
              The rail now moves continuously from right to left so the platform value stays visible without needing user input.
            </p>
          </div>

          <div className="feature-marquee">
            <div className="feature-marquee-track">
              {[...featureRail, ...featureRail].map((feature, index) => (
                <article key={`${feature.title}-${index}`} className="feature-card">
                  <p className="app-kicker">Aptico feature</p>
                  <h3 className="mt-3 text-xl font-bold tracking-[-0.03em] text-[var(--text)]">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">{feature.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mb-24 max-w-6xl border-y border-[var(--border)]">
          <div className="grid md:grid-cols-3">
            {mainFeatures.map(([num, title, copy], index) => (
              <div key={title} className={`p-10 ${index < 2 ? 'md:border-r md:border-[var(--border)]' : ''}`}>
                <span className="mono-text mb-6 block text-[14px] text-[var(--muted)]">{num}</span>
                <h3 className="mb-4 text-xl font-bold tracking-[-0.03em] text-[var(--text)]">{title}</h3>
                <p className="text-[var(--muted)]">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mb-24 max-w-6xl px-2">
          <span className="mono-text mb-12 block text-center text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">
            The methodology
          </span>

          <div className="relative flex flex-col items-center justify-between gap-10 md:flex-row md:items-start md:gap-4">
            <div className="absolute left-0 top-5 -z-10 hidden h-px w-full border-t border-dashed border-[var(--border)] md:block" />

            {methodologySteps.map((step) => (
              <div key={step.number} className="flex max-w-[220px] flex-col items-center text-center">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] mono-text text-xs text-[var(--text)]">
                  {step.number}
                </div>
                <h4 className="mb-2 text-sm font-bold tracking-[-0.02em] text-[var(--text)]">{step.title}</h4>
                <p className="text-xs leading-6 text-[var(--muted)]">{step.copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
