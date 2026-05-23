import React, { useEffect, useState } from 'react';
import { Link } from '@/lib/router-compat.jsx';
import { useSelector } from 'react-redux';
import PostComposer from '../components/PostComposer.jsx';
import AppShell from '../components/AppShell.jsx';
import ResumeBuilderModal from '../components/ResumeBuilderModal.jsx';
import { getMyProfile, getPublicFeedPosts, getPublicProfile, getProfileFollowers, getProfileFollowing, getProfileConnections } from '../api/socialApi.js';
import UserListModal from '../components/UserListModal.jsx';
import { useProfileSettings } from '../hooks/useProfileSettings.js';
import { selectAuth } from '../store/authSlice.js';
import { selectCurrentAnalysis } from '../store/historySlice.js';
import StickerShowcase from '../components/StickerShowcase.jsx';

function initials(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

function formatLabel(value) {
  return `${value || ''}`
    .split('-')
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');
}

function normalizeUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
}

function formatDateRange(start, end, isCurrent = false) {
  return [start, isCurrent ? 'Present' : end].filter(Boolean).join(' - ') || 'Date not specified';
}

function AnimatedSection({ children, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 80 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`transform transition-all duration-700 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
      {children}
    </div>
  );
}

function SectionCard({ id, title, icon, accentColor = 'var(--accent)', children, emptyMessage, isEmpty, className = '' }) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--panel)]/70 p-6 sm:p-7 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-[var(--accent)]/20 hover:shadow-lg ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(78,222,163,0.03),transparent_60%)] pointer-events-none" />
      <div className="relative z-10 mb-6 flex w-full items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)]" style={{ background: `${accentColor}15` }}>
          {icon || <div className="h-3 w-3 rounded-full" style={{ background: accentColor, boxShadow: `0 0 10px ${accentColor}50` }} />}
        </div>
        <h2 className="text-lg font-black tracking-tight text-[var(--text)] sm:text-xl">{title}</h2>
      </div>
      <div className="relative z-10">
        {isEmpty ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/50 py-10 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[var(--muted)]">info</span>
            <p className="text-sm font-bold text-[var(--muted-strong)]">{emptyMessage || 'Nothing to show yet.'}</p>
          </div>
        ) : children}
      </div>
    </section>
  );
}

function MiniPost({ post }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/60 p-5 transition-all hover:border-[var(--accent)]/20 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-[10px] font-black text-white shadow-sm">
            {String(post.author_name || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent-strong)]">
            {String(post.post_type || 'post').replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs font-bold text-[var(--muted)]">{new Date(post.created_at).toLocaleDateString()}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text)]">{post.content}</p>

      <div className="mt-4 flex items-center gap-5 border-t border-[var(--border)]/60 pt-3">
        <button
          onClick={() => {
            setLiked((current) => !current);
            setLikesCount((current) => (liked ? current - 1 : current + 1));
          }}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${liked ? 'scale-105 text-pink-500' : 'text-[var(--muted-strong)] hover:text-[var(--text)]'}`}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
          {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
        </button>
        <button className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)] transition-colors hover:text-[var(--text)]">
          <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
          Comment
        </button>
      </div>
    </article>
  );
}

function heatmapCellClass(intensity) {
  switch (intensity) {
    case 'strong':
      return 'bg-emerald-500';
    case 'medium':
      return 'bg-emerald-400/80';
    case 'light':
      return 'bg-emerald-300/65';
    default:
      return 'border border-[var(--border)] bg-[var(--panel)]';
  }
}

