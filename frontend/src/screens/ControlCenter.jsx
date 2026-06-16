import { useEffect, useMemo, useState } from 'react';
import { Navigate } from '@/lib/router-compat.jsx';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios.js';
import { refreshSessionRequest } from '../api/authApi.js';
import AppShell from '../components/AppShell.jsx';
import { selectAuth } from '../store/authSlice.js';
import { getRequestErrorMessage } from '../utils/requestError.js';

const SECTIONS = [
  { id: 'command', label: 'Command', icon: 'dashboard', description: 'Platform pulse' },
  { id: 'people', label: 'People', icon: 'group', description: 'Users and access' },
  { id: 'activity', label: 'Activity', icon: 'monitoring', description: 'Visits and events' },
  { id: 'moderation', label: 'Moderation', icon: 'shield_person', description: 'Content review' },
  { id: 'support', label: 'Support', icon: 'support_agent', description: 'User tickets' },
  { id: 'security', label: 'Security', icon: 'security', description: 'Risk signals' },
  { id: 'system', label: 'System', icon: 'dns', description: 'API health' },
  { id: 'audit', label: 'Audit', icon: 'receipt_long', description: 'Admin trail' }
];

const FEATURES = ['posting', 'commenting', 'squad_actions', 'analysis', 'job_search', 'job_saving', 'profile_visibility', 'activity_logging', 'login'];
const STATUSES = ['active', 'restricted', 'blocked', 'deactivated'];
const ROLES = ['user', 'admin'];
const CONTENT_TYPES = ['post', 'comment', 'community_win'];
const EVENT_TYPES = ['', 'page_view', 'signup', 'login', 'logout', 'analysis_created', 'job_saved', 'application_logged', 'rejection_logged', 'post_created', 'comment_created', 'squad_joined', 'admin_action', 'api_error'];
const EMAIL_TYPES = ['', 'email_verification', 'password_reset', 'admin_invite_setup'];
const EMAIL_STATUSES = ['', 'pending', 'sent', 'failed'];
const SUPPORT_CATEGORIES = ['', 'account_restriction', 'feature_restriction_appeal', 'email_access', 'job_search', 'analysis', 'squad_community', 'bug_report', 'feedback', 'other'];
const SUPPORT_STATUSES = ['', 'open', 'pending_admin', 'waiting_user', 'resolved', 'closed'];
const SUPPORT_PRIORITIES = ['', 'low', 'normal', 'high', 'urgent'];

const ADMIN_CONTROL_CENTER_QUERY = `
  query AdminControlCenter($eventType: String, $selectedUserId: ID!, $contentType: String!, $contentSearch: String, $emailSearch: String, $emailType: String, $emailStatus: String, $supportTicketId: ID!, $supportStatus: String, $supportCategory: String, $supportPriority: String, $supportSearch: String) {
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
      restrictedUsers
      blockedUsers
      deactivatedUsers
      hiddenPosts
      hiddenWins
      pendingModeration
    }
    apiUsageMetrics {
      sourceName
      date
      requestCount
      last429At
    }
    emailUsageMetrics {
      total
      sent
      failed
      pending
      failedLast24h
      lastSentAt
    }
    emailDeliveryLogs(limit: 50, email: $emailSearch, emailType: $emailType, status: $emailStatus) {
      id
      userId
      userEmail
      userName
      email
      emailType
      provider
      status
      subject
      country
      region
      city
      errorCode
      errorMessage
      createdAt
      deliveredAt
    }
    emailServiceBlocks(limit: 50, email: $emailSearch) {
      id
      email
      isBlocked
      reason
      createdBy
      createdByEmail
      createdAt
      updatedAt
    }
    adminUsers {
      id
      email
      name
      role
      status
      createdAt
      lastLogin
      lastSeenAt
      activeSessionCount
      analysesCount
      savedJobsCount
      eventCount
      restrictionCount
    }
    visitorTrends(days: 14) {
      date
      visits
      uniqueVisitors
      events
    }
    topPages(limit: 8) { label value }
    trafficSources(limit: 8) { label value }
    geoBreakdown(limit: 8) { label value }
    deviceBreakdown { label value }
    recentEvents(limit: 40, eventType: $eventType) {
      id eventType userId userEmail visitorId path source deviceCategory browserName country region city metadata createdAt
    }
    userActivity(userId: $selectedUserId, limit: 30) {
      id eventType userId userEmail path source metadata createdAt
    }
    adminAuditLogs(limit: 50) {
      id adminEmail action targetType targetId metadata createdAt
    }
    adminRestrictions(userId: $selectedUserId) {
      id userId feature isRestricted reason expiresAt createdBy createdAt updatedAt
    }
    adminModerationQueue(contentType: $contentType, limit: 50, search: $contentSearch) {
      id ownerId ownerEmail type title body status createdAt
    }
    adminModerationActions(limit: 50) {
      id adminEmail action targetType targetId reason metadata createdAt
    }
    suspiciousSignals {
      label severity detail count lastSeenAt
    }
    adminSupportTickets(status: $supportStatus, category: $supportCategory, priority: $supportPriority, search: $supportSearch, limit: 50) {
      id userId userEmail userName category subject message status priority relatedFeature createdAt updatedAt lastAdminReplyAt lastUserReplyAt
    }
    adminSupportMessages(ticketId: $supportTicketId, limit: 100) {
      id ticketId senderUserId senderRole senderEmail senderName message createdAt
    }
  }
`;

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

function humanize(value) {
  return String(value || '').replaceAll('_', ' ');
}

function formatLocation(item) {
  return [item.city, item.region, item.country].filter(Boolean).join(', ') || 'Unknown';
}

function AdminFeedbackToast({ message, error, onDismiss }) {
  const text = error || message;
  if (!text) return null;

  const isError = Boolean(error);
  const tone = isError
    ? {
        label: 'Admin action failed',
        icon: 'error',
        bar: 'bg-[var(--danger-strong)]',
        container: 'border-[var(--danger-border)] ring-[var(--danger-border)]',
        iconBox: 'border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-strong)]',
        title: 'text-[var(--danger-strong)]'
      }
    : {
        label: 'Admin action complete',
        icon: 'check_circle',
        bar: 'bg-[var(--success-strong)]',
        container: 'border-[var(--success-border)] ring-[var(--success-border)]',
        iconBox: 'border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-strong)]',
        title: 'text-[var(--success-strong)]'
      };

  return (
    <div className="fixed inset-x-3 bottom-4 z-[280] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(440px,calc(100vw-2rem))]" role="status" aria-live="polite">
      <div className={`overflow-hidden rounded-2xl border bg-[var(--panel)] text-[var(--text)] shadow-[0_24px_60px_rgba(0,0,0,0.28)] ring-1 backdrop-blur-xl ${tone.container}`}>
        <div className={`h-1 ${tone.bar}`} />
        <div className="flex items-start gap-3 px-4 py-4">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tone.iconBox}`}>
            <span className="material-symbols-outlined text-[20px]">{tone.icon}</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${tone.title}`}>{tone.label}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--text)]">{text}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted-strong)] transition hover:text-[var(--text)]"
            aria-label="Dismiss admin feedback"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function toneForStatus(status) {
  if (status === 'blocked' || status === 'delete' || status === 'critical' || status === 'high' || status === 'failed') return 'danger';
  if (status === 'restricted' || status === 'hidden' || status === 'watch' || status === 'medium' || status === 'pending') return 'warning';
  if (status === 'active' || status === 'visible' || status === 'healthy' || status === 'sent') return 'success';
  return 'neutral';
}

