import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { fetchStickerStats, unlockSticker, equipStickers } from '../api/profileApi.js';
import { STICKER_REGISTRY, RARITY_CONFIG, STICKER_CATEGORIES, MAX_EQUIPPED_STICKERS, getStickerById, getHighestInChain } from '../utils/stickerRegistry.js';

/* ── Confetti burst ── */
function ConfettiOverlay({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed inset-0 z-[300] pointer-events-none overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const colors = ['#f59e0b','#ec4899','#8b5cf6','#10b981','#0ea5e9','#ef4444','#d946ef'];
        const c = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const dur = 1.4 + Math.random() * 0.8;
        const size = 6 + Math.random() * 8;
        return <div key={i} className="absolute rounded-sm animate-confetti-fall" style={{ left: `${left}%`, top: '-20px', width: size, height: size, backgroundColor: c, animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />;
      })}
      <style>{`
        @keyframes confetti-fall { 0% { opacity:1; transform: translateY(0) rotate(0deg) scale(1); } 100% { opacity:0; transform: translateY(100vh) rotate(720deg) scale(0.3); } }
        .animate-confetti-fall { animation: confetti-fall linear forwards; }
      `}</style>
    </div>
  );
}

/* ── Sticker Icon Renderer ── */
function StickerIcon({ sticker, size = 40 }) {
  if (sticker.iconType === 'emoji') {
    return <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>{sticker.icon}</span>;
  }
  return (
    <svg width={size * 0.6} height={size * 0.6} fill="none" viewBox="0 0 24 24" stroke={sticker.color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={sticker.icon} />
    </svg>
  );
}

/* ── Requirement label ── */
function reqLabel(req) {
  const labels = {
    xp: `${req.value} XP`, streak: `${req.value}-day streak`, total_applications: `${req.value} applications`,
    total_rejections: `${req.value} rejections`, followers: `${req.value} followers`, connections: `${req.value} connections`,
    night_owl: 'Log an app between 12–4 AM', early_bird: 'Log an app between 4–6 AM',
    join_before: `Join before ${new Date(req.value).getFullYear()}`, squad_goal: 'Squad hits weekly goal',
  };
  return labels[req.type] || 'Special requirement';
}

function reqProgress(req, stats) {
  const map = {
    xp: [stats.xp, req.value], streak: [stats.streak, req.value], total_applications: [stats.totalApplications, req.value],
    total_rejections: [stats.totalRejections, req.value], followers: [stats.followers, req.value], connections: [stats.connections, req.value],
    night_owl: [stats.nightOwl, 1], early_bird: [stats.earlyBird, 1], squad_goal: [stats.squadGoalReached, 1],
  };
  if (req.type === 'join_before') return stats.joinDate < new Date(req.value) ? [1, 1] : [0, 1];
  return map[req.type] || [0, req.value];
}

export default function RewardsPage() {
  const [stats, setStats] = useState(null);
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [equippedIds, setEquippedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('milestone');
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast] = useState('');
  const [unlocking, setUnlocking] = useState(null);
  const [detailSticker, setDetailSticker] = useState(null);

  useEffect(() => {
    fetchStickerStats()
      .then((data) => { setStats(data.stats); setUnlockedIds(data.unlockedStickers || []); setEquippedIds(data.equippedStickers || []); })
      .catch(() => setToast('Failed to load sticker data.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleUnlock(stickerId) {
    setUnlocking(stickerId);
    try {
      const result = await unlockSticker(stickerId);
      setUnlockedIds(result.unlockedStickers || []);
      if (!result.alreadyUnlocked) { setConfetti(true); setToast(`🎉 Unlocked: ${getStickerById(stickerId)?.name}!`); }
      else { setToast('Already unlocked!'); }
    } catch (e) { setToast(e?.response?.data?.error || 'Cannot unlock yet.'); }
    finally { setUnlocking(null); setTimeout(() => setToast(''), 4000); }
  }

  async function handleToggleEquip(stickerId) {
    const isEquipped = equippedIds.includes(stickerId);
    const next = isEquipped ? equippedIds.filter((id) => id !== stickerId) : [...equippedIds, stickerId];
    if (next.length > MAX_EQUIPPED_STICKERS) { setToast(`Max ${MAX_EQUIPPED_STICKERS} stickers on your showcase.`); setTimeout(() => setToast(''), 3000); return; }
    try {
      await equipStickers(next);
      setEquippedIds(next);
      setToast(isEquipped ? 'Sticker removed from showcase.' : 'Sticker added to showcase!');
    } catch (e) { setToast(e?.response?.data?.error || 'Failed to update showcase.'); }
    finally { setTimeout(() => setToast(''), 3000); }
  }

  const filteredStickers = STICKER_REGISTRY.filter((s) => s.category === activeCategory);

  if (loading) {
    return (
      <AppShell title="Rewards" description="Your sticker collection and achievements.">
        <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-[var(--panel)] border border-[var(--border)]" />)}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Rewards"
      description="Collect stickers by hitting milestones. Equip your favorites to showcase on your profile."
      actions={
        <Link to="/profile" className="app-button-secondary flex items-center gap-2 hover:bg-[var(--panel-soft)]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Profile
        </Link>
      }
    >
      {confetti && <ConfettiOverlay onDone={() => setConfetti(false)} />}

      <div className="mx-auto max-w-5xl space-y-8">
        {/* Toast */}
        {toast && <div className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-5 py-2 text-center text-sm font-bold text-[var(--accent-strong)] animate-fade-in-up">{toast}</div>}

        {/* ── XP Overview Card ── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/70 backdrop-blur-xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Your XP</p>
              <p className="mt-1 text-4xl font-black text-[var(--text)]">{stats?.xp || 0} <span className="text-lg text-[var(--muted-strong)]">XP</span></p>
            </div>
            <div className="flex gap-6 text-center">
              {[
                { label: 'Streak', val: `${stats?.streak || 0}d` },
                { label: 'Apps', val: stats?.totalApplications || 0 },
                { label: 'Unlocked', val: `${unlockedIds.length}/${STICKER_REGISTRY.length}` },
                { label: 'Equipped', val: `${equippedIds.length}/${MAX_EQUIPPED_STICKERS}` },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-lg font-black text-[var(--text)]">{s.val}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Showcase Preview ── */}
        {equippedIds.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/70 backdrop-blur-xl p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] mb-4">Your Showcase (visible on profile)</p>
            <div className="flex flex-wrap gap-4">
              {equippedIds.map((id) => {
                const s = getStickerById(id);
                if (!s) return null;
                const rc = RARITY_CONFIG[s.rarity];
                return (
                  <div key={id} className={`flex flex-col items-center gap-2 rounded-2xl border ${rc.border} ${rc.bg} ${rc.glow} p-4 min-w-[90px] transition-all hover:scale-105 ${s.rarity === 'legendary' ? 'sticker-holo' : ''}`}>
                    <div className="flex items-center justify-center h-12 w-12"><StickerIcon sticker={s} size={48} /></div>
                    <p className="text-[11px] font-bold text-[var(--text)] text-center leading-tight">{s.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Category Tabs ── */}
        <div className="flex flex-wrap gap-2">
          {STICKER_CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeCategory === cat.id ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30' : 'border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--muted-strong)]'}`}
            >
              <span>{cat.emoji}</span> {cat.name}
            </button>
          ))}
        </div>

        {/* ── Category description ── */}
        <p className="text-sm font-medium text-[var(--muted-strong)]">{STICKER_CATEGORIES.find((c) => c.id === activeCategory)?.description}</p>

        {/* ── Sticker Grid ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStickers.map((sticker) => {
            const isUnlocked = unlockedIds.includes(sticker.id);
            const isEquipped = equippedIds.includes(sticker.id);
            const rc = RARITY_CONFIG[sticker.rarity];
            const isSecret = sticker.category === 'secret' && !isUnlocked;
            const [current, target] = stats ? reqProgress(sticker.requirement, stats) : [0, 1];
            const pct = Math.min(100, Math.round((current / target) * 100));

            return (
              <div key={sticker.id}
                onClick={() => setDetailSticker(sticker)}
                className={`group relative rounded-2xl border ${rc.border} ${isUnlocked ? rc.bg : 'bg-[var(--panel-soft)]/30'} p-5 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] ${!isUnlocked ? 'opacity-60 grayscale-[40%]' : ''} ${sticker.rarity === 'legendary' && isUnlocked ? 'sticker-holo' : ''} ${rc.glow && isUnlocked ? rc.glow : ''}`}
              >
                {/* Rarity badge */}
                <span className={`absolute top-3 right-3 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${rc.badgeColor}`}>{rc.label}</span>

                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${rc.border} ${isUnlocked ? 'bg-white/10' : 'bg-[var(--panel-soft)]'}`}>
                    {isSecret ? <span className="text-2xl">❓</span> : <StickerIcon sticker={sticker} size={56} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base font-black ${isUnlocked ? 'text-[var(--text)]' : 'text-[var(--muted-strong)]'} leading-tight`}>
                      {isSecret ? '???' : sticker.name}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted-strong)] leading-relaxed line-clamp-2">
                      {isSecret ? 'Hidden achievement — keep exploring!' : sticker.description}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {!isUnlocked && !isSecret && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted-strong)] mb-1">
                      <span>{reqLabel(sticker.requirement)}</span>
                      <span>{current}/{target}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: sticker.color }} />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-4 flex gap-2">
                  {isUnlocked ? (
                    <button onClick={(e) => { e.stopPropagation(); handleToggleEquip(sticker.id); }}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${isEquipped ? 'bg-[var(--accent)] text-white shadow-md' : 'border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]'}`}
                    >
                      {isEquipped ? '✓ Showcased' : 'Add to Showcase'}
                    </button>
                  ) : !isSecret && pct >= 100 ? (
                    <button onClick={(e) => { e.stopPropagation(); handleUnlock(sticker.id); }} disabled={unlocking === sticker.id}
                      className="flex-1 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-3 py-2 text-xs font-bold text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50"
                    >
                      {unlocking === sticker.id ? 'Claiming...' : '🎁 Claim Sticker'}
                    </button>
                  ) : (
                    <div className="flex-1 rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-center text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      {isSecret ? 'Hidden' : 'Locked'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {detailSticker && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" onClick={() => setDetailSticker(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetailSticker(null)} className="absolute top-4 right-4 text-[var(--muted-strong)] hover:text-[var(--text)] transition-colors bg-[var(--panel-soft)] rounded-full p-1.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {(() => {
              const s = detailSticker;
              const rc = RARITY_CONFIG[s.rarity];
              const isUnlocked = unlockedIds.includes(s.id);
              const isSecret = s.category === 'secret' && !isUnlocked;
              const [current, target] = stats ? reqProgress(s.requirement, stats) : [0, 1];
              const pct = Math.min(100, Math.round((current / target) * 100));

              return (
                <>
                  <div className="flex justify-center mb-6">
                    <div className={`flex h-24 w-24 items-center justify-center rounded-2xl border-2 ${rc.border} ${rc.bg} ${rc.glow} ${s.rarity === 'legendary' && isUnlocked ? 'sticker-holo' : ''}`}>
                      {isSecret ? <span className="text-5xl">❓</span> : <StickerIcon sticker={s} size={96} />}
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-[var(--text)] text-center">{isSecret ? '???' : s.name}</h2>
                  <span className={`block text-center mt-2 text-xs font-bold uppercase tracking-wider ${rc.textColor}`}>{rc.label} · {STICKER_CATEGORIES.find((c) => c.id === s.category)?.name}</span>
                  <p className="mt-4 text-sm text-[var(--muted-strong)] text-center leading-relaxed">{isSecret ? 'This is a secret sticker. Keep using Aptico and you might discover it!' : s.description}</p>

                  {!isUnlocked && !isSecret && (
                    <div className="mt-6 p-4 rounded-xl bg-[var(--panel-soft)]/50 border border-[var(--border)]">
                      <div className="flex justify-between text-xs font-bold text-[var(--muted-strong)] mb-2">
                        <span>{reqLabel(s.requirement)}</span>
                        <span>{current}/{target} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </div>
                  )}

                  {isUnlocked && (
                    <div className="mt-6 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        Unlocked
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Holographic CSS effect */}
      <style>{`
        .sticker-holo {
          background-image: linear-gradient(125deg, rgba(192,38,211,0.08) 0%, rgba(56,189,248,0.08) 30%, rgba(245,158,11,0.08) 60%, rgba(236,72,153,0.08) 100%);
          background-size: 300% 300%;
          animation: holo-shift 4s ease-in-out infinite;
        }
        @keyframes holo-shift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
      `}</style>
    </AppShell>
  );
}
