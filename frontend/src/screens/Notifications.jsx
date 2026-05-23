import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { getNotifications, markNotificationsRead } from '../api/socialApi.js';

const socialTypes = ['new_follower', 'new_connection_request', 'connection_accepted', 'post_like', 'post_comment'];
const careerTypes = ['job_match_alert'];

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

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getNotifications({ limit: 20, offset: 0, unreadOnly: filter === 'unread' }).then((result) => {
      setItems(result.notifications || []);
      setHasMore((result.notifications || []).length === 20);
      setOffset(20);
    });
  }, [filter]);

  const visibleItems = useMemo(() => {
    if (filter === 'social') return items.filter((item) => socialTypes.includes(item.type));
    if (filter === 'career') return items.filter((item) => careerTypes.includes(item.type));
    return items;
  }, [filter, items]);

  async function loadMore() {
    const result = await getNotifications({ limit: 20, offset, unreadOnly: filter === 'unread' });
    setItems((current) => [...current, ...(result.notifications || [])]);
    setHasMore((result.notifications || []).length === 20);
    setOffset((current) => current + 20);
  }

  async function markOne(item) {
    await markNotificationsRead({ notificationIds: [item.id] });
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
  }

  return (
    <AppShell title="Notifications" description="Your latest social and career updates.">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap gap-2">
          {['all', 'unread', 'social', 'career'].map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} className={filter === item ? 'app-button px-3 py-2 capitalize' : 'app-button-secondary px-3 py-2 capitalize'}>{item}</button>
          ))}
        </div>
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <button key={item.id} type="button" onClick={() => markOne(item)} className={`flex w-full gap-4 rounded-lg border border-[var(--border)] p-4 text-left ${item.is_read ? 'bg-[var(--panel)]' : 'bg-[var(--accent-soft)]'}`}>
              {item.actor?.avatar_url ? <img src={item.actor.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[#003824]">{initials(item.actor?.name)}</div>}
              <div>
                <p className="font-bold text-[var(--text)]">{item.message}</p>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">{timeAgo(item.created_at)}</p>
              </div>
            </button>
          ))}
          {!visibleItems.length ? <p className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted-strong)]">No notifications here yet.</p> : null}
        </div>
        {hasMore ? <div className="mt-6 text-center"><button type="button" className="app-button-secondary" onClick={loadMore}>Load more</button></div> : null}
      </div>
    </AppShell>
  );
}