function StatusBadge({ value, tone = toneForStatus(String(value || '').toLowerCase()) }) {
  return <span className={`admin-badge ${tone}`}>{humanize(value || 'unknown')}</span>;
}

function AdminCard({ icon, label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`admin-stat ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="admin-eyebrow">{label}</p>
          <p className="mt-3 text-3xl font-black text-[var(--text)]">{value}</p>
        </div>
        <span className="material-symbols-outlined admin-stat-icon">{icon}</span>
      </div>
      {detail ? <p className="mt-3 text-xs font-semibold text-[var(--muted-strong)]">{detail}</p> : null}
    </article>
  );
}

function SectionNav({ activeSection, onChange }) {
  return (
    <nav className="admin-section-nav" aria-label="Admin sections">
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`admin-section-button ${activeSection === section.id ? 'active' : ''}`}
          onClick={() => onChange(section.id)}
        >
          <span className="material-symbols-outlined text-[19px]">{section.icon}</span>
          <span>
            <span className="block text-sm font-black">{section.label}</span>
            <span className="hidden text-[11px] font-semibold text-[var(--muted)] sm:block">{section.description}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}

function BreakdownList({ title, items, icon = 'bar_chart' }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  return (
    <article className="admin-panel">
      <div className="admin-panel-header">
        <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">{icon}</span>
        <h2>{title}</h2>
      </div>
      <div className="mt-5 space-y-3">
        {items.length ? items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-[var(--text)]">{item.label}</span>
              <span className="admin-mono">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-soft)]">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max((item.value / maxValue) * 100, 5)}%` }} />
            </div>
          </div>
        )) : <EmptyState label="No data yet" />}
      </div>
    </article>
  );
}

function EmptyState({ label, detail = 'Nothing needs attention in this view.' }) {
  return (
    <div className="admin-empty">
      <span className="material-symbols-outlined text-[22px]">inbox</span>
      <div>
        <p className="font-bold text-[var(--text)]">{label}</p>
        <p className="text-xs text-[var(--muted-strong)]">{detail}</p>
      </div>
    </div>
  );
}

function EventRow({ event }) {
  const metadata = parseMetadata(event.metadata);
  const metadataText = Object.entries(metadata).slice(0, 4).map(([key, value]) => `${key}: ${String(value)}`).join(' | ');
  return (
    <article className="admin-list-row">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={event.eventType} tone={event.eventType === 'api_error' ? 'danger' : 'neutral'} />
          {event.userEmail ? <span className="admin-chip truncate">{event.userEmail}</span> : null}
          {event.source ? <span className="admin-chip">{event.source}</span> : null}
        </div>
        <p className="mt-2 truncate text-sm font-bold text-[var(--text)]">{event.path || 'No route'}</p>
        <p className="mt-1 text-xs text-[var(--muted-strong)]">
          {[event.city, event.region, event.country].filter(Boolean).join(', ') || 'Unknown location'} | {event.deviceCategory || 'device'} | {event.browserName || 'browser'}
        </p>
        {metadataText ? <p className="mt-2 text-xs text-[var(--muted-strong)]">{metadataText}</p> : null}
      </div>
      <time className="admin-time">{formatDate(event.createdAt)}</time>
    </article>
  );
}

