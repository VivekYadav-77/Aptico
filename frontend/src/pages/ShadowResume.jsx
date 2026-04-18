import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
      <main className="min-h-screen bg-[var(--bg)] px-4 py-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6">
            <div className="h-24 w-24 animate-pulse rounded-3xl bg-[var(--panel-soft)]" />
            <div className="mt-6 h-8 w-2/3 animate-pulse rounded-xl bg-[var(--panel-soft)]" />
            <div className="mt-3 h-5 w-1/2 animate-pulse rounded-xl bg-[var(--panel-soft)]" />
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6">
            <div className="h-[560px] animate-pulse rounded-[24px] bg-[var(--panel-soft)]" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
        <div className="max-w-lg rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-8 text-center">
          <h1 className="text-3xl font-black text-[var(--text)]">Shadow resume not found</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
            This candidate profile is either private or does not exist.
          </p>
          <Link to="/" className="app-button mt-6 inline-flex">
            Return to Aptico
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_28%),var(--bg)] px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <Link to={`/u/${profile.username}`} className="text-sm font-bold text-[var(--accent-strong)] hover:underline">
            View public profile
          </Link>

          <div className="mt-6 flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name || profile.username}
                className="h-20 w-20 rounded-[24px] object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-xl font-black text-white">
                {getInitials(profile.name || profile.username)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">
                {profile.name || profile.username}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[var(--accent-strong)]">
                {profile.headline || 'Professional profile'}
              </p>
            </div>
          </div>

          {profile.location ? (
            <p className="mt-5 text-sm text-[var(--muted-strong)]">{profile.location}</p>
          ) : null}

          {profile.skills?.length ? (
            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-strong)]">
                Highlight Skills
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.skills.slice(0, 8).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 rounded-[22px] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-strong)]">
              How this works
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--text)]">
              Ask targeted questions about experience, education, skills, and project work. This AI reads the candidate{"'"}s verified profile and responds professionally &mdash; it will never invent data that isn{"'"}t there.
            </p>
          </div>
        </aside>

        <section className="flex min-h-[720px] flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[var(--border)] bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(16,185,129,0.08))] px-6 py-5">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--muted-strong)]">
              AI-Powered Candidate Profile
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)]">
              Recruiter Chat
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
              This AI assistant is trained on this candidate{"'"}s verified profile data. Ask direct screening questions about their skills, experience, education, and projects &mdash; all responses are grounded in real data, nothing is invented.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-wrap gap-2 pb-5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void submitMessage(prompt)}
                  className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[24px] px-5 py-4 text-sm leading-7 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-[var(--accent)] text-[#042b1c]'
                        : 'border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--text)]'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {sending ? (
                <div className="flex justify-start">
                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-4 text-sm text-[var(--muted-strong)]">
                    Thinking through the profile data...
                  </div>
                </div>
              ) : null}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="border-t border-[var(--border)] px-6 py-5">
            {error ? (
              <div className="mb-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Ask about ${profile.name || profile.username}'s education, experience, or skills`}
                className="min-w-0 flex-1 rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
              />
              <button type="submit" disabled={sending || !draft.trim()} className="app-button disabled:cursor-not-allowed disabled:opacity-50">
                Send
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
