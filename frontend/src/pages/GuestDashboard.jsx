import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle.jsx';
import Footer from '../components/Footer.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ApticoArchitectureDiagram from '../components/ApticoArchitectureDiagram.jsx';
import ApticoLogo from '../components/ApticoLogo.jsx';
import { getPlatformStats, getPublicJobs, getWins } from '../api/socialApi.js';
import {
  APP_NAME,
  LANDING_FEATURES,
  LANDING_METHODOLOGY,
  LANDING_STATS_LABELS,
  LANDING_CORE_PILLARS,
  LANDING_COMPARISON,
  LANDING_FAQ,
  NAVBAR_HEIGHT,
} from '../constants/index.js';

// ── Reveal Hook ──────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ── Section Reveal ───────────────────────────────────────────
function Reveal({ children, className = '', type = 'fade' }) {
  const ref = useReveal();
  const baseClass = type === 'scale' ? 'reveal-scale-up' : 'reveal-on-scroll';
  return (
    <div ref={ref} className={`${baseClass} ${className}`}>
      {children}
    </div>
  );
}

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

// ── UI PREVIEWS ──────────────────────────────────────────────
function UIPreview({ type }) {
  if (type === 'analysis') {
    return (
      <div className="ui-snippet animate-float w-full max-w-[340px] space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Match Analysis</p>
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Overall Score</span>
            <span className="text-[var(--accent-strong)]">84%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--panel-soft)]">
            <div className="h-full w-[84%] rounded-full bg-[var(--accent)]" />
          </div>
        </div>
        <div className="rounded-lg bg-[var(--panel-soft)] p-3">
          <p className="text-[10px] font-bold text-[var(--muted-strong)]">AI INSIGHT</p>
          <p className="mt-1 text-xs leading-relaxed">Increase keyword density for &quot;Distributed Systems&quot; in bullet 3.</p>
        </div>
      </div>
    );
  }

  if (type === 'squads') {
    return (
      <div className="ui-snippet animate-float w-full max-w-[340px] space-y-4" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-center gap-3">
           <div className="flex -space-x-2">
              {[1,2,3].map(i => <div key={i} className="h-6 w-6 rounded-full border-2 border-[var(--panel)] bg-[var(--accent-soft)]" />)}
           </div>
           <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Squad Alpha-9</p>
        </div>
        <div className="space-y-3">
           <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--border)] p-2">
              <span className="material-symbols-outlined text-sm text-[var(--accent-strong)]">campaign</span>
              <p className="text-[10px] font-medium">User-77 logged an application (14m ago)</p>
           </div>
           <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <div className="h-1.5 flex-1 rounded-full bg-[var(--panel-soft)]" />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-snippet animate-float w-full max-w-[340px] space-y-4" style={{ animationDelay: '1s' }}>
       <div className="rounded-xl border border-[var(--accent-soft)] bg-[var(--accent-soft)] p-4 text-center">
          <span className="material-symbols-outlined text-2xl text-[var(--accent-strong)]">military_tech</span>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[var(--accent-strong)]">GitHub Career Badge</p>
          <p className="mt-1 text-xs font-bold">Level 14 Legend</p>
       </div>
       <div className="grid grid-cols-2 gap-2">
          <div className="h-1 w-full rounded bg-[var(--accent)] opacity-40" />
          <div className="h-1 w-full rounded bg-[var(--accent)]" />
       </div>
    </div>
  );
}

// ── FAQ ITEM ─────────────────────────────────────────────────
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-6 text-left"
      >
        <span className="text-base font-bold text-[var(--text)]">{question}</span>
        <span className={`material-symbols-outlined transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pb-6' : 'max-h-0'}`}>
        <p className="text-sm leading-7 text-[var(--muted-strong)]">{answer}</p>
      </div>
    </div>
  );
}