function UserTable({ users, selectedUserId, onSelect }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Status</th>
            <th>Sessions</th>
            <th>Activity</th>
            <th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className={selectedUserId === user.id ? 'selected' : ''} onClick={() => onSelect(user.id)}>
              <td>
                <button type="button" className="text-left">
                  <span className="block font-black text-[var(--text)]">{user.name || user.email}</span>
                  <span className="block text-xs text-[var(--muted-strong)]">{user.email}</span>
                </button>
              </td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={user.status || 'active'} />
                  <StatusBadge value={user.role} tone={user.role === 'admin' ? 'info' : 'neutral'} />
                </div>
              </td>
              <td className="admin-mono">{user.activeSessionCount}</td>
              <td className="admin-mono">{user.eventCount}</td>
              <td>{formatDate(user.lastSeenAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserDetailPanel({
  selectedUser,
  profileForm,
  setProfileForm,
  roleForm,
  setRoleForm,
  statusForm,
  setStatusForm,
  restrictionForm,
  setRestrictionForm,
  onSaveProfile,
  onSaveRole,
  onSaveStatus,
  onSaveRestrictions,
  onBlockAccount,
  onRevoke,
  busyAction
}) {
  if (!selectedUser) {
    return <EmptyState label="Select a user" detail="Choose a user to view activity, restrictions, and account actions." />;
  }

  return (
    <aside className="admin-detail-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="admin-eyebrow">Selected account</p>
          <h2 className="mt-2 truncate text-xl font-black text-[var(--text)]">{selectedUser.name || selectedUser.email}</h2>
          <p className="truncate text-sm text-[var(--muted-strong)]">{selectedUser.email}</p>
        </div>
        <StatusBadge value={selectedUser.status || 'active'} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="admin-mini-stat"><span>{selectedUser.activeSessionCount}</span><p>Sessions</p></div>
        <div className="admin-mini-stat"><span>{selectedUser.restrictionCount || 0}</span><p>Restrictions</p></div>
        <div className="admin-mini-stat"><span>{selectedUser.savedJobsCount || 0}</span><p>Jobs</p></div>
      </div>

      <div className="mt-6 space-y-5">
        <section className="admin-control-block">
          <div>
            <p className="admin-eyebrow">Profile fields</p>
            <p className="mt-1 text-xs text-[var(--muted-strong)]">Reason is required. Confirmation is only needed when changing the email.</p>
          </div>
          <div className="admin-form-grid">
            <label>
              <span className="app-field-label">Name</span>
              <input className="app-input" value={profileForm.name} onChange={(event) => setProfileForm((form) => ({ ...form, name: event.target.value }))} />
            </label>
            <label>
              <span className="app-field-label">Email</span>
              <input className="app-input" value={profileForm.email} onChange={(event) => setProfileForm((form) => ({ ...form, email: event.target.value }))} />
            </label>
          </div>
          <textarea className="app-input min-h-20" value={profileForm.reason} onChange={(event) => setProfileForm((form) => ({ ...form, reason: event.target.value }))} placeholder="Reason for profile/account change" />
          {profileForm.email !== selectedUser.email ? (
            <input className="app-input" value={profileForm.confirmTarget} onChange={(event) => setProfileForm((form) => ({ ...form, confirmTarget: event.target.value }))} placeholder={`Type current email: ${selectedUser.email}`} />
          ) : null}
          <button type="button" className="app-button-secondary w-fit" onClick={onSaveProfile} disabled={busyAction === 'edit-user'}>Save profile</button>
        </section>

        <section className="admin-control-block">
          <div>
            <p className="admin-eyebrow">Role control</p>
            <p className="mt-1 text-xs text-[var(--muted-strong)]">Changing roles requires a reason and typed target email.</p>
          </div>
          <select className="app-input" value={roleForm.role} onChange={(event) => setRoleForm((form) => ({ ...form, role: event.target.value }))}>
            {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <textarea className="app-input min-h-20" value={roleForm.reason} onChange={(event) => setRoleForm((form) => ({ ...form, reason: event.target.value }))} placeholder="Reason for role change" />
          <input className="app-input" value={roleForm.confirmTarget} onChange={(event) => setRoleForm((form) => ({ ...form, confirmTarget: event.target.value }))} placeholder={`Type ${selectedUser.email}`} />
          <button type="button" className="app-button-secondary w-fit" onClick={onSaveRole} disabled={busyAction === 'role-user'}>Apply role</button>
        </section>

        <section className="admin-control-block">
          <div>
            <p className="admin-eyebrow">Status control</p>
            <p className="mt-1 text-xs text-[var(--muted-strong)]">Blocked and deactivated accounts lose access and require typed target email.</p>
          </div>
          <select className="app-input" value={statusForm.status} onChange={(event) => setStatusForm((form) => ({ ...form, status: event.target.value }))}>
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <textarea className="app-input min-h-20" value={statusForm.reason} onChange={(event) => setStatusForm((form) => ({ ...form, reason: event.target.value }))} placeholder="Reason for status change" />
          <input className="app-input" value={statusForm.confirmTarget} onChange={(event) => setStatusForm((form) => ({ ...form, confirmTarget: event.target.value }))} placeholder={`Type ${selectedUser.email} for block/deactivate`} />
          <div className="admin-action-group">
            <button type="button" className="app-button" onClick={onSaveStatus} disabled={busyAction === 'status-user'}>Apply status</button>
            <button type="button" className="app-button-danger" onClick={onBlockAccount} disabled={busyAction === 'block-user'}>Block whole account</button>
          </div>
        </section>

        <section className="admin-control-block">
          <div>
            <p className="admin-eyebrow">Session control</p>
            <p className="mt-1 text-xs text-[var(--muted-strong)]">Immediately invalidate active refresh sessions for this user.</p>
          </div>
          <button type="button" className="app-button-danger w-fit" onClick={onRevoke} disabled={busyAction === 'revoke'}>Revoke sessions</button>
        </section>
      </div>

      <div className="mt-7 border-t border-[var(--border)] pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="admin-eyebrow">Feature restrictions</p>
            <p className="mt-1 text-xs text-[var(--muted-strong)]">Disable specific product actions without blocking the full account.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {FEATURES.map((feature) => (
            <label key={feature} className="admin-toggle-row">
              <span>{humanize(feature)}</span>
              <input type="checkbox" checked={Boolean(restrictionForm.flags[feature])} onChange={(event) => setRestrictionForm((form) => ({ ...form, flags: { ...form.flags, [feature]: event.target.checked } }))} />
            </label>
          ))}
        </div>
        <textarea className="app-input mt-4 min-h-20" value={restrictionForm.reason} onChange={(event) => setRestrictionForm((form) => ({ ...form, reason: event.target.value }))} placeholder="Restriction reason" />
        {restrictionForm.flags.login ? (
          <input className="app-input mt-3" value={restrictionForm.confirmTarget} onChange={(event) => setRestrictionForm((form) => ({ ...form, confirmTarget: event.target.value }))} placeholder={`Type ${selectedUser.email} for login restriction`} />
        ) : null}
        <button type="button" className="app-button mt-4 w-full" onClick={onSaveRestrictions} disabled={busyAction === 'restrictions'}>Save restrictions</button>
      </div>
    </aside>
  );
}

export default function ControlCenter() {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const [roleCheckComplete, setRoleCheckComplete] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeSection, setActiveSection] = useState('command');
  const [eventType, setEventType] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [contentType, setContentType] = useState('post');
  const [contentSearch, setContentSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [emailType, setEmailType] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [emailBlockForm, setEmailBlockForm] = useState({ email: '', reason: '', confirmTarget: '' });
  const [supportStatus, setSupportStatus] = useState('');
  const [supportCategory, setSupportCategory] = useState('');
  const [supportPriority, setSupportPriority] = useState('');
  const [supportSearch, setSupportSearch] = useState('');
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState('');
  const [supportReply, setSupportReply] = useState('');
  const [supportUpdateForm, setSupportUpdateForm] = useState({ status: 'open', priority: 'normal', reason: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', email: '', reason: '', confirmTarget: '' });
  const [roleForm, setRoleForm] = useState({ role: 'user', reason: '', confirmTarget: '' });
  const [statusForm, setStatusForm] = useState({ status: 'active', reason: '', confirmTarget: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'user', reason: '', confirmTarget: '' });
  const [restrictionForm, setRestrictionForm] = useState({ reason: '', confirmTarget: '', flags: {} });
  const [contentForm, setContentForm] = useState({ action: 'hide', reason: '', confirmTarget: '' });
  const [data, setData] = useState({
    adminOverview: null,
    apiUsageMetrics: [],
    emailUsageMetrics: null,
    emailDeliveryLogs: [],
    emailServiceBlocks: [],
    adminUsers: [],
    visitorTrends: [],
    topPages: [],
    trafficSources: [],
    geoBreakdown: [],
    deviceBreakdown: [],
    recentEvents: [],
    userActivity: [],
    adminAuditLogs: [],
    adminRestrictions: [],
    adminModerationQueue: [],
    adminModerationActions: [],
    suspiciousSignals: [],
    adminSupportTickets: [],
    adminSupportMessages: []
  });

  useEffect(() => {
    setIsAuthorized(auth.user?.role === 'admin');
    setRoleCheckComplete(true);
  }, [auth.user?.role]);

  const selectedUser = useMemo(
    () => data.adminUsers.find((user) => user.id === selectedUserId) || data.adminUsers[0] || null,
    [data.adminUsers, selectedUserId]
  );

  const selectedSupportTicket = useMemo(
    () => data.adminSupportTickets.find((ticket) => ticket.id === selectedSupportTicketId) || data.adminSupportTickets[0] || null,
    [data.adminSupportTickets, selectedSupportTicketId]
  );

  useEffect(() => {
    if (!selectedSupportTicket) return;
    setSupportUpdateForm((current) => ({
      ...current,
      status: selectedSupportTicket.status || 'open',
      priority: selectedSupportTicket.priority || 'normal',
      reason: ''
    }));
  }, [selectedSupportTicket?.id]);

  useEffect(() => {
    if (!selectedUser) return;
    setProfileForm((current) => ({
      ...current,
      name: selectedUser.name || '',
      email: selectedUser.email || '',
      reason: '',
      confirmTarget: ''
    }));
    setRoleForm((current) => ({
      ...current,
      role: selectedUser.role || 'user',
      reason: '',
      confirmTarget: ''
    }));
    setStatusForm((current) => ({
      ...current,
      status: selectedUser.status || 'active',
      reason: '',
      confirmTarget: ''
    }));
  }, [selectedUser?.id]);

  useEffect(() => {
    const flags = {};
    data.adminRestrictions.forEach((restriction) => {
      flags[restriction.feature] = Boolean(restriction.isRestricted);
    });
    setRestrictionForm((current) => ({ ...current, flags }));
  }, [data.adminRestrictions]);

  useEffect(() => {
    if (!message && !error) return undefined;

    const currentMessage = message;
    const currentError = error;
    const timer = window.setTimeout(() => {
      if (currentMessage) {
        setMessage((value) => (value === currentMessage ? '' : value));
      }
      if (currentError) {
        setError((value) => (value === currentError ? '' : value));
      }
    }, error ? 8000 : 5500);

    return () => window.clearTimeout(timer);
  }, [message, error]);

  const queryVariables = useMemo(() => ({
    eventType: eventType || null,
    selectedUserId: selectedUser?.id || '00000000-0000-0000-0000-000000000000',
    contentType,
    contentSearch: contentSearch.trim() || null,
    emailSearch: emailSearch.trim() || null,
    emailType: emailType || null,
    emailStatus: emailStatus || null,
    supportTicketId: selectedSupportTicket?.id || '00000000-0000-0000-0000-000000000000',
    supportStatus: supportStatus || null,
    supportCategory: supportCategory || null,
    supportPriority: supportPriority || null,
    supportSearch: supportSearch.trim() || null
  }), [eventType, selectedUser?.id, contentType, contentSearch, emailSearch, emailType, emailStatus, selectedSupportTicket?.id, supportStatus, supportCategory, supportPriority, supportSearch]);

  async function loadDashboard({ silent = false, authRetried = false } = {}) {
    if (!isAuthorized) {
      setIsLoading(false);
      return;
    }

    if (!silent) setIsLoading(true);
    setError('');
    try {
      const response = await api.post('/admin/graphql', { query: ADMIN_CONTROL_CENTER_QUERY, variables: queryVariables });
      const graphQlError = response.data?.errors?.[0]?.message;
      if (graphQlError) throw new Error(graphQlError);
      const next = response.data?.data || {};
      setData({
        adminOverview: next.adminOverview || null,
        apiUsageMetrics: next.apiUsageMetrics || [],
        emailUsageMetrics: next.emailUsageMetrics || null,
        emailDeliveryLogs: next.emailDeliveryLogs || [],
        emailServiceBlocks: next.emailServiceBlocks || [],
        adminUsers: next.adminUsers || [],
        visitorTrends: next.visitorTrends || [],
        topPages: next.topPages || [],
        trafficSources: next.trafficSources || [],
        geoBreakdown: next.geoBreakdown || [],
        deviceBreakdown: next.deviceBreakdown || [],
        recentEvents: next.recentEvents || [],
        userActivity: next.userActivity || [],
        adminAuditLogs: next.adminAuditLogs || [],
        adminRestrictions: next.adminRestrictions || [],
        adminModerationQueue: next.adminModerationQueue || [],
        adminModerationActions: next.adminModerationActions || [],
        suspiciousSignals: next.suspiciousSignals || [],
        adminSupportTickets: next.adminSupportTickets || [],
        adminSupportMessages: next.adminSupportMessages || []
      });
    } catch (requestError) {
      const status = requestError.response?.status;
      if ((status === 401 || status === 403) && !authRetried) {
        try {
          await refreshSessionRequest({ dispatch });
          await loadDashboard({ silent: true, authRetried: true });
          return;
        } catch (refreshError) {
          setError(getRequestErrorMessage(refreshError, 'Admin access could not be refreshed. Please sign in again.'));
          return;
        }
      }

      setError(getRequestErrorMessage(requestError, 'Could not load admin dashboard.'));
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

  async function runAdminAction(label, callback) {
    setBusyAction(label);
    setMessage('');
    setError('');
    try {
      const result = await callback();
      setMessage(result || 'Admin action completed.');
      await loadDashboard({ silent: true });
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Admin action failed.'));
    } finally {
      setBusyAction('');
    }
  }

  async function revokeSessions(userId) {
    await runAdminAction('revoke', async () => {
      const response = await api.post(`/api/admin/revoke/${userId}`);
      return `Revoked ${response.data?.data?.revokedSessionCount || 0} active sessions.`;
    });
  }

  async function cleanupAnalytics() {
    await runAdminAction('cleanup', async () => {
      const response = await api.post('/api/admin/analytics/cleanup', { retentionDays: 90 });
      return `Deleted ${response.data?.data?.deletedCount || 0} detailed analytics events older than 90 days.`;
    });
  }

  async function inviteNewUser() {
    await runAdminAction('invite', async () => {
      await api.post('/api/admin/users/invite', inviteForm);
      setInviteForm({ email: '', name: '', role: 'user', reason: '', confirmTarget: '' });
      return 'Invite created and reset link sent.';
    });
  }

  async function saveUserProfile() {
    if (!selectedUser) return;
    await runAdminAction('edit-user', async () => {
      await api.patch(`/api/admin/users/${selectedUser.id}`, {
        name: profileForm.name,
        email: profileForm.email,
        reason: profileForm.reason,
        confirmTarget: profileForm.email !== selectedUser.email ? profileForm.confirmTarget : undefined
      });
      return 'User account fields updated.';
    });
  }

  async function saveUserRole() {
    if (!selectedUser) return;
    await runAdminAction('role-user', async () => {
      await api.post(`/api/admin/users/${selectedUser.id}/role`, {
        role: roleForm.role,
        reason: roleForm.reason,
        confirmTarget: roleForm.confirmTarget
      });
      return 'User role updated.';
    });
  }

  async function saveUserStatus() {
    if (!selectedUser) return;
    await runAdminAction('status-user', async () => {
      await api.post(`/api/admin/users/${selectedUser.id}/status`, {
        status: statusForm.status,
        reason: statusForm.reason,
        confirmTarget: ['blocked', 'deactivated'].includes(statusForm.status) ? statusForm.confirmTarget : undefined
      });
      return 'User status updated.';
    });
  }

  async function blockWholeAccount() {
    if (!selectedUser) return;
    await runAdminAction('block-user', async () => {
      await api.post(`/api/admin/users/${selectedUser.id}/status`, {
        status: 'blocked',
        reason: statusForm.reason,
        confirmTarget: statusForm.confirmTarget
      });
      return 'User account blocked and active sessions revoked.';
    });
  }

  async function saveRestrictions() {
    if (!selectedUser) return;
    await runAdminAction('restrictions', async () => {
      await api.post(`/api/admin/users/${selectedUser.id}/restrictions`, {
        reason: restrictionForm.reason,
        confirmTarget: restrictionForm.confirmTarget,
        restrictions: FEATURES.map((feature) => ({ feature, isRestricted: Boolean(restrictionForm.flags[feature]) }))
      });
      return 'User restrictions updated.';
    });
  }

  async function moderateContent(item, action = contentForm.action) {
    await runAdminAction(`content-${item.id}`, async () => {
      await api.post(`/api/admin/content/${contentType}/${item.id}/action`, {
        action,
        reason: contentForm.reason,
        confirmTarget: contentForm.confirmTarget
      });
      return `Content ${action} action completed.`;
    });
  }

  async function updateEmailServiceBlock(isBlocked) {
    await runAdminAction(isBlocked ? 'block-email-service' : 'unblock-email-service', async () => {
      const email = emailBlockForm.email.trim().toLowerCase();
      await api.post('/api/admin/email-service/block', {
        email,
        isBlocked,
        reason: emailBlockForm.reason,
        confirmTarget: isBlocked ? emailBlockForm.confirmTarget : undefined
      });
      setEmailBlockForm({ email: '', reason: '', confirmTarget: '' });
      return isBlocked ? `Email service blocked for ${email}.` : `Email service restored for ${email}.`;
    });
  }

  async function replyToSupportTicket() {
    if (!selectedSupportTicket) return;
    await runAdminAction('support-reply', async () => {
      await api.post(`/api/admin/support/${selectedSupportTicket.id}/reply`, {
        message: supportReply
      });
      setSupportReply('');
      return 'Support reply sent and user notified.';
    });
  }

  async function updateSupportTicket() {
    if (!selectedSupportTicket) return;
    await runAdminAction('support-update', async () => {
      await api.patch(`/api/admin/support/${selectedSupportTicket.id}`, supportUpdateForm);
      return 'Support ticket updated.';
    });
  }

  if (!roleCheckComplete) return null;
  if (!isAuthorized) return <Navigate replace to="/dashboard" />;

  const overview = data.adminOverview || {};
  const highRiskCount = (overview.blockedUsers || 0) + (overview.restrictedUsers || 0) + (overview.apiErrors || 0);
  const hiddenContentCount = (overview.hiddenPosts || 0) + (overview.hiddenWins || 0);
  const filteredUsers = data.adminUsers.filter((user) => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return true;
    return [user.name, user.email, user.role, user.status].filter(Boolean).some((value) => value.toLowerCase().includes(search));
  });
  const maxTrendValue = Math.max(...data.visitorTrends.map((item) => Math.max(item.visits, item.events)), 1);
  const serviceCards = data.apiUsageMetrics.map((metric) => {
    const last429At = metric.last429At ? new Date(metric.last429At).getTime() : 0;
    const hasRecent429 = last429At && Date.now() - last429At < 7 * 24 * 60 * 60 * 1000;
    return {
      name: metric.sourceName,
      status: hasRecent429 ? 'watch' : 'healthy',
      detail: hasRecent429 ? `Last 429: ${formatDate(metric.last429At)}` : 'No recent rate-limit pressure detected.',
      requests: metric.requestCount
    };
  });
  const emailMetrics = data.emailUsageMetrics || {};
  const emailMetricCards = [
    {
      icon: 'mark_email_read',
      label: 'Email sends',
      value: emailMetrics.total || 0,
      detail: `${emailMetrics.sent || 0} sent successfully`,
      tone: 'info'
    },
    {
      icon: 'outgoing_mail',
      label: 'Delivered',
      value: emailMetrics.sent || 0,
      detail: emailMetrics.lastSentAt ? `Last sent ${formatDate(emailMetrics.lastSentAt)}` : 'No successful sends yet',
      tone: 'success'
    },
    {
      icon: 'mark_email_unread',
      label: 'Pending',
      value: emailMetrics.pending || 0,
      detail: 'Emails waiting for provider confirmation',
      tone: emailMetrics.pending ? 'warning' : 'neutral'
    },
    {
      icon: 'warning',
      label: 'Failures',
      value: emailMetrics.failed || 0,
      detail: `${emailMetrics.failedLast24h || 0} failed in the last 24h`,
      tone: emailMetrics.failed ? 'danger' : 'success'
    }
  ];

  return (
    <AppShell title="Admin Control Center" description="Professional operations workspace for analytics, people control, moderation, security, and system health.">
      <section className="admin-command-hero">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value="live operations" tone="info" />
            <StatusBadge value={`${overview.activeVisitors || 0} active now`} tone="success" />
            {highRiskCount ? <StatusBadge value={`${highRiskCount} risk signals`} tone="warning" /> : <StatusBadge value="stable" tone="success" />}
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-[var(--text)] md:text-4xl">Admin command center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-strong)]">
            Monitor visitors, manage accounts, moderate content, and audit sensitive actions from one focused workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="app-button-secondary" onClick={() => loadDashboard({ silent: false })}>
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
          <button type="button" className="app-button-secondary" onClick={cleanupAnalytics} disabled={busyAction === 'cleanup'}>
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
            Cleanup
          </button>
        </div>
      </section>

      <SectionNav activeSection={activeSection} onChange={setActiveSection} />

      <AdminFeedbackToast message={message} error={error} onDismiss={() => { setMessage(''); setError(''); }} />
      {isLoading ? <div className="admin-panel text-center text-sm text-[var(--muted-strong)]">Loading admin workspace...</div> : null}

      {!isLoading && activeSection === 'command' ? (
        <div className="admin-workspace">
          <main className="space-y-6">
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AdminCard icon="group" label="Total users" value={overview.totalUsers || 0} detail={`${overview.activeRefreshTokens || 0} active sessions`} tone="info" />
              <AdminCard icon="person_off" label="Restricted users" value={overview.restrictedUsers || 0} detail={`${overview.blockedUsers || 0} blocked, ${overview.deactivatedUsers || 0} deactivated`} tone={overview.blockedUsers ? 'danger' : 'warning'} />
              <AdminCard icon="visibility" label="Visits" value={overview.totalVisits || 0} detail={`${overview.uniqueVisitors || 0} unique visitors`} tone="success" />
              <AdminCard icon="report" label="API errors" value={overview.apiErrors || 0} detail={`${overview.adminActions || 0} admin actions`} tone={overview.apiErrors ? 'danger' : 'success'} />
              <AdminCard icon="psychology" label="Analyses" value={overview.totalAnalyses || 0} detail={`${overview.totalGeneratedContent || 0} generated items`} />
              <AdminCard icon="bookmark" label="Saved jobs" value={overview.totalSavedJobs || 0} />
              <AdminCard icon="visibility_off" label="Hidden content" value={hiddenContentCount} detail={`${overview.pendingModeration || 0} active restrictions`} tone={hiddenContentCount ? 'warning' : 'neutral'} />
              <AdminCard icon="api" label="API requests" value={overview.totalApiRequests || 0} />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-header">
                <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">stacked_bar_chart</span>
                <h2>14 day visitor trend</h2>
              </div>
              <div className="mt-6 grid min-h-56 grid-cols-7 items-end gap-2 md:grid-cols-14">
                {data.visitorTrends.map((point) => (
                  <div key={point.date} className="flex min-h-48 flex-col justify-end gap-2">
                    <div className="admin-trend-bar" style={{ height: `${Math.max((point.visits / maxTrendValue) * 180, 8)}px` }} title={`${point.visits} visits`} />
                    <p className="truncate text-center text-[10px] font-bold text-[var(--muted-strong)]">{point.date.slice(5)}</p>
                  </div>
                ))}
                {!data.visitorTrends.length ? <div className="col-span-full"><EmptyState label="No trend data yet" /></div> : null}
              </div>
            </section>
          </main>
          <aside className="space-y-6">
            <section className="admin-panel">
              <div className="admin-panel-header">
                <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">priority_high</span>
                <h2>Priority signals</h2>
              </div>
              <div className="mt-4 space-y-3">
                {data.suspiciousSignals.slice(0, 4).map((signal) => (
                  <article key={`${signal.label}-${signal.lastSeenAt}`} className="admin-compact-row">
                    <StatusBadge value={signal.severity} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[var(--text)]">{signal.label}</p>
                      <p className="text-xs text-[var(--muted-strong)]">{signal.count} events | {formatDate(signal.lastSeenAt)}</p>
                    </div>
                  </article>
                ))}
                {!data.suspiciousSignals.length ? <EmptyState label="No suspicious signals" detail="Risk monitoring is quiet right now." /> : null}
              </div>
            </section>
            <BreakdownList title="Top pages" items={data.topPages} icon="web" />
          </aside>
        </div>
      ) : null}

      {!isLoading && activeSection === 'people' ? (
        <div className="admin-workspace">
          <main className="space-y-6">
            <section className="admin-panel">
              <div className="admin-toolbar">
                <div>
                  <p className="admin-eyebrow">People operations</p>
                  <h2 className="text-xl font-black text-[var(--text)]">Users and account access</h2>
                </div>
                <input className="app-input max-w-sm" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search users, role, or status..." />
              </div>
              {filteredUsers.length ? (
                <UserTable users={filteredUsers} selectedUserId={selectedUser?.id} onSelect={setSelectedUserId} />
              ) : <EmptyState label="No users found" detail="Try another email, name, role, or status." />}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-header">
                <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">person_add</span>
                <h2>Invite user</h2>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input className="app-input" value={inviteForm.email} onChange={(event) => setInviteForm((form) => ({ ...form, email: event.target.value }))} placeholder="Email" />
                <input className="app-input" value={inviteForm.name} onChange={(event) => setInviteForm((form) => ({ ...form, name: event.target.value }))} placeholder="Name" />
                <select className="app-input" value={inviteForm.role} onChange={(event) => setInviteForm((form) => ({ ...form, role: event.target.value }))}>
                  {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <input className="app-input" value={inviteForm.confirmTarget} onChange={(event) => setInviteForm((form) => ({ ...form, confirmTarget: event.target.value }))} placeholder="Type the invite email" />
                <textarea className="app-input min-h-20 md:col-span-2" value={inviteForm.reason} onChange={(event) => setInviteForm((form) => ({ ...form, reason: event.target.value }))} placeholder="Invite reason" />
                <button type="button" className="app-button w-fit" onClick={inviteNewUser} disabled={busyAction === 'invite'}>Send invite</button>
              </div>
            </section>
          </main>
          <UserDetailPanel
            selectedUser={selectedUser}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            roleForm={roleForm}
            setRoleForm={setRoleForm}
            statusForm={statusForm}
            setStatusForm={setStatusForm}
            restrictionForm={restrictionForm}
            setRestrictionForm={setRestrictionForm}
            onSaveProfile={saveUserProfile}
            onSaveRole={saveUserRole}
            onSaveStatus={saveUserStatus}
            onSaveRestrictions={saveRestrictions}
            onBlockAccount={blockWholeAccount}
            onRevoke={() => selectedUser && revokeSessions(selectedUser.id)}
            busyAction={busyAction}
          />
        </div>
      ) : null}

      {!isLoading && activeSection === 'activity' ? (
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-4">
            <BreakdownList title="Approximate locations" items={data.geoBreakdown} icon="public" />
            <BreakdownList title="Traffic sources" items={data.trafficSources} icon="campaign" />
            <BreakdownList title="Devices" items={data.deviceBreakdown} icon="devices" />
            <BreakdownList title="Top pages" items={data.topPages} icon="web" />
          </section>
          <section className="admin-panel">
            <div className="admin-toolbar">
              <div>
                <p className="admin-eyebrow">Activity stream</p>
                <h2 className="text-xl font-black text-[var(--text)]">Recent platform events</h2>
              </div>
              <select className="app-input max-w-xs" value={eventType} onChange={(event) => setEventType(event.target.value)}>
                {EVENT_TYPES.map((type) => <option key={type || 'all'} value={type}>{type || 'All events'}</option>)}
              </select>
            </div>
            <div className="mt-5 grid gap-3">
              {data.recentEvents.length ? data.recentEvents.map((event) => <EventRow key={event.id} event={event} />) : <EmptyState label="No matching events" />}
            </div>
          </section>
        </div>
      ) : null}

      {!isLoading && activeSection === 'moderation' ? (
        <div className="admin-workspace">
          <main className="admin-panel">
            <div className="admin-toolbar">
              <div>
                <p className="admin-eyebrow">Moderation queue</p>
                <h2 className="text-xl font-black text-[var(--text)]">Review user-owned content</h2>
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                <select className="app-input md:w-48" value={contentType} onChange={(event) => setContentType(event.target.value)}>
                  {CONTENT_TYPES.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
                </select>
                <input className="app-input md:w-64" value={contentSearch} onChange={(event) => setContentSearch(event.target.value)} placeholder="Search content or owner" />
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {data.adminModerationQueue.map((item) => (
                <article key={item.id} className="admin-content-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={item.status} />
                      <StatusBadge value={item.type} tone="info" />
                      {item.ownerEmail ? <span className="admin-chip truncate">{item.ownerEmail}</span> : null}
                    </div>
                    <p className="mt-3 text-sm font-black text-[var(--text)]">{item.title || item.id}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-strong)]">{item.body || 'No body preview'}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">ID: {item.id}</p>
                  </div>
                  <div className="admin-action-group shrink-0">
                    <button type="button" className="app-button-secondary" onClick={() => moderateContent(item, item.status === 'hidden' ? 'unhide' : 'hide')} disabled={busyAction === `content-${item.id}`}>{item.status === 'hidden' ? 'Unhide' : 'Hide'}</button>
                    <button type="button" className="app-button-danger" onClick={() => moderateContent(item, 'delete')} disabled={busyAction === `content-${item.id}`}>Delete</button>
                  </div>
                </article>
              ))}
              {!data.adminModerationQueue.length ? <EmptyState label="No moderation items" detail="This queue is clear for the current filter." /> : null}
            </div>
          </main>
          <aside className="admin-detail-panel">
            <p className="admin-eyebrow">Action confirmation</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text)]">Moderation controls</h2>
            <div className="mt-5 grid gap-4">
              <label>
                <span className="app-field-label">Default action</span>
                <select className="app-input mt-2" value={contentForm.action} onChange={(event) => setContentForm((form) => ({ ...form, action: event.target.value }))}>
                  <option value="hide">hide</option>
                  <option value="unhide">unhide</option>
                  <option value="delete">delete</option>
                </select>
              </label>
              <label>
                <span className="app-field-label">Reason</span>
                <textarea className="app-input mt-2 min-h-28" value={contentForm.reason} onChange={(event) => setContentForm((form) => ({ ...form, reason: event.target.value }))} placeholder="Required before moderation actions" />
              </label>
              <label>
                <span className="app-field-label">Typed content ID</span>
                <input className="app-input mt-2" value={contentForm.confirmTarget} onChange={(event) => setContentForm((form) => ({ ...form, confirmTarget: event.target.value }))} placeholder="Paste target content ID" />
              </label>
              <div className="admin-warning-box">
                Hide/unhide is preferred for public content. Delete is reserved for content types where the backend already supports safe removal.
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {!isLoading && activeSection === 'support' ? (
        <div className="admin-workspace">
          <main className="admin-panel">
            <div className="admin-toolbar">
              <div>
                <p className="admin-eyebrow">Support queue</p>
                <h2 className="text-xl font-black text-[var(--text)]">User support tickets</h2>
              </div>
              <div className="grid w-full gap-2 md:w-auto md:grid-cols-4">
                <select className="app-input" value={supportStatus} onChange={(event) => setSupportStatus(event.target.value)}>
                  {SUPPORT_STATUSES.map((status) => <option key={status || 'all'} value={status}>{status ? humanize(status) : 'All status'}</option>)}
                </select>
                <select className="app-input" value={supportPriority} onChange={(event) => setSupportPriority(event.target.value)}>
                  {SUPPORT_PRIORITIES.map((priority) => <option key={priority || 'all'} value={priority}>{priority ? humanize(priority) : 'All priority'}</option>)}
                </select>
                <select className="app-input" value={supportCategory} onChange={(event) => setSupportCategory(event.target.value)}>
                  {SUPPORT_CATEGORIES.map((category) => <option key={category || 'all'} value={category}>{category ? humanize(category) : 'All category'}</option>)}
                </select>
                <input className="app-input" value={supportSearch} onChange={(event) => setSupportSearch(event.target.value)} placeholder="Search tickets" />
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {data.adminSupportTickets.length ? data.adminSupportTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedSupportTicketId(ticket.id)}
                  className={`admin-list-row text-left transition ${selectedSupportTicket?.id === ticket.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={ticket.status} />
                      <StatusBadge value={ticket.priority} tone={ticket.priority === 'urgent' || ticket.priority === 'high' ? 'danger' : 'neutral'} />
                      <StatusBadge value={ticket.category} tone="info" />
                      {ticket.userEmail ? <span className="admin-chip truncate">{ticket.userEmail}</span> : null}
                    </div>
                    <p className="mt-3 text-sm font-black text-[var(--text)]">{ticket.subject}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted-strong)]">{ticket.message}</p>
                  </div>
                  <time className="admin-time">{formatDate(ticket.updatedAt)}</time>
                </button>
              )) : <EmptyState label="No support tickets" detail="Tickets from users will appear here." />}
            </div>
          </main>

          <aside className="admin-detail-panel">
            {selectedSupportTicket ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={selectedSupportTicket.status} />
                  <StatusBadge value={selectedSupportTicket.priority} />
                </div>
                <h2 className="mt-3 text-xl font-black text-[var(--text)]">{selectedSupportTicket.subject}</h2>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">{selectedSupportTicket.userEmail || 'Unknown user'}</p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{selectedSupportTicket.message}</p>

                <div className="mt-6 grid gap-3">
                  <p className="admin-eyebrow">Conversation</p>
                  {data.adminSupportMessages.length ? data.adminSupportMessages.map((item) => (
                    <article key={item.id} className={`rounded-lg border p-3 ${item.senderRole === 'admin' ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--panel-soft)]'}`}>
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{item.senderRole === 'admin' ? 'Admin' : item.senderEmail || 'User'}</p>
                        <time className="text-xs font-semibold text-[var(--muted-strong)]">{formatDate(item.createdAt)}</time>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{item.message}</p>
                    </article>
                  )) : <EmptyState label="No messages loaded" />}
                </div>

                <div className="mt-6 grid gap-3">
                  <p className="admin-eyebrow">Reply</p>
                  <textarea className="app-input min-h-28" value={supportReply} onChange={(event) => setSupportReply(event.target.value)} placeholder="Write an admin reply" />
                  <button type="button" className="app-button w-fit" onClick={replyToSupportTicket} disabled={busyAction === 'support-reply'}>Send reply</button>
                </div>

                <div className="mt-6 grid gap-3">
                  <p className="admin-eyebrow">Status control</p>
                  <select className="app-input" value={supportUpdateForm.status} onChange={(event) => setSupportUpdateForm((form) => ({ ...form, status: event.target.value }))}>
                    {SUPPORT_STATUSES.filter(Boolean).map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                  </select>
                  <select className="app-input" value={supportUpdateForm.priority} onChange={(event) => setSupportUpdateForm((form) => ({ ...form, priority: event.target.value }))}>
                    {SUPPORT_PRIORITIES.filter(Boolean).map((priority) => <option key={priority} value={priority}>{humanize(priority)}</option>)}
                  </select>
                  <textarea className="app-input min-h-20" value={supportUpdateForm.reason} onChange={(event) => setSupportUpdateForm((form) => ({ ...form, reason: event.target.value }))} placeholder="Admin reason for ticket update" />
                  <button type="button" className="app-button-secondary w-fit" onClick={updateSupportTicket} disabled={busyAction === 'support-update'}>Apply update</button>
                </div>
              </>
            ) : (
              <EmptyState label="Select a ticket" detail="Open a support ticket to reply or update its status." />
            )}
          </aside>
        </div>
      ) : null}

      {!isLoading && activeSection === 'security' ? (
        <div className="admin-workspace">
          <main className="space-y-6">
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AdminCard icon="vpn_key" label="Active sessions" value={overview.activeRefreshTokens || 0} />
              <AdminCard icon="block" label="Blocked users" value={overview.blockedUsers || 0} tone={overview.blockedUsers ? 'danger' : 'neutral'} />
              <AdminCard icon="error" label="API errors" value={overview.apiErrors || 0} tone={overview.apiErrors ? 'danger' : 'success'} />
              <AdminCard icon="history" label="Admin actions" value={overview.adminActions || 0} />
            </section>
            <section className="admin-panel">
              <div className="admin-panel-header">
                <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">crisis_alert</span>
                <h2>Suspicious signals</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {data.suspiciousSignals.length ? data.suspiciousSignals.map((signal) => (
                  <article key={`${signal.label}-${signal.lastSeenAt}`} className="admin-list-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={signal.severity} />
                        <span className="admin-chip">{signal.count} events</span>
                      </div>
                      <p className="mt-3 font-black text-[var(--text)]">{signal.label}</p>
                      <p className="mt-2 text-sm text-[var(--muted-strong)]">{signal.detail}</p>
                    </div>
                    <time className="admin-time">{formatDate(signal.lastSeenAt)}</time>
                  </article>
                )) : <EmptyState label="No suspicious signals" />}
              </div>
            </section>
          </main>
          <UserDetailPanel
            selectedUser={selectedUser}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            roleForm={roleForm}
            setRoleForm={setRoleForm}
            statusForm={statusForm}
            setStatusForm={setStatusForm}
            restrictionForm={restrictionForm}
            setRestrictionForm={setRestrictionForm}
            onSaveProfile={saveUserProfile}
            onSaveRole={saveUserRole}
            onSaveStatus={saveUserStatus}
            onSaveRestrictions={saveRestrictions}
            onBlockAccount={blockWholeAccount}
            onRevoke={() => selectedUser && revokeSessions(selectedUser.id)}
            busyAction={busyAction}
          />
        </div>
      ) : null}

      {!isLoading && activeSection === 'system' ? (
        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {emailMetricCards.map((card) => (
              <AdminCard key={card.label} icon={card.icon} label={card.label} value={card.value} detail={card.detail} tone={card.tone} />
            ))}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">mail</span>
              <h2>Recent email service usage</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px]">
              <input
                className="app-input"
                value={emailSearch}
                onChange={(event) => setEmailSearch(event.target.value)}
                placeholder="Filter by recipient email"
              />
              <select className="app-input" value={emailType} onChange={(event) => setEmailType(event.target.value)}>
                {EMAIL_TYPES.map((type) => (
                  <option key={type || 'all'} value={type}>{type ? humanize(type) : 'All email types'}</option>
                ))}
              </select>
              <select className="app-input" value={emailStatus} onChange={(event) => setEmailStatus(event.target.value)}>
                {EMAIL_STATUSES.map((status) => (
                  <option key={status || 'all'} value={status}>{status ? humanize(status) : 'All statuses'}</option>
                ))}
              </select>
            </div>
            <div className="mt-5 grid gap-3">
              {data.emailDeliveryLogs.length ? data.emailDeliveryLogs.map((log) => (
                <article key={log.id} className="admin-list-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={log.status} />
                      <StatusBadge value={log.emailType} tone="info" />
                      <span className="admin-chip truncate">{log.provider || 'unknown provider'}</span>
                    </div>
                    <p className="mt-3 break-words text-sm font-bold text-[var(--text)]">{log.email}</p>
                    <p className="mt-1 text-xs text-[var(--muted-strong)]">
                      {log.userEmail ? `Linked user: ${log.userName || log.userEmail}` : 'No linked user'} | {formatLocation(log)}
                    </p>
                    {log.subject ? <p className="mt-2 text-xs text-[var(--muted-strong)]">Subject: {log.subject}</p> : null}
                    {log.errorMessage ? (
                      <p className="mt-2 text-xs font-semibold text-red-500">
                        {log.errorCode ? `${log.errorCode}: ` : ''}{log.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <time className="admin-time">{formatDate(log.createdAt)}</time>
                    {log.deliveredAt ? <p className="mt-2 text-[11px] font-semibold text-[var(--muted)]">Sent {formatDate(log.deliveredAt)}</p> : null}
                  </div>
                </article>
              )) : <EmptyState label="No email service logs" detail="Verification, reset, and invite setup emails will appear after the next send." />}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <article className="admin-panel">
              <div className="admin-panel-header">
                <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">unsubscribe</span>
                <h2>Email service access</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">
                Block or restore transactional email delivery for one address. Blocked addresses cannot receive verification, password reset, or invite setup emails.
              </p>
              <div className="mt-5 grid gap-3">
                <input
                  className="app-input"
                  value={emailBlockForm.email}
                  onChange={(event) => setEmailBlockForm((form) => ({ ...form, email: event.target.value }))}
                  placeholder="Email address"
                />
                <textarea
                  className="app-input min-h-24"
                  value={emailBlockForm.reason}
                  onChange={(event) => setEmailBlockForm((form) => ({ ...form, reason: event.target.value }))}
                  placeholder="Admin reason shown to the user"
                />
                <input
                  className="app-input"
                  value={emailBlockForm.confirmTarget}
                  onChange={(event) => setEmailBlockForm((form) => ({ ...form, confirmTarget: event.target.value }))}
                  placeholder="Type email to confirm block"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="app-button-danger flex-1"
                    onClick={() => updateEmailServiceBlock(true)}
                    disabled={busyAction === 'block-email-service'}
                  >
                    <span className="material-symbols-outlined text-[18px]">block</span>
                    Block email service
                  </button>
                  <button
                    type="button"
                    className="app-button-secondary flex-1"
                    onClick={() => updateEmailServiceBlock(false)}
                    disabled={busyAction === 'unblock-email-service'}
                  >
                    <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
                    Unblock
                  </button>
                </div>
              </div>
            </article>

            <article className="admin-panel">
              <div className="admin-panel-header">
                <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">rule</span>
                <h2>Email blocklist</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {data.emailServiceBlocks.length ? data.emailServiceBlocks.map((block) => (
                  <article key={block.id} className="admin-list-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={block.isBlocked ? 'blocked' : 'unblocked'} />
                        {block.createdByEmail ? <span className="admin-chip truncate">{block.createdByEmail}</span> : null}
                      </div>
                      <p className="mt-3 break-words text-sm font-bold text-[var(--text)]">{block.email}</p>
                      <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">{block.reason}</p>
                    </div>
                    <time className="admin-time">{formatDate(block.updatedAt)}</time>
                  </article>
                )) : <EmptyState label="No blocked email addresses" detail="Blocked and restored email service records will appear here." />}
              </div>
            </article>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">dns</span>
              <h2 className="text-base font-black text-[var(--text)]">External API usage</h2>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              {serviceCards.map((service) => (
                <article key={service.name} className="admin-panel">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="admin-eyebrow">{service.name}</p>
                      <h2 className="mt-3 text-2xl font-black text-[var(--text)]">{service.requests} requests</h2>
                    </div>
                    <StatusBadge value={service.status} />
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">{service.detail}</p>
                </article>
              ))}
              {!serviceCards.length ? <div className="admin-panel"><EmptyState label="No API usage rows" detail="System usage data will appear after services record activity." /></div> : null}
            </div>
          </section>
        </div>
      ) : null}

      {!isLoading && activeSection === 'audit' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">policy</span>
              <h2>Moderation audit</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {data.adminModerationActions.length ? data.adminModerationActions.map((log) => (
                <article key={log.id} className="admin-list-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={log.action} />
                      <StatusBadge value={log.targetType} tone="info" />
                      {log.adminEmail ? <span className="admin-chip truncate">{log.adminEmail}</span> : null}
                    </div>
                    <p className="mt-3 text-sm text-[var(--text)]">Target: {log.targetId}</p>
                    <p className="mt-2 text-sm text-[var(--muted-strong)]">{log.reason}</p>
                  </div>
                  <time className="admin-time">{formatDate(log.createdAt)}</time>
                </article>
              )) : <EmptyState label="No moderation actions" />}
            </div>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-header">
              <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">receipt_long</span>
              <h2>Admin audit trail</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {data.adminAuditLogs.length ? data.adminAuditLogs.map((log) => {
                const metadata = parseMetadata(log.metadata);
                const metadataText = Object.entries(metadata).slice(0, 4).map(([key, value]) => `${key}: ${String(value)}`).join(' | ');
                return (
                  <article key={log.id} className="admin-list-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={log.action} />
                        {log.adminEmail ? <span className="admin-chip truncate">{log.adminEmail}</span> : null}
                        {log.targetType ? <StatusBadge value={log.targetType} tone="info" /> : null}
                      </div>
                      {log.targetId ? <p className="mt-3 text-sm text-[var(--text)]">Target: {log.targetId}</p> : null}
                      {metadataText ? <p className="mt-2 text-xs text-[var(--muted-strong)]">{metadataText}</p> : null}
                    </div>
                    <time className="admin-time">{formatDate(log.createdAt)}</time>
                  </article>
                );
              }) : <EmptyState label="No admin actions" />}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
