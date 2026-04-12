import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getWins, likeWin, postWin } from '../api/socialApi.js';
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

export default function CommunityWins() {
  const auth = useSelector(selectAuth);
  const navigate = useNavigate();
  const [wins, setWins] = useState([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ role_title: '', company_name: '', search_duration_weeks: 3, message: '' });
  const [hideCompany, setHideCompany] = useState(false);

  useEffect(() => {
    getWins({ limit: 20, offset: 0 }).then((result) => {
      setWins(result.wins || []);
      setTotal(result.total || 0);
      setOffset(20);
    }).catch(() => null);
  }, []);

  async function loadMore() {
    const result = await getWins({ limit: 20, offset });
    setWins((current) => [...current, ...(result.wins || [])]);
    setTotal(result.total || total);
    setOffset((current) => current + 20);
  }

  async function handleLike(winId) {
    if (!auth.isAuthenticated) {
      navigate('/login');
      return;
    }

    const result = await likeWin(winId);
    setWins((current) => current.map((win) => win.id === winId ? { ...win, likes_count: result.newLikesCount } : win));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const created = await postWin({
      ...form,
      company_name: hideCompany ? null : form.company_name || null
    });
    setWins((current) => [created, ...current]);
    setModalOpen(false);
    setToast('Congratulations! Your win has been shared.');
    setForm({ role_title: '', company_name: '', search_duration_weeks: 3, message: '' });
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/" className="text-sm font-bold text-[var(--accent-strong)]">Aptico</Link>
            <h1 className="mt-4 text-4xl font-black text-[var(--text)]">Community Wins</h1>
            <p className="mt-2 text-[var(--muted-strong)]">Real people. Real hires. Real stories.</p>
          </div>
          {auth.isAuthenticated ? (
            <button type="button" onClick={() => setModalOpen(true)} className="app-button">Share Your Win</button>
          ) : (
            <Link to="/login" className="app-button-secondary">Sign in to share</Link>
          )}
        </header>

        {toast ? <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] p-4 text-sm font-semibold text-[var(--accent-strong)]">{toast}</div> : null}

        <section className="mt-8 space-y-4">
          {wins.map((win) => (
            <article key={win.id} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  {win.user?.avatar_url ? (
                    <img src={win.user.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[#003824]">{initials(win.user?.name)}</div>
                  )}
                  <div>
                    {win.user?.username ? (
                      <Link to={`/u/${win.user.username}`} className="font-bold text-[var(--text)] hover:text-[var(--accent-strong)]">{win.user?.name || 'Aptico member'}</Link>
                    ) : (
                      <p className="font-bold text-[var(--text)]">{win.user?.name || 'Aptico member'}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--muted)]">{timeAgo(win.created_at)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleLike(win.id)} className="app-button-secondary px-4 py-2">{win.likes_count || 0} likes</button>
              </div>
              <div className="mt-5">
                <h2 className="text-2xl font-black text-[var(--text)]">{win.role_title}</h2>
                <p className="mt-2 text-sm font-semibold text-[var(--muted-strong)]">at {win.company_name || 'a company'}</p>
                {win.search_duration_weeks ? <p className="mt-2 text-sm text-[var(--accent-strong)]">Found their role in {win.search_duration_weeks} weeks</p> : null}
                {win.message ? <p className="mt-4 border-l-2 border-[var(--accent)] pl-4 text-sm italic leading-7 text-[var(--muted-strong)]">"{win.message}"</p> : null}
              </div>
            </article>
          ))}
        </section>

        {wins.length < total ? (
          <div className="mt-8 text-center">
            <button type="button" onClick={loadMore} className="app-button-secondary">Load more</button>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-black text-[var(--text)]">Share Your Win</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="app-icon-button">x</button>
            </div>
            <label className="mt-5 block">
              <span className="app-field-label">Role you got hired for</span>
              <input className="app-input mt-2" required value={form.role_title} onChange={(event) => setForm({ ...form, role_title: event.target.value })} />
            </label>
            <label className="mt-4 block">
              <span className="app-field-label">Company name</span>
              <input className="app-input mt-2" disabled={hideCompany} value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} />
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-[var(--muted-strong)]">
              <input type="checkbox" checked={hideCompany} onChange={(event) => { setHideCompany(event.target.checked); if (event.target.checked) setForm({ ...form, company_name: '' }); }} />
              Keep company private
            </label>
            <div className="mt-4">
              <p className="app-field-label">How long did your search take?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {durationOptions.map(([label, weeks]) => (
                  <button key={label} type="button" onClick={() => setForm({ ...form, search_duration_weeks: weeks })} className={form.search_duration_weeks === weeks ? 'app-button px-3 py-2' : 'app-button-secondary px-3 py-2'}>{label}</button>
                ))}
              </div>
            </div>
            <label className="mt-4 block">
              <span className="app-field-label">Optional message</span>
              <textarea className="app-input mt-2 min-h-28" maxLength={280} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
              <span className="mt-1 block text-right text-xs text-[var(--muted)]">{form.message.length}/280</span>
            </label>
            <button type="submit" className="app-button mt-5 w-full">Share My Win</button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
