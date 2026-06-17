import api from './axios.js';

const VISITOR_ID_KEY = 'aptico_visitor_id';
const SESSION_KEY = 'aptico_session_key';
const OPT_OUT_KEY = 'aptico_analytics_opt_out';

function createId(prefix) {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}_${randomId}`;
}

function readStorageValue(key, fallbackFactory) {
  if (typeof window === 'undefined') {
    return null;
  }

  const existingValue = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
  if (existingValue) {
    return existingValue;
  }

  const nextValue = fallbackFactory();
  const storage = key === SESSION_KEY ? window.sessionStorage : window.localStorage;
  storage.setItem(key, nextValue);
  return nextValue;
}

export function isAnalyticsOptedOut() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(OPT_OUT_KEY) === 'true';
}

export function setAnalyticsOptOut(value) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(OPT_OUT_KEY, value ? 'true' : 'false');
}

export async function trackEvent(eventType, metadata = {}, options = {}) {
  if (typeof window === 'undefined') {
    return { recorded: false };
  }

  const analyticsOptOut = isAnalyticsOptedOut();
  const visitorId = readStorageValue(VISITOR_ID_KEY, () => createId('visitor'));
  const sessionKey = readStorageValue(SESSION_KEY, () => createId('session'));
  const path = options.path || `${window.location.pathname}${window.location.search}`;
  const referrer = options.referrer ?? (document.referrer || null);

  try {
    const response = await api.post('/api/analytics/event', {
      eventType,
      visitorId,
      sessionKey,
      path,
      referrer,
      metadata,
      analyticsOptOut
    });

    return response.data?.data || { recorded: true };
  } catch {
    return { recorded: false };
  }
}

export function trackApiError(error, metadata = {}) {
  const status = error?.response?.status || null;
  const requestUrl = error?.config?.url || null;

  return trackEvent('api_error', {
    status,
    requestUrl,
    ...metadata
  });
}
