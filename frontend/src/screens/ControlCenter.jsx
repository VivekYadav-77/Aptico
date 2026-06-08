import { useEffect, useMemo, useState } from 'react';
import { Navigate } from '@/lib/router-compat.jsx';
import { useSelector } from 'react-redux';
import api from '../api/axios.js';
import AppShell from '../components/AppShell.jsx';
import { selectAuth } from '../store/authSlice.js';

const TABS = ['Overview', 'Visitors', 'Users', 'Activity', 'Health', 'Security', 'Admin Logs'];

const ADMIN_CONTROL_CENTER_QUERY = `
  query AdminControlCenter($eventType: String, $selectedUserId: ID!) {
    adminOverview {
      totalUsers
      totalAnalyses
      totalGeneratedContent
      totalSavedJobs
      totalApiRequests
      activeRefreshTokens
      revokedRefreshTokens
      totalVisits
      uniqueVisitors
      activeVisitors
      totalEvents
      apiErrors
      adminActions
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
      lastSeenAt
      activeSessionCount
      analysesCount
      savedJobsCount
      eventCount
    }
    visitorTrends(days: 14) {
      date
      visits
      uniqueVisitors
      events
    }
    topPages(limit: 8) {
      label
      value
    }
    trafficSources(limit: 8) {
      label
      value
    }
    geoBreakdown(limit: 8) {
      label
      value
    }
    deviceBreakdown {
      label
      value
    }
    recentEvents(limit: 40, eventType: $eventType) {
      id
      eventType
      userId
      userEmail
      visitorId
      path
      source
      deviceCategory
      browserName
      country
      region
      city
      metadata
      createdAt
    }
    userActivity(userId: $selectedUserId, limit: 30) {
      id
      eventType
      userId
      userEmail
      path
      source
      metadata
      createdAt
    }
    adminAuditLogs(limit: 40) {
      id
      adminEmail
      action
      targetType
      targetId
      metadata
      createdAt
    }
    suspiciousSignals {
      label
      severity
      detail
      count
      lastSeenAt
    }
  }
`;

const EVENT_TYPES = [
  '',
  'page_view',
  'signup',
  'login',
  'logout',
  'analysis_created',
  'job_saved',
  'application_logged',
  'rejection_logged',
  'post_created',
  'comment_created',
  'squad_joined',
  'admin_action',
  'api_error'
];

function formatDate(value) {
  if (!value) return 'Never';
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toLocaleString();
}

function parseMetadata(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function StatCard({ label, value, detail }) {
  return (
    <article className="app-panel-soft">
      <p className="app-field-label">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-[var(--text)]">{value}</p>
      {detail ? <p className="mt-2 text-xs text-[var(--muted-strong)]">{detail}</p> : null}
    </article>
  );
}

function BreakdownList({ title, items }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <article className="app-panel">
      <p className="app-kicker">{title}</p>
      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-[var(--text)]">{item.label}</span>
                <span className="text-[var(--muted-strong)]">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-soft)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max((item.value / maxValue) * 100, 5)}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-strong)]">No data yet.</p>
        )}
      </div>
    </article>
  );
}

function EventRow({ event }) {
  const metadata = parseMetadata(event.metadata);
  const metadataText = Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ');

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-chip">{event.eventType}</span>
            {event.userEmail ? <span className="app-chip">{event.userEmail}</span> : null}
            {event.source ? <span className="app-chip">{event.source}</span> : null}
          </div>
          <p className="mt-3 truncate text-sm font-semibold text-[var(--text)]">{event.path || 'No route'}</p>
          <p className="mt-1 text-xs text-[var(--muted-strong)]">
            {[event.city, event.region, event.country].filter(Boolean).join(', ') || 'Unknown location'} · {event.deviceCategory || 'device'} · {event.browserName || 'browser'}
          </p>
          {metadataText ? <p className="mt-2 text-xs text-[var(--muted-strong)]">{metadataText}</p> : null}
        </div>
        <p className="shrink-0 text-xs font-semibold text-[var(--muted-strong)]">{formatDate(event.createdAt)}</p>
      </div>
    </article>
  );
}

