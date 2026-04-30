import api from './axios.js';

export async function joinSquad(payload = {}) {
  const response = await api.post('/api/squads/join', payload);
  return response.data;
}

export async function getMySquad() {
  const response = await api.get('/api/squads/my-squad');
  return response.data;
}

export async function logSquadApplications(payload) {
  const response = await api.post('/api/squads/log-app', payload);
  return response.data;
}

export async function pingSquad(payload = {}) {
  const response = await api.post('/api/squads/ping', payload);
  return response.data;
}

export async function getSquadComms() {
  const response = await api.get('/api/squads/comms');
  return response.data.data;
}

export async function postSquadMessage(payload) {
  const response = await api.post('/api/squads/comms/message', payload);
  return response.data.data;
}

export async function setSquadArchetype(role) {
  const response = await api.post('/api/squads/comms/archetype', { role });
  return response.data.data;
}
