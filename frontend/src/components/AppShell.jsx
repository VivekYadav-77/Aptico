import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutRequest } from '../api/authApi.js';
import { getMyProfile } from '../api/socialApi.js';
import NotificationBell from './NotificationBell.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { selectAuth } from '../store/authSlice.js';

const NAV_ITEMS = [
  { to: '/squads', label: 'Squad', icon: 'groups', description: 'Anonymous squad progress and weekly goal' },
  { to: '/people', label: 'People', icon: 'diversity_3', description: 'Find people to connect with' },
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', description: 'Your career overview and activity' },
  { to: '/analysis', label: 'Analysis', icon: 'analytics', description: 'Resume and job match analysis' },
  { to: '/portfolio-generator', label: 'Portfolio', icon: 'code_blocks', description: 'Generate a GitHub README and live Aptico badge' },
  { to: '/jobs', label: 'Job Search', icon: 'work', description: 'Discover and filter roles' },
  { to: '/wins', label: 'Community', icon: 'groups', description: 'Community wins and career stories' },
  { to: '/profile', label: 'Profile', icon: 'person', description: 'Edit your professional profile' },
  { to: '/settings', label: 'Settings', icon: 'settings', description: 'Account, career, and theme settings' }
];

const SEARCHABLE_INSIGHTS = [
  { label: 'View squad progress', icon: 'groups', to: '/squads', category: 'Squad' },
  { label: 'Log job applications', icon: 'send', to: '/squads', category: 'Squad' },
  { label: 'Ping squadmates', icon: 'campaign', to: '/squads', category: 'Squad' },
  { label: 'Upload resume for analysis', icon: 'upload_file', to: '/analysis', category: 'Analysis' },
  { label: 'Check resume match score', icon: 'analytics', to: '/analysis', category: 'Analysis' },
  { label: 'Generate GitHub README', icon: 'code_blocks', to: '/portfolio-generator', category: 'Portfolio' },
  { label: 'Create Aptico badge', icon: 'military_tech', to: '/portfolio-generator', category: 'Portfolio' },
  { label: 'Find remote jobs', icon: 'wifi', to: '/jobs', category: 'Job Search' },
  { label: 'Browse full-time roles', icon: 'work', to: '/jobs', category: 'Job Search' },
  { label: 'Browse internship roles', icon: 'school', to: '/jobs', category: 'Job Search' },
  { label: 'Update career settings', icon: 'settings', to: '/settings', category: 'Settings' },
  { label: 'Edit profile headline', icon: 'person', to: '/settings', category: 'Settings' },
  { label: 'Set work mode preference', icon: 'home_work', to: '/settings', category: 'Settings' },
  { label: 'Toggle dark mode', icon: 'dark_mode', to: '/settings', category: 'Theme' },
  { label: 'View dashboard overview', icon: 'dashboard', to: '/dashboard', category: 'Dashboard' },
  { label: 'Matched skills from resume', icon: 'star', to: '/analysis', category: 'Analysis' },
  { label: 'High pay job search', icon: 'payments', to: '/jobs', category: 'Job Search' },
  { label: 'Verified listings only', icon: 'verified', to: '/jobs', category: 'Job Search' },
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
  const items = showAdmin ? [...NAV_ITEMS, { to: '/admin', label: 'Admin', icon: 'admin_panel_settings', description: 'Admin control center' }] : NAV_ITEMS;

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
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              isActive
                ? 'border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] pl-[10px] font-bold text-[var(--accent-strong)]'
                : 'text-[var(--muted-strong)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
          </Link>
        );
      })}
    </nav>
  );
}

