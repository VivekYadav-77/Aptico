'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { setupAuthInterceptors, bootstrapAuthSession } from '../api/authApi.js';
import { getMyProfile } from '../api/socialApi.js';
import ProfileSetupModal from '../components/ProfileSetupModal.jsx';
import ScrollToTop from '../components/ScrollToTop.jsx';
import { CACHE_TIMES } from '../constants/index.js';
import { selectAuth, store } from '../store/authSlice.js';
import { ThemeProvider } from './theme.jsx';

setupAuthInterceptors(store);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIMES.DEFAULT,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
});

function AuthBootstrap({ children }) {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  useEffect(() => {
    void bootstrapAuthSession({ dispatch });
  }, [dispatch]);

  useEffect(() => {
    if (!auth.authReady || !auth.isAuthenticated || !auth.user?.id) {
      setShowProfileSetup(false);
      return;
    }

    const skipKey = `aptico-profile-setup-skipped:${auth.user.id}`;
    if (localStorage.getItem(skipKey) === 'true') {
      return;
    }

    getMyProfile()
      .then((profile) => setShowProfileSetup(!profile))
      .catch(() => null);
  }, [auth.authReady, auth.isAuthenticated, auth.user?.id]);

  return (
    <>
      <Suspense fallback={null}>
        <ScrollToTop />
        {children}
      </Suspense>
      <ProfileSetupModal
        open={showProfileSetup}
        onSaved={() => setShowProfileSetup(false)}
        onClose={() => {
          if (auth.user?.id) {
            localStorage.setItem(`aptico-profile-setup-skipped:${auth.user.id}`, 'true');
          }
          setShowProfileSetup(false);
        }}
      />
    </>
  );
}

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeProvider>
          <AuthBootstrap>{children}</AuthBootstrap>
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>
  );
}
