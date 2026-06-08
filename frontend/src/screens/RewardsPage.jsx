import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat.jsx';
import AppShell from '../components/AppShell.jsx';
import { fetchStickerStats, unlockSticker, equipStickers } from '../api/profileApi.js';
import { STICKER_REGISTRY, RARITY_CONFIG, STICKER_CATEGORIES, MAX_EQUIPPED_STICKERS, getStickerById, getHighestInChain } from '../utils/stickerRegistry.js';
import StickerVisual from '../components/StickerVisual.jsx';

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

/* ── Sticker Icon Renderer (now uses StickerVisual) ── */
function StickerIcon({ sticker, size = 40 }) {
  return <StickerVisual id={sticker.id} visualId={sticker.visualId} subVariant={sticker.subVariant} color={sticker.color} size={size} rarity={sticker.rarity} tier={sticker.tier || 1} />;
}

/* ── Requirement label ── */
function reqLabel(req) {
  const labels = {
    xp: `${req.value.toLocaleString()} XP`, streak: `${req.value} day streak`, total_applications: `${req.value} applications`,
    total_rejections: `${req.value} rejections`, followers: `${req.value} followers`, connections: `${req.value} connections`,
    night_owl: 'Log an app between 12–4 AM', early_bird: 'Log an app between 4–6 AM',
    join_before: `Join before ${new Date(req.value).getFullYear()}`, squad_goal: 'Squad hits weekly goal',
    speed_demon: 'Log an app within 1hr of discovery', weekend_warrior: 'Log an app on weekends',
    skill: `Master ${req.value} skill`, posts: `${req.value} community posts`, sparks_given: `Give ${req.value} sparks to squad`,
    post_likes: `${req.value} likes on posts`, daily_apps: `${req.value} apps in one day`, skill_count: `${req.value} skills on profile`,
    streak_no_rejections: `${req.value} days no rejections`, hired_after_rejections: `Hired after ${req.value} rejections`,
    ghost_jobs_found: `Find ${req.value} ghost jobs`, hours_active: `${req.value}h active time`, squad_contribution: '50% squad goal contribution',
    hired_silent: 'Hired without posting', squad_connections: 'Connect 2 squads', join_order: 'Early adopter status',
    xp_rank: 'Top 1% XP rank', bug_report: 'Report a bug', repo_contribution: 'Code contribution', test_phase: `${req.value} tester`,
    monthly_squad_reward: `Monthly squad rank #${req.value}`,
  };
  return labels[req.type] || 'Special requirement';
}

function getMonthlySquadRewardReadiness(req, stats) {
  return (stats.monthlySquadRewardReadiness || []).find((item) => Number(item.rank) === Number(req.value)) || null;
}

function getMonthlySquadRewardOption(req, stats) {
  return (stats.monthlySquadRewardOptions || []).find((item) => Number(item.rank) === Number(req.value)) || null;
}

function isMonthlySquadSticker(sticker) {
  return sticker?.requirement?.type === 'monthly_squad_reward';
}

function getSquadProofForSticker(history = [], stickerId) {
  return (history || []).filter((item) => item.stickerId === stickerId);
}

function rewardStateLabel({ readiness, latestProof, isUnlocked }) {
  if (readiness?.claimable) return latestProof ? 'New month ready' : 'Ready to claim';
  if (latestProof || isUnlocked) return 'Claimed';
  if (readiness?.status === 'needs_review') return 'Needs review';
  if (readiness?.status === 'almost_ready') return 'Almost ready';
  if (readiness?.status === 'building') return 'Building';
  return 'Unclaimed';
}

