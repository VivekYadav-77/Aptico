import api from './axios.js';

export function invalidateReadmeCache() {
  // Portfolio README content can include personal profile details, so it is not persisted in browser storage.
}

export async function fetchProfileSettings() {
  const response = await api.get('/api/profile');
  return response.data.data;
}

export async function saveProfileSettings(profile) {
  const response = await api.put('/api/profile', profile);
  invalidateReadmeCache();
  return response.data.data;
}

export async function saveExperience(experience) {
  const response = await api.post('/api/settings/experience', experience);
  invalidateReadmeCache();
  return response.data.data;
}

export async function removeExperience(experienceId) {
  const response = await api.delete(`/api/settings/experience/${experienceId}`);
  invalidateReadmeCache();
  return response.data.data;
}

export async function fetchDashboardSummary() {
  const response = await api.get('/api/dashboard');
  return response.data.data;
}

export async function generatePortfolioReadme(forceRefresh = false) {
  const response = await api.post('/api/portfolio/readme');
  return response.data.data;
}

// ── Sticker System ───────────────────────────────────
export async function fetchStickerStats() {
  const response = await api.get('/api/stickers');
  return response.data.data;
}

export async function unlockSticker(stickerId) {
  const response = await api.post('/api/stickers/unlock', { stickerId });
  return response.data.data;
}

export async function equipStickers(equippedStickers) {
  const response = await api.put('/api/stickers/equip', { equippedStickers });
  return response.data.data;
}

