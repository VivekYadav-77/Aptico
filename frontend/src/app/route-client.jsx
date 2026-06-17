'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from '@/lib/router-compat.jsx';
import { AdminRoute, ProtectedRoute } from '../components/ProtectedRoute.jsx';
import AnalysisHistoryPage from '../screens/AnalysisHistoryPage.jsx';
import AnalysisWorkspace from '../screens/AnalysisWorkspace.jsx';
import AuthPermanent from '../screens/AuthPermanent.jsx';
import CommunityWins from '../screens/CommunityWins.jsx';
import ControlCenter from '../screens/ControlCenter.jsx';
import ContactSupport from '../screens/ContactSupport.jsx';
import DocArticlePage from '../features/docs/pages/DocArticlePage.jsx';
import DocsHubPage from '../features/docs/pages/DocsHubPage.jsx';
import GuestDashboard from '../screens/GuestDashboard.jsx';
import HomeFeed from '../screens/HomeFeed.jsx';
import InterviewPrepPage from '../screens/InterviewPrepPage.jsx';
import LatestAnalysisPage from '../screens/LatestAnalysisPage.jsx';
import MainDashboard from '../screens/MainDashboard.jsx';
import ModernJobSearchPage from '../screens/ModernJobSearchPage.jsx';
import Notifications from '../screens/Notifications.jsx';
import PeopleDiscovery from '../screens/PeopleDiscovery.jsx';
import PortfolioGenerator from '../screens/PortfolioGenerator.jsx';
import ProfilePage from '../screens/ProfilePage.jsx';
import PublicProfile from '../screens/PublicProfile.jsx';
import ResilienceDetailsPage from '../screens/ResilienceDetailsPage.jsx';
import RewardsPage from '../screens/RewardsPage.jsx';
import SavedJobsPage from '../screens/SavedJobsPage.jsx';
import SettingsPage from '../screens/SettingsPage.jsx';
import ShadowResume from '../screens/ShadowResume.jsx';
import SquadDashboard from '../screens/SquadDashboard.jsx';
import SquadLeaderboardPage from '../screens/SquadLeaderboardPage.jsx';
import SupportCenter from '../screens/SupportCenter.jsx';
import LegalPage from '../screens/LegalPage.jsx';
import { selectAuth } from '../store/authSlice.js';
import { trackEvent } from '../api/analyticsApi.js';

const routes = {
  analysis: AnalysisWorkspace,
  analysisHistory: AnalysisHistoryPage,
  auth: AuthPermanent,
  communityWins: CommunityWins,
  controlCenter: ControlCenter,
  contactSupport: ContactSupport,
  docArticle: DocArticlePage,
  docsHub: DocsHubPage,
  guest: GuestDashboard,
  home: HomeFeed,
  interviewPrep: InterviewPrepPage,
  latestAnalysis: LatestAnalysisPage,
  mainDashboard: MainDashboard,
  modernJobSearch: ModernJobSearchPage,
  notifications: Notifications,
  peopleDiscovery: PeopleDiscovery,
  portfolioGenerator: PortfolioGenerator,
  profile: ProfilePage,
  publicProfile: PublicProfile,
  resilienceDetails: ResilienceDetailsPage,
  rewards: RewardsPage,
  savedJobs: SavedJobsPage,
  settings: SettingsPage,
  shadowResume: ShadowResume,
  squadLeaderboard: SquadLeaderboardPage,
  squads: SquadDashboard,
  support: SupportCenter,
  legal: LegalPage
};

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

  const Component = routes[name];

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
