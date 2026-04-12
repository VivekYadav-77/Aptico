import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'aptico-history-state';
// Removed MAX_ANALYSIS_HISTORY to keep all records
const EMPTY_STATE = {
  currentAnalysis: null,
  analysisHistory: [],
  analysisWorkspace: null,
  jobSearchState: null,
  generatedItems: []
};

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

function normalizeAnalysisSummary(analysis) {
  if (!analysis) {
    return null;
  }

  return {
    ...analysis,
    matchedSkills: Array.isArray(analysis.matchedSkills) ? analysis.matchedSkills : [],
    createdAt: analysis.createdAt || new Date().toISOString()
  };
}

function normalizeAnalysisRecord(record) {
  if (!record) {
    return null;
  }

  const stage1 = record.stage1 || null;

  return {
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
    stage1,
    stage2: record.stage2 || null,
    stage3: record.stage3 || null,
    precheck: record.precheck || null,
    selectedFileMeta: record.selectedFileMeta || null,
    jobDescription: record.jobDescription || '',
    summary: record.summary || stage1?.summary || '',
    companyName: record.companyName || stage1?.companyName || '',
    confidenceScore: record.confidenceScore ?? stage1?.confidenceScore ?? 0,
    matchedSkills: Array.isArray(record.matchedSkills)
      ? record.matchedSkills
      : Array.isArray(stage1?.skillsPresent)
        ? stage1.skillsPresent
        : []
  };
}

function sortAnalyses(items) {
  return [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function upsertAnalysis(history, incomingRecord) {
  const normalizedRecord = normalizeAnalysisRecord(incomingRecord);

  if (!normalizedRecord) {
    return history;
  }

  const nextHistory = history.filter((item) => {
    if (normalizedRecord.id && item.id) {
      return item.id !== normalizedRecord.id;
    }

    if (normalizedRecord.localId && item.localId) {
      return item.localId !== normalizedRecord.localId;
    }

    return true;
  });

  return sortAnalyses([normalizedRecord, ...nextHistory]);
}

function removeAnalysis(history, payload) {
  return history.filter((item) => {
    if (payload?.id && item.id) {
      return item.id !== payload.id;
    }

    if (payload?.localId && item.localId) {
      return item.localId !== payload.localId;
    }

    return true;
  });
}



export function loadHistoryState() {
  const persistedState = readPersistedState();

  if (!persistedState) {
    return EMPTY_STATE;
  }

  return {
    ...EMPTY_STATE,
    ...persistedState,
    currentAnalysis: normalizeAnalysisSummary(persistedState.currentAnalysis),
    analysisHistory: sortAnalyses((persistedState.analysisHistory || []).map(normalizeAnalysisRecord).filter(Boolean)),
    analysisWorkspace: persistedState.analysisWorkspace ? normalizeAnalysisRecord(persistedState.analysisWorkspace) : null,
    generatedItems: Array.isArray(persistedState.generatedItems) ? persistedState.generatedItems : [],
    jobSearchState: persistedState.jobSearchState || null
  };
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
      state.currentAnalysis = normalizeAnalysisSummary(action.payload);
    },
    clearCurrentAnalysis(state) {
      state.currentAnalysis = null;
    },
    upsertAnalysisRecord(state, action) {
      state.analysisHistory = upsertAnalysis(state.analysisHistory, action.payload);
    },
    removeAnalysisRecord(state, action) {
      state.analysisHistory = removeAnalysis(state.analysisHistory, action.payload);

      if (
        (action.payload?.id && state.currentAnalysis?.id === action.payload.id) ||
        (action.payload?.localId && state.currentAnalysis?.localId === action.payload.localId)
      ) {
        state.currentAnalysis = null;
      }

      if (
        (action.payload?.id && state.analysisWorkspace?.id === action.payload.id) ||
        (action.payload?.localId && state.analysisWorkspace?.localId === action.payload.localId)
      ) {
        state.analysisWorkspace = null;
      }

      state.generatedItems = state.generatedItems.filter((item) => item.analysisId !== action.payload?.id);
    },
    clearAnalysisHistory(state) {
      state.analysisHistory = [];
      state.currentAnalysis = null;
      state.analysisWorkspace = null;
      state.generatedItems = [];
    },
    removeInterviewPrep(state, action) {
      state.analysisHistory = state.analysisHistory.map((item) => {
        if (action.payload?.id && item.id === action.payload.id) {
          return { ...item, hideInterviewPrep: true };
        }

        if (action.payload?.localId && item.localId === action.payload.localId) {
          return { ...item, hideInterviewPrep: true };
        }

        return item;
      });
    },
    clearInterviewPrep(state) {
      state.analysisHistory = state.analysisHistory.map((item) => ({ ...item, hideInterviewPrep: true }));
    },
    setAnalysisWorkspace(state, action) {
      state.analysisWorkspace = normalizeAnalysisRecord(action.payload);
    },
    clearAnalysisWorkspace(state) {
      state.analysisWorkspace = null;
    },
    setJobSearchState(state, action) {
      state.jobSearchState = action.payload || null;
    },
    clearJobSearchState(state) {
      state.jobSearchState = null;
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
    },
    clearGeneratedItemsForAnalysis(state, action) {
      state.generatedItems = state.generatedItems.filter((item) => item.analysisId !== action.payload);
    }
  }
});

export const {
  addGeneratedItem,
  clearAnalysisHistory,
  clearAnalysisWorkspace,
  clearCurrentAnalysis,
  clearGeneratedItemsForAnalysis,
  clearInterviewPrep,
  clearJobSearchState,
  removeAnalysisRecord,
  removeInterviewPrep,
  setAnalysisWorkspace,
  setCurrentAnalysis,
  setJobSearchState,
  upsertAnalysisRecord
} = historySlice.actions;

export const selectHistory = (state) => state.history;
export const selectCurrentAnalysis = (state) => state.history.currentAnalysis;
export const selectAnalysisHistory = (state) => state.history.analysisHistory;
export const selectAnalysisWorkspace = (state) => state.history.analysisWorkspace;
export const selectJobSearchState = (state) => state.history.jobSearchState;

export default historySlice.reducer;