export default function GuestDashboard() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [wins, setWins] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="app-page overflow-x-hidden">
      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <header className="glass fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)]">
        <div className="app-container flex items-center justify-between" style={{ height: `${NAVBAR_HEIGHT}px` }}>
          {/* Left Nav */}
          <nav className="hidden flex-1 items-center gap-6 md:flex">
            <a href="#pillars" className="text-sm font-bold text-[var(--muted-strong)] transition hover:text-[var(--text)]">Intelligence</a>
            <a href="#comparison" className="text-sm font-bold text-[var(--muted-strong)] transition hover:text-[var(--text)]">Method</a>
          </nav>

          {/* Centered Branding */}
          <Link to="/" className="flex flex-1 items-center justify-center gap-3 select-none group">
            <ApticoLogo className="h-9 w-9 text-[var(--accent)] drop-shadow-[0_0_12px_var(--accent-soft)] transition-transform group-hover:scale-110" />
            <span 
              className={`animate-text-shimmer text-lg font-black tracking-[-0.04em] transition-all duration-500 overflow-hidden ${
                scrolled ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'
              }`}
            >
              {APP_NAME}
            </span>
          </Link>

          {/* Right Nav + Actions */}
          <div className="flex flex-1 items-center justify-end gap-6">
            <nav className="hidden items-center gap-6 md:flex">
              <a href="#features" className="text-sm font-bold text-[var(--muted-strong)] transition hover:text-[var(--text)]">Features</a>
              <Link to="/login" className="text-sm font-bold text-[var(--muted-strong)] transition hover:text-[var(--text)]">Log in</Link>
            </nav>
            
            <div className="flex items-center gap-3">
              <ThemeToggle compact />
              <Link to="/signup" className="app-button px-5 py-2 hidden sm:inline-flex">Get Started</Link>
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
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--shell)] px-6 py-5 md:hidden">
            <nav className="flex flex-col gap-1">
              {[ ['Intelligence', '#pillars'], ['Method', '#comparison'], ['Features', '#features'], ].map(([label, href]) => (
                <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted-strong)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]">
                  {label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}>
        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--accent)] opacity-[0.06] blur-[120px]" />
          <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#71a1ff] opacity-[0.05] blur-[100px]" />

          <div className="app-container py-20 text-center md:py-28 lg:py-32">
            <Reveal>
              <span className="mono-text mb-4 inline-block rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                Career Intelligence Platform
              </span>
              <h1 className="mx-auto max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.04em] text-[var(--text)] sm:text-5xl md:text-6xl lg:text-[64px]">
                Find jobs that <span className="bg-gradient-to-r from-[var(--accent)] to-[#71a1ff] bg-clip-text text-transparent">actually fit</span> you.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--muted-strong)] sm:text-lg">
                Stop blindly applying. Aptico analyzes your resume, matches it to the underlying needs of the role, and keeps you accountable with elite squads.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link to="/signup" className="app-button px-8 py-3 text-base shadow-xl shadow-[var(--accent-soft)]">Get Started Free</Link>
                <a href="#pillars" className="app-button-secondary px-8 py-3 text-base">See the Engine</a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── LOGO STRIP ───────────────────────────────────── */}
        <div className="border-y border-[var(--border)] bg-[var(--panel-soft)] py-8 overflow-hidden">
           <div className="flex items-center justify-center gap-12 grayscale opacity-40">
              {['Google', 'Stripe', 'Vercel', 'Linear', 'Cursor'].map(brand => (
                <span key={brand} className="text-sm font-black tracking-widest uppercase">{brand}</span>
              ))}
           </div>
        </div>

        {/* ── ARCHITECTURE DIAGRAM ─────────────────────────── */}
        <section className="bg-[var(--bg)] pt-20 md:pt-32">
          <div className="app-container">
            <Reveal className="mx-auto max-w-3xl text-center mb-16">
              <p className="app-kicker">How it works</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--text)] sm:text-4xl md:text-5xl">
                The intelligence routing engine.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-[var(--muted-strong)]">
                Aptico connects your isolated career data through an AI mesh, matching you to roles with high precision and generating automated coaching workflows.
              </p>
            </Reveal>
            
            <Reveal>
              <ApticoArchitectureDiagram />
            </Reveal>
          </div>
        </section>

        {/* ── LIVE STATS ───────────────────────────────────── */}
        <section className="bg-[var(--bg)]">
          <div className="app-container py-12">
            {statItems ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {statItems.map(([value, label]) => (
                  <Reveal key={label} className="text-center">
                    <p className="text-2xl font-black text-[var(--text)] sm:text-3xl">{Number(value || 0).toLocaleString()}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-strong)]">{label}</p>
                  </Reveal>
                ))}
              </div>
            ) : (
              <SkeletonLoader variant="stat" count={4} />
            )}
          </div>
        </section>

        {/* ── CORE PILLARS ─────────────────────────────────── */}
        <section id="pillars" className="py-20 md:py-32">
          <div className="app-container">
            <Reveal className="mx-auto max-w-2xl text-center mb-20">
              <p className="app-kicker">Core Infrastructure</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--text)] sm:text-4xl md:text-5xl">
                The architecture of your next move.
              </h2>
            </Reveal>

            <div className="space-y-32">
              {LANDING_CORE_PILLARS.map((pillar, idx) => (
                <div key={pillar.id} className={`flex flex-col items-center gap-16 lg:flex-row ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                  <Reveal className="flex-1 space-y-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
                      <span className="material-symbols-outlined text-2xl text-[var(--accent-strong)]">
                        {pillar.id === 'analysis' ? 'data_thresholding' : pillar.id === 'squads' ? 'hub' : 'verified'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-4xl font-black tracking-[-0.04em] text-[var(--text)]">{pillar.subtitle}</h3>
                      <p className="mt-6 text-base leading-8 text-[var(--muted-strong)]">{pillar.description}</p>
                    </div>
                    <ul className="grid gap-3 sm:grid-cols-2">
                       {pillar.features.map(f => (
                         <li key={f} className="flex items-center gap-2 text-sm font-bold">
                            <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">check_circle</span>
                            {f}
                         </li>
                       ))}
                    </ul>
                  </Reveal>
                  <Reveal className="relative flex flex-1 items-center justify-center">
                     <div className="absolute inset-0 -z-10 rounded-full bg-[var(--accent)] opacity-5 blur-[100px]" />
                     <UIPreview type={pillar.id} />
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON SECTION ───────────────────────────── */}
        <section id="comparison" className="bg-[var(--panel-soft)] py-20 md:py-32 border-y border-[var(--border)]">
          <div className="app-container">
            <Reveal className="mx-auto max-w-2xl text-center mb-16">
              <p className="app-kicker">Efficiency Analysis</p>
              <h2 className="mt-3 text-3xl font-black text-[var(--text)] sm:text-4xl">Stop wasting momentum.</h2>
            </Reveal>

            <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
              <Reveal className="comparison-card comparison-card-bad">
                 <h4 className="text-xl font-bold mb-6 text-[var(--text)]">{LANDING_COMPARISON.bad.title}</h4>
                 <ul className="space-y-4">
                    {LANDING_COMPARISON.bad.items.map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm text-[var(--muted-strong)]">
                        <span className="material-symbols-outlined text-red-500 text-[18px]">close</span>
                        {item}
                      </li>
                    ))}
                 </ul>
              </Reveal>
              <Reveal className="comparison-card comparison-card-good">
                 <div className="absolute right-4 top-4 rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#003824]">Recommended</div>
                 <h4 className="text-xl font-bold mb-6 text-[var(--text)]">{LANDING_COMPARISON.good.title}</h4>
                 <ul className="space-y-4">
                    {LANDING_COMPARISON.good.items.map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm font-bold text-[var(--text)]">
                        <span className="material-symbols-outlined text-[var(--accent-strong)] text-[18px]">verified</span>
                        {item}
                      </li>
                    ))}
                 </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ────────────────────────────────── */}
        <section id="features" className="py-20 md:py-32">
          <div className="app-container">
            <Reveal className="mx-auto max-w-2xl text-center mb-16">
              <p className="app-kicker">Capabilities</p>
              <h2 className="mt-3 text-3xl font-black text-[var(--text)] sm:text-4xl">Everything you need.</h2>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {LANDING_FEATURES.map((feature) => (
                <Reveal key={feature.title} className="group rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 transition-all hover:border-[var(--accent-soft)] hover:shadow-2xl">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined text-[22px] text-[var(--accent-strong)]">{feature.icon}</span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text)]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">{feature.copy}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ SECTION ─────────────────────────────────── */}
        <section className="bg-[var(--panel-soft)] py-20 md:py-32 border-y border-[var(--border)]">
          <div className="app-container">
            <div className="mx-auto max-w-3xl">
              <Reveal className="text-center mb-16">
                 <p className="app-kicker">Common Questions</p>
                 <h2 className="mt-3 text-3xl font-black text-[var(--text)]">Clearing the path.</h2>
              </Reveal>
              <Reveal className="divide-y divide-[var(--border)]">
                 {LANDING_FAQ.map(item => (
                   <FAQItem key={item.question} {...item} />
                 ))}
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────── */}
        <section className="py-20 text-center md:py-32">
          <Reveal className="app-container">
            <h2 className="text-4xl font-black tracking-[-0.04em] text-[var(--text)] sm:text-5xl">
              Ready to upgrade your search?
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-[var(--muted-strong)]">
              Join thousands of job seekers who use Aptico to analyze, match, and master their career trajectory.
            </p>
            <Link to="/signup" className="app-button mt-10 px-10 py-4 text-lg shadow-xl shadow-[var(--accent-soft)]">
              Start Free — No Card Required
            </Link>
          </Reveal>
        </section>

        {/* ── 3D BRAND FOOTER ───────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#050505] pt-32 pb-16 border-y border-[var(--border)]" style={{ perspective: '1200px' }}>
          {/* Subtle noise floor texture */}
          <div className="absolute inset-0 bg-noise mix-blend-overlay opacity-60" />
          
          <div className="app-container relative z-10 flex flex-col items-center justify-center min-h-[40vh]">
            <Reveal type="scale" className="text-center w-full">
              <div style={{ perspective: '1000px' }}>
                <h2 
                  className="text-3d font-black tracking-tighter uppercase leading-none select-none inline-block"
                  style={{ 
                    fontSize: 'clamp(4rem, 18vw, 16rem)',
                    transform: 'rotateX(55deg) scaleY(1.2)',
                    transformOrigin: 'bottom center'
                  }}
                >
                  <div className="flex gap-x-2 sm:gap-x-4" style={{ transformStyle: 'preserve-3d' }}>
                    {APP_NAME.split('').map((char, i) => {
                      // Custom staggered offsets for the "unordered" look with Z-depth
                      const y = [15, -20, 25, -10, 30, -5][i % 6];
                      const r = [8, -12, 15, -5, 10, -18][i % 6];
                      const z = [40, -20, 60, 10, -30, 50][i % 6]; // Z-axis depth
                      const ry = [10, -15, 5, -20, 15, -10][i % 6]; // Y-axis rotation
                      
                      return (
                        <span 
                          key={i} 
                          className="inline-block"
                          style={{ 
                            transform: `translateY(${y}px) rotateZ(${r}deg) translateZ(${z}px) rotateY(${ry}deg)`,
                            transition: 'transform 0.5s ease-out',
                            textShadow: '0 10px 20px rgba(0,0,0,0.5)'
                          }}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </div>
                </h2>
              </div>
            </Reveal>
          </div>
          
          {/* Bottom gradient fade to blend into the real footer */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[var(--bg)] to-transparent pointer-events-none" />
        </section>
      </main>

      <Footer />
    </div>
  );
}
