import { streamAnalysis } from './analyzeApi.js';
import { store } from '../store/authSlice.js';
import {
  setAnalysisWorkspace,
  setCurrentAnalysis,
  upsertAnalysisRecord
} from '../store/historySlice.js';
import {
  setAnalysisSubmitting,
  setAnalysisLoadingStages,
  setAnalysisGlobalError,
  setAnalysisPrecheck,
  setAnalysisStage1,
  setAnalysisStage2,
  setAnalysisStage3,
  resetAnalysisLiveState
} from '../store/analysisSlice.js';

/**
 * Singleton background analysis manager.
 * Keeps track of one active analysis stream at a time and dispatches
 * all state changes through Redux so results survive navigation.
 */
let activeController = null;
let snapshotRef = null;

export function getActiveController() {
  return activeController;
}

export function abortActiveAnalysis() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  snapshotRef = null;
}

/**
 * Start a background analysis stream.
 * @param {{ file: File, jobDescription: string }} payload
 * @param {{ selectedFileMeta: object }} meta
 */
export function startBackgroundAnalysis(payload, meta) {
  // Abort any existing analysis
  abortActiveAnalysis();

  const dispatch = store.dispatch;

  // Reset live state
  dispatch(resetAnalysisLiveState());
  dispatch(setAnalysisSubmitting(true));
  dispatch(setAnalysisGlobalError(''));
  dispatch(setAnalysisLoadingStages({ precheck: true, stage1: false, stage2: false, stage3: false }));

  // Initialize snapshot for tracking cumulative data
  snapshotRef = {
    localId: `analysis-${Date.now()}`,
    createdAt: new Date().toISOString(),
    selectedFileMeta: meta.selectedFileMeta,
    jobDescription: payload.jobDescription
  };

  // Persist initial workspace state
  dispatch(
    setAnalysisWorkspace({
      id: null,
      localId: snapshotRef.localId,
      createdAt: snapshotRef.createdAt,
      selectedFileMeta: meta.selectedFileMeta,
      jobDescription: payload.jobDescription,
      selectedTab: 1,
      precheck: null,
      stage1: null,
      stage2: null,
      stage3: null
    })
  );

  const controller = streamAnalysis(
    { file: payload.file, jobDescription: payload.jobDescription },
    {
      onPrecheck(data) {
        snapshotRef = { ...snapshotRef, precheck: data };
        dispatch(setAnalysisPrecheck(data));
        dispatch(setAnalysisLoadingStages({ precheck: false, stage1: data.canProceed, stage2: false, stage3: false }));
        syncWorkspace();
      },

      onStage1(data) {
        snapshotRef = {
          ...snapshotRef,
          stage1: data,
          companyName: data.companyName,
          matchedSkills: data.skillsPresent || [],
          confidenceScore: data.confidenceScore,
          summary: data.summary
        };
        dispatch(setAnalysisStage1(data));
        dispatch(setAnalysisLoadingStages({ precheck: false, stage1: false, stage2: true, stage3: true }));
        dispatch(
          setCurrentAnalysis({
            id: null,
            localId: snapshotRef.localId,
            createdAt: snapshotRef.createdAt,
            companyName: data.companyName,
            matchedSkills: data.skillsPresent || [],
            confidenceScore: data.confidenceScore,
            summary: data.summary
          })
        );
        syncWorkspace();
      },

      onAnalysisId(data) {
        snapshotRef = { ...snapshotRef, id: data.id };
        dispatch(
          setCurrentAnalysis({
            id: data.id,
            localId: snapshotRef.localId,
            createdAt: snapshotRef.createdAt,
            companyName: snapshotRef.companyName || null,
            matchedSkills: snapshotRef.matchedSkills || [],
            confidenceScore: snapshotRef.confidenceScore || 0,
            summary: snapshotRef.summary || ''
          })
        );
        dispatch(upsertAnalysisRecord({ ...snapshotRef }));
        syncWorkspace();
      },

      onStage2(data) {
        snapshotRef = { ...snapshotRef, stage2: data };
        dispatch(setAnalysisStage2(data));
        const currentLoading = store.getState().analysis.loadingStages;
        dispatch(setAnalysisLoadingStages({ ...currentLoading, stage2: false }));
        dispatch(upsertAnalysisRecord({ ...snapshotRef }));
        syncWorkspace();
      },

      onStage3(data) {
        snapshotRef = { ...snapshotRef, stage3: data };
        dispatch(setAnalysisStage3(data));
        const currentLoading = store.getState().analysis.loadingStages;
        dispatch(setAnalysisLoadingStages({ ...currentLoading, stage3: false }));
        dispatch(upsertAnalysisRecord({ ...snapshotRef }));
        syncWorkspace();
      },

      onDone() {
        dispatch(setAnalysisSubmitting(false));
        dispatch(setAnalysisLoadingStages({ precheck: false, stage1: false, stage2: false, stage3: false }));
        if (snapshotRef?.stage1) {
          dispatch(upsertAnalysisRecord({ ...snapshotRef }));
        }
        syncWorkspace();
        activeController = null;
      },

      onError(message) {
        dispatch(setAnalysisGlobalError(message));
        dispatch(setAnalysisSubmitting(false));
        dispatch(setAnalysisLoadingStages({ precheck: false, stage1: false, stage2: false, stage3: false }));
        activeController = null;
      }
    }
  );

  activeController = controller;
}

/**
 * Sync the current snapshot to the analysisWorkspace in Redux.
 */
function syncWorkspace() {
  if (!snapshotRef) return;

  const { analysis } = store.getState();

  store.dispatch(
    setAnalysisWorkspace({
      id: snapshotRef.id || null,
      localId: snapshotRef.localId || null,
      createdAt: snapshotRef.createdAt || null,
      selectedFileMeta: snapshotRef.selectedFileMeta,
      jobDescription: snapshotRef.jobDescription,
      selectedTab: analysis.selectedTab,
      precheck: snapshotRef.precheck || null,
      stage1: snapshotRef.stage1 || null,
      stage2: snapshotRef.stage2 || null,
      stage3: snapshotRef.stage3 || null
    })
  );
}
