// ─────────────────────────────────────────────────────────────
// GuestDashboard — The public-facing homepage for Aptico
// Shows product value, live stats, jobs, community wins,
// and a gated analysis preview. Footer included.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle.jsx';
import Footer from '../components/Footer.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getPlatformStats, getPublicJobs, getWins } from '../api/socialApi.js';
import {
  APP_NAME,
  LANDING_FEATURES,
  LANDING_METHODOLOGY,
  LANDING_STATS_LABELS,
  NAVBAR_HEIGHT,
} from '../constants/index.js';

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
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [wins, setWins] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getPlatformStats().catch(() => null),
      getPublicJobs({ limit: 6 }).catch(() => []),
      getWins({ limit: 6 }).catch(() => ({ wins: [] })),
    ]).then(([statsResult, jobsResult, winsResult]) => {
      if (!mounted) return;
      setStats(statsResult || { totalUsers: 0, totalAnalyses: 0, totalWins: 0, totalPublicJobs: 0 });
      setJobs(jobsResult || []);
      setWins(winsResult?.wins || []);
    });
    return () => { mounted = false; };
  }, []);

  const statItems = useMemo(
    () =>
      stats
        ? [stats.totalUsers, stats.totalAnalyses, stats.totalWins, stats.totalPublicJobs].map(
            (val, i) => [val, LANDING_STATS_LABELS[i]]
          )
        : null,
    [stats]
  );

  return (
    <div className="app-page">
      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <header className="glass fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)]">
        <div className="app-container flex items-center justify-between" style={{ height: `${NAVBAR_HEIGHT}px` }}>
          <Link to="/" className="flex items-center gap-3 select-none">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-black text-[#003824]">A</div>
            <span className="text-lg font-black tracking-[-0.04em] text-[var(--text)]">{APP_NAME}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)]">Features</a>
            <a href="#how-it-works" className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)]">How It Works</a>
            <a href="#public-jobs" className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)]">Jobs</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <Link to="/login" className="hidden text-sm font-semibold text-[var(--muted-strong)] transition hover:text-[var(--text)] sm:inline-flex">Log in</Link>
            <Link to="/signup" className="app-button px-5 py-2">Get Started</Link>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="app-icon-button md:hidden"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-[22px]">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--shell)] px-6 py-5 md:hidden">
            <nav className="flex flex-col gap-1">
              {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Jobs', '#public-jobs']].map(([label, href]) => (
                <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted-strong)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]">
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="app-button-secondary w-full justify-center">Log in</Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="app-button w-full justify-center">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      <main style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}>
        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Decorative gradient orbs */}
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--accent)] opacity-[0.06] blur-[120px]" />
          <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#71a1ff] opacity-[0.05] blur-[100px]" />

          <div className="app-container py-20 text-center md:py-28 lg:py-32">
            <div className="animate-fade-in-up">
              <span className="mono-text mb-4 inline-block rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                Career Intelligence Platform
              </span>
            </div>
            <h1 className="animate-fade-in-up-delay-1 mx-auto max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.04em] text-[var(--text)] sm:text-5xl md:text-6xl lg:text-[64px]">
              Find jobs that <span className="bg-gradient-to-r from-[var(--accent)] to-[#71a1ff] bg-clip-text text-transparent">actually fit</span> you.
            </h1>
            <p className="animate-fade-in-up-delay-2 mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--muted-strong)] sm:text-lg">
              Aptico analyzes your resume against any job description, finds real matching opportunities, and prepares your entire application — in minutes.
            </p>
            <div className="animate-fade-in-up-delay-3 mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/signup" className="app-button px-8 py-3 text-base">Get Started Free</Link>
              <a href="#how-it-works" className="app-button-secondary px-8 py-3 text-base">See How It Works</a>
            </div>
          </div>
        </section>

        {/* ── LIVE STATS ───────────────────────────────────── */}
        <section className="border-y border-[var(--border)] bg-[var(--panel-soft)]">
          <div className="app-container py-6">
            {statItems ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {statItems.map(([value, label]) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-black text-[var(--text)] sm:text-3xl">{Number(value || 0).toLocaleString()}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-strong)] sm:text-sm">{label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <SkeletonLoader variant="stat" count={4} />
            )}
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────── */}
        <section id="features" className="py-16 md:py-24">
          <div className="app-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="app-kicker">Platform capabilities</p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--text)] sm:text-3xl md:text-4xl">
                Everything you need to land your next role
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--muted-strong)] sm:text-base">
                From resume analysis to job matching to squad accountability — Aptico covers the full career search lifecycle.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {LANDING_FEATURES.map((feature) => (
                <article key={feature.title} className="group rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 transition-all duration-200 hover:border-[var(--accent-soft)] hover:shadow-[0_8px_30px_rgba(78,222,163,0.08)] md:p-8">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] transition-transform duration-200 group-hover:scale-110">
                    <span className="material-symbols-outlined text-[22px] text-[var(--accent-strong)]">{feature.icon}</span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text)]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">{feature.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────── */}
        <section id="how-it-works" className="border-y border-[var(--border)] bg-[var(--panel-soft)] py-16 md:py-24">
          <div className="app-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="app-kicker">The methodology</p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--text)] sm:text-3xl">
                Four steps to career clarity
              </h2>
            </div>

            <div className="relative mt-14 flex flex-col items-center justify-between gap-10 md:flex-row md:items-start md:gap-4">
              {/* Connecting line — desktop */}
              <div className="absolute left-0 top-6 -z-10 hidden h-px w-full border-t border-dashed border-[var(--border)] md:block" />

              {LANDING_METHODOLOGY.map((step) => (
                <div key={step.number} className="flex max-w-[240px] flex-col items-center text-center">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] font-mono text-sm font-bold text-[var(--text)] shadow-sm">
                    {step.number}
                  </div>
                  <h4 className="mb-2 text-base font-bold text-[var(--text)]">{step.title}</h4>
                  <p className="text-sm leading-relaxed text-[var(--muted-strong)]">{step.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE JOBS + COMMUNITY WINS ────────────────────── */}
        <section id="public-jobs" className="py-16 md:py-24">
          <div className="app-container">
            <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
              {/* Jobs column */}
              <div>
                <p className="app-kicker">Live job listings</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--text)] sm:text-3xl">Updated as our community searches</h2>
                <div className="mt-6 space-y-3">
                  {jobs === null ? (
                    <SkeletonLoader variant="list" count={4} />
                  ) : jobs.length ? (
                    jobs.map((job) => (
                      <a key={job.id || job.jobId} href={job.applyUrl} target="_blank" rel="noreferrer" className="group block rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 transition-all duration-150 hover:border-[var(--accent-soft)] hover:bg-[var(--panel-soft)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold text-[var(--text)] transition-colors group-hover:text-[var(--accent-strong)]">{job.title}</h3>
                            <p className="mt-1 text-sm text-[var(--muted-strong)]">{job.company} — {job.location || 'Remote'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {job.jobType && <span className="app-chip">{job.jobType}</span>}
                            <span className="app-chip">{job.source}</span>
                          </div>
                        </div>
                        {typeof job.ghostScore === 'number' && job.ghostScore < 60 && (
                          <p className="mt-3 text-xs font-semibold text-[var(--accent-strong)]">Ghost risk {job.ghostScore}</p>
                        )}
                      </a>
                    ))
                  ) : (
                    <EmptyState icon="work" title="No live jobs yet" message="Live jobs will appear here as the community searches." ctaLabel="Browse Jobs" ctaTo="/jobs" />
                  )}
                </div>
                {jobs && jobs.length > 0 && (
                  <Link to="/jobs" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[var(--accent-strong)] transition hover:gap-2">
                    View all jobs <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                )}
              </div>

              {/* Wins column */}
              <aside>
                <p className="app-kicker">Recent hires</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--text)] sm:text-3xl">Community Wins</h2>
                <div className="mt-6 space-y-3">
                  {wins === null ? (
                    <SkeletonLoader variant="list" count={3} />
                  ) : wins.length ? (
                    wins.map((win) => (
                      <article key={win.id} className="rounded-xl border border-[var(--accent-soft)] bg-[var(--accent-soft)] p-5">
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
                          {win.search_duration_weeks && <span>Found in {win.search_duration_weeks} weeks</span>}
                          <span>{win.likes_count || 0} likes</span>
                          <span>{timeAgo(win.created_at)}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyState icon="celebration" title="No wins posted yet" message="Recent hires will appear here soon." />
                  )}
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ── GATED ANALYSIS PREVIEW ───────────────────────── */}
        <section className="py-16 md:py-24">
          <div className="app-container">
            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl md:p-8">
              <div className="grid gap-5 blur-[4px] lg:grid-cols-[1fr_1.4fr]">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-6">
                  <p className="app-kicker">Confidence score</p>
                  <p className="mt-4 text-5xl font-black text-[var(--accent-strong)]">72</p>
                  <p className="mt-3 text-sm text-[var(--muted-strong)]">Strong match with focused gaps in testing and systems language.</p>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-6">
                    <h3 className="font-bold text-[var(--text)]">Skill Gaps</h3>
                    <p className="mt-3 text-sm text-[var(--muted-strong)]">Add measurable React performance work, API testing, and ownership examples.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-6">
                    <h3 className="font-bold text-[var(--text)]">Bullet Rewrite</h3>
                    <p className="mt-3 text-sm text-[var(--muted-strong)]">Built reusable dashboards that reduced manual reporting time by 38%.</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-[color:rgba(247,247,245,0.7)] p-4 dark:bg-[color:rgba(19,19,21,0.72)]">
                <div className="max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center shadow-2xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
                    <span className="material-symbols-outlined text-[28px] text-[var(--accent-strong)]">analytics</span>
                  </div>
                  <h2 className="text-2xl font-black text-[var(--text)]">See your real analysis</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">Upload your resume and any job description to get your personal gap analysis, match score, and apply kit.</p>
                  <Link to="/signup" className="app-button mt-6 w-full">Analyze My Resume Free</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────── */}
        <section className="border-t border-[var(--border)] bg-[var(--panel-soft)]">
          <div className="app-container py-20 text-center md:py-28">
            <h2 className="text-3xl font-black tracking-[-0.03em] text-[var(--text)] sm:text-4xl">
              Ready to upgrade your job search?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[var(--muted-strong)]">
              Join thousands of job seekers who use Aptico to analyze, match, and improve their career trajectory.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/signup" className="app-button px-8 py-3 text-base">Start Free — No Card Required</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
