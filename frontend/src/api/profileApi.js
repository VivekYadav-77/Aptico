import api from './axios.js';

export async function fetchProfileSettings() {
  const response = await api.get('/api/profile');
  return response.data.data;
}

export async function saveProfileSettings(profile) {
  const response = await api.put('/api/profile', profile);
  return response.data.data;
}

export async function saveExperience(experience) {
  const response = await api.post('/api/settings/experience', experience);
  return response.data.data;
}

export async function removeExperience(experienceId) {
  const response = await api.delete(`/api/settings/experience/${experienceId}`);
  return response.data.data;
}

export async function fetchDashboardSummary() {
  const response = await api.get('/api/dashboard');
  return response.data.data;
}

export async function generatePortfolioReadme() {
  const response = await api.post('/api/portfolio/readme');
  return response.data.data;
}
