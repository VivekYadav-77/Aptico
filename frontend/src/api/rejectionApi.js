import api from './axios.js';

export async function createRejectionLog(payload) {
  const response = await api.post('/api/rejections', payload);
  return response.data.data;
}