function SquadRewardsSection({ stats, unlockedIds, equippedIds, squadRewardHistory, onUnlock, onToggleEquip, unlocking }) {
  const monthlyStickers = STICKER_REGISTRY.filter(isMonthlySquadSticker);

  return (
    <section className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--panel)]/80 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">Squad Rewards</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--text)]">Verified monthly squad proof</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-strong)]">
            Awarded for consistent, clean contribution to a top monthly squad. Previous months stay as permanent profile proof.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-sm font-black text-[var(--text)]">
          {squadRewardHistory.length} claimed
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {monthlyStickers.map((sticker) => {
          const readiness = getMonthlySquadRewardReadiness(sticker.requirement, stats || {});
          const rewardOption = getMonthlySquadRewardOption(sticker.requirement, stats || {});
          const proofs = getSquadProofForSticker(squadRewardHistory, sticker.id);
          const latestProof = proofs[0] || null;
          const isUnlocked = unlockedIds.includes(sticker.id);
          const isEquipped = equippedIds.includes(sticker.id);
          const rc = RARITY_CONFIG[sticker.rarity];
          const pct = Number(readiness?.progress || (isUnlocked ? 100 : 0));
          const stateLabel = rewardStateLabel({ readiness, latestProof, isUnlocked });
          const monthLabel = rewardOption?.periodLabel || latestProof?.periodLabel || latestProof?.period || 'Month-end reward';

          return (
            <article key={sticker.id} className={`rounded-2xl border ${rc.border} ${isUnlocked ? rc.bg : 'bg-[var(--panel-soft)]/45'} p-5`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${rc.border} bg-white/10`}>
                  <StickerIcon sticker={sticker} size={56} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-base font-black ${rc.textColor}`}>{sticker.name}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-strong)]">Rank #{sticker.requirement.value} reward</p>
                </div>
                <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text)]">
                  {stateLabel}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--panel)]/70 p-4">
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-black uppercase tracking-[0.14em] text-[var(--muted)]">Month</p>
                    <p className="mt-1 font-bold text-[var(--text)]">{monthLabel}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-[0.14em] text-[var(--muted)]">Readiness</p>
                    <p className="mt-1 font-bold text-[var(--text)]">{readiness?.status ? readiness.status.replace(/_/g, ' ') : stateLabel}</p>
                  </div>
                </div>
                {latestProof ? (
                  <>
                    <p className="text-sm font-black text-[var(--text)]">{latestProof.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
                      Earned {latestProof.periodLabel || latestProof.period} with {latestProof.squadName}. {latestProof.verificationLabel}.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-black text-[var(--text)]">{readiness?.status ? readiness.status.replace(/_/g, ' ') : 'Not ready'}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{readiness?.copy || 'Build clean contribution across multiple days.'}</p>
                  </>
                )}
                <p className="mt-3 text-xs font-bold leading-5 text-[var(--muted-strong)]">
                  Awarded for consistent, clean contribution to a top monthly squad.
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: sticker.color }} />
                </div>
              </div>

              {proofs.length > 1 ? (
                <p className="mt-3 text-xs font-bold text-[var(--muted-strong)]">Also earned {proofs.length - 1} earlier month{proofs.length - 1 === 1 ? '' : 's'}.</p>
              ) : null}

              <div className="mt-4 flex gap-2">
                {readiness?.claimable ? (
                  <button onClick={() => onUnlock(sticker.id)} disabled={unlocking === sticker.id} className="flex-1 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-3 py-2 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50">
                    {unlocking === sticker.id ? 'Claiming...' : latestProof ? 'Claim New Month' : 'Claim Reward'}
                  </button>
                ) : isUnlocked ? (
                  <button onClick={() => onToggleEquip(sticker.id)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${isEquipped ? 'bg-[var(--accent)] text-white shadow-md' : 'border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]'}`}>
                    {isEquipped ? 'Showcased' : 'Add to Showcase'}
                  </button>
                ) : (
                  <div className="flex-1 rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Locked</div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatRequirementCopy(req, isUnlocked = false) {
  const prefix = isUnlocked ? {
    xp: 'Reached',
    streak: 'Built',
    total_applications: 'Logged',
    total_rejections: 'Pushed through',
    followers: 'Gained',
    connections: 'Built',
    posts: 'Shared',
    sparks_given: 'Gave',
    post_likes: 'Earned',
    daily_apps: 'Logged',
    skill_count: 'Added',
  } : {
    xp: 'Reach',
    streak: 'Build',
    total_applications: 'Log',
    total_rejections: 'Push through',
    followers: 'Gain',
    connections: 'Build',
    posts: 'Share',
    sparks_given: 'Give',
    post_likes: 'Earn',
    daily_apps: 'Log',
    skill_count: 'Add',
  };

  const labels = {
    xp: `${prefix.xp} ${req.value.toLocaleString()} XP.`,
    streak: `${prefix.streak} a ${req.value} day streak.`,
    total_applications: `${prefix.total_applications} ${req.value.toLocaleString()} applications.`,
    total_rejections: `${prefix.total_rejections} ${req.value.toLocaleString()} rejections.`,
    followers: `${prefix.followers} ${req.value.toLocaleString()} follower${req.value === 1 ? '' : 's'}.`,
    connections: `${prefix.connections} ${req.value.toLocaleString()} connection${req.value === 1 ? '' : 's'}.`,
    night_owl: `${isUnlocked ? 'Logged' : 'Log'} activity between 12 AM and 4 AM.`,
    early_bird: `${isUnlocked ? 'Logged' : 'Log'} activity between 4 AM and 6 AM.`,
    join_before: `${isUnlocked ? 'Joined' : 'Join'} before ${new Date(req.value).getFullYear()}.`,
    squad_goal: `${isUnlocked ? 'Helped your squad hit' : 'Help your squad hit'} a weekly goal.`,
    speed_demon: `${isUnlocked ? 'Logged' : 'Log'} an application within 1 hour of discovery.`,
    weekend_warrior: `${isUnlocked ? 'Logged' : 'Log'} application activity on a weekend.`,
    skill: `${isUnlocked ? 'Added' : 'Add'} ${req.value} as a profile skill.`,
    posts: `${prefix.posts} ${req.value.toLocaleString()} community post${req.value === 1 ? '' : 's'}.`,
    sparks_given: `${prefix.sparks_given} ${req.value.toLocaleString()} sparks to your squad.`,
    post_likes: `${prefix.post_likes} ${req.value.toLocaleString()} likes on a post.`,
    daily_apps: `${prefix.daily_apps} ${req.value.toLocaleString()} applications in one day.`,
    skill_count: `${prefix.skill_count} ${req.value.toLocaleString()} skills to your profile.`,
    streak_no_rejections: `${isUnlocked ? 'Held' : 'Hold'} a ${req.value} day streak without rejections.`,
    hired_after_rejections: `${isUnlocked ? 'Got hired' : 'Get hired'} after ${req.value.toLocaleString()} rejections.`,
    ghost_jobs_found: `${isUnlocked ? 'Identified' : 'Identify'} ${req.value.toLocaleString()} ghost jobs.`,
    hours_active: `${isUnlocked ? 'Stayed' : 'Stay'} active for ${req.value} hours.`,
    squad_contribution: `${isUnlocked ? 'Contributed' : 'Contribute'} 50% of a squad goal.`,
    hired_silent: `${isUnlocked ? 'Got hired' : 'Get hired'} without public posts.`,
    squad_connections: `${isUnlocked ? 'Connected' : 'Connect'} 2 squads.`,
    join_order: `${isUnlocked ? 'Joined' : 'Join'} as an early Aptico user.`,
    xp_rank: `${isUnlocked ? 'Reached' : 'Reach'} the top 1% XP rank.`,
    bug_report: `${isUnlocked ? 'Reported' : 'Report'} a product bug.`,
    repo_contribution: `${isUnlocked ? 'Contributed' : 'Contribute'} code to Aptico.`,
    test_phase: `${isUnlocked ? 'Participated' : 'Participate'} as a ${req.value} tester.`,
    monthly_squad_reward: isUnlocked ? `Earned monthly squad rank #${req.value}.` : 'Build clean contribution across multiple days with proof-backed squad activity.',
  };

  return labels[req.type] || (isUnlocked ? 'Completed a special Aptico achievement.' : 'Complete a special Aptico achievement.');
}

function getStickerMeaning(sticker) {
  const meanings = {
    xp: sticker.requirement.value <= 50
      ? 'The first visible step in your Aptico progress journey.'
      : 'Sustained progress across your job-search journey and long-term consistency in Aptico.',
    streak: 'Consistent effort over time, even when the search takes patience.',
    total_applications: 'Focused job-search activity and steady outreach to opportunities.',
    total_rejections: 'Resilience through difficult outcomes and continued forward movement.',
    followers: 'Your profile has started attracting attention from the community.',
    connections: 'Network growth and stronger access to people, squads, and opportunities.',
    night_owl: 'Extra effort during late hours when you kept momentum alive.',
    early_bird: 'Early discipline and a proactive start to your job-search day.',
    join_before: 'Early belief in Aptico and participation in its founding era.',
    squad_goal: 'Team contribution and shared momentum with your squad.',
    speed_demon: 'Fast action when a relevant opportunity appeared.',
    weekend_warrior: 'Commitment that continued beyond the normal weekday rhythm.',
    skill: `Visible proof that ${sticker.requirement.value} is part of your profile capability.`,
    posts: 'Community presence and willingness to share your journey publicly.',
    sparks_given: 'Support given to others and positive energy inside your squad.',
    post_likes: 'Community impact through posts that resonated with other users.',
    daily_apps: 'A high-intensity application push in a single day.',
    skill_count: 'A broader skill profile that gives your career story more range.',
    streak_no_rejections: 'A stable run of progress without recent rejection setbacks.',
    hired_after_rejections: 'Persistence that carried through rejection and reached an offer.',
    ghost_jobs_found: 'Sharper judgment in spotting low-quality or misleading job posts.',
    hours_active: 'Deep focus time invested into your career progress.',
    squad_contribution: 'Heavy lifting for a shared squad outcome.',
    hired_silent: 'Quiet execution that turned into a real hiring result.',
    squad_connections: 'Bridge-building between different groups in the Aptico network.',
    join_order: 'Early participation before the wider community arrived.',
    xp_rank: 'Exceptional progress compared with the wider Aptico community.',
    bug_report: 'Product care and practical help improving Aptico for everyone.',
    repo_contribution: 'Direct technical contribution to the product itself.',
    test_phase: 'Early product feedback and participation before full release.',
    monthly_squad_reward: 'A verified monthly squad leaderboard finish, backed by quality-weighted activity and reward review.',
  };

  return meanings[sticker.requirement.type] || `${STICKER_CATEGORIES.find((c) => c.id === sticker.category)?.name || 'Aptico'} progress represented as a collectible reward.`;
}

function reqProgress(req, stats) {
  if (req.type === 'monthly_squad_reward') {
    const readiness = getMonthlySquadRewardReadiness(req, stats);
    return [readiness?.claimable ? 1 : 0, 1, readiness || null];
  }

  const map = {
    xp: [stats.xp, req.value], streak: [stats.streak, req.value], total_applications: [stats.totalApplications, req.value],
    total_rejections: [stats.totalRejections, req.value], followers: [stats.followers, req.value], connections: [stats.connections, req.value],
    night_owl: [stats.nightOwl, 1], early_bird: [stats.earlyBird, 1], squad_goal: [stats.squadGoalReached, 1],
    speed_demon: [stats.speedDemon, 1], weekend_warrior: [stats.weekendWarrior, 1],
    posts: [stats.posts, req.value], sparks_given: [stats.sparksGiven, req.value],
    post_likes: [stats.postLikes, req.value], daily_apps: [stats.maxDailyApps, req.value],
    skill_count: [(stats.skills || []).length, req.value],
    streak_no_rejections: [stats.streak, req.value], hired_after_rejections: [stats.totalRejections, req.value],
    ghost_jobs_found: [stats.totalApplications, req.value * 5], hours_active: [stats.xp, req.value * 100],
    squad_contribution: [stats.squadGoalReached, 1], hired_silent: [stats.totalApplications >= 10 && stats.posts === 0 ? 1 : 0, 1],
    squad_connections: [stats.connections >= 20 ? 1 : 0, 1], join_order: [1, 1],
    xp_rank: [stats.xp >= 10000 ? 1 : 0, 1], bug_report: [1, 1], repo_contribution: [1, 1], test_phase: [1, 1],
  };
  if (req.type === 'skill') return (stats.skills || []).includes(req.value) ? [1, 1] : [0, 1];
  if (req.type === 'join_before') return stats.joinDate < new Date(req.value) ? [1, 1] : [0, 1];
  return map[req.type] || [0, req.value];
}

export default function RewardsPage() {
  const [stats, setStats] = useState(null);
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [equippedIds, setEquippedIds] = useState([]);
  const [squadRewardHistory, setSquadRewardHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('milestone');
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast] = useState('');
  const [unlocking, setUnlocking] = useState(null);
  const [detailSticker, setDetailSticker] = useState(null);

  useEffect(() => {
    fetchStickerStats()
      .then((data) => {
        setStats(data.stats);
        setUnlockedIds(data.unlockedStickers || []);
        setEquippedIds(data.equippedStickers || []);
        setSquadRewardHistory(data.squadRewardHistory || []);
      })
      .catch(() => setToast('Failed to load sticker data.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleUnlock(stickerId) {
    setUnlocking(stickerId);
    try {
      const result = await unlockSticker(stickerId);
      setUnlockedIds(result.unlockedStickers || []);
      if (Array.isArray(result.squadRewardHistory)) setSquadRewardHistory(result.squadRewardHistory);
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

  const filteredStickers = useMemo(() => STICKER_REGISTRY.filter((s) => s.category === activeCategory && !isMonthlySquadSticker(s)), [activeCategory]);

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
        <Link
          to="/profile"
          onClick={(e) => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              e.preventDefault();
              window.history.back();
            }
          }}
          className="app-button-secondary flex items-center gap-2 hover:bg-[var(--panel-soft)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
      }
    >
      {confetti && <ConfettiOverlay onDone={() => setConfetti(false)} />}

      {toast ? (
        <div className="fixed inset-x-0 bottom-5 z-[260] flex justify-center px-4 pointer-events-none sm:bottom-6">
          <div
            role="status"
            aria-live="polite"
            className="max-w-[min(100%,32rem)] rounded-xl border border-[var(--accent)]/30 bg-[var(--panel)] px-4 py-3 text-center text-sm font-bold text-[var(--accent-strong)] shadow-2xl shadow-black/15 backdrop-blur-xl animate-fade-in-up"
          >
            {toast}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl space-y-8">

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
        <SquadRewardsSection
          stats={stats}
          unlockedIds={unlockedIds}
          equippedIds={equippedIds}
          squadRewardHistory={squadRewardHistory}
          onUnlock={handleUnlock}
          onToggleEquip={handleToggleEquip}
          unlocking={unlocking}
        />

        {equippedIds.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/70 backdrop-blur-xl p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] mb-4">Your Showcase (visible on profile)</p>
            <div className="flex flex-wrap gap-4">
              {equippedIds.map((id) => {
                const s = getStickerById(id);
                if (!s) return null;
                const rc = RARITY_CONFIG[s.rarity];
                return (
                  <div key={id} className={`relative flex flex-col items-center gap-2 rounded-2xl border ${rc.border} ${rc.bg} ${rc.glow} p-4 min-w-[90px] transition-all hover:scale-105 ${s.rarity === 'legendary' ? 'sticker-holo' : ''}`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleEquip(id);
                      }}
                      aria-label={`Remove ${s.name} from showcase`}
                      title={`Remove ${s.name}`}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--muted-strong)] shadow-md transition-all hover:border-red-400/60 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400/40"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
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
            const [current, target, readiness] = stats ? reqProgress(sticker.requirement, stats) : [0, 1, null];
            const pct = sticker.requirement.type === 'monthly_squad_reward'
              ? Number(readiness?.progress || 0)
              : Math.min(100, Math.round((current / target) * 100));

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
                      {isSecret ? 'Hidden achievement - keep exploring!' : sticker.description}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {!isUnlocked && !isSecret && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted-strong)] mb-1">
                      <span>{readiness?.copy || reqLabel(sticker.requirement)}</span>
                      <span>{readiness?.status ? readiness.status.replace(/_/g, ' ') : `${current}/${target}`}</span>
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
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetailSticker(null)} className="absolute top-4 right-4 text-[var(--muted-strong)] hover:text-[var(--text)] transition-colors bg-[var(--panel-soft)] rounded-full p-1.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {(() => {
              const s = detailSticker;
              const rc = RARITY_CONFIG[s.rarity];
              const isUnlocked = unlockedIds.includes(s.id);
              const isEquipped = equippedIds.includes(s.id);
              const isSecret = s.category === 'secret' && !isUnlocked;
              const [current, target, readiness] = stats ? reqProgress(s.requirement, stats) : [0, 1, null];
              const pct = s.requirement.type === 'monthly_squad_reward'
                ? Number(readiness?.progress || 0)
                : Math.min(100, Math.round((current / target) * 100));
              const categoryName = STICKER_CATEGORIES.find((c) => c.id === s.category)?.name;
              const achievementLabel = isUnlocked ? 'Earned for' : 'How to unlock';
              const achievementCopy = isSecret ? 'Secret achievement. Keep exploring Aptico to discover this reward.' : formatRequirementCopy(s.requirement, isUnlocked);
              const meaningCopy = isSecret ? 'This reward stays hidden until you unlock it, so the exact value it represents is part of the discovery.' : getStickerMeaning(s);
              const squadProofs = isMonthlySquadSticker(s) ? getSquadProofForSticker(squadRewardHistory, s.id) : [];

              return (
                <>
                  <div className="flex justify-center mb-6">
                    <div className={`flex h-24 w-24 items-center justify-center rounded-2xl border-2 ${rc.border} ${rc.bg} ${rc.glow} ${s.rarity === 'legendary' && isUnlocked ? 'sticker-holo' : ''}`}>
                      {isSecret ? <span className="text-5xl">❓</span> : <StickerIcon sticker={s} size={96} />}
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-[var(--text)] text-center">{isSecret ? '???' : s.name}</h2>
                  <span className={`block text-center mt-2 text-xs font-bold uppercase tracking-wider ${rc.textColor}`}>{rc.label} &middot; {categoryName}</span>
                  <p className="mt-4 text-sm text-[var(--muted-strong)] text-center leading-relaxed">{isSecret ? 'This is a secret sticker. Keep using Aptico and you might discover it!' : s.description}</p>

                  <div className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/45 p-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">{achievementLabel}</p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--text)]">{achievementCopy}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Represents</p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--text)]">{meaningCopy}</p>
                    </div>

                    {squadProofs.length ? (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Verified squad proof</p>
                        <div className="mt-2 space-y-2">
                          {squadProofs.slice(0, 3).map((proof) => (
                            <div key={proof.rewardId || `${proof.period}-${proof.rank}`} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
                              <p className="text-sm font-black text-[var(--text)]">{proof.title} · Rank #{proof.rank}</p>
                              <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">Earned {proof.periodLabel || proof.period} with {proof.squadName}. {proof.verificationLabel}.</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {!isUnlocked && !isSecret && (
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[var(--muted-strong)]">
                          <span className="uppercase tracking-[0.14em]">Progress</span>
                          <span>{readiness?.status ? readiness.status.replace(/_/g, ' ') : `${current.toLocaleString()}/${target.toLocaleString()} (${pct}%)`}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                        <p className="mt-2 text-xs font-medium text-[var(--muted-strong)]">{readiness?.copy || reqLabel(s.requirement)}</p>
                      </div>
                    )}
                  </div>

                  {isUnlocked && (
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        Unlocked
                      </span>
                      {isEquipped && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-1.5 text-xs font-bold text-[var(--accent-strong)]">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.3 7.2 17.9l.9-5.4-3.9-3.8 5.4-.8L12 3z" /></svg>
                          Showcased
                        </span>
                      )}
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
