import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import { bootstrapAuthSession } from './api/authApi.js';
import { getMyProfile } from './api/socialApi.js';
import ProfileSetupModal from './components/ProfileSetupModal.jsx';
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute.jsx';
import { selectAuth } from './store/authSlice.js';
import AnalysisHistoryPage from './pages/AnalysisHistoryPage.jsx';
import AnalysisWorkspace from './pages/AnalysisWorkspace.jsx';
import AuthPermanent from './pages/AuthPermanent.jsx';
import CommunityWins from './pages/CommunityWins.jsx';
import ControlCenter from './pages/ControlCenter.jsx';
import GuestDashboard from './pages/GuestDashboard.jsx';
import InterviewPrepPage from './pages/InterviewPrepPage.jsx';
import LatestAnalysisPage from './pages/LatestAnalysisPage.jsx';
import MainDashboard from './pages/MainDashboard.jsx';
import ModernJobSearchPage from './pages/ModernJobSearchPage.jsx';
import Notifications from './pages/Notifications.jsx';
import PeopleDiscovery from './pages/PeopleDiscovery.jsx';
import PortfolioGenerator from './pages/PortfolioGenerator.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import SavedJobsPage from './pages/SavedJobsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ShadowResume from './pages/ShadowResume.jsx';
import SquadDashboard from './pages/SquadDashboard.jsx';

function RootRoute() {
  const auth = useSelector(selectAuth);

  if (!auth.authReady) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--muted-strong)]">Loading Aptico...</div>;
  }

  return auth.isAuthenticated ? <Navigate replace to="/squads" /> : <GuestDashboard />;
}

export default function App() {
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
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/auth" element={<AuthPermanent />} />
        <Route path="/login" element={<AuthPermanent />} />
        <Route path="/signup" element={<AuthPermanent />} />
        <Route path="/guest" element={<GuestDashboard />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="/hire/:username" element={<ShadowResume />} />
        <Route path="/wins" element={<CommunityWins />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Navigate replace to="/squads" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/squads"
          element={
            <ProtectedRoute>
              <SquadDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people"
          element={
            <ProtectedRoute>
              <PeopleDiscovery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <ProtectedRoute>
              <AnalysisWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis-history"
          element={
            <ProtectedRoute>
              <AnalysisHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <ModernJobSearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis/latest"
          element={
            <ProtectedRoute>
              <LatestAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved-jobs"
          element={
            <ProtectedRoute>
              <SavedJobsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview-prep"
          element={
            <ProtectedRoute>
              <InterviewPrepPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portfolio-generator"
          element={
            <ProtectedRoute>
              <PortfolioGenerator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <ControlCenter />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
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
