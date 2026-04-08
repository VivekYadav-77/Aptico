import api from './axios.js';

export async function fetchProfileSettings() {
  const response = await api.get('/api/profile');
  return response.data.data;
}

export async function saveProfileSettings(profile) {
  const response = await api.put('/api/profile', profile);
  return response.data.data;
}

export async function fetchDashboardSummary() {
  const response = await api.get('/api/dashboard');
  return response.data.data;
}
