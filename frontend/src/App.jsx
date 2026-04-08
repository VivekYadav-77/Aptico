import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import { bootstrapAuthSession } from './api/authApi.js';
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute.jsx';
import AnalysisWorkspace from './pages/AnalysisWorkspace.jsx';
import AuthPermanent from './pages/AuthPermanent.jsx';
import ControlCenter from './pages/ControlCenter.jsx';
import GuestDashboard from './pages/GuestDashboard.jsx';
import LandingPage from './pages/LandingPage.jsx';
import MainDashboard from './pages/MainDashboard.jsx';
import ModernJobSearchPage from './pages/ModernJobSearchPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    void bootstrapAuthSession({ dispatch });
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPermanent />} />
      <Route path="/guest" element={<GuestDashboard />} />
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
        path="/jobs"
        element={
          <ProtectedRoute>
            <ModernJobSearchPage />
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
  );
}
