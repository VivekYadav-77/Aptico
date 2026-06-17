'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from '@/lib/router-compat.jsx';
import { AdminRoute, ProtectedRoute } from '../components/ProtectedRoute.jsx';
import GuestDashboard from '../screens/GuestDashboard.jsx';
import { selectAuth } from '../store/authSlice.js';
import { trackEvent } from '../api/analyticsApi.js';
import { getRouteComponent } from './route-registry.jsx';

function LoadingShell() {
  return <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--muted-strong)]">Loading Aptico...</div>;
}

function RootRoute() {
  const auth = useSelector(selectAuth);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !auth.authReady) {
    return <LoadingShell />;
  }

  if (auth.isAuthenticated) {
    return <Navigate replace to={auth.user?.role === 'admin' ? '/admin' : '/squads'} />;
  }

  return <GuestDashboard />;
}

function AnalyticsRouteTracker() {
  const location = useLocation();
  const auth = useSelector(selectAuth);

  useEffect(() => {
    if (!auth.authReady) {
      return;
    }

    void trackEvent('page_view', {
      authenticated: auth.isAuthenticated,
      route: location.pathname
    }, {
      path: `${location.pathname}${location.search}`
    });
  }, [auth.authReady, auth.isAuthenticated, location.pathname, location.search]);

  return null;
}

export default function RouteClient({ name, guard = 'public' }) {
  if (name === 'root') {
    return (
      <>
        <AnalyticsRouteTracker />
        <RootRoute />
      </>
    );
  }

  const Component = getRouteComponent(name);

  if (!Component) {
    return <Navigate replace to="/" />;
  }

  if (guard === 'admin') {
    return (
      <AdminRoute>
        <AnalyticsRouteTracker />
        <Component />
      </AdminRoute>
    );
  }

  if (guard === 'protected') {
    return (
      <ProtectedRoute>
        <AnalyticsRouteTracker />
        <Component />
      </ProtectedRoute>
    );
  }

  return (
    <>
      <AnalyticsRouteTracker />
      <Component />
    </>
  );
}
