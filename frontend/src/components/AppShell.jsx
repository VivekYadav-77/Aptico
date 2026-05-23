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
import ApticoLogo from './ApticoLogo.jsx';
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
      <ApticoLogo className="h-9 w-9 text-[var(--accent)] drop-shadow-[0_0_12px_var(--accent-soft)] transition-transform hover:scale-105" />
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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const [hubDropdownOpen, setHubDropdownOpen] = useState(false);

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

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Escape key closes search, mobile menu and profile dropdown
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
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
      <header className="fixed left-0 right-0 top-0 z-50 bg-[var(--shell)]/70 backdrop-blur-3xl border-b border-white/[0.06] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
        {banner}
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6" style={{ height: `${NAVBAR_HEIGHT}px` }}>
          {/* Left: Mobile hamburger + App Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              className="app-icon-button shrink-0 lg:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined text-[20px] transition-transform duration-300 hover:rotate-90">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
            <AppLogo />
          </div>

          {/* Center: Desktop horizontal centered tabs (only when logged in) */}
          {auth.isAuthenticated && (
            <div className="hidden lg:flex items-center gap-2">
              {[
                { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
                { to: '/analysis', label: 'Analysis', icon: 'analytics' },
                { to: '/jobs', label: 'Jobs', icon: 'work' },
              ].map((tab) => {
                const isActive = location.pathname === tab.to;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={`group relative flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-[var(--accent)]/10 text-[var(--accent-strong)] border border-[var(--accent)]/20 shadow-[0_0_15px_rgba(78,222,163,0.1)]'
                        : 'text-[var(--muted-strong)] hover:text-[var(--text)] hover:bg-[var(--panel-soft)] border border-transparent'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(78,222,163,0.6)]' : 'group-hover:-translate-y-0.5'}`}>{tab.icon}</span>
                    <span className="relative z-10">{tab.label}</span>
                  </Link>
                );
              })}

              {/* Hub Dropdown containing the remaining page routes */}
              <div 
                className="relative"
                onMouseEnter={() => setHubDropdownOpen(true)}
                onMouseLeave={() => setHubDropdownOpen(false)}
              >
                <button
                  type="button"
                  className={`group relative flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer ${
                    ['/squads', '/people', '/wins', '/portfolio-generator'].some(path => location.pathname === path)
                      ? 'bg-[var(--accent)]/10 text-[var(--accent-strong)] border border-[var(--accent)]/20 shadow-[0_0_15px_rgba(78,222,163,0.1)]'
                      : 'text-[var(--muted-strong)] hover:text-[var(--text)] hover:bg-[var(--panel-soft)] border border-transparent'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] transition-all duration-300 ${['/squads', '/people', '/wins', '/portfolio-generator'].some(path => location.pathname === path) ? 'drop-shadow-[0_0_8px_rgba(78,222,163,0.6)]' : 'group-hover:-translate-y-0.5'}`}>hub</span>
                  <span className="relative z-10">Hub</span>
                  <span className="material-symbols-outlined text-[14px] -ml-1 transition-transform duration-300 group-hover:translate-y-0.5">keyboard_arrow_down</span>
                </button>

                {hubDropdownOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-52 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur-3xl p-2 shadow-[0_24px_48px_rgba(0,0,0,0.4)] animate-fade-in-up origin-top z-[200]">
                    {[
                      { to: '/squads', label: 'Squads', icon: 'groups' },
                      { to: '/people', label: 'People', icon: 'diversity_3' },
                      { to: '/wins', label: 'Wins', icon: 'military_tech' },
                      { to: '/portfolio-generator', label: 'Portfolio', icon: 'code_blocks' }
                    ].map((subTab) => {
                      const isSubActive = location.pathname === subTab.to;
                      return (
                        <Link
                          key={subTab.to}
                          to={subTab.to}
                          onClick={() => setHubDropdownOpen(false)}
                          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                            isSubActive
                              ? 'bg-[var(--accent)]/15 text-[var(--accent-strong)]'
                              : 'text-[var(--muted-strong)] hover:bg-white/[0.06] hover:text-[var(--text)]'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[16px] transition-all duration-200 ${isSubActive ? 'drop-shadow-[0_0_6px_rgba(78,222,163,0.5)]' : 'group-hover:scale-110 group-hover:text-[var(--text)]'}`}>{subTab.icon}</span>
                          <span className="transition-transform duration-200 group-hover:translate-x-1">{subTab.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right: Search, Theme, Notifications, Profile Dropdown */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Desktop Search (Only when logged in) */}
            {auth.isAuthenticated && (
              <div className="relative hidden md:block" ref={searchRef}>
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--muted-strong)] z-10 pointer-events-none transition-colors duration-300 peer-focus:text-[var(--accent)]">search</span>
                <input
                  ref={searchInputRef}
                  className="peer w-48 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] py-2 pl-9 pr-12 text-xs text-[var(--text)] outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:w-64 focus:border-[var(--accent)]/50 focus:bg-[var(--panel)] focus:ring-4 focus:ring-[var(--accent)]/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] lg:w-56 lg:focus:w-72"
                  placeholder="Search insights…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none opacity-80">
                  <kbd className="font-mono text-[9px] font-bold tracking-widest text-[var(--muted-strong)] border border-white/[0.1] rounded px-1.5 py-0.5 bg-black/40 shadow-sm">⌘K</kbd>
                </div>
                {searchOpen && (
                  <SearchDropdown
                    query={searchQuery}
                    onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
                    navigate={navigate}
                  />
                )}
              </div>
            )}

            <ThemeToggle compact />
            {auth.isAuthenticated ? <NotificationBell /> : null}

            {/* Profile Dropdown / Auth CTA */}
            {auth.isAuthenticated ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="group flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] px-3 py-1.5 text-xs text-[var(--text)] font-semibold transition-all duration-300 cursor-pointer select-none"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-black text-[#003824] shadow-[0_0_8px_rgba(78,222,163,0.4)]">
                    {userLabel.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[80px] truncate">{userLabel.split(' ')[0]}</span>
                  <span className="material-symbols-outlined text-[16px] text-[var(--muted-strong)] transition-all duration-300 group-hover:text-[var(--text)]">keyboard_arrow_down</span>
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-[250] w-72 overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[var(--panel)]/90 backdrop-blur-2xl p-5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-fade-in-up origin-top-right">
                    <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(78,222,163,0.15),transparent_70%)]" />
                    
                    {/* User Profile Info */}
                    <div className="relative z-10 flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[#003824] shadow-[0_0_12px_rgba(78,222,163,0.4)]">
                        {userLabel.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[var(--text)]">{userLabel}</p>
                        <p className="truncate text-xs text-[var(--muted-strong)]">{auth.user?.email || 'authenticated user'}</p>
                      </div>
                    </div>

                    {/* Resilience Level HUD */}
                    {auth.user?.resilienceXp !== undefined && (
                      <div className="relative z-10 py-4 border-b border-white/[0.08]">
                        {(() => {
                          const xp = auth.user.resilienceXp || 0;
                          const lvl = Math.floor(xp / 1000) + 1;
                          const lvlXp = xp % 1000;
                          const percent = (lvlXp / 1000) * 100;
                          return (
                             <div className="space-y-2">
                               <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[var(--muted-strong)]">
                                 <span>Lvl {lvl} Explorer</span>
                                 <span className="text-[var(--accent-strong)] drop-shadow-[0_0_4px_rgba(78,222,163,0.4)]">{lvlXp}/1000 XP</span>
                               </div>
                               <div className="h-2 w-full overflow-hidden rounded-full bg-black/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                                 <div
                                   className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#71a1ff] shadow-[0_0_12px_rgba(78,222,163,0.6)]"
                                   style={{ width: `${Math.max(5, percent)}%` }}
                                 />
                               </div>
                             </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Action Links */}
                    <div className="relative z-10 py-3 space-y-1">
                      <Link
                        to={profileHref}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)] hover:bg-white/[0.06] hover:text-[var(--text)] transition-all duration-200"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[var(--accent-strong)] transition-transform duration-200 group-hover:scale-110 drop-shadow-[0_0_4px_rgba(78,222,163,0.3)]">person</span>
                        <span className="transition-transform duration-200 group-hover:translate-x-1">View Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)] hover:bg-white/[0.06] hover:text-[var(--text)] transition-all duration-200"
                      >
                        <span className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:scale-110">settings</span>
                        <span className="transition-transform duration-200 group-hover:translate-x-1">Account Settings</span>
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="relative z-10 pt-3 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => { setProfileDropdownOpen(false); void handleSignOut(); }}
                        className="group flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 py-2.5 text-xs font-black uppercase tracking-widest text-rose-400 transition-all duration-200 hover:bg-rose-500/15 hover:text-rose-300 hover:shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                      >
                        <span className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:-translate-x-1">logout</span>
                        <span className="transition-transform duration-200 group-hover:translate-x-1">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="hidden rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-strong)] lg:block">
                  {userLabel}
                </div>
                {auth.guestMode ? (
                  <button type="button" onClick={handleSignOut} className="app-button-secondary hidden px-4 py-2 sm:inline-flex">
                    Exit guest
                  </button>
                ) : (
                  <Link to="/auth" className="app-button hidden px-5 py-2 sm:inline-flex">
                    Sign in
                  </Link>
                )}
              </>
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
