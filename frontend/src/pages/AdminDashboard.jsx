import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios.js';
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
      avatarUrl
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
  if (!value) {
    return 'Never';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
}

export default function AdminDashboard() {
  const auth = useSelector(selectAuth);
  const [roleCheckComplete, setRoleCheckComplete] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    adminOverview: null,
    apiUsageMetrics: [],
    adminUsers: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [revokingUserId, setRevokingUserId] = useState('');

  useEffect(() => {
    const userRole = auth.user?.role;
    setIsAuthorized(userRole === 'admin');
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
        const response = await api.post('/admin/graphql', {
          query: ADMIN_DASHBOARD_QUERY
        });

        if (!isActive) {
          return;
        }

        const graphQlError = response.data?.errors?.[0]?.message;

        if (graphQlError) {
          throw new Error(graphQlError);
        }

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
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, [isAuthorized, roleCheckComplete]);

  async function handleRevoke(userId) {
    setRevokingUserId(userId);
    setError('');
    setStatus('');

    try {
      const response = await api.post(`/api/admin/revoke/${userId}`);
      setStatus(`Revoked ${response.data?.data?.revokedSessionCount || 0} active sessions.`);

      const refreshedResponse = await api.post('/admin/graphql', {
        query: ADMIN_DASHBOARD_QUERY
      });

      const graphQlError = refreshedResponse.data?.errors?.[0]?.message;

      if (graphQlError) {
        throw new Error(graphQlError);
      }

      setDashboardData({
        adminOverview: refreshedResponse.data?.data?.adminOverview || null,
        apiUsageMetrics: refreshedResponse.data?.data?.apiUsageMetrics || [],
        adminUsers: refreshedResponse.data?.data?.adminUsers || []
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Could not revoke the selected user.');
    } finally {
      setRevokingUserId('');
    }
  }

  if (!roleCheckComplete) {
    return null;
  }

  if (!isAuthorized) {
    return <Navigate replace to="/" />;
  }

  const overviewCards = [
    ['Users', dashboardData.adminOverview?.totalUsers || 0],
    ['Analyses', dashboardData.adminOverview?.totalAnalyses || 0],
    ['Generated', dashboardData.adminOverview?.totalGeneratedContent || 0],
    ['Saved Jobs', dashboardData.adminOverview?.totalSavedJobs || 0],
    ['API Requests', dashboardData.adminOverview?.totalApiRequests || 0],
    ['Active Sessions', dashboardData.adminOverview?.activeRefreshTokens || 0],
    ['Revoked Sessions', dashboardData.adminOverview?.revokedRefreshTokens || 0]
  ];

  const maxMetricValue = Math.max(...dashboardData.apiUsageMetrics.map((item) => item.requestCount), 1);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_36%),linear-gradient(180deg,_#020617_0%,_#020617_35%,_#0f172a_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Aptico Admin</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Platform usage and session control</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            Review aggregate platform activity, inspect per-source request volume, and revoke active user sessions immediately.
          </p>
        </header>

        {status ? (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">{status}</div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div>
        ) : null}

        {isLoading ? (
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-10 text-center text-sm text-slate-300 backdrop-blur">
            Loading admin data...
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map(([label, value]) => (
                <article key={label} className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
                  <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
              <article className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">API usage</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Per-source request totals</h2>
                </div>

                <div className="mt-6 space-y-4">
                  {dashboardData.apiUsageMetrics.length ? (
                    dashboardData.apiUsageMetrics.map((metric) => (
                      <div key={`${metric.sourceName}-${metric.date}`} className="space-y-2">
                        <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
                          <span className="font-medium text-white">
                            {metric.sourceName} <span className="text-slate-500">({metric.date})</span>
                          </span>
                          <span>{metric.requestCount}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-950">
                          <div
                            className="h-full rounded-full bg-cyan-400"
                            style={{ width: `${Math.max((metric.requestCount / maxMetricValue) * 100, 6)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">Last 429: {formatDate(metric.last429At)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-6 text-sm text-slate-400">
                      No API usage rows are available yet.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">User sessions</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Revoke active access quickly</h2>
                </div>

                <div className="mt-6 space-y-4">
                  {dashboardData.adminUsers.length ? (
                    dashboardData.adminUsers.map((user) => (
                      <article key={user.id} className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <p className="text-lg font-semibold text-white">{user.name || user.email}</p>
                            <p className="text-sm text-slate-300">{user.email}</p>
                            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                              <span className="rounded-full border border-white/10 px-3 py-1">{user.role}</span>
                              <span className="rounded-full border border-white/10 px-3 py-1">{user.activeSessionCount} active sessions</span>
                              <span className="rounded-full border border-white/10 px-3 py-1">{user.analysesCount} analyses</span>
                              <span className="rounded-full border border-white/10 px-3 py-1">{user.savedJobsCount} saved jobs</span>
                            </div>
                            <p className="text-xs text-slate-500">Joined: {formatDate(user.createdAt)}</p>
                            <p className="text-xs text-slate-500">Last login: {formatDate(user.lastLogin)}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRevoke(user.id)}
                            disabled={revokingUserId === user.id}
                            className="rounded-full border border-rose-400/40 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-300 hover:text-white disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                          >
                            {revokingUserId === user.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-6 text-sm text-slate-400">
                      No users are available yet.
                    </div>
                  )}
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
