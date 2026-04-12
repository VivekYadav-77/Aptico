import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNotifications, getUnreadNotificationCount, markNotificationsRead } from '../api/socialApi.js';

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

function notificationTarget(item) {
  if (item.type === 'new_follower' || item.type === 'connection_accepted') {
    return item.actor?.username ? `/u/${item.actor.username}` : '/home';
  }
  if (item.type === 'job_match_alert') return '/jobs';
  return '/home';
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);

  async function refreshCount() {
    getUnreadNotificationCount().then(setUnreadCount).catch(() => null);
  }

  async function loadItems() {
    const result = await getNotifications({ limit: 10 });
    setItems(result.notifications || []);
    setUnreadCount(result.unreadCount || 0);
  }

  useEffect(() => {
    void refreshCount();
    const timer = window.setInterval(refreshCount, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadItems();
    }
  }

  async function handleItemClick(item) {
    await markNotificationsRead({ notificationIds: [item.id] });
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
    setUnreadCount((current) => Math.max(0, current - (item.is_read ? 0 : 1)));
    setOpen(false);
    navigate(notificationTarget(item));
  }

  async function markAll() {
    await markNotificationsRead({ markAllRead: true });
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button type="button" className="app-icon-button relative" onClick={toggleOpen} aria-label="Notifications">
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {unreadCount >= 10 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[220] w-[min(360px,calc(100vw-2rem))] rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[0_24px_48px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
            <h3 className="font-black text-[var(--text)]">Notifications</h3>
            <button type="button" className="text-xs font-bold text-[var(--accent-strong)]" onClick={markAll}>Mark all as read</button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {items.length ? items.map((item) => (
              <button key={item.id} type="button" onClick={() => handleItemClick(item)} className={`flex w-full gap-3 rounded-lg p-3 text-left transition hover:bg-[var(--panel-soft)] ${item.is_read ? '' : 'bg-[var(--accent-soft)]'}`}>
                {item.actor?.avatar_url ? <img src={item.actor.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-black text-[#003824]">{initials(item.actor?.name)}</div>}
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{item.message}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{timeAgo(item.created_at)}</p>
                </div>
              </button>
            )) : <p className="p-5 text-center text-sm text-[var(--muted-strong)]">No notifications yet.</p>}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-[var(--border)] p-3 text-center text-sm font-bold text-[var(--accent-strong)]">See all notifications</Link>
        </div>
      ) : null}
    </div>
  );
}
