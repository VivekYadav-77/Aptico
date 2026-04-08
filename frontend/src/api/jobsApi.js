import api from './axios.js';

export async function fetchJobs(params) {
  const response = await api.get('/api/jobs', {
    params
  });

  return response.data.data;
}

