import { useEffect, useRef, useState } from 'react';
import { getSquadComms, postSquadMessage, setSquadArchetype } from '../api/squadApi.js';
import { getStickerById } from '../utils/stickerRegistry.js';
import StickerVisual from './StickerVisual.jsx';

const PHASE_LABELS = ['Pre-25%', '25-50%', '50-75%', '75-100%', 'Goal secured'];
const QUICK_SIGNAL_META = {
  HYPE: { label: 'Hype', icon: 'local_fire_department', className: 'from-emerald-500/25 to-lime-400/10 border-emerald-400/35' },
  ON_IT: { label: 'On it', icon: 'flash_on', className: 'from-blue-500/25 to-cyan-400/10 border-blue-400/35' },
  MISSION_SECURED: { label: 'Mission secured', icon: 'military_tech', className: 'from-amber-400/35 to-orange-500/10 border-amber-300/45' },
  LEAD_VOUCHED: { label: 'Lead vouched', icon: 'hub', className: 'from-violet-500/30 to-fuchsia-400/10 border-violet-300/40' },
  SHIELD_UP: { label: 'Shield up', icon: 'shield', className: 'from-teal-500/25 to-emerald-400/10 border-teal-300/45' }
};

const ARCHETYPES = [
  {
    role: 'grinder',
    title: 'The Grinder',
    icon: 'whatshot',
    description: 'Keeps the output engine warm. No special signal, maximum momentum.'
  },
  {
    role: 'motivator',
    title: 'The Motivator',
    icon: 'shield',
    description: 'Unlocks SHIELD_UP for recovery pushes when the squad needs cover.'
  },
  {
    role: 'scout',
    title: 'The Scout',
    icon: 'travel_explore',
    description: 'Unlocks Signal Drops and LEAD_VOUCHED for job lead sharing.'
  }
];

function getMilestonePhase(progressPercent) {
  const safeProgress = Number(progressPercent) || 0;
  if (safeProgress >= 100) return 4;
  if (safeProgress >= 75) return 3;
  if (safeProgress >= 50) return 2;
  if (safeProgress >= 25) return 1;
  return 0;
}

function formatTime(value) {
  if (!value) return 'now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'now';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function isRecent(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time < 60 * 1000;
}

function StickerIcon({ stickerId, size = 44 }) {
  const sticker = getStickerById(stickerId);
  if (!sticker) {
    return <span className="material-symbols-outlined text-[32px]">interests</span>;
  }
  return <StickerVisual id={sticker.id} visualId={sticker.visualId} subVariant={sticker.subVariant} color={sticker.color} size={size} rarity={sticker.rarity} tier={sticker.tier || 1} />;
}

