import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from '@/lib/router-compat.jsx';
import ApticoLogo from '../../../components/ApticoLogo.jsx';
import Footer from '../../../components/Footer.jsx';
import ThemeToggle from '../../../components/ThemeToggle.jsx';
import { NAVBAR_HEIGHT } from '../../../constants/index.js';
import { DOCS, getDocBySlug } from '../data/docs-content.js';

function PublicDocsHeader() {
  return (
    <header className="glass fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)]">
      <div className="app-container flex items-center justify-between" style={{ height: `${NAVBAR_HEIGHT}px` }}>
        <Link to="/" className="flex items-center gap-3">
          <ApticoLogo className="h-8 w-8" />
          <span className="text-lg font-black tracking-tight text-[var(--text)]">Aptico</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/docs" className="app-button-secondary px-4 py-2 text-xs">All docs</Link>
          <ThemeToggle compact />
        </nav>
      </div>
    </header>
  );
}

function Callout({ callout }) {
  if (!callout) return null;

  const isImportant = callout.type === 'important';
  return (
    <aside
      className={`mt-6 rounded-xl border px-5 py-4 ${
        isImportant
          ? 'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
          : 'border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent-strong)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined mt-0.5 text-[20px]">{isImportant ? 'priority_high' : 'lightbulb'}</span>
        <div>
          <p className="text-sm font-black">{callout.title}</p>
          <p className="mt-1 text-sm leading-7">{callout.text}</p>
        </div>
      </div>
    </aside>
  );
}

function CodeTerminal({ code }) {
  if (!code) return null;

  return (
    <div className="doc-terminal mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel-strong)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
        <span className="ml-2 text-xs font-bold text-[var(--muted)]">{code.title}</span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-sm leading-7 text-[var(--text)]">
        <code>{code.lines.join('\n')}</code>
      </pre>
    </div>
  );
}

function DocOverview({ overview }) {
  if (!overview) return null;

  const items = [
    ['Best for', overview.bestFor, 'person_search'],
    ['Plain summary', overview.plainSummary, 'notes'],
    ['What you will achieve', overview.outcome, 'flag'],
  ].filter(([, value]) => Boolean(value));

  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      {items.map(([label, text, icon]) => (
        <article key={label} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
            </span>
            <p className="app-kicker">{label}</p>
          </div>
          <p className="text-sm leading-7 text-[var(--muted-strong)]">{text}</p>
        </article>
      ))}
    </section>
  );
}

function ArticleSection({ section, index }) {
  return (
    <section id={section.id} className="scroll-mt-28 border-t border-[var(--border)] pt-10 first:border-t-0 first:pt-0">
      <p className="app-kicker">Section {String(index + 1).padStart(2, '0')}</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">{section.title}</h2>
      {section.body?.map((paragraph) => (
        <p key={paragraph} className="mt-5 text-lg leading-8 text-[var(--muted-strong)]">
          {paragraph}
        </p>
      ))}
      {section.steps?.length ? (
        <ol className="mt-6 space-y-3">
          {section.steps.map((step, stepIndex) => (
            <li key={step} className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-base leading-7 text-[var(--muted-strong)]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-sm font-black text-[var(--accent-strong)]">
                {stepIndex + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <Callout callout={section.callout} />
      <CodeTerminal code={section.code} />
    </section>
  );
}

export default function DocArticlePage() {
  const { slug } = useParams();
  const doc = getDocBySlug(slug);
  const [activeHeading, setActiveHeading] = useState('');

  const toc = useMemo(() => doc?.sections.map((section) => ({ id: section.id, title: section.title })) || [], [doc]);

  useEffect(() => {
    if (!doc) return undefined;

    setActiveHeading(doc.sections[0]?.id || '');
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActiveHeading(visible[0].target.id);
        }
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: [0, 1] }
    );

    doc.sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [doc]);

  if (!doc) {
    return <Navigate replace to="/docs" />;
  }

  return (
    <div className="app-page overflow-x-hidden bg-[var(--bg)]">
      <PublicDocsHeader />

      <main className="app-container pb-20" style={{ paddingTop: `calc(${NAVBAR_HEIGHT}px + 2rem)` }}>
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-strong)]">
          <Link to="/docs" className="font-bold text-[var(--accent-strong)] transition hover:text-[var(--accent)]">Docs</Link>
          <span>/</span>
          <span>{doc.title}</span>
        </div>

        <div className="grid gap-8 xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
          <aside className="hidden xl:block">
            <div className="app-panel-soft sticky top-24 animate-fade-in-up">
              <p className="app-kicker mb-4">Features</p>
              <nav className="space-y-1">
                {DOCS.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/docs/${item.slug}`}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      item.slug === doc.slug
                        ? 'border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] pl-[10px] font-bold text-[var(--accent-strong)]'
                        : 'text-[var(--muted-strong)] hover:bg-[var(--panel)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span>{item.title}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <article className="min-w-0 animate-fade-in-up-delay-1">
            <div className="mb-6 xl:hidden">
              <label htmlFor="doc-jump" className="app-kicker mb-2 block">Jump to guide</label>
              <select
                id="doc-jump"
                className="app-input"
                value={doc.slug}
                onChange={(event) => {
                  window.location.href = `/docs/${event.target.value}`;
                }}
              >
                {DOCS.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.title}</option>
                ))}
              </select>
            </div>

            <header className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_20px_48px_rgba(0,0,0,0.08)] sm:p-8">
              <div className="absolute inset-0 bg-noise opacity-20" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="app-chip">{doc.category}</span>
                  <span className="text-xs font-bold text-[var(--muted)]">{doc.readTime}</span>
                </div>
                <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-[var(--text)] sm:text-5xl">
                  {doc.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted-strong)]">{doc.intro}</p>
              </div>
            </header>

            <DocOverview overview={doc.overview} />

            <nav className="app-panel-soft mt-6 xl:hidden">
              <p className="app-kicker mb-3">On this page</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className="app-chip shrink-0 bg-[var(--panel)] text-[var(--muted-strong)]">
                    {item.title}
                  </a>
                ))}
              </div>
            </nav>

            <div className="doc-article mx-auto mt-10 max-w-[65ch] space-y-12">
              {doc.sections.map((section, index) => (
                <ArticleSection key={section.id} section={section} index={index} />
              ))}
            </div>
          </article>

          <aside className="hidden xl:block">
            <div className="glass sticky top-24 rounded-xl p-5 animate-fade-in-up-delay-2">
              <p className="app-kicker mb-4">On this page</p>
              <nav className="space-y-1">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block border-l-2 py-2 pl-3 text-sm transition ${
                      activeHeading === item.id
                        ? 'border-[var(--accent)] font-bold text-[var(--accent-strong)]'
                        : 'border-transparent text-[var(--muted-strong)] hover:border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
