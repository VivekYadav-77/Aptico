// ─────────────────────────────────────────────────────────────
// AppShell — Main authenticated layout shell
// Frosted-glass navbar (64px), slide-in mobile drawer,
// desktop sidebar, and page content container.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutRequest } from '../api/authApi.js';
import { getMyProfile } from '../api/socialApi.js';
import NotificationBell from './NotificationBell.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { selectAuth } from '../store/authSlice.js';
import {
  APP_NAME,
  APP_TAGLINE,
  NAV_ITEMS,
  ADMIN_NAV_ITEM,
  SEARCHABLE_INSIGHTS,
  NAVBAR_HEIGHT,
} from '../constants/index.js';

// ── Logo ─────────────────────────────────────────────────────
function AppLogo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-3 select-none">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-black text-[#003824] transition-transform hover:scale-105">
        A
      </div>
      {!compact && (
        <div>
          <p className="text-base font-black tracking-[-0.04em] text-[var(--text)]">{APP_NAME}</p>
          <p className="text-[9px] uppercase tracking-[0.28em] text-[var(--muted)]">{APP_TAGLINE}</p>
        </div>
      )}
    </Link>
  );
}

// ── Sidebar Navigation ───────────────────────────────────────
function Navigation({ mobile = false, onNavigate, showAdmin }) {
  const location = useLocation();
  const items = showAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive =
          location.pathname === item.to ||
          (item.to !== '/' && location.pathname.startsWith(`${item.to}/`));

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
              isActive
                ? 'border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] pl-[10px] font-bold text-[var(--accent-strong)]'
                : 'text-[var(--muted-strong)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-150 ${isActive ? '' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Search Dropdown ──────────────────────────────────────────
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
      className="search-dropdown absolute left-0 top-[calc(100%+8px)] z-[200] w-full min-w-[320px] max-w-sm overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_24px_48px_rgba(0,0,0,0.18)]"
      style={{ backdropFilter: 'blur(20px)' }}
    >
      {!trimmed ? (
        <div className="px-5 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Quick navigation</p>
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
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Pages</p>
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
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Insights</p>
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
          <p className="mt-2 text-sm font-medium text-[var(--text)]">No results for &ldquo;{query}&rdquo;</p>
          <p className="mt-1 text-xs text-[var(--muted-strong)]">Try searching for a page, feature, or setting</p>
        </div>
      )}

      <div className="border-t border-[var(--border)] px-5 py-2.5">
        <p className="text-[10px] text-[var(--muted)]">Press <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to close</p>
      </div>
    </div>
  );
}

// ── Main Shell ───────────────────────────────────────────────
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
    if (auth.user?.name) return auth.user.name;
    if (auth.user?.email) return auth.user.email;
    if (auth.guestMode) return 'Guest mode';
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
      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <header
        className="glass fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)]"
      >
        {banner}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6" style={{ height: `${NAVBAR_HEIGHT}px` }}>
          {/* Left: hamburger + logo + search */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className="app-icon-button shrink-0 lg:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined text-[20px]">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
            <div className="min-w-0">
              <AppLogo />
            </div>

            {/* Desktop search */}
            <div className="relative ml-4 hidden md:block" ref={searchRef}>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--muted)]">search</span>
              <input
                ref={searchInputRef}
                className="w-56 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] py-2 pl-9 pr-4 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:w-72 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] lg:w-72 lg:focus:w-80"
                placeholder="Search insights…"
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

          {/* Right: theme, notifications, user, auth */}
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle compact />
            {auth.isAuthenticated ? <NotificationBell /> : null}
            {auth.isAuthenticated ? (
              <Link
                to={profileHref}
                className="hidden items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-strong)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)] lg:inline-flex"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-black text-[#003824]">
                  {userLabel.charAt(0).toUpperCase()}
                </div>
                {profileLabel}
              </Link>
            ) : (
              <div className="hidden rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-strong)] lg:block">
                {userLabel}
              </div>
            )}
            {auth.isAuthenticated || auth.guestMode ? (
              <button type="button" onClick={handleSignOut} className="app-button-secondary hidden px-4 py-2 sm:inline-flex">
                {auth.guestMode ? 'Exit guest' : 'Sign out'}
              </button>
            ) : (
              <Link to="/auth" className="app-button hidden px-5 py-2 sm:inline-flex">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── MOBILE OVERLAY ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── MOBILE SLIDE-IN DRAWER ─────────────────────────── */}
      <div
        className={`fixed left-0 top-0 z-[45] flex h-full w-72 flex-col border-r border-[var(--border)] bg-[var(--shell)] transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backdropFilter: 'blur(20px)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4" style={{ height: `${NAVBAR_HEIGHT}px` }}>
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
        <div className="px-4 pb-2 pt-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[var(--muted)]">search</span>
            <input
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] py-2.5 pl-9 pr-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              placeholder="Search insights…"
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
                  return <p className="px-4 py-3 text-xs text-[var(--muted-strong)]">No results for &ldquo;{searchQuery}&rdquo;</p>;
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
        <div className="space-y-3 border-t border-[var(--border)] px-4 py-4">
          <Link to={auth.isAuthenticated ? profileHref : '/auth'} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 transition hover:bg-[var(--panel-strong)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[#003824]">
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

      {/* ── MAIN CONTENT ───────────────────────────────────── */}
      <main className="px-4 pb-8 sm:px-6 lg:pb-10" style={{ paddingTop: `calc(${NAVBAR_HEIGHT}px + 1.5rem)` }}>
        <section className="mx-auto mb-8 flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="app-kicker">Aptico workspace</p>
            <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--text)] sm:text-3xl md:text-4xl lg:text-5xl">{title}</h1>
            {description ? <p className="max-w-2xl text-sm leading-7 text-[var(--muted-strong)] sm:text-base">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </section>

        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
