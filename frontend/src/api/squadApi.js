import api from './axios.js';

export async function joinSquad(payload = {}) {
  const response = await api.post('/api/squads/join', payload);
  return response.data;
}

export async function getMySquad() {
  const response = await api.get('/api/squads/my-squad');
  return response.data;
}

export async function logSquadApplications(count = 1) {
  const response = await api.post('/api/squads/log-app', { count });
  return response.data;
}

export async function pingSquad(payload = {}) {
  const response = await api.post('/api/squads/ping', payload);
  return response.data;
}
