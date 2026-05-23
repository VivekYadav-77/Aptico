import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ApticoLogo from '../components/ApticoLogo.jsx';
import Footer from '../components/Footer.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { DOC_CATEGORIES, DOCS, FEATURED_DOCS } from '../data/docsContent.js';
import { NAVBAR_HEIGHT } from '../constants/index.js';

function PublicDocsHeader() {
  return (
    <header className="glass fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)]">
      <div className="app-container flex items-center justify-between" style={{ height: `${NAVBAR_HEIGHT}px` }}>
        <Link to="/" className="flex items-center gap-3">
          <ApticoLogo className="h-8 w-8" />
          <span className="text-lg font-black tracking-tight text-[var(--text)]">Aptico</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/" className="hidden text-sm font-bold text-[var(--muted-strong)] transition hover:text-[var(--text)] sm:inline-flex">
            Home
          </Link>
          <ThemeToggle compact />
          <Link to="/signup" className="app-button hidden px-4 py-2 text-xs sm:inline-flex">Get Started</Link>
        </nav>
      </div>
    </header>
  );
}

function FeatureDocCard({ doc }) {
  return (
    <Link
      to={`/docs/${doc.slug}`}
      className={`doc-card group relative flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-[var(--border)] p-6 text-left transition duration-300 ${
        doc.featured ? 'glass shadow-[0_20px_48px_rgba(0,0,0,0.12)]' : 'bg-[var(--panel)]'
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent)] to-[#71a1ff] opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="app-kicker">{doc.category}</p>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-[var(--text)]">{doc.title}</h2>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <span className="material-symbols-outlined">{doc.icon}</span>
        </span>
      </div>
      <p className="mt-4 flex-1 text-sm leading-7 text-[var(--muted-strong)]">{doc.excerpt}</p>
      <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
        <span className="text-xs font-bold text-[var(--muted)]">{doc.readTime}</span>
        <span className="app-icon-button translate-x-2 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true">
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </span>
      </div>
    </Link>
  );
}

export default function DocsHubPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const filteredDocs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return DOCS.filter((doc) => {
      const matchesCategory = category === 'All' || doc.category === category;
      const haystack = `${doc.title} ${doc.category} ${doc.excerpt}`.toLowerCase();
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, query]);

  return (
    <div className="app-page overflow-x-hidden bg-[var(--bg)]">
      <PublicDocsHeader />

      <main style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}>
        <section className="relative overflow-hidden border-b border-[var(--border)]">
          <div className="absolute inset-0 bg-noise opacity-30" />
          <div className="app-container relative py-16 text-center sm:py-20 lg:py-24">
            <p className="app-kicker animate-fade-in-up">Aptico Knowledge Base</p>
            <h1 className="animate-text-shimmer mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Platform Docs & Feature Guides
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--muted-strong)] sm:text-lg">
              Plain-language guides for every major Aptico feature: what it does, why it matters, and how to use it without guessing.
            </p>

            <div className="mx-auto mt-10 max-w-2xl animate-fade-in-up-delay-1">
              <label htmlFor="docs-search" className="sr-only">Search documentation</label>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">search</span>
                <input
                  id="docs-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="app-input text-base"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="Search features, guides, or actions"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2 animate-fade-in-up-delay-2">
              {DOC_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`app-chip transition ${
                    category === item ? 'border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-soft)]' : 'bg-[var(--panel)] text-[var(--muted-strong)]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="app-container py-12 sm:py-16">
          {!query && category === 'All' ? (
            <div className="mb-10 animate-fade-in-up">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="app-kicker">Start here</p>
                  <h2 className="mt-2 text-2xl font-black text-[var(--text)]">Featured guides</h2>
                </div>
                <Link to="/docs/resume-analysis" className="app-button-secondary hidden px-4 py-2 text-xs sm:inline-flex">First guide</Link>
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                {FEATURED_DOCS.map((doc) => <FeatureDocCard key={doc.slug} doc={doc} />)}
              </div>
            </div>
          ) : null}

          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="app-kicker">All documentation</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--text)]">
                {filteredDocs.length} {filteredDocs.length === 1 ? 'guide' : 'guides'} found
              </h2>
            </div>
          </div>

          {filteredDocs.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDocs.map((doc) => <FeatureDocCard key={doc.slug} doc={doc} />)}
            </div>
          ) : (
            <div className="app-panel-soft py-14 text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--muted)]">search_off</span>
              <h2 className="mt-4 text-xl font-black text-[var(--text)]">No guide found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--muted-strong)]">
                Try a feature name like analysis, jobs, squad, portfolio, profile, or settings.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
