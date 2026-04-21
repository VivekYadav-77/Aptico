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
      const requestUrl = String(error.config?.url || '').toLowerCase();
      const errorStr = JSON.stringify(data).toLowerCase();
      const isAiRoute =
        requestUrl.includes('/analysis') ||
        requestUrl.includes('/resume') ||
        requestUrl.includes('/portfolio') ||
        requestUrl.includes('/generate') ||
        requestUrl.includes('/genai') ||
        requestUrl.includes('/ai');
      const hasAiSignal =
        errorStr.includes('google') ||
        errorStr.includes('gemini') ||
        errorStr.includes('genai') ||
        errorStr.includes('ai systems') ||
        errorStr.includes('experiencing high demand') ||
        errorStr.includes('model overloaded');
      const isHighDemand = error.response.status === 503 && (isAiRoute || hasAiSignal);

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
