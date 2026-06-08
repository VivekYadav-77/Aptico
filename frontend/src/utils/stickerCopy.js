import { STICKER_CATEGORIES } from './stickerRegistry.js';

export function getStickerCategoryName(sticker) {
  return STICKER_CATEGORIES.find((category) => category.id === sticker?.category)?.name || 'Achievement';
}

export function formatStickerRequirement(sticker, { isUnlocked = true, squadProof = null } = {}) {
  const req = sticker?.requirement || {};
  if (squadProof) {
    return `Rank #${squadProof.rank} monthly squad. Earned ${squadProof.periodLabel || squadProof.period} with ${squadProof.squadName}.`;
  }

  const action = isUnlocked ? 'Completed' : 'Complete';
  const value = Number(req.value || 0);
  const numberValue = Number.isFinite(value) ? value.toLocaleString() : req.value;

  const labels = {
    xp: `${isUnlocked ? 'Reached' : 'Reach'} ${numberValue} XP.`,
    streak: `${isUnlocked ? 'Built' : 'Build'} a ${numberValue} day streak.`,
    total_applications: `${isUnlocked ? 'Logged' : 'Log'} ${numberValue} applications.`,
    total_rejections: `${isUnlocked ? 'Pushed through' : 'Push through'} ${numberValue} rejections.`,
    followers: `${isUnlocked ? 'Gained' : 'Gain'} ${numberValue} followers.`,
    connections: `${isUnlocked ? 'Built' : 'Build'} ${numberValue} connections.`,
    night_owl: `${isUnlocked ? 'Logged' : 'Log'} activity between 12 AM and 4 AM.`,
    early_bird: `${isUnlocked ? 'Logged' : 'Log'} activity between 4 AM and 6 AM.`,
    join_before: `${isUnlocked ? 'Joined' : 'Join'} before ${new Date(req.value).getFullYear()}.`,
    squad_goal: `${isUnlocked ? 'Helped' : 'Help'} a squad hit its weekly goal.`,
    speed_demon: `${isUnlocked ? 'Acted' : 'Act'} quickly when an opportunity appeared.`,
    weekend_warrior: `${isUnlocked ? 'Logged' : 'Log'} application activity on weekends.`,
    skill: `${isUnlocked ? 'Added' : 'Add'} ${req.value} as a profile skill.`,
    posts: `${isUnlocked ? 'Shared' : 'Share'} ${numberValue} community posts.`,
    sparks_given: `${isUnlocked ? 'Gave' : 'Give'} ${numberValue} sparks to squad members.`,
    post_likes: `${isUnlocked ? 'Earned' : 'Earn'} ${numberValue} likes on posts.`,
    daily_apps: `${isUnlocked ? 'Logged' : 'Log'} ${numberValue} applications in one day.`,
    skill_count: `${isUnlocked ? 'Added' : 'Add'} ${numberValue} skills to the profile.`,
    monthly_squad_reward: `Awarded for consistent, clean contribution to a top monthly squad.`
  };

  return labels[req.type] || `${action} a verified Aptico achievement.`;
}

export function getStickerMeaning(sticker, squadProof = null) {
  if (squadProof) {
    return `${sticker.name} proves this member contributed cleanly and consistently to a top-ranked squad month.`;
  }

  const reqType = sticker?.requirement?.type;
  const meanings = {
    xp: 'Sustained progress across the job-search journey and long-term activity in Aptico.',
    streak: 'Consistency over time, even when the search takes patience.',
    total_applications: 'Focused job-search activity and steady outreach to opportunities.',
    total_rejections: 'Resilience through difficult outcomes and continued forward movement.',
    followers: 'Community visibility and profile traction.',
    connections: 'Network growth and stronger access to people, squads, and opportunities.',
    night_owl: 'Extra effort during late hours when momentum continued.',
    early_bird: 'Early discipline and a proactive start to the day.',
    join_before: 'Early belief in Aptico and participation in its founding era.',
    squad_goal: 'Team contribution and shared momentum with a squad.',
    speed_demon: 'Fast action when a relevant opportunity appeared.',
    weekend_warrior: 'Commitment that continued beyond normal weekday rhythm.',
    skill: `Visible proof that ${sticker?.requirement?.value} is part of this profile's capability.`,
    posts: 'Community presence and willingness to share the journey publicly.',
    sparks_given: 'Support given to other squad members.',
    post_likes: 'Community impact through posts that resonated with other users.',
    daily_apps: 'A high-intensity application push in a single day.',
    skill_count: 'A broader skill profile that gives the career story more range.',
    monthly_squad_reward: 'A verified monthly squad leaderboard finish backed by clean contribution.'
  };

  return meanings[reqType] || `${getStickerCategoryName(sticker)} progress represented as a collectible reward.`;
}

export function getRecruiterStickerSignal(sticker, squadProof = null) {
  if (squadProof) {
    return `Verified through clean monthly contribution. Safe public proof: squad, month, rank, and reward title only.`;
  }

  return `Aptico verified achievement: ${getStickerCategoryName(sticker)} signal shown on this profile.`;
}
