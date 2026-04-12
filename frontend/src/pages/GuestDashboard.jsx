import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { getPlatformStats, getPublicJobs, getWins } from '../api/socialApi.js';

function timeAgo(value) {
  if (!value) return 'recently';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function initials(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

export default function GuestDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalAnalyses: 0, totalWins: 0, totalPublicJobs: 0 });
  const [jobs, setJobs] = useState([]);
  const [wins, setWins] = useState([]);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getPlatformStats().catch(() => null),
      getPublicJobs({ limit: 10 }).catch(() => []),
      getWins({ limit: 8 }).catch(() => ({ wins: [] }))
    ]).then(([statsResult, jobsResult, winsResult]) => {
      if (!mounted) return;
      if (statsResult) setStats(statsResult);
      setJobs(jobsResult || []);
      setWins(winsResult?.wins || []);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const statItems = useMemo(
    () => [
      [stats.totalUsers, 'job seekers'],
      [stats.totalAnalyses, 'analyses run'],
      [stats.totalWins, 'people hired'],
      [stats.totalPublicJobs, 'live job listings']
    ],
    [stats]
  );

  return (
    <div className="app-page">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--shell)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-xl font-black text-[var(--text)]">Aptico</Link>
          <nav className="flex items-center gap-3">
            <a href="#public-jobs" className="hidden text-sm font-bold text-[var(--muted-strong)] sm:inline-flex">Jobs</a>
            <ThemeToggle compact />
            <Link to="/login" className="app-button-secondary px-4 py-2">Sign In</Link>
            <Link to="/signup" className="app-button px-4 py-2">Get Started</Link>
          </nav>
        </div>
      </header>

      <main className="px-4 py-10">
        <section className="mx-auto max-w-3xl py-16 text-center">
          <p className="app-kicker">Aptico career intelligence</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-[var(--text)] sm:text-5xl">Find jobs that actually fit you.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--muted-strong)]">
            Aptico analyzes your resume against any job description, finds real matching opportunities, and prepares your entire application - in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="app-button">Get Started Free</Link>
            <a href="#how-it-works" className="app-button-secondary">See how it works</a>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-3 border-y border-[var(--border)] py-5 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map(([value, label]) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-black text-[var(--text)]">{Number(value || 0).toLocaleString()}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--muted-strong)]">{label}</p>
            </div>
          ))}
        </section>

        <section id="public-jobs" className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[3fr_2fr]">
          <div>
            <div className="mb-5">
              <p className="app-kicker">Live Job Listings</p>
              <h2 className="mt-2 text-3xl font-black text-[var(--text)]">Updated as our community searches</h2>
            </div>
            <div className="space-y-3">
              {jobs.length ? jobs.map((job) => (
                <a key={job.id || job.jobId} href={job.applyUrl} target="_blank" rel="noreferrer" className="block rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:bg-[var(--panel-soft)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text)]">{job.title}</h3>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">{job.company} - {job.location || 'Remote'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {job.jobType ? <span className="app-chip">{job.jobType}</span> : null}
                      <span className="app-chip">{job.source}</span>
                    </div>
                  </div>
                  {typeof job.ghostScore === 'number' && job.ghostScore < 60 ? (
                    <p className="mt-3 text-xs font-semibold text-[var(--accent-strong)]">Ghost risk {job.ghostScore}</p>
                  ) : null}
                </a>
              )) : (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 text-sm text-[var(--muted-strong)]">Live jobs will appear here as the community searches.</div>
              )}
            </div>
            <Link to="/jobs" className="mt-5 inline-flex text-sm font-bold text-[var(--accent-strong)]">View all jobs -&gt;</Link>
          </div>

          <aside>
            <div className="mb-5">
              <p className="app-kicker">Recent Hires</p>
              <h2 className="mt-2 text-3xl font-black text-[var(--text)]">Community Wins</h2>
            </div>
            <div className="space-y-3">
              {wins.length ? wins.map((win) => (
                <article key={win.id} className="rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] p-5">
                  <div className="flex gap-3">
                    {win.user?.avatar_url ? (
                      <img src={win.user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[#003824]">{initials(win.user?.name)}</div>
                    )}
                    <div>
                      <p className="font-bold text-[var(--text)]">{win.user?.name || 'Aptico member'}</p>
                      <p className="text-sm text-[var(--muted-strong)]">{win.role_title} at {win.company_name || 'Undisclosed company'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted-strong)]">
                    {win.search_duration_weeks ? <span>Found in {win.search_duration_weeks} weeks</span> : null}
                    <span>{win.likes_count || 0} likes</span>
                    <span>{timeAgo(win.created_at)}</span>
                  </div>
                </article>
              )) : (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 text-sm text-[var(--muted-strong)]">Recent hires will appear here soon.</div>
              )}
            </div>
          </aside>
        </section>

        <section id="how-it-works" className="mx-auto mt-14 max-w-6xl">
          <div className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
            <div className="grid gap-5 blur-[4px] lg:grid-cols-[1fr_1.4fr]">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                <p className="app-kicker">Confidence score</p>
                <p className="mt-4 text-5xl font-black text-[var(--accent-strong)]">72</p>
                <p className="mt-3 text-sm text-[var(--muted-strong)]">Strong match with focused gaps in testing and systems language.</p>
              </div>
              <div className="grid gap-4">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                  <h3 className="font-bold text-[var(--text)]">Skill gaps</h3>
                  <p className="mt-3 text-sm text-[var(--muted-strong)]">Add measurable React performance work, API testing, and ownership examples.</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                  <h3 className="font-bold text-[var(--text)]">Bullet rewrite</h3>
                  <p className="mt-3 text-sm text-[var(--muted-strong)]">Built reusable dashboards that reduced manual reporting time by 38%.</p>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-[color:rgba(247,247,245,0.7)] p-4 dark:bg-[color:rgba(19,19,21,0.72)]">
              <div className="max-w-md rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 text-center shadow-[0_18px_38px_rgba(0,0,0,0.18)]">
                <h2 className="text-2xl font-black text-[var(--text)]">See your real analysis</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">Upload your resume and any job description to get your personal gap analysis, match score, and apply kit.</p>
                <Link to="/signup" className="app-button mt-5 w-full">Analyze My Resume Free</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
/*
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

const lockedFeatures = [
  'Saved analyses and profile history',
  'Protected admin and authenticated API routes',
  'Persistent job bookmarks and session syncing'
];

export default function GuestDashboard() {
  return (
    <AppShell
      title="Guest dashboard"
      description="Guest mode is now framed around Aptico’s actual service: explore the analysis flow, job search UI, and product structure safely while staying clear about what requires an account and what is not saved."
      banner={
        <div className="border-b border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-center text-sm text-[var(--warning-text)]">
          Guest mode is for exploration only. Progress, uploads, and protected routes are limited until you sign in.
        </div>
      }
      actions={
        <>
          <Link to="/auth" className="app-button">
            Create account
          </Link>
          <Link to="/analysis" className="app-button-secondary">
            Open analysis preview
          </Link>
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="app-panel">
          <p className="app-kicker">Preview experience</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--text)]">See the workflow before you commit</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">
            You can inspect the redesigned screens, understand how analysis works, and browse the product without
            exposing billing or persistence features that require a real account.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Analysis preview', 'Interactive layout and AI result structure'],
              ['Job search preview', 'Filters, cards, and multi-source UX'],
              ['Theme preview', 'Dark and light mode behavior on all screen sizes']
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                <h3 className="font-semibold text-[var(--text)]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">{copy}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="app-panel">
          <p className="app-kicker">Service terms</p>
          <div className="mt-4 space-y-4">
            {[
              'Guest sessions are temporary and should not be used for storing personal career documents.',
              'Protected API endpoints and account-specific data remain unavailable without authentication.',
              'Use the guest workspace to evaluate the product flow, then sign in to save real activity and unlock persistence.'
            ].map((rule) => (
              <div key={rule} className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm leading-7 text-[var(--muted-strong)]">
                {rule}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="app-panel relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.04))]" />
          <div className="relative">
            <p className="app-kicker">Locked until sign-in</p>
            <div className="mt-4 space-y-3">
              {lockedFeatures.map((feature) => (
                <div key={feature} className="flex items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3">
                  <span className="text-sm text-[var(--text)]">{feature}</span>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    Locked
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="app-panel">
          <p className="app-kicker">Next step</p>
          <h3 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--text)]">Move from preview to a saved workspace</h3>
          <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">
            Create an account to save analyses, keep your matched skills between sessions, search jobs with stored
            context, and access the full Aptico service.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/auth" className="app-button">
              Sign up now
            </Link>
            <Link to="/" className="app-button-secondary">
              Back to landing
            </Link>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
*/
