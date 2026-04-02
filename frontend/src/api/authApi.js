import api from './axios.js';
import { clearAuthSession, setAuthSession, updateAccessToken } from '../store/authSlice.js';

let interceptorsReady = false;
let activeStore = null;
let refreshPromise = null;

function getRequestUrl(config) {
  return `${config.baseURL || ''}${config.url || ''}`;
}

async function runRefreshFlow() {
  const response = await api.post('/api/auth/refresh');
  return response.data.data;
}

function isAuthenticationEndpoint(requestUrl) {
  return (
    requestUrl.includes('/api/auth/google') ||
    requestUrl.includes('/api/auth/magic-link') ||
    requestUrl.includes('/api/auth/verify') ||
    requestUrl.includes('/api/auth/refresh')
  );
}

export function setupAuthInterceptors(store) {
  if (interceptorsReady) {
    activeStore = store;
    return;
  }

  activeStore = store;

  api.interceptors.request.use((config) => {
    const accessToken = activeStore?.getState()?.auth?.accessToken;

    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (!originalRequest) {
        throw error;
      }

      const responseStatus = error.response?.status;
      const requestUrl = getRequestUrl(originalRequest);
      const isAuthRequest = isAuthenticationEndpoint(requestUrl);

      if (responseStatus !== 401 || originalRequest._retry || isAuthRequest) {
        throw error;
      }

      originalRequest._retry = true;

      try {
        refreshPromise = refreshPromise || runRefreshFlow();
        const refreshedSession = await refreshPromise;

        activeStore.dispatch(
          setAuthSession({
            user: refreshedSession.user,
            accessToken: refreshedSession.accessToken
          })
        );

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${refreshedSession.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        activeStore.dispatch(clearAuthSession());
        throw refreshError;
      } finally {
        refreshPromise = null;
      }
    }
  );

  interceptorsReady = true;
}

export async function sendMagicLinkRequest(email) {
  const response = await api.post('/api/auth/magic-link', { email });
  return response.data.data;
}

export async function verifyMagicLinkRequest(token, store) {
  const response = await api.post('/api/auth/verify', { token });
  const session = response.data.data;

  store.dispatch(
    setAuthSession({
      user: session.user,
      accessToken: session.accessToken
    })
  );

  return session;
}

export async function loginWithGoogleRequest(credential, store) {
  const response = await api.post('/api/auth/google', { credential });
  const session = response.data.data;

  store.dispatch(
    setAuthSession({
      user: session.user,
      accessToken: session.accessToken
    })
  );

  return session;
}

export async function refreshSessionRequest(store) {
  const session = await runRefreshFlow();

  store.dispatch(updateAccessToken(session.accessToken));
  store.dispatch(
    setAuthSession({
      user: session.user,
      accessToken: session.accessToken
    })
  );

  return session;
}
