import api from './axios.js';

export async function fetchJobs(params) {
  const response = await api.get('/api/jobs', {
    params
  });

  return response.data.data;
}

export async function deleteSavedJob(savedJobId) {
  const response = await api.delete(`/api/jobs/save/${savedJobId}`);
  return response.data.data;
}

export async function deleteAllSavedJobs() {
  const response = await api.delete('/api/jobs/save');
  return response.data.data;
}