function ResilienceHeatmap({ heatmap = [] }) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
      {heatmap.map((day) => (
        <div key={day.date} className="flex flex-col items-center gap-1.5">
          <div
            title={`${day.date}: ${day.count} application${day.count === 1 ? '' : 's'}`}
            className={`h-8 w-full rounded-lg ${heatmapCellClass(day.intensity)}`}
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {day.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResilienceFeed({ items = [], renderMeta, emptyLabel, baseLink, activeTab }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/50 px-4 py-5 text-sm text-[var(--muted-strong)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const itemKey = `${item.companyName}-${item.dateLabel}`;
        const content = (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 px-4 py-3 transition-all hover:border-[var(--muted-strong)] group-hover:bg-[var(--panel-soft)]">
            <p className="text-sm font-bold text-[var(--text)]">
              {item.companyName} <span className="text-[var(--muted)]">·</span> {item.roleTitle}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{renderMeta(item)}</p>
          </div>
        );

        if (baseLink) {
          return (
            <Link 
              key={`${itemKey}-${index}`} 
              to={baseLink} 
              state={{ activeTab, selectedItemKey: itemKey }}
              className="block group"
            >
              {content}
            </Link>
          );
        }

        return <div key={`${itemKey}-${index}`}>{content}</div>;
      })}
    </div>
  );
}

function Pill({ children, tone = 'default' }) {
  const tones = {
    default: 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--text)]',
    accent: 'border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent-strong)]',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400'
  };

  return <span className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] ${tones[tone]}`}>{children}</span>;
}

export default function ProfilePage() {
  const auth = useSelector(selectAuth);
  const analysis = useSelector(selectCurrentAnalysis);
  const { profile, saveProfile, isLoadingProfile, profileError } = useProfileSettings(auth, analysis);

  const [activeBannerView, setActiveBannerView] = useState('badge');
  const [badgePopupOpen, setBadgePopupOpen] = useState(false);
  const [ownerUsername, setOwnerUsername] = useState('');
  const [socialProfile, setSocialProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [bannerSettingsOpen, setBannerSettingsOpen] = useState(false);
  const [bannerPrefTemp, setBannerPrefTemp] = useState('badge');
  const [listModalState, setListModalState] = useState({ isOpen: false, type: null, title: '', fetchFn: null });
  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Aptico User';
  const userInitials = `${profile.firstName?.[0] || 'A'}${profile.lastName?.[0] || 'U'}`.toUpperCase();
  const username = ownerUsername || auth?.user?.username || '';
  const badgeSrc = username
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL === '/' ? '' : (process.env.NEXT_PUBLIC_API_BASE_URL || '')}/api/badge/${username}.svg`
    : null;
  const bannerUrl = profile.banner_url || profile.bannerUrl || profile?.enriched_settings?.banner_url || '';
  const bannerPreference = profile.banner_preference || profile?.enriched_settings?.banner_preference || 'badge';
  const readinessScore = Number(analysis?.confidenceScore || 0);
  const matchScore = analysis?.confidenceScore ? `${analysis.confidenceScore}%` : 'Pending';
  const preferredModes = Array.isArray(profile.preferredWorkModes) ? profile.preferredWorkModes : [];
  const publicLinks = [
    profile.linkedin ? { name: 'LinkedIn', url: profile.linkedin } : null,
    profile.github ? { name: 'GitHub', url: profile.github } : null,
    profile.portfolio ? { name: 'Portfolio', url: profile.portfolio } : null,
    profile.website ? { name: 'Website', url: profile.website } : null
  ].filter(Boolean);
  const resiliencePortfolio = socialProfile?.resilience_portfolio || null;
  const followerCount = socialProfile?.follower_count || 0;
  const followingCount = socialProfile?.following_count || 0;
  const connectionCount = socialProfile?.connection_count || 0;
  const educationEntries = profile.educationEntries?.length
    ? profile.educationEntries
    : (profile.school
      ? [{
          school: profile.school,
          degree: profile.degree,
          field: profile.fieldOfStudy,
          startYear: '',
          endYear: profile.graduationYear,
          activities: profile.learningFocus
        }]
      : []);

  useEffect(() => {
    if (!auth?.isAuthenticated) return;

    getMyProfile()
      .then((myProfile) => {
        if (!myProfile?.username) return null;
        setOwnerUsername(myProfile.username);
        return getPublicProfile(myProfile.username);
      })
      .then((data) => {
        if (!data) return null;
        setSocialProfile(data);
        return getPublicFeedPosts({ limit: 5, userId: data.user_id });
      })
      .then((feed) => {
        if (feed) {
          setPosts(feed.posts || []);
        }
      })
      .catch(() => null);
  }, [auth?.isAuthenticated]);

  useEffect(() => {
    if (!bannerUrl) {
      setActiveBannerView('badge');
      return;
    }

    if (bannerPreference === 'slider') {
      const interval = setInterval(() => {
        setActiveBannerView((current) => (current === 'badge' ? 'banner' : 'badge'));
      }, 3500);
      return () => clearInterval(interval);
    }

    setActiveBannerView(bannerPreference === 'banner' ? 'banner' : 'badge');
  }, [bannerPreference, bannerUrl]);

  function handleBannerFlip() {
    if (!bannerUrl) return;
    setActiveBannerView((current) => (current === 'badge' ? 'banner' : 'badge'));
  }

  async function handleBannerPrefsSave() {
    try {
      await saveProfile({ ...profile, banner_preference: bannerPrefTemp });
      setBannerSettingsOpen(false);
      setToast('Banner settings saved.');
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      setToast('Failed to save banner settings.');
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function handleBannerUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        await saveProfile({ ...profile, banner_url: loadEvent.target?.result });
        setToast('Banner uploaded!');
        setTimeout(() => setToast(''), 3000);
      } catch (error) {
        setToast('Upload failed.');
        setTimeout(() => setToast(''), 3000);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <AppShell
      title="Profile Portfolio"
      description="Your complete professional story in the same premium layout as your public profile, with personal-only access to every section."
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setResumeModalOpen(true)}
            className="app-button-secondary flex items-center gap-2 transition-all hover:bg-[var(--panel-soft)]"
            title="Build & Download Resume"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            <span className="hidden sm:inline">Export Resume</span>
          </button>
          {username ? (
            <Link
              to={`/u/${username}`}
              target="_blank"
              rel="noreferrer"
              className="app-button-secondary flex items-center gap-2 transition-all hover:bg-[var(--panel-soft)]"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              <span className="hidden sm:inline">Preview Public</span>
            </Link>
          ) : null}
          <Link to="/rewards" className="app-button-secondary flex items-center gap-2 transition-all hover:bg-[var(--panel-soft)]">
            <span className="material-symbols-outlined text-[18px] text-amber-500">star</span>
            <span className="hidden sm:inline">Rewards</span>
          </Link>
          <Link to="/settings" className="app-button-secondary flex items-center gap-2 transition-all hover:bg-[var(--panel-soft)]">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span className="hidden sm:inline">Edit Info</span>
          </Link>
          <Link to="/jobs" className="app-button shadow-lg shadow-[var(--accent)]/20 transition-shadow hover:shadow-[var(--accent)]/40 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">work</span>
            View Job Matches
          </Link>
        </div>
      }
    >
      <div className="mx-auto max-w-6xl">
        {isLoadingProfile ? (
          <div className="mb-6 flex items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-center text-sm font-medium text-[var(--text)] animate-pulse">
            <svg className="h-5 w-5 animate-spin text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Synchronizing your latest profile settings...
          </div>
        ) : null}

        {profileError ? (
          <div className="mb-6 rounded-2xl border-l-4 border-[var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm font-medium text-[var(--warning-text)]">
            {profileError}
          </div>
        ) : null}

        {toast ? (
          <div className="mb-4 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-1.5 text-center text-sm font-bold text-[var(--accent-strong)] animate-fade-in-up">
            {toast}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <AnimatedSection>
              <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--panel)]/80 shadow-lg backdrop-blur-xl">
                <div className="relative h-56 overflow-hidden">
                  <div className="absolute left-4 top-4 z-20">
                    <button
                      onClick={() => {
                        setBannerPrefTemp(bannerPreference);
                        setBannerSettingsOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-xl bg-black/50 px-3.5 py-2 text-xs font-bold text-white shadow-lg outline outline-1 outline-white/20 transition-all hover:scale-105 hover:bg-black/70"
                    >
                      <span className="material-symbols-outlined text-[16px]">settings</span>
                      Banner Settings
                    </button>
                  </div>
                  <div className="absolute inset-0 z-0 h-full w-full cursor-pointer transition-all duration-700" onClick={handleBannerFlip}>
                    {bannerUrl ? (
                      <div
                        className={`absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out ${activeBannerView === 'banner' ? 'z-10 scale-100 opacity-100' : '-z-10 scale-95 opacity-0 pointer-events-none'}`}
                        style={{ backgroundImage: `url(${bannerUrl})` }}
                      >
                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[var(--panel)] opacity-80" />
                      </div>
                    ) : null}

                    <div className={`absolute inset-0 flex h-full w-full items-center justify-center transition-all duration-700 ease-in-out ${activeBannerView === 'badge' || !bannerUrl ? 'z-10 scale-100 opacity-100' : '-z-10 scale-105 opacity-0 pointer-events-none'}`}>
                      {!bannerUrl ? <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15 mix-blend-overlay" /> : null}
                      {!bannerUrl ? <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[var(--panel)] opacity-80" /> : null}
                      {badgeSrc ? (
                        <img
                          src={badgeSrc}
                          alt="Developer Badge XP"
                          onClick={(event) => {
                            event.stopPropagation();
                            setBadgePopupOpen(true);
                          }}
                          className="pointer-events-auto h-full max-h-48 w-auto cursor-pointer object-contain drop-shadow-2xl transition-transform duration-300 hover:-translate-y-1"
                        />
                      ) : (
                        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-black/25 text-5xl font-black text-white shadow-2xl backdrop-blur">
                          {userInitials}
                        </div>
                      )}
                    </div>
                  </div>

                  {bannerUrl ? (
                    <div className="pointer-events-none absolute right-4 top-4 z-10">
                      <div className="flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1.5 text-[10px] font-bold text-white opacity-70 backdrop-blur">
                        <span className="material-symbols-outlined text-[14px]">flip</span>
                        Click to Flip
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative -mt-12 px-6 pb-8 sm:-mt-14 sm:px-10">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="relative z-10 flex w-full flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="relative w-max shrink-0">
                        <div className="flex h-28 w-28 items-center justify-center rounded-[1.5rem] border-4 border-[var(--panel)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-5xl font-black text-white shadow-xl sm:h-36 sm:w-36">
                          {userInitials}
                        </div>
                        <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[var(--panel)] bg-emerald-500 text-white shadow-lg">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 pt-2 sm:pt-4">
                        <div className="space-y-1">
                          <h1 className="text-3xl font-black tracking-tight text-[var(--text)] sm:text-5xl">{fullName}</h1>
                          <p className="text-lg font-bold text-[var(--accent-strong)] sm:text-2xl">
                            {profile.headline || 'Add your professional headline'}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[var(--muted-strong)]">
                          {profile.location ? (
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--panel-soft)] shadow-sm">
                                <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">location_on</span>
                              </span>
                              <span>{profile.location}</span>
                            </div>
                          ) : null}
                          {profile.showEmail && profile.email ? (
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--panel-soft)] shadow-sm">
                                <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">mail</span>
                              </span>
                              <span>{profile.email}</span>
                            </div>
                          ) : null}
                          {profile.showPhone && profile.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--panel-soft)] shadow-sm">
                                <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">call</span>
                              </span>
                              <span>{profile.phone}</span>
                            </div>
                          ) : null}
                        </div>

                        {profile.equippedStickers?.length > 0 && (
                          <div className="mt-5">
                            <StickerShowcase equippedStickers={profile.equippedStickers} />
                          </div>
                        )}

                        {socialProfile ? (
                          <div className="mt-8 flex gap-6 border-t border-[var(--border)] pt-5 sm:gap-8">
                            <button 
                              type="button"
                              onClick={() => setListModalState({ isOpen: true, type: 'followers', title: 'Followers', fetchFn: () => getProfileFollowers(username) })}
                              className="flex cursor-pointer flex-col items-start transition-transform hover:-translate-y-0.5 hover:opacity-80"
                            >
                              <span className="text-xl font-black text-[var(--text)]">{followerCount}</span>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">Followers</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => setListModalState({ isOpen: true, type: 'following', title: 'Following', fetchFn: () => getProfileFollowing(username) })}
                              className="flex cursor-pointer flex-col items-start transition-transform hover:-translate-y-0.5 hover:opacity-80"
                            >
                              <span className="text-xl font-black text-[var(--text)]">{followingCount}</span>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">Following</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => setListModalState({ isOpen: true, type: 'connections', title: 'Connections', fetchFn: () => getProfileConnections(username) })}
                              className="flex cursor-pointer flex-col items-start transition-transform hover:-translate-y-0.5 hover:opacity-80"
                            >
                              <span className="text-xl font-black text-[var(--text)]">{connectionCount}</span>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">Connections</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--panel)] p-5 shadow-sm relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(78,222,163,0.08),transparent_60%)] pointer-events-none" />
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Readiness</p>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <p className="text-4xl font-black tracking-tight text-[var(--text)]">{readinessScore}%</p>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                            Latest sync
                          </span>
                        </div>
                        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--panel-strong)] shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] transition-all duration-1000"
                            style={{ width: `${Math.max(0, Math.min(readinessScore, 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </AnimatedSection>

            <AnimatedSection delay={80}>
              <SectionCard
                id="about"
                title="Professional Overview"
                accentColor="#0ea5e9"
                isEmpty={!profile.bio && !profile.currentTitle && !profile.currentCompany && !profile.industry}
                emptyMessage="Add a summary and current role details to shape your profile story."
              >
                <div className="space-y-6">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)] sm:text-base">
                    {profile.bio || 'Share the story behind your work, strengths, and what you want to build next.'}
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/50 rounded-r" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">badge</span>Current Role</p>
                      <p className="mt-2 text-sm font-bold text-[var(--text)]">
                        {[profile.currentTitle, profile.currentCompany].filter(Boolean).join(' at ') || 'Not specified'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 rounded-r" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">timeline</span>Experience</p>
                      <p className="mt-2 text-sm font-bold text-[var(--text)]">
                        {profile.yearsExperience ? `${profile.yearsExperience} years` : 'Not specified'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-violet-500/50 rounded-r" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">factory</span>Industry</p>
                      <p className="mt-2 text-sm font-bold text-[var(--text)]">{profile.industry || 'Not specified'}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 rounded-r" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">work</span>Employment</p>
                      <p className="mt-2 text-sm font-bold text-[var(--text)]">
                        {profile.employmentType ? formatLabel(profile.employmentType) : 'Not specified'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 rounded-r" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">schedule</span>Availability</p>
                      <p className="mt-2 text-sm font-bold text-[var(--text)]">{profile.availability || 'Not specified'}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50 rounded-r" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">emoji_events</span>Achievements</p>
                      <p className="mt-2 text-sm font-bold text-[var(--text)]">
                        {profile.achievements?.length ? `${profile.achievements.length} highlights added` : 'No highlights yet'}
                      </p>
                    </div>
                  </div>

                  {profile.achievements?.length ? (
                    <div>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Highlights</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.achievements.map((item) => (
                          <Pill key={item} tone="accent">{item}</Pill>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={140}>
              <SectionCard
                id="skills"
                title="Skills"
                accentColor="#ec4899"
                isEmpty={!profile.topSkills?.length && !profile.tools?.length && !profile.languages?.length}
                emptyMessage="Add top skills, tools, and languages to strengthen your profile."
              >
                <div className="space-y-6">
                  {profile.topSkills?.length ? (
                    <div className="space-y-4">
                      {profile.topSkills.map((skill, index) => {
                        const level = Math.max(55, 100 - (index * 12));
                        return (
                          <div key={skill}>
                            <div className="mb-1.5 flex items-baseline justify-between">
                              <span className="text-sm font-bold text-[var(--text)]">{skill}</span>
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{level}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--panel-strong)]">
                              <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-700" style={{ width: `${level}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {profile.tools?.length ? (
                    <div>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Tools & Stack</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.tools.map((tool) => (
                          <Pill key={tool} tone="default">{tool}</Pill>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {profile.languages?.length ? (
                    <div>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Languages</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((language) => (
                          <Pill key={language} tone="success">{language}</Pill>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <SectionCard
                id="experience"
                title="Experience"
                accentColor="#6366f1"
                isEmpty={!profile.experiences?.length}
                emptyMessage="No experience listed yet."
              >
                <div className="relative ml-2 border-l-2 border-[var(--border)] pl-6 sm:ml-4 sm:pl-8">
                  <div className="space-y-8 py-2">
                    {(profile.experiences || []).map((experience, index) => (
                      <div key={`${experience.id || experience.title}-${index}`} className="relative">
                        <div className="absolute -left-[33px] top-1 h-4 w-4 rounded-full bg-[#6366f1] ring-4 ring-[var(--panel)] sm:-left-[41px]" />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-base font-black text-[var(--text)] sm:text-lg">{experience.title || 'Role'}</h3>
                            <p className="text-sm font-bold text-[var(--accent-strong)]">{experience.company || 'Company'}</p>
                          </div>
                          <div className="w-max rounded-md bg-[var(--panel-soft)]/50 px-2 py-1 text-xs font-semibold text-[var(--muted-strong)] sm:text-right">
                            <p>{formatDateRange(experience.startDate, experience.endDate, experience.isCurrent)}</p>
                          </div>
                        </div>
                        {experience.description ? (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{experience.description}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={260}>
              <SectionCard
                id="education"
                title="Education"
                accentColor="#10b981"
                isEmpty={!educationEntries.length}
                emptyMessage="No education listed yet."
              >
                <div className="relative ml-2 border-l-2 border-[var(--border)] pl-6 sm:ml-4 sm:pl-8">
                  <div className="space-y-8 py-2">
                    {educationEntries.map((education, index) => (
                      <div key={`${education.school || 'education'}-${index}`} className="relative">
                        <div className="absolute -left-[33px] top-1 h-4 w-4 rounded-full bg-[#10b981] ring-4 ring-[var(--panel)] sm:-left-[41px]" />
                        <div>
                          <h3 className="text-base font-black text-[var(--text)] sm:text-lg">{education.school || 'Institution'}</h3>
                          <p className="text-sm font-bold text-[var(--accent-strong)]">
                            {[education.degree, education.field].filter(Boolean).join(' in ') || 'Degree not specified'}
                          </p>
                          {(education.startYear || education.endYear) ? (
                            <p className="mt-2 inline-block rounded-md bg-[var(--panel-soft)]/50 px-2 py-1 text-xs font-semibold text-[var(--muted-strong)]">
                              {[education.startYear, education.endYear].filter(Boolean).join(' - ')}
                            </p>
                          ) : null}
                          {education.activities ? (
                            <p className="mt-3 border-l-2 border-[var(--border)] pl-3 text-sm italic leading-relaxed text-[var(--text)]">
                              {education.activities}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={320}>
              <SectionCard
                id="licenses"
                title="Licenses & Certifications"
                accentColor="#eab308"
                isEmpty={!profile.licenses?.length}
                emptyMessage="No licenses or certifications listed yet."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {(profile.licenses || []).map((license, index) => (
                    <div key={`${license.name || 'license'}-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/40 p-5 transition-all hover:border-[#eab308]/50 hover:shadow-md">
                      <h3 className="text-base font-bold text-[var(--text)]">{license.name || 'Certificate'}</h3>
                      {license.issuingOrg ? <p className="mt-1 text-sm font-semibold text-[var(--muted-strong)]">{license.issuingOrg}</p> : null}
                      <div className="mt-3 space-y-1">
                        {license.issueDate ? (
                          <p className="text-xs font-medium text-[var(--muted)]">
                            Issued {license.issueDate}{license.expiryDate ? ` · Expires ${license.expiryDate}` : ''}
                          </p>
                        ) : null}
                        {license.credentialId ? <p className="text-xs font-medium text-[var(--muted)]">ID: <span className="font-mono text-[var(--text)]">{license.credentialId}</span></p> : null}
                      </div>
                      {license.credentialUrl ? (
                        <a
                          href={normalizeUrl(license.credentialUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs font-bold text-[var(--text)] transition-all hover:border-[#eab308]/50 hover:text-[#eab308]"
                        >
                          Show Credential
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={380}>
              <SectionCard
                id="honors"
                title="Honors & Awards"
                accentColor="#f59e0b"
                isEmpty={!profile.honorsAwards?.length}
                emptyMessage="No honors or awards listed yet."
              >
                <div className="space-y-4">
                  {(profile.honorsAwards || []).map((award, index) => (
                    <div key={`${award.title || 'award'}-${index}`} className="flex items-start gap-4 rounded-xl border border-transparent bg-[var(--panel-soft)]/40 p-4 transition-all hover:border-[var(--border)] hover:bg-[var(--panel-soft)]">
                      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <span className="material-symbols-outlined text-[18px] text-amber-500">star</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-black text-[var(--text)]">{award.title || 'Award'}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {award.issuer ? <span className="text-xs font-bold text-[var(--accent-strong)]">{award.issuer}</span> : null}
                          {award.issuer && award.date ? <span className="text-[var(--border)]">•</span> : null}
                          {award.date ? <span className="text-xs font-semibold text-[var(--muted)]">{award.date}</span> : null}
                        </div>
                        {award.description ? <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{award.description}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={440}>
              <SectionCard
                id="featured"
                title="Featured"
                accentColor="#f97316"
                isEmpty={!profile.featured?.length}
                emptyMessage="No featured work added yet."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {(profile.featured || []).map((item, index) => (
                    <a
                      key={`${item.title || 'featured'}-${index}`}
                      href={item.link ? normalizeUrl(item.link) : undefined}
                      target={item.link ? '_blank' : undefined}
                      rel="noreferrer"
                      className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 transition-all hover:border-[#f97316]/50 hover:shadow-md"
                    >
                      <span className="w-max rounded-md bg-[#f97316]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#f97316]">
                        {item.type || 'project'}
                      </span>
                      <h3 className="mt-3 text-sm font-bold leading-tight text-[var(--text)]">{item.title || 'Untitled'}</h3>
                      {item.description ? <p className="mt-2 text-xs font-medium leading-relaxed text-[var(--muted-strong)]">{item.description}</p> : null}
                    </a>
                  ))}
                </div>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={500}>
              <SectionCard
                id="activity"
                title="Activity"
                accentColor="#8b5cf6"
                isEmpty={!posts.length}
                emptyMessage="No posts yet. Write your first career update!"
              >
                <div className="space-y-3">
                  {posts.map((post) => <MiniPost key={post.id} post={post} />)}
                  <button className="app-button mt-3 w-full flex items-center justify-center gap-2" onClick={() => setComposerOpen(true)}>
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    New Post
                  </button>
                </div>
              </SectionCard>
            </AnimatedSection>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <AnimatedSection delay={180}>
              <SectionCard
                id="dashboard"
                title="Career Dashboard"
                accentColor="#0f766e"
                isEmpty={!profile.profileStrengthNotes && !matchScore && !profile.targetRole && !preferredModes.length}
                emptyMessage="No dashboard insights available yet."
              >
                <div className="space-y-5">
                  <div className="rounded-xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--panel)] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">Discovery Strength</p>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-[var(--text)]">
                      {profile.profileStrengthNotes || 'Complete more profile sections to sharpen your recruiter readiness.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-5">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Match Score</p>
                        <p className="mt-2 text-4xl font-black tracking-tight text-[var(--text)]">{matchScore}</p>
                      </div>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)]">
                        Latest analysis
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-[var(--border)] pt-4">
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <span className="font-medium text-[var(--muted-strong)]">Target Role</span>
                      <span className="max-w-[170px] text-right font-bold text-[var(--text)]">{profile.targetRole || 'Not set'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <span className="font-medium text-[var(--muted-strong)]">Work Modes</span>
                      <span className="max-w-[170px] text-right font-bold text-[var(--text)]">{preferredModes.length ? preferredModes.join(', ') : 'Any'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <span className="font-medium text-[var(--muted-strong)]">Visibility</span>
                      <span className="max-w-[170px] text-right font-bold text-[var(--text)]">{profile.publicProfile ? 'Public' : 'Private'}</span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </AnimatedSection>

            <AnimatedSection delay={240}>
              <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel)]/70 p-6 sm:p-7 shadow-sm backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                    <span className="material-symbols-outlined text-[16px] text-[var(--accent-strong)]">link</span>
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted-strong)]">Digital Footprint</h3>
                </div>
                <div className="space-y-3">
                  {publicLinks.length ? (
                    publicLinks.map((link) => (
                      <a
                        key={`${link.name}-${link.url}`}
                        href={normalizeUrl(link.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm transition-all hover:border-[var(--accent)]/30 hover:shadow-md"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--panel-soft)] group-hover:bg-[var(--accent-soft)] transition-colors">
                          <span className="material-symbols-outlined text-[16px] text-[var(--muted-strong)] group-hover:text-[var(--accent-strong)] transition-colors">open_in_new</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent-strong)] transition-colors">{link.name}</p>
                          <p className="truncate text-xs font-medium text-[var(--muted-strong)] opacity-80 group-hover:opacity-100">{link.url}</p>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] p-5 text-center flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-2xl text-[var(--muted)]">add_link</span>
                      <p className="text-sm font-bold text-[var(--muted-strong)]">Connect your portfolio, GitHub, or LinkedIn to increase visibility.</p>
                    </div>
                  )}
                </div>
              </article>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <SectionCard
                id="resilience-portfolio"
                title="Proof of Resilience"
                accentColor="#10b981"
                isEmpty={!resiliencePortfolio}
                emptyMessage="No resilience activity has been shared yet."
              >
                {resiliencePortfolio ? (() => {
                  const now = new Date();
                  const currentMonth = now.getUTCMonth();
                  const currentYear = now.getUTCFullYear();
                  const currentMonthHeatmap = (resiliencePortfolio.heatmap || []).filter((day) => {
                    const d = new Date(day.date + 'T00:00:00Z');
                    return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
                  });
                  const topApps = (resiliencePortfolio.applicationHistory || []).slice(0, 3);
                  const topRejections = (resiliencePortfolio.rejectionJourney || []).slice(0, 3);
                  const resilienceLink = username ? `/u/${username}/resilience` : '#';

                  return (
                    <div className="space-y-5">
                      <Link to={resilienceLink} state={{ activeTab: 'applications' }} className="group block rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--panel-soft)]">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
                            Daily Streak — {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-strong)] transition-colors group-hover:text-[var(--text)]">
                            See Full Year
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </div>
                        </div>
                        <div className="mt-4">
                          <ResilienceHeatmap heatmap={currentMonthHeatmap} />
                        </div>
                      </Link>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Total Applications</p>
                          <p className="mt-2 text-2xl font-black text-[var(--text)]">{resiliencePortfolio.stats?.totalApplications || 0}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Total Rejections</p>
                          <p className="mt-2 text-2xl font-black text-[var(--text)]">{resiliencePortfolio.stats?.totalRejections || 0}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">7-Day Daily Average</p>
                          <p className="mt-2 text-2xl font-black text-[var(--text)]">{resiliencePortfolio.stats?.currentDailyAverage || 0}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Longest Streak</p>
                          <p className="mt-2 text-2xl font-black text-[var(--text)]">{resiliencePortfolio.stats?.longestStreak || 0} days</p>
                        </div>
                      </div>

                      <div className="group block space-y-3 rounded-xl border border-transparent p-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Application History</p>
                          {(resiliencePortfolio.applicationHistory || []).length > 3 && (
                            <Link to={resilienceLink} state={{ activeTab: 'applications' }} className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-strong)] transition-colors group-hover:text-[var(--text)]">
                              See All
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </Link>
                          )}
                        </div>
                        <ResilienceFeed
                          items={topApps}
                          renderMeta={(item) => item.dateLabel}
                          emptyLabel="No application history yet."
                          baseLink={resilienceLink}
                          activeTab="applications"
                        />
                      </div>

                      <div className="group block space-y-3 rounded-xl border border-transparent p-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Rejection Journey</p>
                          {(resiliencePortfolio.rejectionJourney || []).length > 3 && (
                            <Link to={resilienceLink} state={{ activeTab: 'rejections' }} className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-strong)] transition-colors group-hover:text-[var(--text)]">
                              See All
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </Link>
                          )}
                        </div>
                        <ResilienceFeed
                          items={topRejections}
                          renderMeta={(item) => item.dateLabel}
                          emptyLabel="No rejection journey yet."
                          baseLink={resilienceLink}
                          activeTab="rejections"
                        />
                      </div>
                    </div>
                  );
                })() : null}
              </SectionCard>
            </AnimatedSection>
          </div>
        </div>


      </div>

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={(post) => setPosts((current) => [post, ...current].slice(0, 5))}
      />

      <ResumeBuilderModal
        open={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        profile={profile}
        educationEntries={educationEntries}
      />

      {bannerSettingsOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-2xl">
            <h2 className="mb-6 text-center text-2xl font-black tracking-tight text-[var(--text)]">Banner Settings</h2>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">Upload Custom Banner</label>
                <input
                  type="file"
                  onChange={handleBannerUpload}
                  className="block w-full cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-2 text-sm text-[var(--text)] file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2.5 file:text-sm file:font-black file:text-white"
                />
                <p className="mt-2 text-[10px] font-semibold leading-tight text-[var(--muted-strong)]">Upload a banner image to personalize your profile header.</p>
              </div>

              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">Display Mode</label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3.5 transition-colors hover:border-[var(--accent)]/50">
                    <input type="radio" name="bannerPref" value="badge" checked={bannerPrefTemp === 'badge'} onChange={() => setBannerPrefTemp('badge')} className="h-5 w-5 accent-[var(--accent)]" />
                    <span className="text-sm font-bold text-[var(--text)]">XP Badge Main (Click to Flip)</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3.5 transition-colors hover:border-[var(--accent)]/50">
                    <input type="radio" name="bannerPref" value="banner" checked={bannerPrefTemp === 'banner'} onChange={() => setBannerPrefTemp('banner')} className="h-5 w-5 accent-[var(--accent)]" />
                    <span className="text-sm font-bold text-[var(--text)]">Banner Photo Main (Click to Flip)</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3.5 transition-colors hover:border-[var(--accent)]/50">
                    <input type="radio" name="bannerPref" value="slider" checked={bannerPrefTemp === 'slider'} onChange={() => setBannerPrefTemp('slider')} className="h-5 w-5 accent-[var(--accent)]" />
                    <span className="text-sm font-bold text-[var(--text)]">Automatic Slider</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                <button onClick={() => setBannerSettingsOpen(false)} className="app-button-secondary bg-[var(--panel-soft)] px-5">Close</button>
                <button onClick={handleBannerPrefsSave} className="app-button px-6 shadow-lg shadow-[var(--accent)]/30">Save Layout</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {badgePopupOpen ? (
        <div className="fixed inset-0 z-[200] flex cursor-pointer items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in" onClick={() => setBadgePopupOpen(false)}>
          <div className="relative w-full max-w-sm cursor-default rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-8 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="absolute right-4 top-4">
              <button onClick={() => setBadgePopupOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--panel-soft)] text-[var(--muted-strong)] transition-colors hover:text-[var(--text)] hover:bg-[var(--panel-strong)]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <h2 className="mb-1 text-center text-2xl font-black tracking-tight text-[var(--text)]">Developer Badge</h2>
            <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-[var(--accent-strong)]">{fullName}</p>

            <div className="relative mb-8 flex justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[#ec4899] opacity-20 blur-3xl" />
              {badgeSrc ? (
                <img src={badgeSrc} alt="Badge" className="relative z-10 h-44 object-contain drop-shadow-2xl" />
              ) : (
                <div className="relative z-10 flex h-40 w-40 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-6xl font-black text-white">
                  {userInitials}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-5 shadow-inner backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--muted-strong)]">Current XP</span>
                <span className="text-base font-black text-[var(--text)]">{socialProfile?.resilience_xp || profile.resilience_xp || 0} XP</span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                <span className="text-sm font-bold text-[var(--muted-strong)]">Network Rank</span>
                <span className="text-sm font-black text-[var(--text)]">{followerCount > 10 ? 'Influencer' : 'Rising Star'}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                <span className="text-sm font-bold text-[var(--muted-strong)]">Readiness Score</span>
                <span className="text-sm font-black text-[var(--accent-strong)]">{matchScore}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <UserListModal 
        isOpen={listModalState.isOpen}
        onClose={() => setListModalState(s => ({ ...s, isOpen: false }))}
        title={listModalState.title}
        fetchData={listModalState.fetchFn}
        emptyMessage={`No ${listModalState.title.toLowerCase()} found.`}
      />
    </AppShell>
  );
}
