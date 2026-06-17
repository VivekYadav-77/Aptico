import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { deleteNotification, getNotifications, markNotificationsRead } from '../api/socialApi.js';

const socialTypes = ['new_follower', 'new_connection_request', 'connection_accepted', 'post_like', 'post_comment'];
const careerTypes = ['job_match_alert'];
const squadTypes = ['squad_ping', 'squad_goal_reached', 'squad_synergy_burst'];
const adminTypes = ['admin_restriction_update', 'admin_account_status', 'support_ticket_reply', 'support_ticket_status'];
const typeOptions = ['', ...socialTypes, ...careerTypes, ...squadTypes, ...adminTypes];

function initials(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

function timeAgo(value) {
  if (!value) return 'recently';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function humanize(value) {
  return String(value || '').replaceAll('_', ' ');
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  async function loadNotifications({ reset = true } = {}) {
    const nextOffset = reset ? 0 : offset;
    setIsLoading(reset);
    setError('');
    try {
      const result = await getNotifications({
        limit: 20,
        offset: nextOffset,
        readStatus: statusFilter,
        category: typeFilter ? undefined : categoryFilter || undefined,
        type: typeFilter || undefined
      });
      const nextItems = result.notifications || [];
      setItems((current) => (reset ? nextItems : [...current, ...nextItems]));
      setHasMore(nextItems.length === 20);
      setOffset(nextOffset + 20);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.response?.data?.message || requestError.message || 'Could not load notifications.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications({ reset: true });
  }, [statusFilter, categoryFilter, typeFilter]);

  const visibleItems = useMemo(() => items, [items]);

  async function loadMore() {
    await loadNotifications({ reset: false });
  }

  async function markOne(item) {
    setBusyId(`read-${item.id}`);
    try {
      await markNotificationsRead({ notificationIds: [item.id] });
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
    } finally {
      setBusyId('');
    }
  }

  async function markAllRead() {
    setBusyId('mark-all');
    try {
      await markNotificationsRead({ markAllRead: true });
      setItems((current) => current.map((row) => ({ ...row, is_read: true })));
    } finally {
      setBusyId('');
    }
  }

  async function removeOne(item) {
    setBusyId(`delete-${item.id}`);
    try {
      await deleteNotification(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
    } finally {
      setBusyId('');
    }
  }

  function resetFilters() {
    setStatusFilter('all');
    setCategoryFilter('');
    setTypeFilter('');
  }

  return (
    <AppShell title="Notifications" description="Your latest social and career updates.">
      <div className="mx-auto max-w-4xl">
        <section className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                Status
                <select className="app-input mt-2" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </label>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                Category
                <select
                  className="app-input mt-2"
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setTypeFilter('');
                  }}
                >
                  <option value="">All categories</option>
                  <option value="social">Social</option>
                  <option value="career">Career</option>
                  <option value="squad">Squad</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                Type
                <select
                  className="app-input mt-2"
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    if (event.target.value) setCategoryFilter('');
                  }}
                >
                  {typeOptions.map((type) => (
                    <option key={type || 'all'} value={type}>{type ? humanize(type) : 'All types'}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="app-button-secondary" onClick={resetFilters}>Reset</button>
              <button type="button" className="app-button-secondary" onClick={() => loadNotifications({ reset: true })}>Refresh</button>
              <button type="button" className="app-button" onClick={markAllRead} disabled={busyId === 'mark-all'}>Mark all read</button>
            </div>
          </div>
        </section>

        {error ? <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-500">{error}</p> : null}
        {isLoading ? <p className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted-strong)]">Loading notifications...</p> : null}
        {!isLoading ? (
          <div className="space-y-3">
            {visibleItems.map((item) => (
              <article key={item.id} className={`flex w-full gap-4 rounded-lg border border-[var(--border)] p-4 text-left ${item.is_read ? 'bg-[var(--panel)]' : 'bg-[var(--accent-soft)]'}`}>
                {item.actor?.avatar_url ? <img src={item.actor.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[#003824]">{initials(item.actor?.name)}</div>}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted-strong)]">{humanize(item.type)}</span>
                    {!item.is_read ? <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#003824]">Unread</span> : null}
                  </div>
                  <p className="mt-3 font-bold text-[var(--text)]">{item.message}</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">{timeAgo(item.created_at)}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  {!item.is_read ? (
                    <button type="button" className="app-button-secondary px-3 py-2 text-xs" onClick={() => markOne(item)} disabled={busyId === `read-${item.id}`}>Read</button>
                  ) : null}
                  <button type="button" className="app-button-secondary px-3 py-2 text-xs text-red-500" onClick={() => removeOne(item)} disabled={busyId === `delete-${item.id}`}>Delete</button>
                </div>
              </article>
            ))}
            {!visibleItems.length ? <p className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted-strong)]">No notifications match these filters.</p> : null}
          </div>
        ) : null}
        {hasMore && !isLoading ? <div className="mt-6 text-center"><button type="button" className="app-button-secondary" onClick={loadMore}>Load more</button></div> : null}
      </div>
    </AppShell>
  );
}
