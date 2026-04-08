import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from '../store/authSlice.js';

function AuthGateShell({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-8 py-10 text-center shadow-[var(--shadow-soft)]">
        <p className="mono-text text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Aptico auth</p>
        <p className="mt-4 text-sm text-[var(--muted-strong)]">{message}</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const auth = useSelector(selectAuth);
  const location = useLocation();

  if (!auth.authReady) {
    return <AuthGateShell message="Restoring your secure session..." />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace to="/auth" state={{ from: location.pathname }} />;
  }

  return children;
}

export function AdminRoute({ children }) {
  const auth = useSelector(selectAuth);

  if (!auth.authReady) {
    return <AuthGateShell message="Checking your access..." />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace to="/auth" />;
  }

  if (auth.user?.role !== 'admin') {
    return <Navigate replace to="/dashboard" />;
  }

  return children;
}
