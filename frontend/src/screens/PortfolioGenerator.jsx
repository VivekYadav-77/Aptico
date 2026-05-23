import { useEffect, useState } from 'react';
import { Link } from '@/lib/router-compat.jsx';
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
  const [showBadgePreview, setShowBadgePreview] = useState(false);

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
      setTimeout(() => setCopyMessage(''), 3000); // Clear after 3s
    } catch {
      setCopyMessage('Could not copy automatically.');
      setTimeout(() => setCopyMessage(''), 3000);
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
          <div className="flex items-center gap-3 animate-fade-in-up">
            <button type="button" onClick={() => setShowBadgePreview(true)} className="app-button-secondary transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] group">
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:scale-110">visibility</span>
              Preview badge
            </button>
            <a href={readme.shadowResumeUrl} target="_blank" rel="noreferrer" className="app-button-secondary transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] group">
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">open_in_new</span>
              Shadow resume
            </a>
            <button type="button" onClick={handleCopy} className="app-button shadow-[0_0_15px_rgba(59,201,142,0.4)] hover:shadow-[0_0_25px_rgba(59,201,142,0.6)] group" disabled={copying}>
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:scale-110">
                {copying ? 'check' : 'content_copy'}
              </span>
              {copying ? 'Copied!' : 'Copy markdown'}
            </button>
          </div>
        ) : null
      }
    >
      {error ? (
        <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)] animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        </div>
      ) : null}

      {copyMessage ? (
        <div className="mt-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)] animate-fade-in-up flex items-center gap-2 shadow-[0_0_15px_rgba(59,201,142,0.2)]">
           <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {copyMessage}
        </div>
      ) : null}

      {showExplainer ? (
        <div className="mt-6 relative overflow-hidden rounded-[1.6rem] border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--panel-soft)] to-[var(--bg)] p-6 sm:p-8 shadow-lg animate-fade-in-up group">
          <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--accent)]/10 rounded-full blur-3xl group-hover:bg-[var(--accent)]/20 transition-all duration-700" />
          
          <button type="button" onClick={dismissExplainer} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--muted-strong)] transition hover:text-[var(--text)] hover:bg-[var(--panel-strong)] z-10" aria-label="Dismiss explainer">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 shadow-sm">
                <span className="material-symbols-outlined">rocket_launch</span>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--accent)]">GitHub README Generator</p>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--text)] font-medium">
              Create a <strong>professional GitHub README</strong> fueled by your Aptico profile, starting with a live badge showcasing your career level.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)]">
              Convert profile views into conversations. When recruiters click your badge, they land on your <strong>AI-powered chatbot</strong> to ask questions about your experience.
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="app-panel h-[400px] flex flex-col gap-4 shadow-lg border-[var(--border)]/50">
            <div className="skeleton skeleton-text w-1/3" />
            <div className="skeleton skeleton-text w-2/3 h-8" />
            <div className="skeleton skeleton-text w-full mt-4" />
            <div className="skeleton skeleton-text w-5/6" />
            <div className="skeleton skeleton-card mt-6 flex-grow" />
          </div>
          <div className="app-panel h-[560px] flex flex-col gap-4 shadow-lg border-[var(--border)]/50">
            <div className="flex justify-between items-center">
               <div className="skeleton skeleton-text w-1/4 h-6" />
               <div className="skeleton skeleton-text w-24 h-10 rounded-lg" />
            </div>
            <div className="skeleton h-full w-full rounded-xl mt-4" />
          </div>
        </div>
      ) : readme ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] animate-fade-in-up-delay-1">
          <section className="app-panel relative overflow-hidden group border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors duration-500 shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,201,142,0.08),transparent_40%),linear-gradient(145deg,rgba(255,255,255,0.02),transparent)]" />
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">hub</span>
                <p className="app-kicker !mb-0 text-[var(--accent)]">Generated funnel</p>
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text)]">{readme.suggestedTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">{readme.headline}</p>

              <div className="mt-8 space-y-5">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-5 transition-all hover:border-[var(--accent)]/40 hover:shadow-[0_4px_20px_rgba(59,201,142,0.08)] group/card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="app-kicker !mb-0">Badge markdown</p>
                    <span className="material-symbols-outlined text-[16px] text-[var(--muted)] group-hover/card:text-[var(--accent)] transition-colors">code</span>
                  </div>
                  <code className="block break-all text-[13px] leading-relaxed text-[var(--text)] font-mono bg-[var(--bg)] p-3 rounded-lg border border-[var(--border)]/50 shadow-inner">
                    {readme.badgeMarkdown}
                  </code>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-5 transition-all hover:border-[var(--accent)]/40 hover:shadow-[0_4px_20px_rgba(59,201,142,0.08)] group/card">
                  <div className="flex items-center justify-between mb-3">
                     <p className="app-kicker !mb-0">Secure destination</p>
                     <span className="material-symbols-outlined text-[16px] text-[var(--muted)] group-hover/card:text-[var(--accent)] transition-colors">lock</span>
                  </div>
                  <a
                    href={readme.shadowResumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group/link flex items-center gap-2 break-all text-sm font-semibold text-[var(--accent-strong)] hover:text-[var(--accent)] transition-colors"
                  >
                    <span className="truncate">{readme.shadowResumeUrl}</span>
                    <span className="material-symbols-outlined text-[16px] opacity-0 -translate-x-2 transition-all group-hover/link:opacity-100 group-hover/link:translate-x-0">arrow_forward</span>
                  </a>
                  <p className="mt-3 text-sm text-[var(--muted-strong)] leading-relaxed">
                    The generated markdown always links badge clicks back to your AI-powered profile page where recruiters can chat with your profile assistant.
                  </p>
                </div>

                {!readme.isPublic ? (
                  <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)] flex gap-3 items-start shadow-sm">
                    <span className="material-symbols-outlined text-[20px] mt-0.5">lock_person</span>
                    <p className="leading-relaxed">Your profile is currently private. The badge will render a private state and the shadow resume route will not be publicly useful until you enable public visibility in settings.</p>
                  </div>
                ) : null}

                <div className="pt-2">
                  <Link to="/settings" className="app-button-secondary w-full justify-center group/btn hover:border-[var(--text)] shadow-sm hover:shadow-md transition-all">
                    <span className="material-symbols-outlined text-[18px] transition-transform group-hover/btn:-rotate-12">manage_accounts</span>
                    Update profile data
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="app-panel flex flex-col border-[var(--border)] shadow-lg relative bg-gradient-to-b from-[var(--panel)] to-[var(--panel-soft)]">
             <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <span className="material-symbols-outlined text-[16px] text-[var(--muted-strong)]">terminal</span>
                   <p className="app-kicker !mb-0">GitHub README output</p>
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--text)]">Copy-ready markdown</h2>
              </div>
              <button 
                type="button" 
                onClick={handleCopy} 
                className={`app-button-secondary relative overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md ${copying ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-strong)]' : 'hover:border-[var(--accent)] hover:text-[var(--accent)]'} group/copy`}
                disabled={copying}
              >
                <div className="relative z-10 flex items-center gap-2">
                   <span className={`material-symbols-outlined text-[18px] transition-transform ${copying ? 'scale-110' : 'group-hover/copy:scale-110'}`}>
                     {copying ? 'check_circle' : 'content_copy'}
                   </span>
                   {copying ? 'Copied!' : 'Copy'}
                </div>
              </button>
            </div>

            <div className="relative flex-grow group/editor rounded-xl shadow-2xl overflow-hidden border border-[#333]">
              <div className="absolute inset-0 bg-[var(--accent)]/5 blur-md opacity-0 transition-opacity duration-500 group-hover/editor:opacity-100 pointer-events-none z-0" />
              <textarea
                readOnly
                value={readme.markdown}
                className="relative z-10 w-full h-full min-h-[480px] font-mono text-[13px] leading-relaxed resize-none bg-[#1e1e1e] text-[#d4d4d4] p-5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition-shadow"
                style={{ colorScheme: 'dark' }}
                spellCheck={false}
              />
              <div className="absolute top-3 right-4 px-2 py-1 rounded bg-[#2d2d2d] border border-[#404040] text-[#858585] text-[10px] font-mono font-bold uppercase tracking-wider select-none pointer-events-none z-20 shadow-sm backdrop-blur-md">
                markdown
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {showBadgePreview && readme ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-md" onClick={() => setShowBadgePreview(false)} />
          <div className="relative w-full max-w-4xl bg-[#0d1117] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-[#30363d] overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#161b22] shrink-0">
              <div className="flex items-center gap-3">
                 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#238636]/10 text-[#238636] border border-[#238636]/20">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                 </div>
                 <div>
                   <h3 className="text-[#c9d1d9] font-bold text-sm leading-tight">Live Badge Showcase</h3>
                   <p className="text-[#8b949e] text-xs">GitHub Dark Mode Preview</p>
                 </div>
              </div>
              <button onClick={() => setShowBadgePreview(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9] transition-colors border border-transparent hover:border-[#30363d]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 sm:p-10 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-blend-overlay" style={{ backgroundColor: '#0d1117' }}>
               <div className="max-w-3xl mx-auto space-y-8 bg-[#0d1117]/80 p-8 sm:p-12 rounded-xl border border-[#21262d] backdrop-blur-sm shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#238636]/5 rounded-full blur-3xl" />
                  
                  <div className="relative z-10 border-b border-[#21262d] pb-5 flex items-center gap-4">
                    <span className="text-4xl">👋</span>
                    <h1 className="text-[#c9d1d9] text-3xl font-black tracking-tight">{readme.suggestedTitle || "Hi there"}</h1>
                  </div>
                  
                  <p className="relative z-10 text-[#8b949e] text-base leading-relaxed max-w-2xl">
                    This is a simulation of how your Aptico badge will render on a GitHub profile README. 
                    The badge acts as a dynamic live-widget that routes inbound traffic back to your interactive shadow resume.
                  </p>
                  
                  <div className="relative z-10 mt-8 p-8 sm:p-12 bg-[#161b22] border border-[#30363d] rounded-xl flex justify-center items-center shadow-inner relative overflow-hidden group/badge cursor-crosshair">
                     <div className="absolute inset-0 bg-gradient-to-br from-[#238636]/5 to-transparent pointer-events-none" />
                     <a href={readme.shadowResumeUrl} target="_blank" rel="noreferrer" className="relative z-20 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1 block outline-none">
                       <img src={readme.badgeUrl} alt="Aptico Profile" className="max-w-full drop-shadow-2xl" />
                     </a>
                     
                     <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-0 group-hover/badge:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                        <span className="bg-[#0d1117]/90 text-[#8b949e] text-[11px] px-4 py-2 rounded-full border border-[#30363d] font-mono shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px]">touch_app</span>
                          Click badge to test routing
                        </span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
