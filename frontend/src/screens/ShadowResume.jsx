import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from '@/lib/router-compat.jsx';
import { chatWithShadowResume, getPublicProfile } from '../api/socialApi.js';

function createInitialMessage(profile) {
  const displayName = profile?.name || profile?.username || 'this candidate';
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean).slice(0, 3) : [];
  const skillText = skills.length ? skills.join(', ') : 'their background and experience';

  return {
    id: 'intro',
    role: 'assistant',
    content: `Hi, I am ${displayName}'s AI Assistant. Ask me anything about ${skillText}.`
  };
}

function getInitials(name) {
  return String(name || 'A')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'A';
}

function renderInlineText(text, keyPrefix) {
  const parts = [];
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      parts.push(
        <a
          key={`${keyPrefix}-link-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-[var(--accent-strong)] underline decoration-[var(--accent)]/30 underline-offset-4 transition hover:text-[var(--accent)]"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      parts.push(
        <strong key={`${keyPrefix}-strong-${match.index}`} className="font-black text-[var(--text)]">
          {match[4]}
        </strong>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

function renderTextBlock(text, keyPrefix) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const listItems = lines.filter((line) => /^[-*•]\s+/.test(line));

  if (lines.length > 1 && listItems.length === lines.length) {
    return (
      <ul className="space-y-2">
        {lines.map((line, index) => (
          <li key={`${keyPrefix}-li-${index}`} className="flex gap-2 text-sm leading-6 text-[var(--text)]">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            <span>{renderInlineText(line.replace(/^[-*•]\s+/, ''), `${keyPrefix}-li-${index}`)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-sm leading-7 text-[var(--text)]">
      {renderInlineText(lines.join(' '), keyPrefix)}
    </p>
  );
}

function parseAssistantSections(content) {
  const text = String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const sectionPattern = /\*\*([^*\n]{2,80}?)\*\*/g;
  const matches = [...text.matchAll(sectionPattern)].filter((match) => match[1].trim().endsWith(':'));

  if (matches.length < 2) {
    return { intro: text, sections: [] };
  }

  const intro = text.slice(0, matches[0].index).trim();
  const sections = matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    return {
      title: match[1].replace(/:$/, '').trim(),
      body: text.slice(match.index + match[0].length, nextMatch?.index ?? text.length).trim()
    };
  }).filter((section) => section.title && section.body);

  return { intro, sections };
}

function AssistantMessageContent({ content }) {
  const { intro, sections } = parseAssistantSections(content);

  if (!sections.length) {
    return (
      <div className="space-y-3">
        {String(content || '')
          .split(/\n{2,}/)
          .map((block) => block.trim())
          .filter(Boolean)
          .map((block, index) => (
            <div key={`assistant-block-${index}`}>{renderTextBlock(block, `assistant-block-${index}`)}</div>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {intro ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/70 px-4 py-3">
          {renderTextBlock(intro, 'assistant-intro')}
        </div>
      ) : null}

      <div className="grid gap-3">
        {sections.map((section, index) => (
          <section key={`${section.title}-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/55 px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <span className="material-symbols-outlined text-[14px]">verified</span>
              </span>
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                {section.title}
              </h3>
            </div>
            {section.body ? renderTextBlock(section.body, `assistant-section-${index}`) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

export default function ShadowResume() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setNotFound(false);
    setError('');

    getPublicProfile(username)
      .then((data) => {
        if (!active) {
          return;
        }

        setProfile(data);
        setMessages([createInitialMessage(data)]);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        if (requestError.response?.status === 404) {
          setNotFound(true);
          return;
        }

        setError(requestError.response?.data?.error || 'Could not load this shadow resume.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [username]);

  const suggestedPrompts = useMemo(() => {
    const displayName = profile?.name || username || 'this candidate';
    return [
      `What is ${displayName}'s education?`,
      `Tell me about ${displayName}'s recent experience.`,
      `What are ${displayName}'s strongest skills?`
    ];
  }, [profile, username]);

  async function submitMessage(messageText) {
    const trimmed = String(messageText || '').trim();

    if (!trimmed || sending || !username) {
      return;
    }

    const recruiterMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed
    };

    setMessages((current) => [...current, recruiterMessage]);
    setDraft('');
    setSending(true);
    setError('');

    try {
      const result = await chatWithShadowResume(username, trimmed);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.response || 'No response was generated.'
        }
      ]);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not send the recruiter question right now.');
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    void submitMessage(draft);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[320px_minmax(0,1fr)] relative z-10">
          <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="skeleton skeleton-avatar h-20 w-20 rounded-2xl" />
              <div className="flex-1">
                <div className="skeleton skeleton-text w-3/4 h-6 mb-2" />
                <div className="skeleton skeleton-text w-1/2 h-4" />
              </div>
            </div>
            <div className="skeleton skeleton-text w-1/3 mt-2" />
            <div className="mt-4">
               <div className="skeleton skeleton-text w-1/4 h-3 mb-3" />
               <div className="flex flex-wrap gap-2">
                 {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton w-16 h-6 rounded-full" />)}
               </div>
            </div>
            <div className="skeleton skeleton-card mt-auto h-32" />
          </aside>
          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl flex flex-col h-[720px]">
             <div className="border-b border-[var(--border)] pb-6 mb-6">
                <div className="skeleton skeleton-text w-1/4 h-3 mb-2" />
                <div className="skeleton skeleton-text w-1/3 h-8 mb-4" />
                <div className="skeleton skeleton-text w-full h-4" />
                <div className="skeleton skeleton-text w-5/6 h-4" />
             </div>
             <div className="flex-1 flex flex-col gap-4">
               <div className="skeleton w-2/3 h-20 rounded-2xl self-start" />
               <div className="skeleton w-1/2 h-16 rounded-2xl self-end" />
               <div className="skeleton w-3/4 h-24 rounded-2xl self-start" />
             </div>
             <div className="mt-6 pt-6 border-t border-[var(--border)] flex gap-4">
                <div className="skeleton flex-1 h-12 rounded-[20px]" />
                <div className="skeleton w-24 h-12 rounded-[20px]" />
             </div>
          </section>
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--warning-soft)] rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-lg rounded-[28px] border border-[var(--border)] bg-[var(--panel)]/80 backdrop-blur-xl p-10 text-center shadow-2xl relative z-10 animate-fade-in-up">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--warning-soft)] text-[var(--warning-text)] border border-[var(--warning-border)] mb-6 shadow-inner">
             <span className="material-symbols-outlined text-[40px]">search_off</span>
          </div>
          <h1 className="text-3xl font-black text-[var(--text)] tracking-tight">Shadow resume not found</h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--muted-strong)] max-w-[80%] mx-auto">
            This candidate profile is either private or does not exist.
          </p>
          <Link to="/" className="app-button mt-8 inline-flex px-8 py-3 shadow-[0_0_15px_rgba(59,201,142,0.3)] hover:shadow-[0_0_25px_rgba(59,201,142,0.5)]">
            Return to Aptico
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,201,142,0.1),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(113,161,255,0.08),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none" />
      
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[320px_minmax(0,1fr)] relative z-10 animate-fade-in-up">
        <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-md p-7 shadow-[0_20px_80px_rgba(0,0,0,0.08)] flex flex-col group/sidebar transition-all duration-500 hover:shadow-[0_30px_90px_rgba(0,0,0,0.12)]">
          <Link to={`/u/${profile.username}`} className="flex items-center gap-2 text-sm font-bold text-[var(--accent-strong)] hover:text-[var(--accent)] transition-colors group/link mb-2 w-fit">
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover/link:-translate-x-1">arrow_back</span>
            View public profile
          </Link>

          <div className="mt-5 flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--accent)] blur-xl opacity-20 rounded-full" />
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name || profile.username}
                  className="relative h-20 w-20 rounded-[22px] object-cover border-2 border-[var(--panel)] shadow-lg"
                />
              ) : (
                <div className="relative flex h-20 w-20 items-center justify-center rounded-[22px] bg-gradient-to-br from-[var(--accent)] to-[#158f62] text-2xl font-black text-[#042b1c] border-2 border-[var(--panel)] shadow-lg">
                  {getInitials(profile.name || profile.username)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-[var(--text)] truncate">
                {profile.name || profile.username}
              </h1>
              <p className="mt-1 text-[13px] font-semibold text-[var(--muted-strong)] leading-snug line-clamp-2">
                {profile.headline || 'Professional profile'}
              </p>
            </div>
          </div>

          {profile.location ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-[var(--muted-strong)] bg-[var(--panel-soft)] w-fit px-3 py-1.5 rounded-lg border border-[var(--border)]/50">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              {profile.location}
            </div>
          ) : null}

          {profile.skills?.length ? (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">psychology</span>
                <p className="app-kicker !mb-0 text-[var(--accent)]">Highlight Skills</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.slice(0, 8).map((skill) => (
                  <span
                    key={skill}
                    className="app-chip shadow-sm hover:shadow-md transition-shadow"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-auto pt-8">
            <div className="rounded-[22px] border border-[var(--border)] bg-gradient-to-br from-[var(--panel-soft)] to-[var(--bg)] p-5 relative overflow-hidden group/info">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover/info:bg-[var(--accent)]/10" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">info</span>
                <p className="app-kicker !mb-0 text-[var(--text)]">How this works</p>
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--muted-strong)] relative z-10 font-medium">
                Ask targeted questions about experience, education, skills, and project work. This AI reads the candidate{"'"}s verified profile and responds professionally &mdash; <span className="text-[var(--text)] font-semibold">it will never invent data</span> that isn{"'"}t there.
              </p>
            </div>
          </div>
        </aside>

        <section className="relative flex h-[calc(100vh-4rem)] min-h-[620px] max-h-[760px] min-w-0 flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-md shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
          
          <div className="relative z-10 flex shrink-0 flex-col justify-center border-b border-[var(--border)]/60 bg-[var(--panel-soft)]/50 px-6 py-5 backdrop-blur-sm sm:px-8 sm:py-6">
            <div className="flex items-center gap-3 mb-2">
               <div className="comms-pulse-active w-2.5 h-2.5 bg-[var(--accent)] rounded-full" />
               <p className="app-kicker !mb-0 text-[var(--accent)] tracking-[0.2em]">
                 AI-Powered Profile Chat
               </p>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[var(--text)]">
              Recruiter Shadow Resume
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-strong)] max-w-2xl">
              This assistant is trained strictly on <strong className="text-[var(--text)]">{profile.name || profile.username}</strong>{"'"}s verified data. Ask direct screening questions &mdash; all responses are grounded in real facts.
            </p>
          </div>

          <div className="custom-scrollbar relative z-0 min-h-0 flex-1 overflow-y-auto bg-[var(--panel)] px-5 py-5 sm:px-8 sm:py-6">
            <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--border)]/50 pb-5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void submitMessage(prompt)}
                  className="group/prompt rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-2 text-[13px] font-semibold text-[var(--text)] transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] flex items-center gap-2 shadow-sm"
                >
                  {prompt}
                  <span className="material-symbols-outlined text-[14px] opacity-0 -ml-2 transition-all group-hover/prompt:opacity-100 group-hover/prompt:ml-0">arrow_upward</span>
                </button>
              ))}
            </div>

            <div className="space-y-6 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                >
                  <div
                    className={`relative max-w-[92%] rounded-[24px] px-5 py-4 text-[14px] leading-relaxed shadow-md sm:px-6 lg:max-w-[86%] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-[var(--accent)] to-[#2fa875] text-[#042b1c] rounded-br-[8px] font-medium border border-transparent'
                        : 'border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] rounded-bl-[8px]'
                    }`}
                  >
                    {message.role === 'assistant' && (
                       <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full border-2 border-[var(--panel)] bg-[var(--panel-soft)] flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-[14px] text-[var(--accent)]">smart_toy</span>
                       </div>
                    )}
                    {message.role === 'assistant' ? <AssistantMessageContent content={message.content} /> : message.content}
                  </div>
                </div>
              ))}

              {sending ? (
                <div className="flex justify-start animate-fade-in-up">
                  <div className="relative rounded-[24px] rounded-bl-[8px] border border-[var(--border)] bg-[var(--panel)] px-6 py-4 shadow-md">
                     <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full border-2 border-[var(--panel)] bg-[var(--panel-soft)] flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[14px] text-[var(--accent)]">smart_toy</span>
                     </div>
                     <div className="flex items-center gap-1.5 h-6">
                       <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-[bounce_1s_infinite_0ms]" />
                       <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-[bounce_1s_infinite_200ms]" />
                       <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-[bounce_1s_infinite_400ms]" />
                     </div>
                  </div>
                </div>
              ) : null}
              <div ref={chatEndRef} className="h-4" />
            </div>
          </div>

          <div className="relative z-10 shrink-0 border-t border-[var(--border)]/60 bg-[var(--panel-soft)]/30 px-5 py-4 backdrop-blur-md sm:px-8 sm:py-5">
            {error ? (
              <div className="mb-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[13px] text-red-500 flex items-center gap-2 shadow-sm animate-fade-in-up">
                 <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Ask about ${profile.name || profile.username}'s experience...`}
                className="w-full rounded-[24px] border border-[var(--border)] bg-[var(--panel)] pl-6 pr-16 py-4 text-[14px] text-[var(--text)] shadow-sm outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--muted)] font-medium"
              />
              <button 
                type="submit" 
                disabled={sending || !draft.trim()} 
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--accent)] text-[#042b1c] transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(59,201,142,0.4)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-[20px] ml-0.5">send</span>
              </button>
            </form>
            <div className="text-center mt-3">
              <span className="text-[11px] text-[var(--muted)] font-mono tracking-widest uppercase">Aptico AI Shadow Resume</span>
            </div>
          </div>
        </section>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--muted);
        }
      `}</style>
    </main>
  );
}
