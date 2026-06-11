import { clearAuthSession, store } from '../store/authSlice.js';
import { refreshSessionRequest } from './authApi.js';
import api from './axios.js';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function formatAnalysisError(errorJson, fallback) {
  const message = errorJson?.error || errorJson?.message || fallback;

  if (errorJson?.code === 'FEATURE_RESTRICTED') {
    return message ? `Access restricted: ${message}` : 'Access restricted: Resume analysis is restricted on your account.';
  }

  return message;
}

function getAuthHeaders() {
  const token = store.getState()?.auth?.accessToken;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  return {};
}

async function refreshAnalysisSession() {
  try {
    const session = await refreshSessionRequest(store);

    return session;
  } catch (error) {
    store.dispatch(clearAuthSession());
    throw error;
  }
}

/**
 * Streams a resume analysis via Server-Sent Events.
 *
 * @param {{ file: File, jobDescription: string }} payload
 * @param {{ onPrecheck, onStage1, onStage2, onStage3, onAnalysisId, onError, onDone }} callbacks
 * @returns {AbortController} - call .abort() to cancel the stream
 */
export function streamAnalysis(payload, callbacks) {
  const controller = new AbortController();

  (async () => {
    try {
      if (!payload?.file || typeof payload.file.arrayBuffer !== 'function') {
        callbacks.onError?.('Please choose a PDF or DOCX resume first.');
        callbacks.onDone?.();
        return;
      }

      const arrayBuffer = await payload.file.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      const contentBase64 = btoa(binary);

      const requestBody = JSON.stringify({
        file: {
          name: payload.file.name,
          type: payload.file.type || 'application/pdf',
          size: payload.file.size,
          contentBase64
        },
        jobDescription: payload.jobDescription
      });

      const sendAnalysisRequest = () =>
        fetch(`${API_BASE}api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...getAuthHeaders()
          },
          credentials: 'include',
          signal: controller.signal,
          body: requestBody
        });

      let response = await sendAnalysisRequest();

      if (response.status === 401 && store.getState()?.auth?.isAuthenticated) {
        await refreshAnalysisSession();
        response = await sendAnalysisRequest();
      }

      if (!response.ok) {
        let errorMsg = 'Analysis failed.';
        try {
          const errorJson = await response.json();
          errorMsg = formatAnalysisError(errorJson, errorMsg);
        } catch (e) {
          // couldn't parse error response
        }
        callbacks.onError?.(errorMsg);
        callbacks.onDone?.();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              switch (currentEvent) {
                case 'precheck':
                  callbacks.onPrecheck?.(data);
                  break;
                case 'stage1':
                  callbacks.onStage1?.(data);
                  break;
                case 'stage2':
                  callbacks.onStage2?.(data);
                  break;
                case 'stage3':
                  callbacks.onStage3?.(data);
                  break;
                case 'analysisId':
                  callbacks.onAnalysisId?.(data);
                  break;
                case 'stage1_error':
                case 'stage2_error':
                case 'stage3_error':
                  callbacks.onError?.(data.error, currentEvent.replace('_error', ''));
                  break;
                case 'done':
                  callbacks.onDone?.(data);
                  break;
              }
            } catch (e) {
              // Skip malformed data lines
            }
            currentEvent = '';
          }
        }
      }

      callbacks.onDone?.();
    } catch (error) {
      if (error.name !== 'AbortError') {
        callbacks.onError?.(error.message || 'Analysis failed.');
        callbacks.onDone?.();
      }
    }
  })();

  return controller;
}

export async function checkAnalysisAccess() {
  const response = await api.get('/api/analyze/access');
  return response.data;
}