export default function ControlCenter() {
  const auth = useSelector(selectAuth);
  const [roleCheckComplete, setRoleCheckComplete] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [eventType, setEventType] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [revokingUserId, setRevokingUserId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    adminOverview: null,
    apiUsageMetrics: [],
    adminUsers: [],
    visitorTrends: [],
    topPages: [],
    trafficSources: [],
    geoBreakdown: [],
    deviceBreakdown: [],
    recentEvents: [],
    userActivity: [],
    adminAuditLogs: [],
    suspiciousSignals: []
  });

  useEffect(() => {
    setIsAuthorized(auth.user?.role === 'admin');
    setRoleCheckComplete(true);
  }, [auth.user?.role]);

  const selectedUser = useMemo(
    () => data.adminUsers.find((user) => user.id === selectedUserId) || data.adminUsers[0] || null,
    [data.adminUsers, selectedUserId]
  );

  const queryVariables = useMemo(
    () => ({
      eventType: eventType || null,
      selectedUserId: selectedUser?.id || '00000000-0000-0000-0000-000000000000'
    }),
    [eventType, selectedUser?.id]
  );

  async function loadDashboard({ silent = false } = {}) {
    if (!isAuthorized) {
      setIsLoading(false);
      return;
    }

    if (!silent) setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/admin/graphql', {
        query: ADMIN_CONTROL_CENTER_QUERY,
        variables: queryVariables
      });
      const graphQlError = response.data?.errors?.[0]?.message;
      if (graphQlError) throw new Error(graphQlError);

      setData({
        adminOverview: response.data?.data?.adminOverview || null,
        apiUsageMetrics: response.data?.data?.apiUsageMetrics || [],
        adminUsers: response.data?.data?.adminUsers || [],
        visitorTrends: response.data?.data?.visitorTrends || [],
        topPages: response.data?.data?.topPages || [],
        trafficSources: response.data?.data?.trafficSources || [],
        geoBreakdown: response.data?.data?.geoBreakdown || [],
        deviceBreakdown: response.data?.data?.deviceBreakdown || [],
        recentEvents: response.data?.data?.recentEvents || [],
        userActivity: response.data?.data?.userActivity || [],
        adminAuditLogs: response.data?.data?.adminAuditLogs || [],
        suspiciousSignals: response.data?.data?.suspiciousSignals || []
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Could not load admin dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!roleCheckComplete || !isAuthorized) {
      setIsLoading(false);
      return undefined;
    }

    let active = true;
    const run = async (options) => {
      if (active) await loadDashboard(options);
    };

    void run();
    const intervalId = window.setInterval(() => void run({ silent: true }), 45000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthorized, roleCheckComplete, queryVariables]);

  async function revokeSessions(userId) {
    setRevokingUserId(userId);
    setError('');
    setMessage('');

    try {
      const response = await api.post(`/api/admin/revoke/${userId}`);
      setMessage(`Revoked ${response.data?.data?.revokedSessionCount || 0} active sessions.`);
      await loadDashboard({ silent: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Could not revoke sessions.');
    } finally {
      setRevokingUserId('');
    }
  }

  async function cleanupAnalytics() {
    setMessage('');
    setError('');

    try {
      const response = await api.post('/api/admin/analytics/cleanup', { retentionDays: 90 });
      setMessage(`Deleted ${response.data?.data?.deletedCount || 0} detailed analytics events older than 90 days.`);
      await loadDashboard({ silent: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Could not clean analytics events.');
    }
  }

  if (!roleCheckComplete) return null;
  if (!isAuthorized) return <Navigate replace to="/dashboard" />;

  const overview = data.adminOverview || {};
  const filteredUsers = data.adminUsers.filter((user) => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return true;
    return [user.name, user.email, user.role].filter(Boolean).some((value) => value.toLowerCase().includes(search));
  });
  const maxTrendValue = Math.max(...data.visitorTrends.map((item) => Math.max(item.visits, item.events)), 1);
  const serviceCards = data.apiUsageMetrics.map((metric) => {
    const last429At = metric.last429At ? new Date(metric.last429At).getTime() : 0;
    const hasRecent429 = last429At && Date.now() - last429At < 7 * 24 * 60 * 60 * 1000;
    return {
      name: metric.sourceName,
      status: hasRecent429 ? 'Watch' : 'Healthy',
      detail: hasRecent429 ? `Last 429: ${formatDate(metric.last429At)}` : 'No recent rate-limit pressure detected.',
      requests: metric.requestCount
    };
  });

  return (
    <AppShell title="Admin Control Center" description="Monitor visitors, users, product events, platform health, security signals, and admin actions from one operational dashboard.">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button key={tab} type="button" className={`app-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="app-button-secondary" onClick={() => loadDashboard({ silent: false })}>
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
          <button type="button" className="app-button-secondary" onClick={cleanupAnalytics}>
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
            90 day cleanup
          </button>
        </div>
      </div>

      {message ? <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div> : null}
      {error ? <div className="mb-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-rose-300">{error}</div> : null}
      {isLoading ? <div className="app-panel text-center text-sm text-[var(--muted-strong)]">Loading control center...</div> : null}

      {!isLoading && activeTab === 'Overview' ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={overview.totalUsers || 0} detail={`${overview.activeRefreshTokens || 0} active sessions`} />
            <StatCard label="Visits" value={overview.totalVisits || 0} detail={`${overview.uniqueVisitors || 0} unique visitors`} />
            <StatCard label="Active now" value={overview.activeVisitors || 0} detail="Seen in the last 15 minutes" />
            <StatCard label="Tracked events" value={overview.totalEvents || 0} detail={`${overview.apiErrors || 0} API errors`} />
            <StatCard label="Analyses" value={overview.totalAnalyses || 0} detail={`${overview.totalGeneratedContent || 0} generated items`} />
            <StatCard label="Saved jobs" value={overview.totalSavedJobs || 0} />
            <StatCard label="API requests" value={overview.totalApiRequests || 0} />
            <StatCard label="Admin actions" value={overview.adminActions || 0} detail={`${overview.revokedRefreshTokens || 0} revoked sessions`} />
          </section>

          <section className="app-panel">
            <p className="app-kicker">14 day activity</p>
            <div className="mt-6 grid min-h-56 grid-cols-7 items-end gap-2 md:grid-cols-14">
              {data.visitorTrends.map((point) => (
                <div key={point.date} className="flex min-h-48 flex-col justify-end gap-2">
                  <div className="rounded-t-xl bg-[var(--accent)]" style={{ height: `${Math.max((point.visits / maxTrendValue) * 180, 8)}px` }} title={`${point.visits} visits`} />
                  <p className="truncate text-center text-[10px] text-[var(--muted-strong)]">{point.date.slice(5)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <BreakdownList title="Top pages" items={data.topPages} />
            <BreakdownList title="Traffic sources" items={data.trafficSources} />
            <BreakdownList title="Device mix" items={data.deviceBreakdown} />
          </section>
        </div>
      ) : null}

      {!isLoading && activeTab === 'Visitors' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <BreakdownList title="Approximate locations" items={data.geoBreakdown} />
          <BreakdownList title="Traffic sources" items={data.trafficSources} />
          <BreakdownList title="Top pages" items={data.topPages} />
          <BreakdownList title="Devices" items={data.deviceBreakdown} />
        </section>
      ) : null}

      {!isLoading && activeTab === 'Users' ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <article className="app-panel">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="app-kicker">User management</p>
              <input className="app-input max-w-sm" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search users..." />
            </div>
            <div className="mt-5 grid gap-3">
              {filteredUsers.map((user) => (
                <button key={user.id} type="button" className={`rounded-2xl border p-4 text-left ${selectedUser?.id === user.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--panel-soft)]'}`} onClick={() => setSelectedUserId(user.id)}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold text-[var(--text)]">{user.name || user.email}</p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">{user.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="app-chip">{user.role}</span>
                        <span className="app-chip">{user.eventCount} events</span>
                        <span className="app-chip">{user.activeSessionCount} sessions</span>
                      </div>
                    </div>
                    <div className="text-xs leading-6 text-[var(--muted-strong)]">
                      <p>Joined: {formatDate(user.createdAt)}</p>
                      <p>Last login: {formatDate(user.lastLogin)}</p>
                      <p>Last seen: {formatDate(user.lastSeenAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="app-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker">Selected user</p>
                <h2 className="mt-3 text-2xl font-black text-[var(--text)]">{selectedUser?.name || selectedUser?.email || 'No user selected'}</h2>
                {selectedUser ? <p className="mt-1 text-sm text-[var(--muted-strong)]">{selectedUser.email}</p> : null}
              </div>
              {selectedUser ? (
                <button type="button" className="app-button-secondary" onClick={() => revokeSessions(selectedUser.id)} disabled={revokingUserId === selectedUser.id}>
                  <span className="material-symbols-outlined text-[18px]">block</span>
                  {revokingUserId === selectedUser.id ? 'Revoking' : 'Revoke'}
                </button>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3">
              {data.userActivity.length ? data.userActivity.map((event) => <EventRow key={event.id} event={event} />) : <p className="text-sm text-[var(--muted-strong)]">No user activity yet.</p>}
            </div>
          </article>
        </section>
      ) : null}

      {!isLoading && activeTab === 'Activity' ? (
        <section className="app-panel">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="app-kicker">Event stream</p>
            <select className="app-input max-w-xs" value={eventType} onChange={(event) => setEventType(event.target.value)}>
              {EVENT_TYPES.map((type) => (
                <option key={type || 'all'} value={type}>
                  {type || 'All events'}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-5 grid gap-3">
            {data.recentEvents.length ? data.recentEvents.map((event) => <EventRow key={event.id} event={event} />) : <p className="text-sm text-[var(--muted-strong)]">No events match this filter.</p>}
          </div>
        </section>
      ) : null}

      {!isLoading && activeTab === 'Health' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {serviceCards.map((service) => (
            <article key={service.name} className="app-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="app-kicker">{service.name}</p>
                  <h2 className="mt-3 text-2xl font-black text-[var(--text)]">{service.requests} requests</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${service.status === 'Healthy' ? 'bg-emerald-500/12 text-emerald-300' : 'bg-amber-500/12 text-amber-300'}`}>{service.status}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">{service.detail}</p>
            </article>
          ))}
          {!serviceCards.length ? <div className="app-panel text-sm text-[var(--muted-strong)]">No API usage rows are available yet.</div> : null}
        </section>
      ) : null}

      {!isLoading && activeTab === 'Security' ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <StatCard label="Active sessions" value={overview.activeRefreshTokens || 0} />
            <StatCard label="Revoked sessions" value={overview.revokedRefreshTokens || 0} />
            <StatCard label="API errors" value={overview.apiErrors || 0} />
            <StatCard label="Admin actions" value={overview.adminActions || 0} />
          </div>
          <article className="app-panel">
            <p className="app-kicker">Suspicious signals</p>
            <div className="mt-5 grid gap-3">
              {data.suspiciousSignals.length ? (
                data.suspiciousSignals.map((signal) => (
                  <div key={`${signal.label}-${signal.lastSeenAt}`} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--text)]">{signal.label}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${signal.severity === 'high' ? 'bg-rose-500/12 text-rose-300' : 'bg-amber-500/12 text-amber-300'}`}>{signal.severity}</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-strong)]">{signal.detail}</p>
                    <p className="mt-2 text-xs text-[var(--muted-strong)]">{signal.count} events · Last seen {formatDate(signal.lastSeenAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted-strong)]">No suspicious signals detected.</p>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {!isLoading && activeTab === 'Admin Logs' ? (
        <section className="app-panel">
          <p className="app-kicker">Admin audit trail</p>
          <div className="mt-5 grid gap-3">
            {data.adminAuditLogs.length ? (
              data.adminAuditLogs.map((log) => {
                const metadata = parseMetadata(log.metadata);
                const metadataText = Object.entries(metadata)
                  .map(([key, value]) => `${key}: ${String(value)}`)
                  .join(' | ');

                return (
                  <article key={log.id} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="app-chip">{log.action}</span>
                          {log.adminEmail ? <span className="app-chip">{log.adminEmail}</span> : null}
                          {log.targetType ? <span className="app-chip">{log.targetType}</span> : null}
                        </div>
                        {log.targetId ? <p className="mt-3 text-sm text-[var(--text)]">Target: {log.targetId}</p> : null}
                        {metadataText ? <p className="mt-2 text-xs text-[var(--muted-strong)]">{metadataText}</p> : null}
                      </div>
                      <p className="shrink-0 text-xs font-semibold text-[var(--muted-strong)]">{formatDate(log.createdAt)}</p>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-[var(--muted-strong)]">No admin actions have been recorded yet.</p>
            )}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
