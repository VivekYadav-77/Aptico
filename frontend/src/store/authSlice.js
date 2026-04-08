import { configureStore, createSlice } from '@reduxjs/toolkit';
import historyReducer, { loadHistoryState, saveHistoryState } from './historySlice.js';

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  guestMode: false,
  authReady: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.guestMode = false;
      state.authReady = true;
    },
    updateAccessToken(state, action) {
      state.accessToken = action.payload;
      state.isAuthenticated = Boolean(action.payload && state.user);
      state.authReady = true;
    },
    clearAuthSession(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.guestMode = false;
      state.authReady = true;
    },
    enterGuestMode(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.guestMode = true;
      state.authReady = true;
    },
    exitGuestMode(state) {
      state.guestMode = false;
    },
    setAuthReady(state, action) {
      state.authReady = Boolean(action.payload);
    }
  }
});

export const { clearAuthSession, enterGuestMode, exitGuestMode, setAuthReady, setAuthSession, updateAccessToken } =
  authSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    history: historyReducer
  },
  preloadedState: {
    history: loadHistoryState()
  }
});

store.subscribe(() => {
  saveHistoryState(store.getState().history);
});

export const selectAuth = (state) => state.auth;
export default authSlice.reducer;
