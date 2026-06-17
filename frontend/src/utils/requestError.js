export function isRestrictionError(error) {
  return error?.response?.data?.code === 'FEATURE_RESTRICTED';
}

export function isRestrictionMessage(message) {
  return /restricted|blocked from platform access|currently unavailable/i.test(String(message || ''));
}

export function getRequestErrorMessage(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data;
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.code === 'FEATURE_RESTRICTED' ? `Access restricted: ${data.error}` : data.error;
  }
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof data?.error?.message === 'string' && data.error.message.trim()) return data.error.message;
  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  return fallback;
}
