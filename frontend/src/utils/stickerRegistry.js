/**
 * ═══════════════════════════════════════════════════════
 *  APTICO STICKER REGISTRY — Single Source of Truth
 * ═══════════════════════════════════════════════════════
 *
 *  Each sticker has:
 *    id          — Unique key stored in DB
 *    name        — Display name
 *    description — Short meaning / how it was earned
 *    category    — 'milestone' | 'resilience' | 'social' | 'secret' | 'event'
 *    rarity      — 'common' | 'rare' | 'epic' | 'legendary'
 *    iconType    — 'svg' | 'emoji'  (mix of both per user's request)
 *    icon        — SVG path data OR emoji character
 *    color       — Primary accent colour for the sticker
 *    requirement — { type, value } describing unlock condition
 *    evolvesFrom — id of the sticker this one replaces (or null)
 *    tier        — Evolution tier (1 = base, 2 = silver, 3 = gold/diamond)
 */

// ─── Rarity visual config ────────────────────────────
export const RARITY_CONFIG = {
  common: {
    label: 'Common',
    border: 'border-slate-400/40',
    bg: 'bg-slate-500/5',
    glow: '',
    textColor: 'text-slate-500',
    badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  },
  rare: {
    label: 'Rare',
    border: 'border-sky-400/50',
    bg: 'bg-sky-500/5',
    glow: 'shadow-[0_0_16px_rgba(56,189,248,0.25)]',
    textColor: 'text-sky-500',
    badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  epic: {
    label: 'Epic',
    border: 'border-amber-400/60',
    bg: 'bg-amber-500/5',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    textColor: 'text-amber-500',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  legendary: {
    label: 'Legendary',
    border: 'border-fuchsia-400/60',
    bg: 'bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-cyan-500/10',
    glow: 'shadow-[0_0_28px_rgba(192,38,211,0.35)]',
    textColor: 'text-fuchsia-500',
    badgeColor: 'bg-gradient-to-r from-fuchsia-500/15 to-violet-500/15 text-fuchsia-600 dark:text-fuchsia-400',
  },
};

// ─── Maximum equipped stickers on profile ────────────
export const MAX_EQUIPPED_STICKERS = 4;

// ─── Full sticker catalogue ──────────────────────────
export const STICKER_REGISTRY = [
  {
    "id": "xp_50",
    "name": "Rookie",
    "description": "Took the first step. Earned 50 XP.",
    "category": "milestone",
    "rarity": "common",
    "iconType": "emoji",
    "icon": "🌱",
    "color": "#22c55e",
    "requirement": {
      "type": "xp",
      "value": 50
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "xp_100",
    "name": "Novice Scout",
    "description": "Crossed the 100 XP mark.",
    "category": "milestone",
    "rarity": "common",
    "iconType": "emoji",
    "icon": "🔍",
    "color": "#3b82f6",
    "requirement": {
      "type": "xp",
      "value": 100
    },
    "evolvesFrom": "xp_50",
    "tier": 2
  },
  {
    "id": "xp_250",
    "name": "Career Warrior",
    "description": "Reached 250 XP. Building momentum.",
    "category": "milestone",
    "rarity": "rare",
    "iconType": "svg",
    "icon": "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    "color": "#6366f1",
    "requirement": {
      "type": "xp",
      "value": 250
    },
    "evolvesFrom": "xp_100",
    "tier": 3
  },
  {
    "id": "xp_500",
    "name": "Grind Master",
    "description": "Hit 500 XP. Dedication pays off.",
    "category": "milestone",
    "rarity": "epic",
    "iconType": "svg",
    "icon": "M13 10V3L4 14h7v7l9-11h-7z",
    "color": "#f59e0b",
    "requirement": {
      "type": "xp",
      "value": 500
    },
    "evolvesFrom": "xp_250",
    "tier": 4
  },
  {
    "id": "xp_1000",
    "name": "The Thousand",
    "description": "Ascended to 1000 XP.",
    "category": "milestone",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "👑",
    "color": "#a855f7",
    "requirement": {
      "type": "xp",
      "value": 1000
    },
    "evolvesFrom": "xp_500",
    "tier": 5
  },
  {
    "id": "xp_2500",
    "name": "Trailblazer",
    "description": "Blazing the path at 2500 XP.",
    "category": "milestone",
    "rarity": "rare",
    "iconType": "emoji",
    "icon": "🔥",
    "color": "#ef4444",
    "requirement": {
      "type": "xp",
      "value": 2500
    },
    "evolvesFrom": "xp_1000",
    "tier": 6
  },
  {
    "id": "xp_5000",
    "name": "Elite Achiever",
    "description": "Hit 5000 XP. Pure dedication.",
    "category": "milestone",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "⭐",
    "color": "#fcd34d",
    "requirement": {
      "type": "xp",
      "value": 5000
    },
    "evolvesFrom": "xp_2500",
    "tier": 7
  },
  {
    "id": "xp_7500",
    "name": "Grandmaster",
    "description": "Incredible 7500 XP reached.",
    "category": "milestone",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "💎",
    "color": "#06b6d4",
    "requirement": {
      "type": "xp",
      "value": 7500
    },
    "evolvesFrom": "xp_5000",
    "tier": 8
  },
  {
    "id": "xp_10000",
    "name": "Aptico Legend",
    "description": "An absolute legend. 10,000 XP.",
    "category": "milestone",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "🌟",
    "color": "#f43f5e",
    "requirement": {
      "type": "xp",
      "value": 10000
    },
    "evolvesFrom": "xp_7500",
    "tier": 9
  },
  {
    "id": "xp_20000",
    "name": "Zenith",
    "description": "Unprecedented 20,000 XP.",
    "category": "milestone",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "🚀",
    "color": "#8b5cf6",
    "requirement": {
      "type": "xp",
      "value": 20000
    },
    "evolvesFrom": "xp_10000",
    "tier": 10
  },
  {
    "id": "xp_50000",
    "name": "Transcendent",
    "description": "Beyond the stars at 50,000 XP.",
    "category": "milestone",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "🌌",
    "color": "#3b82f6",
    "requirement": {
      "type": "xp",
      "value": 50000
    },
    "evolvesFrom": "xp_20000",
    "tier": 11
  },
  {
    "id": "streak_3",
    "name": "Spark",
    "description": "3-day application streak.",
    "category": "resilience",
    "rarity": "common",
    "iconType": "emoji",
    "icon": "🔥",
    "color": "#ef4444",
    "requirement": {
      "type": "streak",
      "value": 3
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "streak_7",
    "name": "Iron Will",
    "description": "7 days non-stop.",
    "category": "resilience",
    "rarity": "rare",
    "iconType": "svg",
    "icon": "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    "color": "#0ea5e9",
    "requirement": {
      "type": "streak",
      "value": 7
    },
    "evolvesFrom": "streak_3",
    "tier": 2
  },
  {
    "id": "streak_14",
    "name": "Relentless",
    "description": "14 days of grit.",
    "category": "resilience",
    "rarity": "rare",
    "iconType": "emoji",
    "icon": "🛡️",
    "color": "#6366f1",
    "requirement": {
      "type": "streak",
      "value": 14
    },
    "evolvesFrom": "streak_7",
    "tier": 3
  },
  {
    "id": "streak_30",
    "name": "Unbreakable",
    "description": "30-day streak.",
    "category": "resilience",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "💎",
    "color": "#8b5cf6",
    "requirement": {
      "type": "streak",
      "value": 30
    },
    "evolvesFrom": "streak_14",
    "tier": 4
  },
  {
    "id": "streak_60",
    "name": "Juggernaut",
    "description": "60-day streak.",
    "category": "resilience",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "🚂",
    "color": "#f59e0b",
    "requirement": {
      "type": "streak",
      "value": 60
    },
    "evolvesFrom": "streak_30",
    "tier": 5
  },
  {
    "id": "streak_100",
    "name": "Century Streak",
    "description": "100 days straight.",
    "category": "resilience",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "💯",
    "color": "#eab308",
    "requirement": {
      "type": "streak",
      "value": 100
    },
    "evolvesFrom": "streak_60",
    "tier": 6
  },
  {
    "id": "streak_365",
    "name": "A Year of Grit",
    "description": "365 days of relentless applying.",
    "category": "resilience",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "🗓️",
    "color": "#ec4899",
    "requirement": {
      "type": "streak",
      "value": 365
    },
    "evolvesFrom": "streak_100",
    "tier": 7
  },
  {
    "id": "apps_25",
    "name": "First Wave",
    "description": "25 applications submitted.",
    "category": "resilience",
    "rarity": "common",
    "iconType": "emoji",
    "icon": "📝",
    "color": "#10b981",
    "requirement": {
      "type": "total_applications",
      "value": 25
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "apps_100",
    "name": "Century Club",
    "description": "100 applications submitted.",
    "category": "resilience",
    "rarity": "rare",
    "iconType": "emoji",
    "icon": "📝",
    "color": "#10b981",
    "requirement": {
      "type": "total_applications",
      "value": 100
    },
    "evolvesFrom": "apps_25",
    "tier": 2
  },
  {
    "id": "apps_250",
    "name": "Veteran",
    "description": "250 applications submitted.",
    "category": "resilience",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "📝",
    "color": "#10b981",
    "requirement": {
      "type": "total_applications",
      "value": 250
    },
    "evolvesFrom": "apps_100",
    "tier": 3
  },
  {
    "id": "apps_500",
    "name": "Machine",
    "description": "500 applications submitted.",
    "category": "resilience",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "📝",
    "color": "#10b981",
    "requirement": {
      "type": "total_applications",
      "value": 500
    },
    "evolvesFrom": "apps_250",
    "tier": 4
  },
  {
    "id": "apps_1000",
    "name": "Unstoppable Force",
    "description": "1000 applications submitted.",
    "category": "resilience",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "📝",
    "color": "#10b981",
    "requirement": {
      "type": "total_applications",
      "value": 1000
    },
    "evolvesFrom": "apps_500",
    "tier": 5
  },
  {
    "id": "rejections_10",
    "name": "Bounce Back",
    "description": "10 rejections. Failure is just feedback.",
    "category": "resilience",
    "rarity": "common",
    "iconType": "emoji",
    "icon": "🛡️",
    "color": "#ec4899",
    "requirement": {
      "type": "total_rejections",
      "value": 10
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "rejections_50",
    "name": "Thick Skin",
    "description": "50 rejections. Failure is just feedback.",
    "category": "resilience",
    "rarity": "rare",
    "iconType": "emoji",
    "icon": "🛡️",
    "color": "#ec4899",
    "requirement": {
      "type": "total_rejections",
      "value": 50
    },
    "evolvesFrom": "rejections_10",
    "tier": 2
  },
  {
    "id": "rejections_100",
    "name": "Unfazed",
    "description": "100 rejections. Failure is just feedback.",
    "category": "resilience",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "🛡️",
    "color": "#ec4899",
    "requirement": {
      "type": "total_rejections",
      "value": 100
    },
    "evolvesFrom": "rejections_50",
    "tier": 3
  },
  {
    "id": "rejections_250",
    "name": "Battle Scarred",
    "description": "250 rejections. Failure is just feedback.",
    "category": "resilience",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "🛡️",
    "color": "#ec4899",
    "requirement": {
      "type": "total_rejections",
      "value": 250
    },
    "evolvesFrom": "rejections_100",
    "tier": 4
  },
  {
    "id": "rejections_500",
    "name": "Titanium Mind",
    "description": "500 rejections. Failure is just feedback.",
    "category": "resilience",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "🛡️",
    "color": "#ec4899",
    "requirement": {
      "type": "total_rejections",
      "value": 500
    },
    "evolvesFrom": "rejections_250",
    "tier": 5
  },
  {
    "id": "social_followers_1",
    "name": "First Fan",
    "description": "1 followers on your journey.",
    "category": "social",
    "rarity": "common",
    "iconType": "emoji",
    "icon": "⭐",
    "color": "#eab308",
    "requirement": {
      "type": "followers",
      "value": 1
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "social_followers_10",
    "name": "Gathering Crowd",
    "description": "10 followers on your journey.",
    "category": "social",
    "rarity": "rare",
    "iconType": "emoji",
    "icon": "⭐",
    "color": "#eab308",
    "requirement": {
      "type": "followers",
      "value": 10
    },
    "evolvesFrom": "social_followers_1",
    "tier": 2
  },
  {
    "id": "social_followers_50",
    "name": "Thought Leader",
    "description": "50 followers on your journey.",
    "category": "social",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "⭐",
    "color": "#eab308",
    "requirement": {
      "type": "followers",
      "value": 50
    },
    "evolvesFrom": "social_followers_10",
    "tier": 3
  },
  {
    "id": "social_followers_100",
    "name": "Influencer",
    "description": "100 followers on your journey.",
    "category": "social",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "⭐",
    "color": "#eab308",
    "requirement": {
      "type": "followers",
      "value": 100
    },
    "evolvesFrom": "social_followers_50",
    "tier": 4
  },
  {
    "id": "social_followers_500",
    "name": "Micro-Celeb",
    "description": "500 followers on your journey.",
    "category": "social",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "⭐",
    "color": "#eab308",
    "requirement": {
      "type": "followers",
      "value": 500
    },
    "evolvesFrom": "social_followers_100",
    "tier": 5
  },
  {
    "id": "social_followers_1000",
    "name": "Community Icon",
    "description": "1000 followers on your journey.",
    "category": "social",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "⭐",
    "color": "#eab308",
    "requirement": {
      "type": "followers",
      "value": 1000
    },
    "evolvesFrom": "social_followers_500",
    "tier": 6
  },
  {
    "id": "social_connections_10",
    "name": "Networker",
    "description": "10 connections strong.",
    "category": "social",
    "rarity": "rare",
    "iconType": "emoji",
    "icon": "🤝",
    "color": "#0ea5e9",
    "requirement": {
      "type": "connections",
      "value": 10
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "social_connections_50",
    "name": "Connector",
    "description": "50 connections strong.",
    "category": "social",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "🤝",
    "color": "#0ea5e9",
    "requirement": {
      "type": "connections",
      "value": 50
    },
    "evolvesFrom": "social_connections_10",
    "tier": 2
  },
  {
    "id": "social_connections_100",
    "name": "Super Connector",
    "description": "100 connections strong.",
    "category": "social",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "🤝",
    "color": "#0ea5e9",
    "requirement": {
      "type": "connections",
      "value": 100
    },
    "evolvesFrom": "social_connections_50",
    "tier": 3
  },
  {
    "id": "social_connections_250",
    "name": "The Hub",
    "description": "250 connections strong.",
    "category": "social",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "🤝",
    "color": "#0ea5e9",
    "requirement": {
      "type": "connections",
      "value": 250
    },
    "evolvesFrom": "social_connections_100",
    "tier": 4
  },
  {
    "id": "social_connections_500",
    "name": "Nexus",
    "description": "500 connections strong.",
    "category": "social",
    "rarity": "legendary",
    "iconType": "emoji",
    "icon": "🤝",
    "color": "#0ea5e9",
    "requirement": {
      "type": "connections",
      "value": 500
    },
    "evolvesFrom": "social_connections_250",
    "tier": 5
  },
  {
    "id": "secret_night_owl",
    "name": "Night Owl",
    "description": "Logged an application between midnight and 4 AM.",
    "category": "secret",
    "rarity": "rare",
    "iconType": "emoji",
    "icon": "🦉",
    "color": "#7c3aed",
    "requirement": {
      "type": "night_owl",
      "value": 1
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "secret_early_bird",
    "name": "Early Bird",
    "description": "Logged an application between 4 AM and 6 AM.",
    "category": "secret",
    "rarity": "rare",
    "iconType": "emoji",
    "icon": "🐦",
    "color": "#f97316",
    "requirement": {
      "type": "early_bird",
      "value": 1
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "secret_weekend_warrior",
    "name": "Weekend Warrior",
    "description": "Applied for 5 jobs on a Sunday.",
    "category": "secret",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "⚔️",
    "color": "#ef4444",
    "requirement": {
      "type": "weekend_warrior",
      "value": 1
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "secret_speed_demon",
    "name": "Speed Demon",
    "description": "Logged 10 applications in a single hour.",
    "category": "secret",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "⚡",
    "color": "#eab308",
    "requirement": {
      "type": "speed_demon",
      "value": 1
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "event_pioneer",
    "name": "The Pioneer",
    "description": "Joined Aptico during the founding era.",
    "category": "event",
    "rarity": "legendary",
    "iconType": "svg",
    "icon": "M3 21l1.65-3.8a9 9 0 1114.71 0L21 21M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707",
    "color": "#d946ef",
    "requirement": {
      "type": "join_before",
      "value": "2027-01-01"
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "event_squad_champion",
    "name": "Squad Champion",
    "description": "Part of a squad that hit its weekly goal.",
    "category": "event",
    "rarity": "epic",
    "iconType": "emoji",
    "icon": "🛡️",
    "color": "#14b8a6",
    "requirement": {
      "type": "squad_goal",
      "value": 1
    },
    "evolvesFrom": null,
    "tier": 1
  },
  {
    "id": "event_beta_tester",
    "name": "Beta Bug Hunter",
    "description": "Reported a bug during the beta phase.",
    "category": "event",
    "rarity": "rare",
    "iconType": "emoji",
    "icon": "🐛",
    "color": "#3b82f6",
    "requirement": {
      "type": "beta_tester",
      "value": 1
    },
    "evolvesFrom": null,
    "tier": 1
  }
];

// ─── Helper: find a sticker by id ────────────────────
export function getStickerById(id) {
  return STICKER_REGISTRY.find((s) => s.id === id) || null;
}

// ─── Helper: get all stickers in a category ──────────
export function getStickersByCategory(category) {
  return STICKER_REGISTRY.filter((s) => s.category === category);
}

// ─── Helper: get the evolution chain for a sticker ───
export function getEvolutionChain(stickerId) {
  const chain = [];
  let current = getStickerById(stickerId);
  // Walk backwards to the root
  while (current?.evolvesFrom) {
    current = getStickerById(current.evolvesFrom);
    if (current) chain.unshift(current);
  }
  // Walk forwards from root
  current = getStickerById(stickerId);
  if (current) chain.push(current);
  // Find children
  let child = STICKER_REGISTRY.find((s) => s.evolvesFrom === stickerId);
  while (child) {
    chain.push(child);
    child = STICKER_REGISTRY.find((s) => s.evolvesFrom === child.id);
  }
  return chain;
}

// ─── Helper: get the highest unlocked sticker in a chain ──
export function getHighestInChain(stickerId, unlockedIds = []) {
  const chain = getEvolutionChain(stickerId);
  const unlocked = chain.filter((s) => unlockedIds.includes(s.id));
  return unlocked.length ? unlocked[unlocked.length - 1] : null;
}

// ─── Category metadata for UI grouping ───────────────
export const STICKER_CATEGORIES = [
  { id: 'milestone', name: 'Milestone', emoji: '🏅', description: 'Earned through XP progression' },
  { id: 'resilience', name: 'Resilience', emoji: '💪', description: 'Earned through grit and consistency' },
  { id: 'social', name: 'Social', emoji: '🌐', description: 'Earned by growing your network' },
  { id: 'secret', name: 'Secret', emoji: '🔮', description: 'Hidden achievements — can you find them all?' },
  { id: 'event', name: 'Exclusive', emoji: '✨', description: 'Limited-time and special event rewards' },
];
