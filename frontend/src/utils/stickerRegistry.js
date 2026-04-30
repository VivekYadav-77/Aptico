/**
 * ═══════════════════════════════════════════════════════
 *  APTICO STICKER REGISTRY — Single Source of Truth
 * ═══════════════════════════════════════════════════════
 *
 *  Each sticker has:
 *    id          — Unique key stored in DB
 *    name        — Display name
 *    description — Short meaning / how it was earned
 *    category    — 'milestone' | 'resilience' | 'social' | 'mastery' | 'engagement' | 'secret' | 'event'
 *    rarity      — 'common' | 'rare' | 'epic' | 'legendary'
 *    visualId    — Mapping to SVG template in StickerVisual.jsx
 *    color       — Primary accent colour for the sticker
 *    requirement — { type, value } describing unlock condition
 *    evolvesFrom — id of the sticker this one replaces (or null)
 *    tier        — Evolution tier (1, 2, 3...)
 */

export const RARITY_CONFIG = {
  common: {
    label: 'Common', border: 'border-slate-400/40', bg: 'bg-slate-500/5', glow: '',
    textColor: 'text-slate-500', badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  },
  rare: {
    label: 'Rare', border: 'border-sky-400/50', bg: 'bg-sky-500/5', glow: 'shadow-[0_0_16px_rgba(56,189,248,0.25)]',
    textColor: 'text-sky-500', badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  epic: {
    label: 'Epic', border: 'border-amber-400/60', bg: 'bg-amber-500/5', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    textColor: 'text-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  legendary: {
    label: 'Legendary', border: 'border-fuchsia-400/60', bg: 'bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-cyan-500/10', glow: 'shadow-[0_0_28px_rgba(192,38,211,0.35)]',
    textColor: 'text-fuchsia-500', badgeColor: 'bg-gradient-to-r from-fuchsia-500/15 to-violet-500/15 text-fuchsia-600 dark:text-fuchsia-400',
  },
};

export const MAX_EQUIPPED_STICKERS = 4;

export const STICKER_REGISTRY = [
  /* ── MILESTONE: XP Progression (25 Tiers) ── */
  { id: 'xp_50', name: 'Sprout', description: 'Just starting.', category: 'milestone', rarity: 'common', visualId: 'sprout', subVariant: 'minimal', color: '#10b981', requirement: { type: 'xp', value: 50 }, evolvesFrom: null, tier: 1 },
  { id: 'xp_100', name: 'Seedling', description: 'Growing fast.', category: 'milestone', rarity: 'common', visualId: 'sprout', subVariant: 'dual', color: '#10b981', requirement: { type: 'xp', value: 100 }, evolvesFrom: 'xp_50', tier: 2 },
  { id: 'xp_250', name: 'Sapling', description: 'Taking root.', category: 'milestone', rarity: 'common', visualId: 'sprout', subVariant: 'triple', color: '#10b981', requirement: { type: 'xp', value: 250 }, evolvesFrom: 'xp_100', tier: 3 },
  { id: 'xp_500', name: 'Observer', description: 'Watching closely.', category: 'milestone', rarity: 'common', visualId: 'scout', subVariant: 'basic', color: '#3b82f6', requirement: { type: 'xp', value: 500 }, evolvesFrom: 'xp_250', tier: 1 },
  { id: 'xp_1000', name: 'Scout', description: 'Mapping territory.', category: 'milestone', rarity: 'rare', visualId: 'scout', subVariant: 'cross', color: '#3b82f6', requirement: { type: 'xp', value: 1000 }, evolvesFrom: 'xp_500', tier: 2 },
  { id: 'xp_2500', name: 'Navigator', description: 'Clear direction.', category: 'milestone', rarity: 'rare', visualId: 'scout', subVariant: 'radar', color: '#3b82f6', requirement: { type: 'xp', value: 2500 }, evolvesFrom: 'xp_1000', tier: 3 },
  { id: 'xp_5000', name: 'Elite Hunter', description: 'The best leads.', category: 'milestone', rarity: 'epic', visualId: 'elite_hunter', subVariant: 'blade', color: '#ef4444', requirement: { type: 'xp', value: 5000 }, evolvesFrom: 'xp_2500', tier: 1 },
  { id: 'xp_7500', name: 'Apex Predator', description: 'Top of the chain.', category: 'milestone', rarity: 'epic', visualId: 'elite_hunter', subVariant: 'spiked', color: '#ef4444', requirement: { type: 'xp', value: 7500 }, evolvesFrom: 'xp_5000', tier: 2 },
  { id: 'xp_10000', name: 'Crown Bearer', description: 'True mastery.', category: 'milestone', rarity: 'legendary', visualId: 'apex', subVariant: 'crown', color: '#f59e0b', requirement: { type: 'xp', value: 10000 }, evolvesFrom: 'xp_7500', tier: 1 },
  { id: 'xp_15000', name: 'Resilient King', description: 'Unshakable.', category: 'milestone', rarity: 'legendary', visualId: 'apex', subVariant: 'throne', color: '#f59e0b', requirement: { type: 'xp', value: 15000 }, evolvesFrom: 'xp_10000', tier: 2 },
  { id: 'xp_20000', name: 'Overlord', description: 'Total control.', category: 'milestone', rarity: 'legendary', visualId: 'apex', subVariant: 'scepter', color: '#f59e0b', requirement: { type: 'xp', value: 20000 }, evolvesFrom: 'xp_15000', tier: 3 },
  { id: 'xp_30000', name: 'Nebula', description: 'Stellar presence.', category: 'milestone', rarity: 'legendary', visualId: 'nebula', subVariant: 'dust', color: '#8b5cf6', requirement: { type: 'xp', value: 30000 }, evolvesFrom: 'xp_20000', tier: 1 },
  { id: 'xp_40000', name: 'Supernova', description: 'Explosive growth.', category: 'milestone', rarity: 'legendary', visualId: 'nebula', subVariant: 'blast', color: '#8b5cf6', requirement: { type: 'xp', value: 40000 }, evolvesFrom: 'xp_30000', tier: 2 },
  { id: 'xp_50000', name: 'Galactic', description: 'Systems level.', category: 'milestone', rarity: 'legendary', visualId: 'nebula', subVariant: 'spiral', color: '#8b5cf6', requirement: { type: 'xp', value: 50000 }, evolvesFrom: 'xp_40000', tier: 3 },
  { id: 'xp_60000', name: 'Celestial', description: 'Beyond stars.', category: 'milestone', rarity: 'legendary', visualId: 'nebula', subVariant: 'orbit', color: '#8b5cf6', requirement: { type: 'xp', value: 60000 }, evolvesFrom: 'xp_50000', tier: 4 },
  { id: 'xp_75000', name: 'Demi-God', description: 'Near infinite.', category: 'milestone', rarity: 'legendary', visualId: 'deity', subVariant: 'aura', color: '#f43f5e', requirement: { type: 'xp', value: 75000 }, evolvesFrom: 'xp_60000', tier: 1 },
  { id: 'xp_90000', name: 'Ascended', description: 'Pure energy.', category: 'milestone', rarity: 'legendary', visualId: 'deity', subVariant: 'light', color: '#f43f5e', requirement: { type: 'xp', value: 90000 }, evolvesFrom: 'xp_75000', tier: 2 },
  { id: 'xp_100000', name: 'The Oracle', description: 'Knows all paths.', category: 'milestone', rarity: 'legendary', visualId: 'deity', subVariant: 'eye', color: '#f43f5e', requirement: { type: 'xp', value: 100000 }, evolvesFrom: 'xp_90000', tier: 3 },
  { id: 'xp_150000', name: 'Ethereal', description: 'Phasing through reality.', category: 'milestone', rarity: 'legendary', visualId: 'deity', subVariant: 'ghost', color: '#f43f5e', requirement: { type: 'xp', value: 150000 }, evolvesFrom: 'xp_100000', tier: 4 },
  { id: 'xp_200000', name: 'Cosmic Entity', description: 'The universe itself.', category: 'milestone', rarity: 'legendary', visualId: 'deity', subVariant: 'void', color: '#f43f5e', requirement: { type: 'xp', value: 200000 }, evolvesFrom: 'xp_150000', tier: 5 },
  { id: 'xp_250000', name: 'Hall of Fame', description: 'Eternal legacy.', category: 'milestone', rarity: 'legendary', visualId: 'trophy', subVariant: 'bronze', color: '#fbbf24', requirement: { type: 'xp', value: 250000 }, evolvesFrom: 'xp_200000', tier: 1 },
  { id: 'xp_350000', name: 'Grandmaster', description: 'Absolute peak.', category: 'milestone', rarity: 'legendary', visualId: 'trophy', subVariant: 'silver', color: '#fbbf24', requirement: { type: 'xp', value: 350000 }, evolvesFrom: 'xp_250000', tier: 2 },
  { id: 'xp_500000', name: 'Legendary One', description: 'Transcendent.', category: 'milestone', rarity: 'legendary', visualId: 'trophy', subVariant: 'gold', color: '#fbbf24', requirement: { type: 'xp', value: 500000 }, evolvesFrom: 'xp_350000', tier: 3 },
  { id: 'xp_750000', name: 'Mythic', description: 'Beyond history.', category: 'milestone', rarity: 'legendary', visualId: 'trophy', subVariant: 'platinum', color: '#fbbf24', requirement: { type: 'xp', value: 750000 }, evolvesFrom: 'xp_500000', tier: 4 },
  { id: 'xp_1000000', name: 'The Singularity', description: 'End of the beginning.', category: 'milestone', rarity: 'legendary', visualId: 'trophy', subVariant: 'diamond', color: '#fbbf24', requirement: { type: 'xp', value: 1000000 }, evolvesFrom: 'xp_750000', tier: 5 },

  /* ── RESILIENCE: Streaks (20 Tiers) ── */
  { id: 'streak_3', name: 'Ignition', description: 'The fire is lit.', category: 'resilience', rarity: 'common', visualId: 'fire_low', subVariant: 'spark', color: '#f97316', requirement: { type: 'streak', value: 3 }, evolvesFrom: null, tier: 1 },
  { id: 'streak_5', name: 'Spark', description: 'Glowing brighter.', category: 'resilience', rarity: 'common', visualId: 'fire_low', subVariant: 'flame', color: '#f97316', requirement: { type: 'streak', value: 5 }, evolvesFrom: 'streak_3', tier: 2 },
  { id: 'streak_7', name: 'Week Strong', description: 'A full week.', category: 'resilience', rarity: 'common', visualId: 'fire_low', subVariant: 'torch', color: '#f97316', requirement: { type: 'streak', value: 7 }, evolvesFrom: 'streak_5', tier: 3 },
  { id: 'streak_10', name: 'Steady Pulse', description: 'Consistency is rhythm.', category: 'resilience', rarity: 'rare', visualId: 'pulse', subVariant: 'slow', color: '#0ea5e9', requirement: { type: 'streak', value: 10 }, evolvesFrom: 'streak_7', tier: 1 },
  { id: 'streak_14', name: 'Fortnight', description: 'Two weeks deep.', category: 'resilience', rarity: 'rare', visualId: 'pulse', subVariant: 'steady', color: '#0ea5e9', requirement: { type: 'streak', value: 14 }, evolvesFrom: 'streak_10', tier: 2 },
  { id: 'streak_21', name: 'Habit Former', description: 'It is a routine now.', category: 'resilience', rarity: 'rare', visualId: 'pulse', subVariant: 'fast', color: '#0ea5e9', requirement: { type: 'streak', value: 21 }, evolvesFrom: 'streak_14', tier: 3 },
  { id: 'streak_30', name: 'Unstoppable Flow', description: 'A force of nature.', category: 'resilience', rarity: 'epic', visualId: 'flow', subVariant: 'river', color: '#8b5cf6', requirement: { type: 'streak', value: 30 }, evolvesFrom: 'streak_21', tier: 1 },
  { id: 'streak_45', name: 'Half-90', description: 'Midway to a quarter year.', category: 'resilience', rarity: 'epic', visualId: 'flow', subVariant: 'stream', color: '#8b5cf6', requirement: { type: 'streak', value: 45 }, evolvesFrom: 'streak_30', tier: 2 },
  { id: 'streak_60', name: 'Double Month', description: 'Two months solid.', category: 'resilience', rarity: 'epic', visualId: 'flow', subVariant: 'flood', color: '#8b5cf6', requirement: { type: 'streak', value: 60 }, evolvesFrom: 'streak_45', tier: 3 },
  { id: 'streak_75', name: 'Rhythm Master', description: 'Never missing a beat.', category: 'resilience', rarity: 'epic', visualId: 'flow', subVariant: 'wave', color: '#8b5cf6', requirement: { type: 'streak', value: 75 }, evolvesFrom: 'streak_60', tier: 4 },
  { id: 'streak_90', name: 'Quarter Cycle', description: 'A full quarter year.', category: 'resilience', rarity: 'epic', visualId: 'flow', subVariant: 'tide', color: '#8b5cf6', requirement: { type: 'streak', value: 90 }, evolvesFrom: 'streak_75', tier: 5 },
  { id: 'streak_100', name: 'Century Guard', description: 'A monument of grit.', category: 'resilience', rarity: 'legendary', visualId: 'century', subVariant: 'obelisk', color: '#eab308', requirement: { type: 'streak', value: 100 }, evolvesFrom: 'streak_90', tier: 1 },
  { id: 'streak_120', name: 'Iron Will', description: 'Nothing stops you.', category: 'resilience', rarity: 'legendary', visualId: 'century', subVariant: 'pillar', color: '#eab308', requirement: { type: 'streak', value: 120 }, evolvesFrom: 'streak_100', tier: 2 },
  { id: 'streak_150', name: 'Obsidian', description: 'Hardened by time.', category: 'resilience', rarity: 'legendary', visualId: 'century', subVariant: 'monolith', color: '#eab308', requirement: { type: 'streak', value: 150 }, evolvesFrom: 'streak_120', tier: 3 },
  { id: 'streak_180', name: 'Half Solar', description: 'Half a year.', category: 'resilience', rarity: 'legendary', visualId: 'century', subVariant: 'pyramid', color: '#eab308', requirement: { type: 'streak', value: 180 }, evolvesFrom: 'streak_150', tier: 4 },
  { id: 'streak_250', name: 'Eternal Flame', description: 'Burning forever.', category: 'resilience', rarity: 'legendary', visualId: 'solar', subVariant: 'flare', color: '#ec4899', requirement: { type: 'streak', value: 250 }, evolvesFrom: 'streak_180', tier: 1 },
  { id: 'streak_300', name: 'Apex Predator', description: 'Dominating the calendar.', category: 'resilience', rarity: 'legendary', visualId: 'solar', subVariant: 'corona', color: '#ec4899', requirement: { type: 'streak', value: 300 }, evolvesFrom: 'streak_250', tier: 2 },
  { id: 'streak_365', name: 'Solar Cycle', description: 'A full year.', category: 'resilience', rarity: 'legendary', visualId: 'solar', subVariant: 'sphere', color: '#ec4899', requirement: { type: 'streak', value: 365 }, evolvesFrom: 'streak_300', tier: 3 },
  { id: 'streak_500', name: 'Millennial', description: 'Half a thousand days.', category: 'resilience', rarity: 'legendary', visualId: 'solar', subVariant: 'ray', color: '#ec4899', requirement: { type: 'streak', value: 500 }, evolvesFrom: 'streak_365', tier: 4 },
  { id: 'streak_730', name: 'Binary Star', description: 'Two full years.', category: 'resilience', rarity: 'legendary', visualId: 'solar', subVariant: 'twin', color: '#ec4899', requirement: { type: 'streak', value: 730 }, evolvesFrom: 'streak_500', tier: 5 },
  { id: 'streak_1000', name: 'Eternal', description: 'Time is your servant.', category: 'resilience', rarity: 'legendary', visualId: 'solar', subVariant: 'nova', color: '#ec4899', requirement: { type: 'streak', value: 1000 }, evolvesFrom: 'streak_730', tier: 6 },

  /* ── RESILIENCE: Applications (20 Tiers) ── */
  { id: 'apps_25', name: 'Paper Plane', description: '25 apps launched.', category: 'resilience', rarity: 'common', visualId: 'plane', subVariant: 'basic', color: '#10b981', requirement: { type: 'total_applications', value: 25 }, evolvesFrom: null, tier: 1 },
  { id: 'apps_50', name: 'Glider', description: 'Staying aloft.', category: 'resilience', rarity: 'common', visualId: 'plane', subVariant: 'wide', color: '#10b981', requirement: { type: 'total_applications', value: 50 }, evolvesFrom: 'apps_25', tier: 2 },
  { id: 'apps_75', name: 'Propeller', description: 'Powered flight.', category: 'resilience', rarity: 'common', visualId: 'plane', subVariant: 'heavy', color: '#10b981', requirement: { type: 'total_applications', value: 75 }, evolvesFrom: 'apps_50', tier: 3 },
  { id: 'apps_100', name: 'Resumé Rain', description: '100 apps. Market cover.', category: 'resilience', rarity: 'rare', visualId: 'rain', subVariant: 'drizzle', color: '#10b981', requirement: { type: 'total_applications', value: 100 }, evolvesFrom: 'apps_75', tier: 1 },
  { id: 'apps_150', name: 'Storm', description: 'Heavy volume.', category: 'resilience', rarity: 'rare', visualId: 'rain', subVariant: 'downpour', color: '#10b981', requirement: { type: 'total_applications', value: 150 }, evolvesFrom: 'apps_100', tier: 2 },
  { id: 'apps_200', name: 'Monsoon', description: 'Relentless flood.', category: 'resilience', rarity: 'rare', visualId: 'rain', subVariant: 'squall', color: '#10b981', requirement: { type: 'total_applications', value: 200 }, evolvesFrom: 'apps_150', tier: 3 },
  { id: 'apps_250', name: 'Jet Stream', description: 'High speed output.', category: 'resilience', rarity: 'rare', visualId: 'rain', subVariant: 'vortex', color: '#10b981', requirement: { type: 'total_applications', value: 250 }, evolvesFrom: 'apps_200', tier: 4 },
  { id: 'apps_300', name: 'Cloudburst', description: 'Sudden intensity.', category: 'resilience', rarity: 'rare', visualId: 'rain', subVariant: 'surge', color: '#10b981', requirement: { type: 'total_applications', value: 300 }, evolvesFrom: 'apps_250', tier: 5 },
  { id: 'apps_400', name: 'Nexus', description: 'Centralizing opportunities.', category: 'resilience', rarity: 'rare', visualId: 'rain', subVariant: 'core', color: '#10b981', requirement: { type: 'total_applications', value: 400 }, evolvesFrom: 'apps_300', tier: 6 },
  { id: 'apps_500', name: 'Opportunity Hub', description: 'The center of activity.', category: 'resilience', rarity: 'epic', visualId: 'hub', subVariant: 'local', color: '#10b981', requirement: { type: 'total_applications', value: 500 }, evolvesFrom: 'apps_400', tier: 1 },
  { id: 'apps_600', name: 'Switchboard', description: 'Routing every lead.', category: 'resilience', rarity: 'epic', visualId: 'hub', subVariant: 'regional', color: '#10b981', requirement: { type: 'total_applications', value: 600 }, evolvesFrom: 'apps_500', tier: 2 },
  { id: 'apps_750', name: 'Mainframe', description: 'Processing volume.', category: 'resilience', rarity: 'epic', visualId: 'hub', subVariant: 'global', color: '#10b981', requirement: { type: 'total_applications', value: 750 }, evolvesFrom: 'apps_600', tier: 3 },
  { id: 'apps_900', name: 'Superhub', description: 'Ultimate connectivity.', category: 'resilience', rarity: 'epic', visualId: 'hub', subVariant: 'cosmic', color: '#10b981', requirement: { type: 'total_applications', value: 900 }, evolvesFrom: 'apps_750', tier: 4 },
  { id: 'apps_1000', name: 'Beacon', description: 'A guiding light.', category: 'resilience', rarity: 'legendary', visualId: 'broadcast', subVariant: 'tower', color: '#10b981', requirement: { type: 'total_applications', value: 1000 }, evolvesFrom: 'apps_900', tier: 1 },
  { id: 'apps_1250', name: 'Signal Boost', description: 'Amplify your reach.', category: 'resilience', rarity: 'legendary', visualId: 'broadcast', subVariant: 'dish', color: '#10b981', requirement: { type: 'total_applications', value: 1250 }, evolvesFrom: 'apps_1000', tier: 2 },
  { id: 'apps_1500', name: 'Radio Tower', description: 'Broadcasting success.', category: 'resilience', rarity: 'legendary', visualId: 'broadcast', subVariant: 'mast', color: '#10b981', requirement: { type: 'total_applications', value: 1500 }, evolvesFrom: 'apps_1250', tier: 3 },
  { id: 'apps_2000', name: 'Satellite', description: 'Global coverage.', category: 'resilience', rarity: 'legendary', visualId: 'broadcast', subVariant: 'array', color: '#10b981', requirement: { type: 'total_applications', value: 2000 }, evolvesFrom: 'apps_1500', tier: 4 },
  { id: 'apps_3000', name: 'Interstellar', description: 'Out of this world.', category: 'resilience', rarity: 'legendary', visualId: 'broadcast', subVariant: 'pulse', color: '#10b981', requirement: { type: 'total_applications', value: 3000 }, evolvesFrom: 'apps_2000', tier: 5 },
  { id: 'apps_5000', name: 'Void Walker', description: 'The market is yours.', category: 'resilience', rarity: 'legendary', visualId: 'nebula', subVariant: 'deep', color: '#10b981', requirement: { type: 'total_applications', value: 5000 }, evolvesFrom: 'apps_3000', tier: 1 },
  { id: 'apps_10000', name: 'The Architect', description: 'Creating the market.', category: 'resilience', rarity: 'legendary', visualId: 'deity', subVariant: 'grand', color: '#10b981', requirement: { type: 'total_applications', value: 10000 }, evolvesFrom: 'apps_5000', tier: 1 },

  /* ── RESILIENCE: Rejections (15 Tiers) ── */
  { id: 'rejections_10', name: 'Scuffed', description: 'First marks.', category: 'resilience', rarity: 'common', visualId: 'shield_base', color: '#64748b', requirement: { type: 'total_rejections', value: 10 }, evolvesFrom: null, tier: 1 },
  { id: 'rejections_20', name: 'Dented', description: 'Battle scars.', category: 'resilience', rarity: 'common', visualId: 'shield_base', color: '#64748b', requirement: { type: 'total_rejections', value: 20 }, evolvesFrom: 'rejections_10', tier: 2 },
  { id: 'rejections_30', name: 'Scratched', description: 'Still standing.', category: 'resilience', rarity: 'common', visualId: 'shield_base', color: '#64748b', requirement: { type: 'total_rejections', value: 30 }, evolvesFrom: 'rejections_20', tier: 3 },
  { id: 'rejections_50', name: 'Iron Skin', description: 'Feeling nothing.', category: 'resilience', rarity: 'rare', visualId: 'shield_iron', color: '#94a3b8', requirement: { type: 'total_rejections', value: 50 }, evolvesFrom: 'rejections_30', tier: 1 },
  { id: 'rejections_75', name: 'Hardened', description: 'Solid protection.', category: 'resilience', rarity: 'rare', visualId: 'shield_iron', color: '#94a3b8', requirement: { type: 'total_rejections', value: 75 }, evolvesFrom: 'rejections_50', tier: 2 },
  { id: 'rejections_100', name: 'Reinforced', description: 'Double layer.', category: 'resilience', rarity: 'rare', visualId: 'shield_iron', color: '#94a3b8', requirement: { type: 'total_rejections', value: 100 }, evolvesFrom: 'rejections_75', tier: 3 },
  { id: 'rejections_125', name: 'Steel Core', description: 'Unbreakable center.', category: 'resilience', rarity: 'rare', visualId: 'shield_iron', color: '#94a3b8', requirement: { type: 'total_rejections', value: 125 }, evolvesFrom: 'rejections_100', tier: 4 },
  { id: 'rejections_150', name: 'Titanium', description: 'Light but strong.', category: 'resilience', rarity: 'epic', visualId: 'shield_titanium', color: '#cbd5e1', requirement: { type: 'total_rejections', value: 150 }, evolvesFrom: 'rejections_125', tier: 1 },
  { id: 'rejections_200', name: 'Unshakable', description: 'A wall of grit.', category: 'resilience', rarity: 'epic', visualId: 'shield_titanium', color: '#cbd5e1', requirement: { type: 'total_rejections', value: 200 }, evolvesFrom: 'rejections_150', tier: 2 },
  { id: 'rejections_300', name: 'Guardian', description: 'Protecting the dream.', category: 'resilience', rarity: 'epic', visualId: 'shield_titanium', color: '#cbd5e1', requirement: { type: 'total_rejections', value: 300 }, evolvesFrom: 'rejections_200', tier: 3 },
  { id: 'rejections_500', name: 'Immortal', description: 'Time is irrelevant.', category: 'resilience', rarity: 'legendary', visualId: 'phoenix', color: '#f43f5e', requirement: { type: 'total_rejections', value: 500 }, evolvesFrom: 'rejections_300', tier: 1 },
  { id: 'rejections_750', name: 'Eternal Rebirth', description: 'Every end is a start.', category: 'resilience', rarity: 'legendary', visualId: 'phoenix', color: '#f43f5e', requirement: { type: 'total_rejections', value: 750 }, evolvesFrom: 'rejections_500', tier: 2 },
  { id: 'rejections_1000', name: 'God of Rejection', description: 'Turning "no" into "yes".', category: 'resilience', rarity: 'legendary', visualId: 'phoenix', color: '#f43f5e', requirement: { type: 'total_rejections', value: 1000 }, evolvesFrom: 'rejections_750', tier: 3 },
  { id: 'rejections_1500', name: 'Obsidian Guard', description: 'Blackened fire.', category: 'resilience', rarity: 'legendary', visualId: 'phoenix', color: '#f43f5e', requirement: { type: 'total_rejections', value: 1500 }, evolvesFrom: 'rejections_1000', tier: 4 },
  { id: 'rejections_2000', name: 'The Martyr', description: 'Sacrifice for success.', category: 'resilience', rarity: 'legendary', visualId: 'phoenix', color: '#f43f5e', requirement: { type: 'total_rejections', value: 2000 }, evolvesFrom: 'rejections_1500', tier: 5 },

  /* ── SOCIAL: Followers & Connections (30 Tiers) ── */
  { id: 'social_followers_1', name: 'First Echo', description: 'Someone is listening.', category: 'social', rarity: 'common', visualId: 'signal', subVariant: 'echo', color: '#0ea5e9', requirement: { type: 'followers', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'social_followers_5', name: 'Audience', description: 'A small group.', category: 'social', rarity: 'common', visualId: 'signal', subVariant: 'group', color: '#0ea5e9', requirement: { type: 'followers', value: 5 }, evolvesFrom: 'social_followers_1', tier: 2 },
  { id: 'social_followers_10', name: 'Signal', description: 'Reaching out.', category: 'social', rarity: 'common', visualId: 'signal', subVariant: 'pulse', color: '#0ea5e9', requirement: { type: 'followers', value: 10 }, evolvesFrom: 'social_followers_5', tier: 3 },
  { id: 'social_followers_25', name: 'Broadcast', description: 'Loud and clear.', category: 'social', rarity: 'rare', visualId: 'broadcast', subVariant: 'dish', color: '#0ea5e9', requirement: { type: 'followers', value: 25 }, evolvesFrom: 'social_followers_10', tier: 1 },
  { id: 'social_followers_50', name: 'Beacon', description: 'Visible to all.', category: 'social', rarity: 'rare', visualId: 'beacon', subVariant: 'tower', color: '#0ea5e9', requirement: { type: 'followers', value: 50 }, evolvesFrom: 'social_followers_25', tier: 1 },
  { id: 'social_followers_75', name: 'Searchlight', description: 'Cutting through.', category: 'social', rarity: 'rare', visualId: 'beacon', subVariant: 'beam', color: '#0ea5e9', requirement: { type: 'followers', value: 75 }, evolvesFrom: 'social_followers_50', tier: 2 },
  { id: 'social_followers_100', name: 'Network Node', description: 'Connected.', category: 'social', rarity: 'epic', visualId: 'nexus', subVariant: 'node', color: '#0ea5e9', requirement: { type: 'followers', value: 100 }, evolvesFrom: 'social_followers_75', tier: 1 },
  { id: 'social_followers_150', name: 'Hub', description: 'A center of talk.', category: 'social', rarity: 'epic', visualId: 'nexus', subVariant: 'hub', color: '#0ea5e9', requirement: { type: 'followers', value: 150 }, evolvesFrom: 'social_followers_100', tier: 2 },
  { id: 'social_followers_250', name: 'Influencer', description: 'Shaping opinions.', category: 'social', rarity: 'epic', visualId: 'nexus', subVariant: 'star', color: '#0ea5e9', requirement: { type: 'followers', value: 250 }, evolvesFrom: 'social_followers_150', tier: 3 },
  { id: 'social_followers_400', name: 'Trendsetter', description: 'Leading the way.', category: 'social', rarity: 'epic', visualId: 'nexus', subVariant: 'flow', color: '#0ea5e9', requirement: { type: 'followers', value: 400 }, evolvesFrom: 'social_followers_250', tier: 4 },
  { id: 'social_followers_500', name: 'Community Lead', description: 'A leader.', category: 'social', rarity: 'legendary', visualId: 'weaver', subVariant: 'web', color: '#0ea5e9', requirement: { type: 'followers', value: 500 }, evolvesFrom: 'social_followers_400', tier: 1 },
  { id: 'social_followers_750', name: 'Ambassador', description: 'Representing Aptico.', category: 'social', rarity: 'legendary', visualId: 'weaver', subVariant: 'silk', color: '#0ea5e9', requirement: { type: 'followers', value: 750 }, evolvesFrom: 'social_followers_500', tier: 2 },
  { id: 'social_followers_1000', name: 'Icon', description: 'A legend in the feed.', category: 'social', rarity: 'legendary', visualId: 'weaver', subVariant: 'mesh', color: '#0ea5e9', requirement: { type: 'followers', value: 1000 }, evolvesFrom: 'social_followers_750', tier: 3 },
  { id: 'social_followers_2500', name: 'Celebrity', description: 'Everyone knows.', category: 'social', rarity: 'legendary', visualId: 'weaver', subVariant: 'net', color: '#0ea5e9', requirement: { type: 'followers', value: 2500 }, evolvesFrom: 'social_followers_1000', tier: 4 },
  { id: 'social_followers_5000', name: 'The Voice', description: 'Universal reach.', category: 'social', rarity: 'legendary', visualId: 'weaver', subVariant: 'grid', color: '#0ea5e9', requirement: { type: 'followers', value: 5000 }, evolvesFrom: 'social_followers_2500', tier: 5 },
  { id: 'social_connections_10', name: 'Handshake', description: 'First 10 peers.', category: 'social', rarity: 'common', visualId: 'synergy', subVariant: 'link', color: '#0ea5e9', requirement: { type: 'connections', value: 10 }, evolvesFrom: null, tier: 1 },
  { id: 'social_connections_25', name: 'Collaborator', description: 'Working together.', category: 'social', rarity: 'common', visualId: 'synergy', subVariant: 'dual', color: '#0ea5e9', requirement: { type: 'connections', value: 25 }, evolvesFrom: 'social_connections_10', tier: 2 },
  { id: 'social_connections_50', name: 'Synergy Node', description: 'Power of collective.', category: 'social', rarity: 'epic', visualId: 'synergy', subVariant: 'triple', color: '#0ea5e9', requirement: { type: 'connections', value: 50 }, evolvesFrom: 'social_connections_25', tier: 3 },
  { id: 'social_connections_75', name: 'Active Link', description: 'Staying connected.', category: 'social', rarity: 'epic', visualId: 'synergy', subVariant: 'quad', color: '#0ea5e9', requirement: { type: 'connections', value: 75 }, evolvesFrom: 'social_connections_50', tier: 4 },
  { id: 'social_connections_100', name: 'Collaborator', description: 'Working together.', category: 'social', rarity: 'epic', visualId: 'synergy', subVariant: 'penta', color: '#0ea5e9', requirement: { type: 'connections', value: 100 }, evolvesFrom: 'social_connections_75', tier: 5 },
  { id: 'social_connections_150', name: 'Bridge', description: 'Connecting others.', category: 'social', rarity: 'epic', visualId: 'synergy', subVariant: 'bridge', color: '#0ea5e9', requirement: { type: 'connections', value: 150 }, evolvesFrom: 'social_connections_100', tier: 6 },
  { id: 'social_connections_200', name: 'Router', description: 'Traffic master.', category: 'social', rarity: 'epic', visualId: 'synergy', subVariant: 'router', color: '#0ea5e9', requirement: { type: 'connections', value: 200 }, evolvesFrom: 'social_connections_150', tier: 7 },
  { id: 'social_connections_250', name: 'Nexus Core', description: 'A central hub.', category: 'social', rarity: 'legendary', visualId: 'nexus', subVariant: 'core', color: '#0ea5e9', requirement: { type: 'connections', value: 250 }, evolvesFrom: 'social_connections_200', tier: 8 },
  { id: 'social_connections_350', name: 'Mainframe', description: 'Central processing.', category: 'social', rarity: 'legendary', visualId: 'nexus', subVariant: 'system', color: '#0ea5e9', requirement: { type: 'connections', value: 350 }, evolvesFrom: 'social_connections_250', tier: 9 },
  { id: 'social_connections_500', name: 'Global Node', description: 'Global footprint.', category: 'social', rarity: 'legendary', visualId: 'nexus', subVariant: 'global', color: '#0284c7', requirement: { type: 'connections', value: 500 }, evolvesFrom: 'social_connections_350', tier: 10 },
  { id: 'social_connections_750', name: 'Superhub', description: 'Total integration.', category: 'social', rarity: 'legendary', visualId: 'nexus', subVariant: 'ultra', color: '#0284c7', requirement: { type: 'connections', value: 750 }, evolvesFrom: 'social_connections_500', tier: 11 },
  { id: 'social_connections_1000', name: 'Superconnector', description: 'Every path leads here.', category: 'social', rarity: 'legendary', visualId: 'weaver', subVariant: 'web', color: '#0ea5e9', requirement: { type: 'connections', value: 1000 }, evolvesFrom: 'social_connections_750', tier: 12 },
  { id: 'social_connections_2000', name: 'Hyperlink', description: 'Instant access.', category: 'social', rarity: 'legendary', visualId: 'weaver', subVariant: 'fast', color: '#0ea5e9', requirement: { type: 'connections', value: 2000 }, evolvesFrom: 'social_connections_1000', tier: 13 },
  { id: 'social_connections_3500', name: 'The Grid', description: 'Powering the whole.', category: 'social', rarity: 'legendary', visualId: 'weaver', subVariant: 'grid', color: '#0ea5e9', requirement: { type: 'connections', value: 3500 }, evolvesFrom: 'social_connections_2000', tier: 14 },
  { id: 'social_connections_5000', name: 'Interstellar', description: 'Beyond boundaries.', category: 'social', rarity: 'legendary', visualId: 'weaver', subVariant: 'deep', color: '#0ea5e9', requirement: { type: 'connections', value: 5000 }, evolvesFrom: 'social_connections_3500', tier: 15 },

  /* ── MASTERY: Technical Skills (30 Skills) ── */
  { id: 'mastery_html', name: 'Structure Sage', description: 'Web foundation.', category: 'mastery', rarity: 'rare', visualId: 'circuit', subVariant: 'gate', color: '#e34c26', requirement: { type: 'skill', value: 'HTML' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_css', name: 'Style Sorcerer', description: 'Visual art.', category: 'mastery', rarity: 'rare', visualId: 'circuit', subVariant: 'path', color: '#264de4', requirement: { type: 'skill', value: 'CSS' }, evolvesFrom: null, tier: 2 },
  { id: 'mastery_js', name: 'Logic Lord', description: 'Interaction heartbeat.', category: 'mastery', rarity: 'epic', visualId: 'circuit', subVariant: 'core', color: '#f7df1e', requirement: { type: 'skill', value: 'Javascript' }, evolvesFrom: null, tier: 3 },
  { id: 'mastery_react', name: 'Component King', description: 'Future UI.', category: 'mastery', rarity: 'epic', visualId: 'circuit', subVariant: 'react', color: '#61dafb', requirement: { type: 'skill', value: 'React' }, evolvesFrom: null, tier: 4 },
  { id: 'mastery_node', name: 'Backend Beast', description: 'Scalable logic.', category: 'mastery', rarity: 'epic', visualId: 'circuit', subVariant: 'node', color: '#339933', requirement: { type: 'skill', value: 'Node.js' }, evolvesFrom: null, tier: 5 },
  { id: 'mastery_python', name: 'Snake Charmer', description: 'Data & Scripting.', category: 'mastery', rarity: 'rare', visualId: 'circuit', subVariant: 'python', color: '#3776ab', requirement: { type: 'skill', value: 'Python' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_java', name: 'Coffee Crafter', description: 'Enterprise robust.', category: 'mastery', rarity: 'rare', visualId: 'coffee', subVariant: 'java', color: '#007396', requirement: { type: 'skill', value: 'Java' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_cpp', name: 'System Architect', description: 'Low-level power.', category: 'mastery', rarity: 'epic', visualId: 'circuit', subVariant: 'cpp', color: '#00599c', requirement: { type: 'skill', value: 'C++' }, evolvesFrom: null, tier: 3 },
  { id: 'mastery_ts', name: 'Type Titan', description: 'Strict & Strong.', category: 'mastery', rarity: 'epic', visualId: 'circuit', subVariant: 'ts', color: '#3178c6', requirement: { type: 'skill', value: 'Typescript' }, evolvesFrom: null, tier: 2 },
  { id: 'mastery_sql', name: 'Query Queen', description: 'Database master.', category: 'mastery', rarity: 'rare', visualId: 'hub', subVariant: 'sql', color: '#4479a1', requirement: { type: 'skill', value: 'SQL' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_nosql', name: 'Schema Shifter', description: 'Fluid data.', category: 'mastery', rarity: 'rare', visualId: 'hub', subVariant: 'nosql', color: '#47a248', requirement: { type: 'skill', value: 'NoSQL' }, evolvesFrom: null, tier: 2 },
  { id: 'mastery_aws', name: 'Cloud Captain', description: 'Infinite scale.', category: 'mastery', rarity: 'legendary', visualId: 'nebula', subVariant: 'aws', color: '#232f3e', requirement: { type: 'skill', value: 'AWS' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_docker', name: 'Containment', description: 'Isolated perfection.', category: 'mastery', rarity: 'epic', visualId: 'hub', subVariant: 'docker', color: '#2496ed', requirement: { type: 'skill', value: 'Docker' }, evolvesFrom: null, tier: 3 },
  { id: 'mastery_git', name: 'Version Vision', description: 'Time traveler.', category: 'mastery', rarity: 'rare', visualId: 'signal', subVariant: 'git', color: '#f05032', requirement: { type: 'skill', value: 'Git' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_next', name: 'Server Side', description: 'Optimized React.', category: 'mastery', rarity: 'epic', visualId: 'circuit', subVariant: 'next', color: '#000000', requirement: { type: 'skill', value: 'Next.js' }, evolvesFrom: null, tier: 4 },
  { id: 'mastery_tailwind', name: 'Utility Wizard', description: 'Rapid styling.', category: 'mastery', rarity: 'rare', visualId: 'solar', subVariant: 'tailwind', color: '#06b6d4', requirement: { type: 'skill', value: 'Tailwind' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_figma', name: 'Pixel Pilot', description: 'Design vision.', category: 'mastery', rarity: 'rare', visualId: 'sprout', subVariant: 'figma', color: '#f24e1e', requirement: { type: 'skill', value: 'Figma' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_rust', name: 'Safe Sector', description: 'Memory safety.', category: 'mastery', rarity: 'legendary', visualId: 'circuit', subVariant: 'rust', color: '#000000', requirement: { type: 'skill', value: 'Rust' }, evolvesFrom: null, tier: 5 },
  { id: 'mastery_go', name: 'Gopher Pro', description: 'Concurrent power.', category: 'mastery', rarity: 'epic', visualId: 'bolt', subVariant: 'go', color: '#00add8', requirement: { type: 'skill', value: 'Go' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_flutter', name: 'Cross Platform', description: 'One code, all devices.', category: 'mastery', rarity: 'epic', visualId: 'circuit', subVariant: 'flutter', color: '#02569b', requirement: { type: 'skill', value: 'Flutter' }, evolvesFrom: null, tier: 2 },
  { id: 'mastery_ai', name: 'Prompt Master', description: 'AI whisperer.', category: 'mastery', rarity: 'legendary', visualId: 'deity', subVariant: 'ai', color: '#a855f7', requirement: { type: 'skill', value: 'AI' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_ml', name: 'Model Maker', description: 'Predictive logic.', category: 'mastery', rarity: 'legendary', visualId: 'deity', subVariant: 'ml', color: '#f59e0b', requirement: { type: 'skill', value: 'ML' }, evolvesFrom: null, tier: 2 },
  { id: 'mastery_devops', name: 'Pipeline Pro', description: 'Continuous flow.', category: 'mastery', rarity: 'epic', visualId: 'flow', subVariant: 'devops', color: '#339933', requirement: { type: 'skill', value: 'DevOps' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_security', name: 'Guard Dog', description: 'Fortified code.', category: 'mastery', rarity: 'legendary', visualId: 'shield_titanium', subVariant: 'security', color: '#be185d', requirement: { type: 'skill', value: 'Security' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_testing', name: 'Quality Guard', description: 'Bug hunter.', category: 'mastery', rarity: 'rare', visualId: 'scout', subVariant: 'testing', color: '#22c55e', requirement: { type: 'skill', value: 'Testing' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_agile', name: 'Sprint Star', description: 'Fast iteration.', category: 'mastery', rarity: 'common', visualId: 'momentum', subVariant: 'agile', color: '#6366f1', requirement: { type: 'skill', value: 'Agile' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_graphql', name: 'Data Weaver', description: 'Efficient queries.', category: 'mastery', rarity: 'epic', visualId: 'weaver', subVariant: 'graphql', color: '#e10098', requirement: { type: 'skill', value: 'GraphQL' }, evolvesFrom: null, tier: 1 },
  { id: 'mastery_kubernetes', name: 'Orchestrator', description: 'Cluster master.', category: 'mastery', rarity: 'legendary', visualId: 'hub', subVariant: 'k8s', color: '#326ce5', requirement: { type: 'skill', value: 'Kubernetes' }, evolvesFrom: null, tier: 4 },
  { id: 'mastery_linux', name: 'Kernel King', description: 'Shell master.', category: 'mastery', rarity: 'rare', visualId: 'scout', subVariant: 'linux', color: '#000000', requirement: { type: 'skill', value: 'Linux' }, evolvesFrom: null, tier: 2 },
  { id: 'mastery_firebase', name: 'Cloud Realtime', description: 'BaaS expert.', category: 'mastery', rarity: 'rare', visualId: 'fire_low', subVariant: 'firebase', color: '#ffca28', requirement: { type: 'skill', value: 'Firebase' }, evolvesFrom: null, tier: 1 },

  /* ── ENGAGEMENT: Community (15 Tiers) ── */
  { id: 'content_1', name: 'First Pulse', description: 'Community signal.', category: 'engagement', rarity: 'common', visualId: 'broadcast', subVariant: 'pulse', color: '#8b5cf6', requirement: { type: 'posts', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'content_5', name: 'Whisper', description: 'Soft presence.', category: 'engagement', rarity: 'common', visualId: 'broadcast', subVariant: 'soft', color: '#8b5cf6', requirement: { type: 'posts', value: 5 }, evolvesFrom: 'content_1', tier: 2 },
  { id: 'content_10', name: 'Vocal', description: 'Making noise.', category: 'engagement', rarity: 'common', visualId: 'broadcast', subVariant: 'loud', color: '#8b5cf6', requirement: { type: 'posts', value: 10 }, evolvesFrom: 'content_5', tier: 3 },
  { id: 'content_25', name: 'Community Echo', description: 'Voice matters.', category: 'engagement', rarity: 'rare', visualId: 'signal', subVariant: 'echo', color: '#a78bfa', requirement: { type: 'posts', value: 25 }, evolvesFrom: 'content_10', tier: 4 },
  { id: 'content_50', name: 'Pillar', description: 'Consistent support.', category: 'engagement', rarity: 'rare', visualId: 'signal', subVariant: 'pillar', color: '#a78bfa', requirement: { type: 'posts', value: 50 }, evolvesFrom: 'content_25', tier: 5 },
  { id: 'content_75', name: 'Amplified', description: 'Heard by all.', category: 'engagement', rarity: 'rare', visualId: 'signal', subVariant: 'amp', color: '#a78bfa', requirement: { type: 'posts', value: 75 }, evolvesFrom: 'content_50', tier: 6 },
  { id: 'content_100', name: 'Resonance', description: 'A pillar of feed.', category: 'engagement', rarity: 'epic', visualId: 'beacon', subVariant: 'res', color: '#c084fc', requirement: { type: 'posts', value: 100 }, evolvesFrom: 'content_75', tier: 7 },
  { id: 'content_150', name: 'Cultural Icon', description: 'Setting trends.', category: 'engagement', rarity: 'epic', visualId: 'beacon', subVariant: 'icon', color: '#c084fc', requirement: { type: 'posts', value: 150 }, evolvesFrom: 'content_100', tier: 8 },
  { id: 'content_250', name: 'Movement', description: 'Driving change.', category: 'engagement', rarity: 'epic', visualId: 'beacon', subVariant: 'move', color: '#c084fc', requirement: { type: 'posts', value: 250 }, evolvesFrom: 'content_150', tier: 9 },
  { id: 'content_500', name: 'Broadcaster', description: 'Ultimate reach.', category: 'engagement', rarity: 'legendary', visualId: 'broadcast', subVariant: 'ultra', color: '#8b5cf6', requirement: { type: 'posts', value: 500 }, evolvesFrom: 'content_250', tier: 10 },
  { id: 'engagement_100', name: 'Hype Driver', description: 'Gave 100 sparks.', category: 'engagement', rarity: 'rare', visualId: 'heart', subVariant: 'spark', color: '#fbbf24', requirement: { type: 'sparks_given', value: 100 }, evolvesFrom: null, tier: 1 },
  { id: 'engagement_250', name: 'Motivator', description: 'Gave 250 sparks.', category: 'engagement', rarity: 'rare', visualId: 'heart', subVariant: 'flare', color: '#fbbf24', requirement: { type: 'sparks_given', value: 250 }, evolvesFrom: 'engagement_100', tier: 2 },
  { id: 'engagement_500', name: 'Squad Star', description: 'Gave 500 sparks.', category: 'engagement', rarity: 'epic', visualId: 'heart', subVariant: 'star', color: '#fbbf24', requirement: { type: 'sparks_given', value: 500 }, evolvesFrom: 'engagement_250', tier: 3 },
  { id: 'engagement_1000', name: 'Inspiration', description: 'Gave 1000 sparks.', category: 'engagement', rarity: 'legendary', visualId: 'heart', subVariant: 'sun', color: '#fbbf24', requirement: { type: 'sparks_given', value: 1000 }, evolvesFrom: 'engagement_500', tier: 4 },

  /* ── SECRET: Hidden (15 Tiers) ── */
  { id: 'secret_night_owl', name: 'Night Owl', description: 'Midnight - 4 AM grind.', category: 'secret', rarity: 'rare', visualId: 'owl', subVariant: 'midnight', color: '#7c3aed', requirement: { type: 'night_owl', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_early_bird', name: 'Horizon Scout', description: '4 AM - 6 AM grind.', category: 'secret', rarity: 'rare', visualId: 'bird', subVariant: 'dawn', color: '#f97316', requirement: { type: 'early_bird', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_speed_demon', name: 'Velocity', description: '10 apps in 1 hour.', category: 'secret', rarity: 'epic', visualId: 'bolt', subVariant: 'sonic', color: '#eab308', requirement: { type: 'speed_demon', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_coffee_addict', name: 'Overclocked', description: 'Worked every day.', category: 'secret', rarity: 'epic', visualId: 'coffee', subVariant: 'steam', color: '#d946ef', requirement: { type: 'weekend_warrior', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_zen', name: 'Zen Master', description: '30 days no rejections.', category: 'secret', rarity: 'legendary', visualId: 'shield_base', subVariant: 'zen', color: '#10b981', requirement: { type: 'streak_no_rejections', value: 30 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_phoenix_rebirth', name: 'Fire Rise', description: 'Hired after 100 rejections.', category: 'secret', rarity: 'legendary', visualId: 'phoenix', subVariant: 'ash', color: '#f43f5e', requirement: { type: 'hired_after_rejections', value: 100 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_ghost_buster', name: 'Ectoplasm', description: 'Identified 10 ghost jobs.', category: 'secret', rarity: 'epic', visualId: 'scout', subVariant: 'ghost', color: '#a855f7', requirement: { type: 'ghost_jobs_found', value: 10 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_marathon', name: 'Long Haul', description: '12 hours active.', category: 'secret', rarity: 'legendary', visualId: 'flow', subVariant: 'deep', color: '#3b82f6', requirement: { type: 'hours_active', value: 12 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_trendsetter', name: 'Viral Signal', description: '100+ likes on a post.', category: 'secret', rarity: 'legendary', visualId: 'beacon', subVariant: 'viral', color: '#ec4899', requirement: { type: 'post_likes', value: 100 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_carry', name: 'Squad Atlas', description: 'Contributed 50% squad goal.', category: 'secret', rarity: 'legendary', visualId: 'squad', subVariant: 'atlas', color: '#14b8a6', requirement: { type: 'squad_contribution', value: 50 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_ninja', name: 'Silent Strike', description: 'Hired without public posts.', category: 'secret', rarity: 'epic', visualId: 'scout', subVariant: 'ninja', color: '#64748b', requirement: { type: 'hired_silent', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_polyglot', name: 'Fluent', description: '10+ skills on profile.', category: 'secret', rarity: 'epic', visualId: 'nexus', subVariant: 'poly', color: '#3b82f6', requirement: { type: 'skill_count', value: 10 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_connector', name: 'Interlinked', description: 'Connected 2 squads.', category: 'secret', rarity: 'legendary', visualId: 'weaver', subVariant: 'link', color: '#8b5cf6', requirement: { type: 'squad_connections', value: 2 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_beta', name: 'First Wave', description: 'Joined in first 1000.', category: 'secret', rarity: 'rare', visualId: 'pioneer', subVariant: 'beta', color: '#94a3b8', requirement: { type: 'join_order', value: 1000 }, evolvesFrom: null, tier: 1 },
  { id: 'secret_god_speed', name: 'Mach 1', description: 'Logged 50 apps in a day.', category: 'secret', rarity: 'legendary', visualId: 'bolt', subVariant: 'mach', color: '#f59e0b', requirement: { type: 'daily_apps', value: 50 }, evolvesFrom: null, tier: 1 },

  /* ── EVENT: Special (10 Tiers) ── */
  { id: 'event_pioneer', name: 'Founding Era', description: 'Join before 2027.', category: 'event', rarity: 'legendary', visualId: 'pioneer', subVariant: 'found', color: '#d946ef', requirement: { type: 'join_before', value: '2027-01-01' }, evolvesFrom: null, tier: 1 },
  { id: 'event_squad_champion', name: 'Team Player', description: 'Hit weekly goal.', category: 'event', rarity: 'epic', visualId: 'squad', subVariant: 'champ', color: '#14b8a6', requirement: { type: 'squad_goal', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'event_top_1_percent', name: 'Elite 1%', description: 'Top of XP leaderboard.', category: 'event', rarity: 'legendary', visualId: 'deity', subVariant: 'elite', color: '#f59e0b', requirement: { type: 'xp_rank', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'event_bug_hunter', name: 'Exterminator', description: 'Reported a bug.', category: 'event', rarity: 'rare', visualId: 'scout', subVariant: 'bug', color: '#22c55e', requirement: { type: 'bug_report', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'event_contributor', name: 'Architect', description: 'Code contributor.', category: 'event', rarity: 'legendary', visualId: 'nexus', subVariant: 'code', color: '#3b82f6', requirement: { type: 'repo_contribution', value: 1 }, evolvesFrom: null, tier: 1 },
  { id: 'event_alpha', name: 'Origin', description: 'Alpha tester.', category: 'event', rarity: 'legendary', visualId: 'pioneer', subVariant: 'alpha', color: '#0f172a', requirement: { type: 'test_phase', value: 'alpha' }, evolvesFrom: null, tier: 1 },
  { id: 'event_beta', name: 'Evolution', description: 'Beta tester.', category: 'event', rarity: 'epic', visualId: 'pioneer', subVariant: 'beta', color: '#334155', requirement: { type: 'test_phase', value: 'beta' }, evolvesFrom: null, tier: 1 },
];

export function getStickerById(id) {
  return STICKER_REGISTRY.find((s) => s.id === id) || null;
}

export function getStickersByCategory(category) {
  return STICKER_REGISTRY.filter((s) => s.category === category);
}

export function getEvolutionChain(stickerId) {
  const chain = [];
  let current = getStickerById(stickerId);
  while (current?.evolvesFrom) {
    current = getStickerById(current.evolvesFrom);
    if (current) chain.unshift(current);
  }
  current = getStickerById(stickerId);
  if (current) chain.push(current);
  let child = STICKER_REGISTRY.find((s) => s.evolvesFrom === stickerId);
  while (child) {
    chain.push(child);
    child = STICKER_REGISTRY.find((s) => s.evolvesFrom === child.id);
  }
  return chain;
}

export function getHighestInChain(stickerId, unlockedIds = []) {
  const chain = getEvolutionChain(stickerId);
  const unlocked = chain.filter((s) => unlockedIds.includes(s.id));
  return unlocked.length ? unlocked[unlocked.length - 1] : null;
}

export const STICKER_CATEGORIES = [
  { id: 'milestone', name: 'Milestone', emoji: '🏅', description: 'XP progression' },
  { id: 'resilience', name: 'Resilience', emoji: '💪', description: 'Grit & consistency' },
  { id: 'social', name: 'Social', emoji: '🌐', description: 'Network growth' },
  { id: 'mastery', name: 'Mastery', emoji: '⚔️', description: 'Technical skills' },
  { id: 'engagement', name: 'Impact', emoji: '📣', description: 'Community engagement' },
  { id: 'secret', name: 'Secret', emoji: '🔮', description: 'Hidden achievements' },
  { id: 'event', name: 'Exclusive', emoji: '✨', description: 'Special rewards' },
];
