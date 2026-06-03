import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat.jsx';
import { useSelector } from 'react-redux';
import {
  bulkDeleteActivity,
  bulkUnlikeActivity,
  getActivityComments,
  getActivityLikes,
  getActivityReplies
} from '../api/socialApi.js';
import { selectAuth } from '../store/authSlice.js';

const tabs = [
  { id: 'likes', label: 'Likes', icon: 'favorite', action: 'Unlike', loader: getActivityLikes },
  { id: 'comments', label: 'Comments', icon: 'chat_bubble', action: 'Delete', loader: getActivityComments },
  { id: 'replies', label: 'Replies', icon: 'reply', action: 'Delete', loader: getActivityReplies }
];

function timeLabel(value) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function truncate(value, max = 140) {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function emptyCopy(tabId) {
  if (tabId === 'likes') return 'Posts and wins you like will appear here.';
  if (tabId === 'comments') return 'Comments you leave on posts will appear here.';
  return 'Replies you leave in post conversations will appear here.';
}

function targetLabel(item) {
  if (item.target_type === 'win') {
    return `Community Win${item.target?.role_title ? ` - ${item.target.role_title}` : ''}`;
  }

  return `Post${item.target?.post_type ? ` - ${String(item.target.post_type).replace('_', ' ')}` : ''}`;
}

export default function YourActivityPanel() {
  const auth = useSelector(selectAuth);
  const [activeTab, setActiveTab] = useState('likes');
  const [stateByTab, setStateByTab] = useState(() =>
    Object.fromEntries(tabs.map((tab) => [tab.id, { items: [], offset: 0, hasMore: false, loading: false, error: '' }]))
  );
  const [selectedByTab, setSelectedByTab] = useState(() => Object.fromEntries(tabs.map((tab) => [tab.id, new Set()])));
  const [acting, setActing] = useState(false);

  const tab = useMemo(() => tabs.find((item) => item.id === activeTab) || tabs[0], [activeTab]);
  const current = stateByTab[activeTab];
  const selected = selectedByTab[activeTab] || new Set();
  const selectedItems = current.items.filter((item) => selected.has(item.id));

  useEffect(() => {
    if (!auth.authReady || !auth.isAuthenticated) return;
    if (stateByTab[activeTab].items.length || stateByTab[activeTab].loading) return;
    void loadTab(activeTab, { reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, auth.authReady, auth.isAuthenticated]);

  function getErrorMessage(error, fallback) {
    return error.response?.data?.error || error.response?.data?.message || error.message || fallback;
  }

  async function loadTab(tabId, { reset = false } = {}) {
    const targetTab = tabs.find((item) => item.id === tabId) || tabs[0];
    const offset = reset ? 0 : stateByTab[tabId].offset;

    setStateByTab((currentState) => ({
      ...currentState,
      [tabId]: { ...currentState[tabId], loading: true, error: '' }
    }));

    try {
      const result = await targetTab.loader({ limit: 20, offset });
      setStateByTab((currentState) => ({
        ...currentState,
        [tabId]: {
          items: reset ? result.items || [] : [...currentState[tabId].items, ...(result.items || [])],
          offset: offset + (result.items || []).length,
          hasMore: Boolean(result.hasMore),
          loading: false,
          error: ''
        }
      }));
    } catch (error) {
      setStateByTab((currentState) => ({
        ...currentState,
        [tabId]: {
          ...currentState[tabId],
          loading: false,
          error: getErrorMessage(error, 'Could not load this activity.')
        }
      }));
    }
  }

  function toggleSelected(itemId) {
    setSelectedByTab((currentSelection) => {
      const next = new Set(currentSelection[activeTab] || []);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { ...currentSelection, [activeTab]: next };
    });
  }

  function toggleAll() {
    setSelectedByTab((currentSelection) => {
      const next = selected.size === current.items.length ? new Set() : new Set(current.items.map((item) => item.id));
      return { ...currentSelection, [activeTab]: next };
    });
  }

  function removeItems(tabId, ids) {
    setStateByTab((currentState) => ({
      ...currentState,
      [tabId]: {
        ...currentState[tabId],
        items: currentState[tabId].items.filter((item) => !ids.includes(item.id))
      }
    }));
    setSelectedByTab((currentSelection) => ({ ...currentSelection, [tabId]: new Set() }));
  }

  async function performAction(items) {
    if (!items.length || acting) return;

    setActing(true);
    try {
      if (activeTab === 'likes') {
        await bulkUnlikeActivity(items.map((item) => ({ id: item.id, activity_type: item.activity_type })));
      } else {
        await bulkDeleteActivity(items.map((item) => item.id));
      }
      removeItems(activeTab, items.map((item) => item.id));
    } catch (error) {
      setStateByTab((currentState) => ({
        ...currentState,
        [activeTab]: {
          ...currentState[activeTab],
          error: getErrorMessage(error, `Could not ${tab.action.toLowerCase()} selected activity.`)
        }
      }));
    } finally {
      setActing(false);
    }
  }

  if (!auth.authReady) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 text-sm font-semibold text-[var(--muted-strong)]">
        Loading your session...
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-6 text-sm font-semibold text-[var(--muted-strong)]">
        Sign in to view and manage your activity.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-colors ${
                activeTab === item.id
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20'
                  : 'border border-[var(--border)] bg-[var(--panel)] text-[var(--muted-strong)] hover:text-[var(--text)]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-3 text-sm font-bold text-[var(--text)]">
          <input
            type="checkbox"
            checked={current.items.length > 0 && selected.size === current.items.length}
            onChange={toggleAll}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Select visible
        </label>
        <button
          type="button"
          className="app-button-secondary px-4 py-2 text-sm text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!selectedItems.length || acting}
          onClick={() => performAction(selectedItems)}
        >
          <span className="material-symbols-outlined text-[18px]">{activeTab === 'likes' ? 'heart_minus' : 'delete'}</span>
          {acting ? 'Updating...' : `${tab.action} selected (${selectedItems.length})`}
        </button>
      </div>

      {current.error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm font-bold text-red-500">
          {current.error}
        </div>
      ) : null}

      <div className="space-y-3">
        {current.items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]/40">
            <div className="flex gap-3">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggleSelected(item.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">
                    {targetLabel(item)}
                  </span>
                  <span className="text-xs font-bold text-[var(--muted)]">{timeLabel(item.created_at)}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--text)]">{truncate(item.preview)}</p>
                {item.target?.content && item.target.content !== item.preview ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">On: {truncate(item.target.content, 110)}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link to={item.href} className="app-button-secondary px-3 py-2 text-xs">
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Open
                  </Link>
                  <button
                    type="button"
                    className="app-button-secondary px-3 py-2 text-xs text-red-500"
                    disabled={acting}
                    onClick={() => performAction([item])}
                  >
                    <span className="material-symbols-outlined text-[16px]">{activeTab === 'likes' ? 'heart_minus' : 'delete'}</span>
                    {tab.action}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!current.loading && !current.items.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] p-10 text-center text-sm font-semibold text-[var(--muted-strong)]">
          {emptyCopy(activeTab)}
        </div>
      ) : null}

      {current.loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
          ))}
        </div>
      ) : null}

      {current.hasMore && !current.loading ? (
        <div className="text-center">
          <button type="button" className="app-button-secondary px-5 py-2" onClick={() => loadTab(activeTab)}>
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
