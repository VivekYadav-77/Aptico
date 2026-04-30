import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { generatePortfolioReadme } from '../api/profileApi.js';

const PORTFOLIO_EXPLAINER_KEY = 'aptico-portfolio-explainer-dismissed';

export default function PortfolioGenerator() {
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [readme, setReadme] = useState(null);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [showExplainer, setShowExplainer] = useState(() => localStorage.getItem(PORTFOLIO_EXPLAINER_KEY) !== 'true');

  function dismissExplainer() {
    setShowExplainer(false);
    localStorage.setItem(PORTFOLIO_EXPLAINER_KEY, 'true');
  }

  useEffect(() => {
    generatePortfolioReadme()
      .then((data) => {
        setReadme(data);
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.error || 'Could not generate your GitHub README right now.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCopy() {
    if (!readme?.markdown) {
      return;
    }

    setCopying(true);
    setCopyMessage('');

    try {
      await navigator.clipboard.writeText(readme.markdown);
      setCopyMessage('README markdown copied.');
    } catch {
      setCopyMessage('Could not copy automatically.');
    } finally {
      setCopying(false);
    }
  }

  return (
    <AppShell
      title="Portfolio Generator"
      description="Turn your Aptico profile into a GitHub README that starts with a live Aptico badge and routes inbound traffic back to your AI shadow resume."
      actions={
        readme ? (
          <>
            <a href={readme.badgeUrl} target="_blank" rel="noreferrer" className="app-button-secondary">
              Preview badge
            </a>
            <a href={readme.shadowResumeUrl} target="_blank" rel="noreferrer" className="app-button-secondary">
              Open shadow resume
            </a>
            <button type="button" onClick={handleCopy} className="app-button" disabled={copying}>
              {copying ? 'Copying...' : 'Copy markdown'}
            </button>
          </>
        ) : null
      }
    >
      {error ? (
        <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
          {error}
        </div>
      ) : null}

      {copyMessage ? (
        <div className="mt-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)]">
          {copyMessage}
        </div>
      ) : null}

      {showExplainer ? (
        <div className="mt-4 relative overflow-hidden rounded-[1.6rem] border border-purple-500/25 bg-[linear-gradient(135deg,rgba(168,85,247,0.10),rgba(59,130,246,0.08))] p-5 sm:p-6">
          <button type="button" onClick={dismissExplainer} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--muted-strong)] transition hover:text-[var(--text)]" aria-label="Dismiss explainer">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-purple-400">{"\u{1F680}"} GitHub README + Live Badge Generator</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text)]">
            This tool creates a <strong>professional GitHub README</strong> using your Aptico profile data, and prepends it with a live badge that shows your current career level.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted-strong)]">
            When recruiters visit your GitHub profile, they can click the badge and land directly on your <strong>AI-powered profile chatbot</strong> where they can ask questions about your experience.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="app-panel h-[320px]" />
          <div className="app-panel h-[520px]" />
        </div>
      ) : readme ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="app-panel relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,222,163,0.18),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.06),transparent)]" />
            <div className="relative">
              <p className="app-kicker">Generated funnel</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--text)]">{readme.suggestedTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">{readme.headline}</p>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="app-kicker">Badge markdown</p>
                  <code className="mt-3 block break-all text-xs leading-6 text-[var(--text)]">{readme.badgeMarkdown}</code>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="app-kicker">Secure destination</p>
                  <a
                    href={readme.shadowResumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block break-all text-sm font-semibold text-[var(--accent-strong)] hover:underline"
                  >
                    {readme.shadowResumeUrl}
                  </a>
                  <p className="mt-3 text-sm text-[var(--muted-strong)]">
                    The generated markdown always links badge clicks back to your AI-powered profile page where recruiters can chat with your profile assistant.
                  </p>
                </div>

                {!readme.isPublic ? (
                  <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">
                    Your profile is currently private, so the badge will render a private state and the shadow resume route will not be publicly useful until you enable public visibility in settings.
                  </div>
                ) : null}

                <Link to="/settings" className="app-button-secondary">
                  Update profile data
                </Link>
              </div>
            </div>
          </section>

          <section className="app-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker">GitHub README output</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">Copy-ready markdown</h2>
              </div>
              <button type="button" onClick={handleCopy} className="app-button-secondary" disabled={copying}>
                {copying ? 'Copying...' : 'Copy'}
              </button>
            </div>

            <textarea
              readOnly
              value={readme.markdown}
              className="app-input mt-6 min-h-[520px] font-mono text-xs leading-6"
            />
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