function MessageCard({ message, myAlias }) {
  const alias = message.metadata?.alias || 'System';
  const pulseClass = isRecent(message.createdAt) ? 'comms-pulse-active' : '';

  if (message.messageType === 'momentum_surge') {
    return (
      <div className={`rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4 ${pulseClass}`}>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[var(--accent-strong)]">trending_up</span>
          <div>
            <p className="text-sm font-black text-[var(--text)]">Momentum Surge</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">{message.content}</p>
            {message.metadata?.aliases?.length ? (
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{message.metadata.aliases.join(' / ')}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (message.messageType === 'system') {
    const goalReached = message.metadata?.type === 'goal_reached';
    return (
      <div
        className={`rounded-2xl border p-4 font-mono text-sm ${
          goalReached
            ? 'border-amber-300/45 bg-[linear-gradient(135deg,rgba(245,158,11,0.24),rgba(78,222,163,0.10))]'
            : 'border-[var(--border)] bg-black/10'
        } ${pulseClass}`}
      >
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">terminal</span>
          <div>
            <p className="app-kicker">{message.metadata?.type === 'daily_briefing' ? 'Daily briefing' : 'System relay'}</p>
            <p className="mt-2 leading-6 text-[var(--text)]">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  if (message.messageType === 'quick_signal') {
    const meta = QUICK_SIGNAL_META[message.content] || QUICK_SIGNAL_META.HYPE;
    return (
      <div className={`signal-pop rounded-2xl border bg-gradient-to-r p-4 ${meta.className} ${pulseClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">{meta.icon}</span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--text)]">{meta.label}</p>
              <p className="mt-1 text-xs text-[var(--muted-strong)]">{alias} sent a quick signal.</p>
            </div>
          </div>
          <span className="text-xs text-[var(--muted)]">{formatTime(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  if (message.messageType === 'sticker_drop') {
    const sticker = getStickerById(message.content);
    const rarity = sticker?.rarity === 'epic' ? 'legendary' : sticker?.rarity || 'common';
    return (
      <div className={`rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 sticker-drop-${rarity} ${pulseClass}`}>
        <p className="app-kicker">{alias} dropped a sticker</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
            <StickerIcon stickerId={message.content} />
          </div>
          <div>
            <p className="text-sm font-black text-[var(--text)]">{sticker?.name || message.content}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{sticker?.rarity || 'custom'} signal token</p>
          </div>
        </div>
      </div>
    );
  }

  if (message.messageType === 'signal_drop') {
    return (
      <div className={`rounded-2xl border border-blue-400/25 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(78,222,163,0.08))] p-4 ${pulseClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="app-kicker">{alias} dropped a signal</p>
            <h3 className="mt-2 text-lg font-black text-[var(--text)]">{message.metadata?.title || message.content}</h3>
            {message.metadata?.companyName ? <p className="mt-1 text-sm text-[var(--muted-strong)]">{message.metadata.companyName}</p> : null}
            {message.metadata?.note ? <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">{message.metadata.note}</p> : null}
          </div>
          <span className="material-symbols-outlined text-blue-400">work</span>
        </div>
        {message.metadata?.url ? (
          <a href={message.metadata.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-blue-400/30 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-400">
            Open lead
          </a>
        ) : null}
      </div>
    );
  }

  if (message.messageType === 'accolade') {
    return (
      <div className={`rounded-2xl border border-amber-300/35 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(255,255,255,0.03))] p-4 ${pulseClass}`}>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-400">auto_awesome</span>
          <div>
            <p className="text-sm font-black text-[var(--text)]">Resilience Spark</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">
              {alias} gave a spark to {message.metadata?.targetAlias || message.content}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${message.isMine || alias === myAlias ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl border px-4 py-3 ${
          message.isMine || alias === myAlias
            ? 'border-[var(--accent)]/35 bg-[var(--accent-soft)]'
            : 'border-[var(--border)] bg-[var(--panel-soft)]'
        } ${pulseClass}`}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{alias}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text)]">{message.content}</p>
        <p className="mt-2 text-right text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

export default function SquadCommsHub({ progressPercent = 0, members = [], myAlias: initialAlias = '' }) {
  const [messages, setMessages] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(getMilestonePhase(progressPercent));
  const [synergyScore, setSynergyScore] = useState(0);
  const [synergyBurstActive, setSynergyBurstActive] = useState(false);
  const [myArchetype, setMyArchetype] = useState(null);
  const [myAlias, setMyAlias] = useState(initialAlias);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [jobUrl, setJobUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [targetAlias, setTargetAlias] = useState('');
  const [stickerId, setStickerId] = useState('');
  const [sending, setSending] = useState(false);
  const [lastPollAt, setLastPollAt] = useState(null);
  const [error, setError] = useState('');
  const feedEndRef = useRef(null);

  useEffect(() => {
    setCurrentPhase(getMilestonePhase(progressPercent));
  }, [progressPercent]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    async function poll() {
      try {
        const data = await getSquadComms();
        if (cancelled) return;
        setMessages(data.messages || []);
        setCurrentPhase(data.currentPhase ?? getMilestonePhase(progressPercent));
        setSynergyScore(Number(data.synergyScore || 0));
        setSynergyBurstActive(Boolean(data.synergyBurstActive));
        setMyArchetype(data.myArchetype || null);
        setMyAlias(data.myAlias || '');
        setLastPollAt(new Date());
        setError('');
      } catch (apiError) {
        if (!cancelled) {
          setError(apiError.response?.data?.error || 'Could not reach squad comms.');
        }
      }
    }

    poll();
    const interval = setInterval(poll, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, progressPercent]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function refreshComms() {
    const data = await getSquadComms();
    setMessages(data.messages || []);
    setCurrentPhase(data.currentPhase ?? currentPhase);
    setSynergyScore(Number(data.synergyScore || 0));
    setSynergyBurstActive(Boolean(data.synergyBurstActive));
    setMyArchetype(data.myArchetype || null);
    setMyAlias(data.myAlias || '');
    setLastPollAt(new Date());
  }

  async function sendPayload(payload) {
    setSending(true);
    setError('');

    try {
      const result = await postSquadMessage(payload);
      if (result?.message) {
        setMessages((current) => [...current, result.message]);
      }
      setDraft('');
      setJobUrl('');
      setCompanyName('');
      setTargetAlias('');
      setStickerId('');
      await refreshComms();
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Signal rejected by comms control.');
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (messageType === 'signal_drop') {
      await sendPayload({
        messageType,
        content: draft.trim() || 'Signal Drop',
        metadata: {
          title: draft.trim(),
          companyName,
          url: jobUrl,
          note: draft.trim()
        }
      });
      return;
    }

    if (messageType === 'accolade') {
      await sendPayload({
        messageType,
        content: targetAlias,
        metadata: { targetAlias }
      });
      return;
    }

    if (messageType === 'sticker_drop') {
      await sendPayload({
        messageType,
        content: stickerId,
        metadata: { stickerId }
      });
      return;
    }

    await sendPayload({
      messageType,
      content: draft
    });
  }

  async function chooseArchetype(role) {
    setSending(true);
    setError('');

    try {
      await setSquadArchetype(role);
      setMyArchetype(role);
      await refreshComms();
    } catch (apiError) {
      setError(apiError.response?.data?.error || 'Role lock failed.');
    } finally {
      setSending(false);
    }
  }

  const canSend = messageType === 'accolade' ? targetAlias : messageType === 'sticker_drop' ? stickerId : messageType === 'signal_drop' ? jobUrl : draft.trim();
  const visibleMembers = members.filter((member) => !member.isCurrentUser && member.alias !== myAlias);

  return (
    <article className={`app-panel relative overflow-hidden ${synergyBurstActive ? 'synergy-burst-flash' : ''}`}>
      <div className="absolute inset-x-0 top-0 h-24 hud-scanlines opacity-60" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="app-kicker">Tactical comms</p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">Alias-only war room</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-strong)]">
              Ephemeral signals, sparks, stickers, and job leads. No names, no avatars, just squad output.
            </p>
          </div>
          <button type="button" onClick={() => setIsOpen((value) => !value)} className="app-button-secondary">
            <span className="material-symbols-outlined text-[18px]">{isOpen ? 'keyboard_arrow_up' : 'forum'}</span>
            {isOpen ? 'Close comms' : 'Open comms'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
            <p className="app-kicker">Echo phase</p>
            <p className="mt-2 text-lg font-black text-[var(--text)]">{PHASE_LABELS[currentPhase] || PHASE_LABELS[0]}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <p className="app-kicker">Squad synergy</p>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">{synergyScore}/100</span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-black/10">
              <div className="synergy-meter-fill" style={{ width: `${Math.min(100, Math.max(0, synergyScore))}%` }} />
            </div>
            {synergyBurstActive ? <p className="mt-2 text-xs font-bold text-[var(--accent-strong)]">Synergy burst active for this squad.</p> : null}
          </div>
        </div>

        {isOpen ? (
          <div className="mt-6">
            {error ? (
              <div className="mb-4 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
                {error}
              </div>
            ) : null}

            {!myArchetype ? (
              <div className="mb-4 rounded-[1.4rem] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                <p className="app-kicker">Choose this week's role</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {ARCHETYPES.map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => chooseArchetype(item.role)}
                      disabled={sending}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40"
                    >
                      <span className="material-symbols-outlined text-[var(--accent-strong)]">{item.icon}</span>
                      <p className="mt-2 text-sm font-black text-[var(--text)]">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4 inline-flex rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                {myAlias || 'You'} / The {myArchetype}
              </div>
            )}

            <div className="max-h-[460px] space-y-3 overflow-y-auto rounded-[1.4rem] border border-[var(--border)] bg-[var(--panel-soft)] p-3">
              {messages.length ? (
                messages.map((message) => <MessageCard key={message.id} message={message} myAlias={myAlias} />)
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel)] p-5 text-sm leading-6 text-[var(--muted-strong)]">
                  Comms are quiet. Drop the first signal and wake the room.
                </div>
              )}
              <div ref={feedEndRef} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {Object.keys(QUICK_SIGNAL_META).map((signal) => {
                const scoutLocked = signal === 'LEAD_VOUCHED' && myArchetype !== 'scout';
                const motivatorLocked = signal === 'SHIELD_UP' && myArchetype !== 'motivator';
                return (
                  <button
                    key={signal}
                    type="button"
                    onClick={() => sendPayload({ messageType: 'quick_signal', content: signal })}
                    disabled={sending || scoutLocked || motivatorLocked}
                    className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {QUICK_SIGNAL_META[signal].label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 rounded-[1.4rem] border border-[var(--border)] bg-[var(--panel-soft)] p-3">
              <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                <select value={messageType} onChange={(event) => setMessageType(event.target.value)} className="app-input">
                  <option value="text">Text signal</option>
                  <option value="sticker_drop">Sticker drop</option>
                  <option value="signal_drop">Signal drop</option>
                  <option value="accolade">Resilience Spark</option>
                </select>

                {messageType === 'accolade' ? (
                  <select value={targetAlias} onChange={(event) => setTargetAlias(event.target.value)} className="app-input">
                    <option value="">Choose an alias</option>
                    {visibleMembers.map((member) => (
                      <option key={member.alias} value={member.alias}>
                        {member.alias}
                      </option>
                    ))}
                  </select>
                ) : messageType === 'sticker_drop' ? (
                  <input value={stickerId} onChange={(event) => setStickerId(event.target.value)} placeholder="Unlocked sticker id, e.g. xp_50" className="app-input" />
                ) : (
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={messageType === 'signal_drop' ? 'Job title or note' : 'Send a 200 character squad signal'}
                    maxLength={200}
                    className="app-input"
                  />
                )}
              </div>

              {messageType === 'signal_drop' ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Company name" className="app-input" />
                  <input value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} placeholder="https://company.com/job" className="app-input" />
                  {myArchetype !== 'scout' ? (
                    <p className="text-xs font-semibold text-[var(--warning-text)] md:col-span-2">Signal Drops are locked to The Scout role.</p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {lastPollAt ? `Last sync ${formatTime(lastPollAt)}` : 'Sync starts when opened'}
                </p>
                <button type="submit" disabled={sending || !canSend || (messageType === 'signal_drop' && myArchetype !== 'scout')} className="app-button">
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  {sending ? 'Sending...' : 'Transmit'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </article>
  );
}
