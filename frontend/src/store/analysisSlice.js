import { createSlice } from '@reduxjs/toolkit';

/**
 * Transient analysis state — tracks the live progress of an in-flight
 * analysis stream. Unlike historySlice (persisted to localStorage),
 * this slice resets on page reload, which is the desired behavior
 * since the SSE stream itself cannot survive a reload.
 */
const initialState = {
  isSubmitting: false,
  globalError: '',
  selectedTab: 1,
  precheck: null,
  stage1: null,
  stage2: null,
  stage3: null,
  loadingStages: { precheck: false, stage1: false, stage2: false, stage3: false }
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setAnalysisSubmitting(state, action) {
      state.isSubmitting = action.payload;
    },
    setAnalysisGlobalError(state, action) {
      state.globalError = action.payload || '';
    },
    setAnalysisSelectedTab(state, action) {
      state.selectedTab = action.payload;
    },
    setAnalysisPrecheck(state, action) {
      state.precheck = action.payload;
    },
    setAnalysisStage1(state, action) {
      state.stage1 = action.payload;
      state.selectedTab = 1;
    },
    setAnalysisStage2(state, action) {
      state.stage2 = action.payload;
      // Auto-advance tab if user is still on a stage-1 tab
      if (state.selectedTab <= 3) {
        state.selectedTab = 4;
      }
    },
    setAnalysisStage3(state, action) {
      state.stage3 = action.payload;
      // Auto-advance tab if user is still on a stage-2 tab
      if (state.selectedTab <= 6) {
        state.selectedTab = 7;
      }
    },
    setAnalysisLoadingStages(state, action) {
      state.loadingStages = action.payload;
    },
    resetAnalysisLiveState(state) {
      state.isSubmitting = false;
      state.globalError = '';
      state.selectedTab = 1;
      state.precheck = null;
      state.stage1 = null;
      state.stage2 = null;
      state.stage3 = null;
      state.loadingStages = { precheck: false, stage1: false, stage2: false, stage3: false };
    },
    /**
     * Restore live state from persisted workspace data.
     * Called when the component mounts and finds a completed analysis in Redux.
     */
    hydrateFromWorkspace(state, action) {
      const ws = action.payload;
      if (!ws) return;
      state.precheck = ws.precheck || null;
      state.stage1 = ws.stage1 || null;
      state.stage2 = ws.stage2 || null;
      state.stage3 = ws.stage3 || null;
      state.selectedTab = ws.selectedTab || 1;
      state.isSubmitting = false;
      state.globalError = '';
      state.loadingStages = { precheck: false, stage1: false, stage2: false, stage3: false };
    }
  }
});

export const {
  setAnalysisSubmitting,
  setAnalysisGlobalError,
  setAnalysisSelectedTab,
  setAnalysisPrecheck,
  setAnalysisStage1,
  setAnalysisStage2,
  setAnalysisStage3,
  setAnalysisLoadingStages,
  resetAnalysisLiveState,
  hydrateFromWorkspace
} = analysisSlice.actions;

export const selectAnalysis = (state) => state.analysis;

export default analysisSlice.reducer;
