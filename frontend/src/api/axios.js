import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  },
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000),
  withCredentials: true
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data) {
      const data = error.response.data;
      let isHighDemand = error.response.status === 503;
      
      // Check for Google GenAI specific error structure or message
      const errorStr = JSON.stringify(data).toLowerCase();
      if (errorStr.includes('experiencing high demand') || errorStr.includes('unavailable') || errorStr.includes('503')) {
        isHighDemand = true;
      }

      if (isHighDemand) {
        const msg = 'Our AI systems are currently handling exceptionally high traffic. Please try again in a few moments.';
        error.message = msg;
        
        if (typeof data === 'object') {
          if (data.error && typeof data.error === 'object') {
            data.error.message = msg;
          } else {
            data.error = msg;
          }
          data.message = msg;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
