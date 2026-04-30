import api from './axios.js';
import { clearAuthSession, setAuthReady, setAuthSession, updateAccessToken } from '../store/authSlice.js';
import { invalidateReadmeCache } from './profileApi.js';

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
    requestUrl.includes('/api/auth/register') ||
    requestUrl.includes('/api/auth/login') ||
    requestUrl.includes('/api/auth/google') ||
    requestUrl.includes('/api/auth/verify-email/') ||
    requestUrl.includes('/api/auth/password/') ||
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
  const response = await api.post('/api/auth/verify-email/request', { email });
  return response.data.data;
}

function applySessionToStore(store, session) {
  store.dispatch(
    setAuthSession({
      user: session.user,
      accessToken: session.accessToken
    })
  );
}

export async function registerRequest(payload) {
  const response = await api.post('/api/auth/register', payload);
  return response.data.data;
}

export async function loginRequest(payload, store) {
  const response = await api.post('/api/auth/login', payload);
  const session = response.data.data;
  applySessionToStore(store, session);
  return session;
}

export async function loginWithGoogleRequest(credential, store) {
  const response = await api.post('/api/auth/google', { credential });
  const session = response.data.data;
  applySessionToStore(store, session);
  return session;
}

export async function verifyEmailRequest(token, store) {
  const response = await api.post('/api/auth/verify-email/confirm', { token });
  const session = response.data.data;
  applySessionToStore(store, session);
  return session;
}

export const verifyMagicLinkRequest = verifyEmailRequest;

export async function forgotPasswordRequest(email) {
  const response = await api.post('/api/auth/password/forgot', { email });
  return response.data.data;
}

export async function resetPasswordRequest(payload) {
  const response = await api.post('/api/auth/password/reset', payload);
  return response.data.data;
}

export async function requestEmailVerification(email) {
  const response = await api.post('/api/auth/verify-email/request', { email });
  return response.data.data;
}

export async function refreshSessionRequest(store) {
  const session = await runRefreshFlow();

  store.dispatch(updateAccessToken(session.accessToken));
  applySessionToStore(store, session);

  return session;
}

export async function bootstrapAuthSession(store) {
  try {
    await refreshSessionRequest(store);
  } catch (error) {
    store.dispatch(clearAuthSession());
  } finally {
    store.dispatch(setAuthReady(true));
  }
}

export async function logoutRequest(store) {
  try {
    await api.post('/api/auth/logout');
  } finally {
    invalidateReadmeCache();
    store.dispatch(clearAuthSession());
  }
}
