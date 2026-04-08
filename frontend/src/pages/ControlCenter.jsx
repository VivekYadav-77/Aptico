import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios.js';
import AppShell from '../components/AppShell.jsx';
import { selectAuth } from '../store/authSlice.js';

const ADMIN_DASHBOARD_QUERY = `
  query AdminDashboard {
    adminOverview {
      totalUsers
      totalAnalyses
      totalGeneratedContent
      totalSavedJobs
      totalApiRequests
      activeRefreshTokens
      revokedRefreshTokens
    }
    apiUsageMetrics {
      sourceName
      date
      requestCount
      last429At
    }
    adminUsers {
      id
      email
      name
      role
      createdAt
      lastLogin
      activeSessionCount
      analysesCount
      savedJobsCount
    }
  }
`;

function formatDate(value) {
  if (!value) return 'Never';
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toLocaleString();
}

export default function ControlCenter() {
  const auth = useSelector(selectAuth);
  const [roleCheckComplete, setRoleCheckComplete] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dashboardData, setDashboardData] = useState({ adminOverview: null, apiUsageMetrics: [], adminUsers: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsAuthorized(auth.user?.role === 'admin');
    setRoleCheckComplete(true);
  }, [auth.user?.role]);

  useEffect(() => {
    if (!roleCheckComplete || !isAuthorized) {
      setIsLoading(false);
      return;
    }

    let isActive = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.post('/admin/graphql', { query: ADMIN_DASHBOARD_QUERY });
        if (!isActive) return;

        const graphQlError = response.data?.errors?.[0]?.message;
        if (graphQlError) throw new Error(graphQlError);

        setDashboardData({
          adminOverview: response.data?.data?.adminOverview || null,
          apiUsageMetrics: response.data?.data?.apiUsageMetrics || [],
          adminUsers: response.data?.data?.adminUsers || []
        });
      } catch (requestError) {
        if (isActive) {
          setError(requestError.response?.data?.error || requestError.message || 'Could not load the admin dashboard.');
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      isActive = false;
    };
  }, [isAuthorized, roleCheckComplete]);

  const usageTotal = dashboardData.apiUsageMetrics.reduce((sum, item) => sum + item.requestCount, 0);
  const pieBackground = useMemo(() => {
    if (!usageTotal) {
      return 'conic-gradient(#475569 0deg 360deg)';
    }

    const palette = ['#4ade80', '#38bdf8', '#f59e0b', '#f472b6', '#a78bfa', '#fb7185'];
    let cursor = 0;
    const parts = dashboardData.apiUsageMetrics.map((item, index) => {
      const angle = (item.requestCount / usageTotal) * 360;
      const start = cursor;
      cursor += angle;
      return `${palette[index % palette.length]} ${start}deg ${cursor}deg`;
    });

    return `conic-gradient(${parts.join(', ')})`;
  }, [dashboardData.apiUsageMetrics, usageTotal]);

  const serviceCards = useMemo(
    () =>
      dashboardData.apiUsageMetrics.map((metric) => {
        const hadRecent429 = Boolean(metric.last429At && Date.now() - new Date(metric.last429At).getTime() < 1000 * 60 * 60 * 24 * 7);
        return {
          name: metric.sourceName,
          status: hadRecent429 ? 'Watch' : 'Healthy',
          detail: hadRecent429 ? `Last 429 at ${formatDate(metric.last429At)}` : 'No recent rate-limit pressure detected.',
          requests: metric.requestCount
        };
      }),
    [dashboardData.apiUsageMetrics]
  );

  if (!roleCheckComplete) return null;
  if (!isAuthorized) return <Navigate replace to="/" />;

  return (
    <AppShell
      title="Admin dashboard"
      description="The admin view now replaces the old revenue emphasis with service health, usage composition, and practical operational signals for Aptico."
    >
      {error ? <div className="mb-6 rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-rose-300">{error}</div> : null}

      {isLoading ? (
        <div className="app-panel text-center text-sm text-[var(--muted-strong)]">Loading admin data…</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Total users', dashboardData.adminOverview?.totalUsers || 0],
              ['Analyses', dashboardData.adminOverview?.totalAnalyses || 0],
              ['Generated items', dashboardData.adminOverview?.totalGeneratedContent || 0],
              ['Saved jobs', dashboardData.adminOverview?.totalSavedJobs || 0],
              ['API requests', dashboardData.adminOverview?.totalApiRequests || 0],
              ['Active sessions', dashboardData.adminOverview?.activeRefreshTokens || 0],
              ['Revoked sessions', dashboardData.adminOverview?.revokedRefreshTokens || 0]
            ].map(([label, value]) => (
              <article key={label} className="app-panel-soft">
                <p className="app-field-label">{label}</p>
                <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--text)]">{value}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="app-panel">
              <p className="app-kicker">Usage composition</p>
              <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row">
                <div className="relative h-56 w-56 rounded-full" style={{ background: pieBackground }}>
                  <div className="absolute inset-8 rounded-full bg-[var(--panel)]" />
                  <div className="absolute inset-0 flex items-center justify-center text-center">
                    <div>
                      <p className="text-3xl font-black text-[var(--text)]">{usageTotal || 0}</p>
                      <p className="app-field-label mt-2">tracked requests</p>
                    </div>
                  </div>
                </div>

                <div className="grid flex-1 gap-3">
                  {dashboardData.apiUsageMetrics.map((metric) => (
                    <div key={`${metric.sourceName}-${metric.date}`} className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--text)]">{metric.sourceName}</p>
                        <span className="text-sm text-[var(--muted-strong)]">{metric.requestCount}</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted-strong)]">Last 429: {formatDate(metric.last429At)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="app-panel">
              <p className="app-kicker">Service health</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {serviceCards.map((service) => (
                  <div key={service.name} className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--text)]">{service.name}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${service.status === 'Healthy' ? 'bg-emerald-500/12 text-emerald-300' : 'bg-amber-500/12 text-amber-300'}`}>{service.status}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">{service.detail}</p>
                    <p className="mt-3 text-sm text-[var(--text)]">{service.requests} requests tracked</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-6 app-panel">
            <p className="app-kicker">User health</p>
            <div className="mt-5 grid gap-4">
              {dashboardData.adminUsers.map((user) => (
                <article key={user.id} className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[var(--text)]">{user.name || user.email}</p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">{user.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="app-chip">{user.role}</span>
                        <span className="app-chip">{user.activeSessionCount} active sessions</span>
                        <span className="app-chip">{user.analysesCount} analyses</span>
                      </div>
                    </div>
                    <div className="text-sm leading-7 text-[var(--muted-strong)]">
                      <p>Joined: {formatDate(user.createdAt)}</p>
                      <p>Last login: {formatDate(user.lastLogin)}</p>
                      <p>Saved jobs: {user.savedJobsCount}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
