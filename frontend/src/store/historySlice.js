import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'aptico-history-state';

function readPersistedState() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
}

export function loadHistoryState() {
  const persistedState = readPersistedState();

  return (
    persistedState || {
      currentAnalysis: null,
      generatedItems: []
    }
  );
}

export function saveHistoryState(state) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures to avoid blocking the UI.
  }
}

const historySlice = createSlice({
  name: 'history',
  initialState: loadHistoryState(),
  reducers: {
    setCurrentAnalysis(state, action) {
      state.currentAnalysis = {
        ...action.payload,
        matchedSkills: Array.isArray(action.payload?.matchedSkills) ? action.payload.matchedSkills : []
      };
    },
    clearCurrentAnalysis(state) {
      state.currentAnalysis = null;
    },
    addGeneratedItem(state, action) {
      const incomingItem = action.payload;
      state.generatedItems = [
        incomingItem,
        ...state.generatedItems.filter(
          (item) =>
            !(
              item.analysisId === incomingItem.analysisId &&
              item.contentType === incomingItem.contentType &&
              item.jobId === incomingItem.jobId
            )
        )
      ].slice(0, 24);
    }
  }
});

export const { addGeneratedItem, clearCurrentAnalysis, setCurrentAnalysis } = historySlice.actions;
export const selectHistory = (state) => state.history;
export const selectCurrentAnalysis = (state) => state.history.currentAnalysis;
export default historySlice.reducer;
