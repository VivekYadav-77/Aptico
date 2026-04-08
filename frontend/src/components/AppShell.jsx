import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutRequest } from '../api/authApi.js';
import ThemeToggle from './ThemeToggle.jsx';
import { selectAuth } from '../store/authSlice.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/analysis', label: 'Analysis', icon: 'analytics' },
  { to: '/jobs', label: 'Job Search', icon: 'work' },
  { to: '/profile', label: 'Profile', icon: 'person' },
  { to: '/settings', label: 'Settings', icon: 'settings' }
];

function AppLogo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-black text-slate-950">
        A
      </div>
      <div>
        <p className="text-lg font-black tracking-[-0.04em] text-[var(--text)]">Aptico</p>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">Career Intelligence</p>
      </div>
    </Link>
  );
}

function Navigation({ mobile = false, onNavigate, showAdmin }) {
  const location = useLocation();
  const items = showAdmin ? [...NAV_ITEMS, { to: '/admin', label: 'Admin', icon: 'admin_panel_settings' }] : NAV_ITEMS;

  return (
    <nav className={`flex ${mobile ? 'flex-col gap-1' : 'flex-col gap-1'}`}>
      {items.map((item) => {
        const isActive =
          location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(`${item.to}/`));

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              isActive
                ? 'border-r-2 border-[var(--accent)] bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)]'
                : 'text-[var(--muted-strong)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppShell({ title, description, actions, children, banner = null }) {
  const auth = useSelector(selectAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userLabel = useMemo(() => {
    if (auth.user?.name) {
      return auth.user.name;
    }

    if (auth.user?.email) {
      return auth.user.email;
    }

    if (auth.guestMode) {
      return 'Guest mode';
    }

    return 'Visitor';
  }, [auth.guestMode, auth.user]);

  async function handleSignOut() {
    await logoutRequest({ dispatch });
    navigate('/auth');
  }

  return (
    <div className="app-page">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--shell)]">
        {banner}
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 md:pl-[18.5rem]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="app-icon-button md:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined text-[20px]">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
            <div className="md:hidden">
              <AppLogo />
            </div>
            <div className="hidden md:block">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">search</span>
                <input
                  className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] py-2 pl-10 pr-4 text-sm text-[var(--text)] outline-none"
                  placeholder="Search insights..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button type="button" className="app-icon-button hidden sm:inline-flex">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <div className="hidden rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-strong)] lg:block">
              {userLabel}
            </div>
            {auth.isAuthenticated || auth.guestMode ? (
              <button type="button" onClick={handleSignOut} className="app-button-secondary hidden sm:inline-flex">
                {auth.guestMode ? 'Exit guest' : 'Sign out'}
              </button>
            ) : (
              <Link to="/auth" className="app-button hidden sm:inline-flex">
                Sign in
              </Link>
            )}
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-[var(--border)] px-4 py-4 md:hidden">
            <Navigation mobile onNavigate={() => setMobileMenuOpen(false)} showAdmin={auth.user?.role === 'admin'} />
          </div>
        ) : null}
      </header>

      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-[var(--border)] bg-[var(--shell)] md:flex md:flex-col">
        <div className="mt-14 px-6 py-6">
          <AppLogo />
          <div className="mt-10">
            <Navigation showAdmin={auth.user?.role === 'admin'} />
          </div>
        </div>
        <div className="mt-auto px-4 pb-6">
          <button type="button" className="w-full bg-[var(--accent)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#003824]">
            Upgrade Plan
          </button>
        </div>
      </aside>

      <main className="px-4 pb-8 pt-20 sm:px-6 md:ml-64 lg:pb-10">
        <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="app-kicker">Aptico workspace</p>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-[var(--text)] sm:text-5xl">{title}</h1>
            {description ? <p className="max-w-2xl text-sm leading-7 text-[var(--muted-strong)] sm:text-base">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </section>

        {children}
      </main>
    </div>
  );
}
