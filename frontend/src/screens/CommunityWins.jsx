import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from '@/lib/router-compat.jsx';
import { useSelector } from 'react-redux';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import UserListModal from '../components/UserListModal.jsx';
import { deleteWin, getMyWins, getWinById, getWins, likeWin, getWinLikers, postWin, updateWin } from '../api/socialApi.js';
import { selectAuth } from '../store/authSlice.js';

const durationOptions = [
  ['< 1 week', 1],
  ['1-4 weeks', 3],
  ['1-3 months', 8],
  ['3-6 months', 20],
  ['6+ months', 30]
];

function initials(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

function timeAgo(value) {
  if (!value) return 'recently';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function isScheduledFuture(value) {
  return value && new Date(value).getTime() > Date.now();
}

function getMinScheduleValue() {
  const date = new Date(Date.now() + 60000);
  date.setSeconds(0, 0);
  return toDatetimeLocal(date);
}

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toScheduledIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isPastScheduleValue(value) {
  if (!value) return false;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now();
}

const emptyForm = { role_title: '', company_name: '', search_duration_weeks: 3, message: '', scheduled_at: '' };

export default function CommunityWins() {
  const auth = useSelector(selectAuth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusedWinId = searchParams.get('winId');
  const [wins, setWins] = useState([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState('community');
  const [loadingWins, setLoadingWins] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWin, setEditingWin] = useState(null);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [hideCompany, setHideCompany] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [likersWinId, setLikersWinId] = useState(null);
  const [highlightedWinId, setHighlightedWinId] = useState(null);

  const debounceTimeouts = useRef({});
  const pendingLikeStates = useRef({});

  useEffect(() => {
    return () => {
      Object.values(debounceTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const loader = viewMode === 'mine' ? getMyWins : getWins;
    let isActive = true;

    setLoadingWins(true);
    setWins([]);
    setTotal(0);
    setOffset(0);

    loader({ limit: 20, offset: 0 })
      .then((result) => {
        if (!isActive) return;
        setWins(result.wins || []);
        setTotal(result.total || 0);
        setOffset(20);
      })
      .catch(() => null)
      .finally(() => {
        if (isActive) {
          setLoadingWins(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [viewMode]);

  useEffect(() => {
    if (!focusedWinId) return;

    let cancelled = false;
    const existing = wins.find((win) => String(win.id) === String(focusedWinId));

    async function ensureFocusedWin() {
      if (!existing) {
        try {
          const win = await getWinById(focusedWinId);
          if (!cancelled && win) {
            setWins((current) => [win, ...current.filter((item) => String(item.id) !== String(win.id))]);
          }
        } catch {
          if (!cancelled) setToast('Could not load the linked win.');
          return;
        }
      }

      setHighlightedWinId(focusedWinId);
      setTimeout(() => {
        document.getElementById(`win-${focusedWinId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 160);
      setTimeout(() => {
        if (!cancelled) setHighlightedWinId(null);
      }, 3400);
    }

    void ensureFocusedWin();
    return () => {
      cancelled = true;
    };
  }, [focusedWinId, wins]);

  async function loadMore() {
    const loader = viewMode === 'mine' ? getMyWins : getWins;
    const result = await loader({ limit: 20, offset });
    setWins((current) => [...current, ...(result.wins || [])]);
    setTotal(result.total || total);
    setOffset((current) => current + 20);
  }

  async function handleLike(winId) {
    if (!auth.isAuthenticated) {
      navigate('/login');
      return;
    }

    const win = wins.find((w) => w.id === winId);
    if (!win) return;

    const nextState = !win.has_liked;
    pendingLikeStates.current[winId] = nextState;

    setWins((current) =>
      current.map((w) =>
        w.id === winId
          ? { ...w, has_liked: nextState, likes_count: nextState ? (w.likes_count || 0) + 1 : Math.max((w.likes_count || 0) - 1, 0) }
          : w
      )
    );

    if (debounceTimeouts.current[winId]) {
      clearTimeout(debounceTimeouts.current[winId]);
    }

    debounceTimeouts.current[winId] = setTimeout(async () => {
      try {
        const result = await likeWin(winId);
        setWins((current) =>
          current.map((w) => (w.id === winId ? { ...w, likes_count: result.newLikesCount, has_liked: result.liked } : w))
        );
        pendingLikeStates.current[winId] = result.liked;
      } catch (err) {
        const rollbackState = !nextState;
        setWins((current) =>
          current.map((w) =>
            w.id === winId
              ? { ...w, has_liked: rollbackState, likes_count: rollbackState ? (w.likes_count || 0) + 1 : Math.max((w.likes_count || 0) - 1, 0) }
              : w
          )
        );
        pendingLikeStates.current[winId] = rollbackState;
        setToast('Could not update like status.');
      }
    }, 400);
  }

  function openCreateModal() {
    setEditingWin(null);
    setForm(emptyForm);
    setHideCompany(false);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(win) {
    setEditingWin(win);
    setForm({
      role_title: win.role_title || '',
      company_name: win.company_name || '',
      search_duration_weeks: win.search_duration_weeks || 3,
      message: win.message || '',
      scheduled_at: isScheduledFuture(win.scheduled_at) ? toDatetimeLocal(win.scheduled_at) : ''
    });
    setHideCompany(!win.company_name);
    setError('');
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;

    setDeleting(true);
    try {
      await deleteWin(deleteTarget.id);
      setWins((current) => current.filter((win) => win.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast('Win removed.');
    } catch (requestError) {
      setToast(requestError.response?.data?.error || 'Could not delete this win.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (isPastScheduleValue(form.scheduled_at)) {
      setError('Choose a future date and time, or leave the schedule empty to publish immediately.');
      return;
    }

    const payload = {
      ...form,
      company_name: hideCompany ? null : form.company_name || null,
      scheduled_at: toScheduledIso(form.scheduled_at)
    };
    setSubmitting(true);

    try {
      const saved = editingWin ? await updateWin(editingWin.id, payload) : await postWin(payload);
      setWins((current) => {
        if (editingWin) {
          return current.map((win) => win.id === saved.id ? saved : win);
        }
        return viewMode === 'mine' || !isScheduledFuture(saved.scheduled_at) ? [saved, ...current] : current;
      });
      setModalOpen(false);
      setToast(isScheduledFuture(saved.scheduled_at) ? 'Your win has been scheduled.' : editingWin ? 'Win updated.' : 'Congratulations! Your win has been shared.');
      setForm(emptyForm);
      setEditingWin(null);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not save this win.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(78,222,163,0.15),transparent_70%)] pointer-events-none" />
      
      <div className="mx-auto max-w-6xl px-4 py-16 relative z-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border)] pb-8 mb-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-[var(--accent-strong)] hover:text-[var(--text)] transition-colors">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Return to Hub
            </Link>
            <h1 className="mt-6 text-5xl font-black text-[var(--text)] tracking-tight">Community Wins</h1>
            <p className="mt-4 max-w-xl text-lg text-[var(--muted-strong)] leading-relaxed">
              Real people. Real hires. Real stories. Explore the successful alignments achieved by the Aptico network.
            </p>
          </div>
          {auth.isAuthenticated ? (
            <button type="button" onClick={openCreateModal} className="group relative flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-black uppercase tracking-widest text-[#003824] shadow-[0_0_20px_rgba(78,222,163,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
              Share Your Win
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">add</span>
            </button>
          ) : (
            <Link to="/login" className="group flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)] transition-all">
              Sign in to share
              <span className="material-symbols-outlined text-[18px]">login</span>
            </Link>
          )}
        </header>

        {toast ? (
           <div className="fixed bottom-8 right-8 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--panel)] p-4 shadow-[0_8px_30px_rgba(78,222,163,0.15)] text-sm font-medium text-[var(--text)] animate-in slide-in-from-bottom-8 fade-in duration-300">
             <span className="material-symbols-outlined text-[var(--accent-strong)]">info</span>
             {toast}
             <button onClick={() => setToast('')} className="ml-auto flex items-center justify-center rounded-full p-1 text-[var(--muted-strong)] hover:bg-[var(--panel-strong)] hover:text-[var(--text)] transition-colors">
               <span className="material-symbols-outlined text-[16px]">close</span>
             </button>
           </div>
        ) : null}

        {auth.isAuthenticated ? (
          <div className="mb-8 grid grid-cols-2 gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2">
            <button type="button" onClick={() => setViewMode('community')} className={viewMode === 'community' ? 'app-button py-2' : 'app-button-secondary py-2'}>
              <span className="material-symbols-outlined text-[18px]">groups</span>
              Community
            </button>
            <button type="button" onClick={() => setViewMode('mine')} className={viewMode === 'mine' ? 'app-button py-2' : 'app-button-secondary py-2'}>
              <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              My Wins
            </button>
          </div>
        ) : null}

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loadingWins ? (
            [0, 1, 2].map((item) => (
              <article key={item} className="h-72 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-6">
                <div className="h-10 w-40 rounded-xl bg-[var(--panel-strong)]" />
                <div className="mt-8 h-6 w-3/4 rounded-lg bg-[var(--panel-strong)]" />
                <div className="mt-4 h-4 w-1/2 rounded-lg bg-[var(--panel-strong)]" />
                <div className="mt-8 h-20 rounded-xl bg-[var(--panel-strong)]" />
              </article>
            ))
          ) : null}
          {wins.map((win) => (
            <article
              key={win.id}
              id={`win-${win.id}`}
              className={`group flex flex-col rounded-[2rem] border bg-[var(--panel)] p-6 shadow-xl transition-all hover:border-[var(--accent)]/50 hover:shadow-[0_8px_30px_rgba(78,222,163,0.1)] hover:-translate-y-1 ${
                String(highlightedWinId) === String(win.id) ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 shadow-[0_8px_35px_rgba(78,222,163,0.24)]' : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex gap-3 items-center">
                  {win.user?.avatar_url ? (
                    <img src={win.user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--panel-strong)]" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-black text-[var(--accent-strong)] ring-2 ring-[var(--panel-strong)]">
                      {initials(win.user?.name)}
                    </div>
                  )}
                  <div>
                    {win.user?.username ? (
                      <Link to={`/u/${win.user.username}`} className="font-bold text-[var(--text)] hover:text-[var(--accent-strong)] transition-colors">{win.user?.name || 'Aptico member'}</Link>
                    ) : (
                      <p className="font-bold text-[var(--text)]">{win.user?.name || 'Aptico member'}</p>
                    )}
                    <p className="text-xs font-mono text-[var(--muted)]">{isScheduledFuture(win.scheduled_at) ? `Scheduled ${new Date(win.scheduled_at).toLocaleString()}` : timeAgo(win.created_at)}</p>
                  </div>
                </div>
                {isScheduledFuture(win.scheduled_at) ? (
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-600">Scheduled</span>
                ) : null}
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-black text-[var(--text)] leading-snug group-hover:text-[var(--accent-strong)] transition-colors">{win.role_title}</h2>
                <p className="mt-1 text-sm font-medium text-[var(--muted-strong)]">
                  at <span className="text-[var(--text)]">{win.company_name || 'Confidential'}</span>
                </p>
                
                {win.message ? (
                  <div className="mt-4 relative">
                    <span className="absolute -top-2 -left-2 text-4xl text-[var(--border)] font-serif select-none pointer-events-none">"</span>
                    <p className="relative z-10 text-sm leading-relaxed text-[var(--muted-strong)] italic">
                      {win.message}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 pt-6 border-t border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {win.search_duration_weeks ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {win.search_duration_weeks} wks
                    </span>
                  ) : null}
                </div>
                
                <div className="flex items-center">
                  <button 
                    type="button" 
                    onClick={() => handleLike(win.id)} 
                    className={`flex items-center text-xs font-bold uppercase tracking-wider transition-colors group/like ${win.has_liked ? 'text-[var(--accent-strong)]' : 'text-[var(--muted-strong)] hover:text-[var(--text)]'}`}
                  >
                    <span 
                      className={`material-symbols-outlined text-[18px] transition-transform group-hover/like:scale-110 ${win.has_liked ? 'text-[var(--accent-strong)]' : ''}`}
                      style={{ fontVariationSettings: win.has_liked ? '"FILL" 1' : '"FILL" 0' }}
                    >
                      favorite
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLikersWinId(win.id)}
                    className={`ml-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:underline ${win.has_liked ? 'text-[var(--accent-strong)]' : 'text-[var(--muted-strong)] hover:text-[var(--text)]'}`}
                  >
                    {win.likes_count || 0}
                  </button>
                </div>
              </div>
              {viewMode === 'mine' && String(win.user_id || '') === String(auth.user?.id || '') ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" className="app-button-secondary px-3 py-2" onClick={() => openEditModal(win)}>
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit
                  </button>
                  <button type="button" className="app-button-secondary px-3 py-2 text-red-500" onClick={() => setDeleteTarget(win)}>
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </section>

        {!loadingWins && wins.length === 0 && !total ? (
           <div className="flex flex-col items-center justify-center py-20 text-center">
             <span className="material-symbols-outlined text-6xl text-[var(--muted)] mb-4">search_off</span>
             <h3 className="text-xl font-bold text-[var(--text)]">{viewMode === 'mine' ? 'No wins shared yet' : 'No wins recorded yet'}</h3>
             <p className="text-[var(--muted-strong)] mt-2">{viewMode === 'mine' ? 'Your old and scheduled wins will appear here.' : 'Be the first to share your success story.'}</p>
           </div>
        ) : !loadingWins && wins.length < total ? (
          <div className="mt-12 text-center">
            <button 
              type="button" 
              onClick={loadMore} 
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-8 py-3 text-sm font-bold uppercase tracking-widest text-[var(--muted-strong)] hover:border-[var(--accent)] hover:text-[var(--text)] transition-colors"
            >
              Load More Sequences
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200 sm:items-center">
          <form 
            onSubmit={handleSubmit} 
            className="my-4 max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[2.5rem] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 sm:my-0 sm:p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-[var(--text)] tracking-tight">{editingWin ? 'Edit Your Win' : 'Share Your Win'}</h2>
                <p className="text-sm text-[var(--muted-strong)] mt-1">{editingWin ? 'Update the details or schedule.' : 'Broadcast your success to the Aptico network.'}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)} 
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--panel-strong)] text-[var(--muted-strong)] hover:bg-[var(--accent)] hover:text-[#003824] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <label className="block group">
                <span className="app-field-label flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">work</span>
                  Role Acquired
                </span>
                <input 
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-medium text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]" 
                  placeholder="e.g. Senior Frontend Engineer"
                  required 
                  value={form.role_title} 
                  onChange={(event) => setForm({ ...form, role_title: event.target.value })} 
                />
              </label>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block group">
                  <span className="app-field-label flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">business</span>
                    Company
                  </span>
                  <input 
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-medium text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed" 
                    placeholder="e.g. Acme Corp"
                    disabled={hideCompany} 
                    value={form.company_name} 
                    onChange={(event) => setForm({ ...form, company_name: event.target.value })} 
                  />
                </label>
                
                <div className="flex flex-col justify-end pb-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`relative flex h-6 w-11 items-center rounded-full transition-colors ${hideCompany ? 'bg-[var(--accent)]' : 'bg-[var(--panel-strong)]'}`}>
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={hideCompany} 
                        onChange={(event) => { 
                          setHideCompany(event.target.checked); 
                          if (event.target.checked) setForm({ ...form, company_name: '' }); 
                        }} 
                      />
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hideCompany ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm font-semibold text-[var(--muted-strong)] group-hover:text-[var(--text)] transition-colors">Keep confidential</span>
                  </label>
                </div>
              </div>

              <div>
                <p className="app-field-label flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">timer</span>
                  Search Duration
                </p>
                <div className="flex flex-wrap gap-2">
                  {durationOptions.map(([label, weeks]) => {
                    const isSelected = form.search_duration_weeks === weeks;
                    return (
                      <button 
                        key={label} 
                        type="button" 
                        onClick={() => setForm({ ...form, search_duration_weeks: weeks })} 
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${isSelected ? 'bg-[var(--accent)] text-[#003824] shadow-[0_0_15px_rgba(78,222,163,0.3)]' : 'border border-[var(--border)] bg-[var(--panel)] text-[var(--muted-strong)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block group">
                <div className="flex items-center justify-between mb-2">
                  <span className="app-field-label flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">format_quote</span>
                    Field Report (Optional)
                  </span>
                  <span className={`text-xs font-mono ${form.message.length > 250 ? 'text-rose-400' : 'text-[var(--muted)]'}`}>
                    {form.message.length}/280
                  </span>
                </div>
                <textarea 
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-medium leading-relaxed text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] min-h-[100px]" 
                  placeholder="Share any advice, interview tips, or thoughts on your journey..."
                  maxLength={280} 
                  value={form.message} 
                  onChange={(event) => setForm({ ...form, message: event.target.value })} 
                />
              </label>

              <label className="block group">
                <span className="app-field-label flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">event_upcoming</span>
                  Schedule
                </span>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-medium text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  min={getMinScheduleValue()}
                  value={form.scheduled_at}
                  onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })}
                />
                <span className="mt-2 block text-xs text-[var(--muted-strong)]">Leave empty to publish immediately.</span>
              </label>

              {error ? (
                <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm font-semibold text-red-500">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-8 flex gap-4">
              <button 
                type="button" 
                onClick={() => setModalOpen(false)} 
                className="flex-1 rounded-xl border border-[var(--border)] bg-transparent px-4 py-3.5 text-sm font-bold uppercase tracking-widest text-[var(--muted-strong)] hover:bg-[var(--panel-strong)] hover:text-[var(--text)] transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="group relative flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-black uppercase tracking-widest text-[#003824] shadow-[0_0_20px_rgba(78,222,163,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? 'Saving...' : form.scheduled_at ? 'Schedule Win' : editingWin ? 'Save Win' : 'Broadcast Win'}
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">send</span>
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this win?"
        description="This removes the win from your profile and the community wins board. This action cannot be undone."
        confirmLabel="Delete Win"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <UserListModal
        isOpen={Boolean(likersWinId)}
        onClose={() => setLikersWinId(null)}
        title="Liked by"
        fetchData={() => getWinLikers(likersWinId)}
        emptyMessage="No one has liked this win yet."
      />
    </main>
  );
}