function SearchDropdown({ query, onClose, navigate }) {
  const trimmed = query.trim().toLowerCase();

  const navResults = NAV_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(trimmed) ||
      item.description.toLowerCase().includes(trimmed)
  );

  const insightResults = SEARCHABLE_INSIGHTS.filter(
    (item) =>
      item.label.toLowerCase().includes(trimmed) ||
      item.category.toLowerCase().includes(trimmed)
  );

  const hasResults = navResults.length > 0 || insightResults.length > 0;

  function handleSelect(to) {
    navigate(to);
    onClose();
  }

  return (
    <div
      className="absolute left-0 top-[calc(100%+8px)] z-[200] w-full min-w-[320px] max-w-sm overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_24px_48px_rgba(0,0,0,0.18)]"
      style={{ backdropFilter: 'blur(20px)' }}
    >
      {!trimmed ? (
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-3">Quick navigation</p>
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => handleSelect(item.to)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-[var(--panel-soft)]"
              >
                <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">{item.icon}</span>
                <div>
                  <p className="font-semibold text-[var(--text)]">{item.label}</p>
                  <p className="text-xs text-[var(--muted-strong)]">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : hasResults ? (
        <div className="py-3">
          {navResults.length > 0 && (
            <div className="px-5 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-2">Pages</p>
              {navResults.map((item) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleSelect(item.to)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--panel-soft)]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-[var(--text)]">{item.label}</p>
                    <p className="text-xs text-[var(--muted-strong)]">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {insightResults.length > 0 && (
            <div className="px-5 pt-1">
              {navResults.length > 0 && <div className="mb-2 border-t border-[var(--border)]" />}
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-2">Insights</p>
              {insightResults.slice(0, 5).map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(item.to)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--panel-soft)]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">{item.icon}</span>
                  <div>
                    <p className="font-medium text-[var(--text)]">{item.label}</p>
                    <p className="text-xs text-[var(--muted-strong)]">{item.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <span className="material-symbols-outlined text-[32px] text-[var(--muted)]">search_off</span>
          <p className="mt-2 text-sm font-medium text-[var(--text)]">No results for "{query}"</p>
          <p className="mt-1 text-xs text-[var(--muted-strong)]">Try searching for a page, feature, or setting</p>
        </div>
      )}

      <div className="border-t border-[var(--border)] px-5 py-2.5">
        <p className="text-[10px] text-[var(--muted)]">Press <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to close</p>
      </div>
    </div>
  );
}

export default function AppShell({ title, description, actions, children, banner = null }) {
  const auth = useSelector(selectAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [socialProfile, setSocialProfile] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

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

  const profileHref = socialProfile?.username ? `/u/${socialProfile.username}` : '/settings';
  const profileLabel = socialProfile?.username ? userLabel : 'Set up profile';

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setSocialProfile(null);
      return;
    }

    getMyProfile().then(setSocialProfile).catch(() => setSocialProfile(null));
  }, [auth.isAuthenticated]);

  // Close search on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Escape key closes search and mobile menu
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  async function handleSignOut() {
    await logoutRequest({ dispatch });
    navigate('/auth');
  }

  return (
    <div className="app-page">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--shell)]" style={{ backdropFilter: 'blur(16px)' }}>
        {banner}
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          {/* Left: hamburger + mobile logo OR desktop search */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className="app-icon-button shrink-0"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined text-[20px]">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
            <div className="min-w-0">
              <AppLogo />
            </div>
            {/* Search — desktop: inline, mobile: also shown inline after logo */}
            <div className="relative hidden md:block" ref={searchRef}>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--muted)]">search</span>
              <input
                ref={searchInputRef}
                className="w-56 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] py-2 pl-9 pr-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] lg:w-72"
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
              />
              {searchOpen && (
                <SearchDropdown
                  query={searchQuery}
                  onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
                  navigate={navigate}
                />
              )}
            </div>
          </div>

          {/* Right: theme, notifications, user label, auth button */}
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle compact />
            {auth.isAuthenticated ? <NotificationBell /> : null}
            {auth.isAuthenticated ? (
              <Link to={profileHref} className="hidden rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-strong)] transition hover:bg-[var(--panel-soft)] lg:block">
                {profileLabel}
              </Link>
            ) : (
              <div className="hidden rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-strong)] lg:block">
                {userLabel}
              </div>
            )}
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
      </header>

      {/* Mobile backdrop overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-in drawer */}
      <div
        className={`fixed left-0 top-0 z-[45] flex h-full w-72 flex-col border-r border-[var(--border)] bg-[var(--shell)] transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backdropFilter: 'blur(20px)' }}
      >
        {/* Drawer header */}
        <div className="flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] px-4">
          <AppLogo />
          <button
            type="button"
            className="app-icon-button shrink-0"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Mobile search */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[var(--muted)]">search</span>
            <input
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] py-2.5 pl-9 pr-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Mobile inline search results */}
          {searchQuery.trim() && (
            <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] py-2">
              {(() => {
                const trimmed = searchQuery.trim().toLowerCase();
                const navRes = NAV_ITEMS.filter(i => i.label.toLowerCase().includes(trimmed) || i.description.toLowerCase().includes(trimmed));
                const insRes = SEARCHABLE_INSIGHTS.filter(i => i.label.toLowerCase().includes(trimmed) || i.category.toLowerCase().includes(trimmed));
                const hasAny = navRes.length > 0 || insRes.length > 0;
                if (!hasAny) {
                  return <p className="px-4 py-3 text-xs text-[var(--muted-strong)]">No results for "{searchQuery}"</p>;
                }
                return (
                  <>
                    {navRes.map(item => (
                      <button
                        key={item.to}
                        type="button"
                        onClick={() => { navigate(item.to); setMobileMenuOpen(false); setSearchQuery(''); }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-[var(--panel-soft)]"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[var(--accent-strong)]">{item.icon}</span>
                        <span className="font-medium text-[var(--text)]">{item.label}</span>
                      </button>
                    ))}
                    {insRes.slice(0, 4).map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { navigate(item.to); setMobileMenuOpen(false); setSearchQuery(''); }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-[var(--panel-soft)]"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">{item.icon}</span>
                        <div>
                          <span className="text-[var(--text)]">{item.label}</span>
                          <span className="ml-2 text-xs text-[var(--muted-strong)]">— {item.category}</span>
                        </div>
                      </button>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Navigation</p>
          <Navigation mobile onNavigate={() => setMobileMenuOpen(false)} showAdmin={auth.user?.role === 'admin'} />
        </div>

        {/* User info + auth actions */}
        <div className="border-t border-[var(--border)] px-4 py-4 space-y-3">
          <Link to={auth.isAuthenticated ? profileHref : '/auth'} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-slate-950">
              {userLabel.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text)]">{auth.isAuthenticated ? profileLabel : userLabel}</p>
              <p className="text-xs text-[var(--muted-strong)]">{auth.isAuthenticated ? 'Authenticated' : auth.guestMode ? 'Guest session' : 'Not signed in'}</p>
            </div>
          </Link>
          <div className="flex gap-2">
            <ThemeToggle compact />
            {auth.isAuthenticated || auth.guestMode ? (
              <button
                type="button"
                onClick={() => { void handleSignOut(); setMobileMenuOpen(false); }}
                className="app-button-secondary flex-1 justify-center"
              >
                {auth.guestMode ? 'Exit guest mode' : 'Sign out'}
              </button>
            ) : (
              <Link to="/auth" className="app-button flex-1 justify-center text-center" onClick={() => setMobileMenuOpen(false)}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="px-4 pb-8 pt-20 sm:px-6 lg:pb-10">
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
