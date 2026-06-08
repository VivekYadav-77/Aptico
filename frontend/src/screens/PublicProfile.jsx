import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from '@/lib/router-compat.jsx';
import { useSelector } from 'react-redux';
import PostComposer from '../components/PostComposer.jsx';
import ProfileActivityPost from '../components/ProfileActivityPost.jsx';
import {
  followProfile,
  getConnectionStatus,
  getFollowStatus,
  getMyProfile,
  getPublicFeedPosts,
  getPublicProfile,
  sendConnectionRequest,
  respondToConnection,
  unfollowProfile,
  getProfileFollowers,
  getProfileFollowing,
  getProfileConnections
} from '../api/socialApi.js';
import UserListModal from '../components/UserListModal.jsx';
import { saveProfileSettings, fetchProfileSettings } from '../api/profileApi.js';
import { selectAuth } from '../store/authSlice.js';
import ResumeTemplate from '../components/ResumeTemplate.jsx';
import StickerShowcase from '../components/StickerShowcase.jsx';
import StickerInventoryModal from '../components/StickerInventoryModal.jsx';
import ResumeBuilderModal from '../components/ResumeBuilderModal.jsx';
import TopProjectDetailsModal from '../components/TopProjectDetailsModal.jsx';
import SquadProofCard from '../components/SquadProofCard.jsx';

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

/* ── Animated Section Wrapper ── */
function AnimatedSection({ children, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 80 + delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'}`}>
      {children}
    </div>
  );
}

/* ── Premium Section Card Wrapper ── */
function SectionCard({ id, title, icon, accentColor = 'var(--accent)', children, emptyMessage, isEmpty, locked, lockedMessage, className = '' }) {
  const glowStyle = {
    background: `radial-gradient(120% 120% at 50% -10%, ${accentColor}15 0%, transparent 70%)`
  };

  if (locked) {
    return (
      <section id={id} className={`relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--panel)]/40 backdrop-blur-2xl p-6 sm:p-8 shadow-xl transition-all ${className}`}>
        <div className="absolute inset-0 pointer-events-none" style={glowStyle} />
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="h-8 w-2 rounded-full" style={{ background: accentColor, boxShadow: `0 0 20px ${accentColor}` }} />
          <h2 className="text-xl sm:text-2xl font-black text-[var(--text)] tracking-tight">{title}</h2>
          <svg className="w-6 h-6 text-[var(--muted-strong)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <div className="h-32 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/30 text-sm font-semibold text-[var(--muted-strong)] backdrop-blur-sm relative z-10 shadow-inner">
           <svg className="w-8 h-8 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          {lockedMessage || 'Connect to view this section'}
        </div>
      </section>
    );
  }

  return (
    <section id={id} className={`relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--panel)]/40 backdrop-blur-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-[var(--muted-strong)] transition-all duration-500 group ${className}`}>
      <div className="absolute inset-0 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500" style={glowStyle} />
      <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
      <div className="flex items-center gap-4 mb-8 relative z-10 w-full">
        <div className="h-8 w-2 rounded-full transition-all duration-500 group-hover:scale-y-110" style={{ background: accentColor, boxShadow: `0 0 20px ${accentColor}` }} />
        <h2 className="text-xl sm:text-2xl font-black text-[var(--text)] tracking-tight">{title}</h2>
        {icon && <span className="ml-auto text-[var(--muted-strong)] opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>}
      </div>
      <div className="relative z-10">
        {isEmpty ? (
          <div className="py-12 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/30 shadow-inner group-hover:border-[var(--muted-strong)]/50 transition-colors">
            <div className="w-12 h-12 mb-4 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center shadow-sm" style={{ color: accentColor }}>
              <svg className="w-6 h-6 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
            </div>
            <p className="text-sm font-semibold text-[var(--muted-strong)]">{emptyMessage || 'Nothing to show yet.'}</p>
          </div>
        ) : children}
      </div>
    </section>
  );
}

/* ── Mini Post Card ── */
function TopProjectCard({ project, onReadMore }) {
  const links = [
    project.githubUrl ? { label: 'GitHub', url: project.githubUrl } : null,
    project.liveUrl ? { label: 'Live Demo', url: project.liveUrl } : null
  ].filter(Boolean);
  const canReadMore = String(project.description || '').length > 110;

  return (
    <article className="group rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/40 p-4 transition-all duration-300 hover:border-[#14b8a6]/50 hover:bg-[#14b8a6]/5 hover:shadow-xl sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#14b8a6]/20 bg-[#14b8a6]/10 text-[#14b8a6] shadow-inner transition-transform group-hover:scale-110">
            <span className="material-symbols-outlined text-[22px]">code_blocks</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 break-words text-base font-black leading-tight text-[var(--text)] transition-colors group-hover:text-[#14b8a6]">{project.title}</h3>
            <p className="mt-1.5 line-clamp-2 break-words text-sm font-medium leading-6 text-[var(--muted-strong)]">{project.description}</p>
            {canReadMore ? (
              <button
                type="button"
                onClick={() => onReadMore(project)}
                className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#14b8a6] transition-colors hover:text-[#0f766e]"
              >
                Read more
              </button>
            ) : null}
          </div>
        </div>

        {links.length ? (
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            {links.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={normalizeUrl(link.url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs font-bold text-[var(--text)] transition-all hover:border-[#14b8a6]/50 hover:text-[#14b8a6]"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                <span className="truncate">{link.label}</span>
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {project.techStack?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 pl-0 sm:pl-14">
          {project.techStack.slice(0, 4).map((tech) => (
            <span key={tech} className="rounded-lg border border-[#14b8a6]/20 bg-[#14b8a6]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#14b8a6]">{tech}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function MiniPost({ post }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  return (
    <article className="group rounded-2xl border border-[var(--border)] bg-[var(--panel)]/40 p-5 backdrop-blur-md transition-all duration-300 hover:border-[#ec4899]/30 hover:bg-[var(--panel-soft)]/60 hover:shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#ec4899]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-sm font-black text-white shadow-md transform group-hover:scale-105 transition-transform">
             {String(post.author_name || 'U').charAt(0).toUpperCase()}
           </div>
           <div>
             <p className="text-xs font-black uppercase tracking-widest text-[var(--accent-strong)] opacity-80 group-hover:opacity-100 transition-opacity">{String(post.post_type || 'post').replace('_', ' ')}</p>
             <p className="text-xs font-bold text-[var(--muted)]">{new Date(post.created_at).toLocaleDateString()}</p>
           </div>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium leading-relaxed text-[var(--text)] relative z-10">{post.content}</p>
      
      <div className="mt-5 flex items-center gap-5 border-t border-[var(--border)]/50 pt-4 relative z-10">
        <button 
          onClick={() => { setLiked(!liked); setLikesCount(c => liked ? c - 1 : c + 1); }}
          className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all duration-300 ${liked ? 'text-pink-500' : 'text-[var(--muted-strong)] hover:text-pink-500'}`}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${liked ? 'bg-pink-500/10' : 'group-hover:bg-pink-500/10'}`}>
            <svg className={`h-4 w-4 transition-transform duration-300 ${liked ? 'fill-current scale-110' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={liked ? 2 : 2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          {likesCount} <span className="hidden sm:inline">{likesCount === 1 ? 'Like' : 'Likes'}</span>
        </button>
        <button className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--muted-strong)] transition-all duration-300 hover:text-[var(--text)] group-hover:text-[var(--text)]/80">
          <div className="p-1.5 rounded-lg transition-colors hover:bg-[var(--panel-soft)]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="hidden sm:inline">Comment</span>
        </button>
      </div>
    </article>
  );
}

function heatmapCellClass(intensity) {
  switch (intensity) {
    case 'strong':
      return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
    case 'medium':
      return 'bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.3)]';
    case 'light':
      return 'bg-emerald-300/40';
    default:
      return 'bg-[var(--panel-soft)]/30 border border-[var(--border)]/50';
  }
}

function ResilienceHeatmap({ heatmap = [] }) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
      {heatmap.map((day) => (
        <div key={day.date} className="flex flex-col items-center gap-1.5">
          <div
            title={`${day.date}: ${day.count} application${day.count === 1 ? '' : 's'}`}
            className={`h-[46px] w-full rounded-lg ${heatmapCellClass(day.intensity)}`}
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
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/40 px-5 py-4 transition-all duration-300 hover:border-[#10b981]/40 hover:bg-[#10b981]/5 hover:shadow-md relative overflow-hidden backdrop-blur-sm group-hover:translate-x-1">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10b981]/20 group-hover:bg-[#10b981] transition-colors duration-300" />
            <p className="text-sm font-black text-[var(--text)] group-hover:text-[#10b981] transition-colors">
              {item.companyName} <span className="text-[var(--muted)] font-normal px-1">·</span> {item.roleTitle}
            </p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-strong)]">
              {renderMeta(item)}
            </p>
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

export default function PublicProfile() {
  const { username } = useParams();
  const auth = useSelector(selectAuth);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('not_connected');
  const [connectionId, setConnectionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectNote, setConnectNote] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [toast, setToast] = useState('');
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // Banner & Badge Settings State
  const [activeBannerView, setActiveBannerView] = useState('badge');
  const [bannerSettingsOpen, setBannerSettingsOpen] = useState(false);
  const [badgePopupOpen, setBadgePopupOpen] = useState(false);
  const [stickerGalleryOpen, setStickerGalleryOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [selectedTopProject, setSelectedTopProject] = useState(null);
  const [bannerPrefTemp, setBannerPrefTemp] = useState('badge');
  const [listModalState, setListModalState] = useState({ isOpen: false, type: null, title: '', fetchFn: null });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Visibility Settings State

  
  // Banner Slider Effect
  useEffect(() => {
    if (!profile) return;
    const pref = profile.enriched_settings?.banner_preference || 'badge';
    let isSlider = pref === 'slider';
    
    if (isSlider && profile.banner_url) {
      const interval = setInterval(() => {
        setActiveBannerView(prev => prev === 'badge' ? 'banner' : 'badge');
      }, 3500);
      return () => clearInterval(interval);
    } else {
      setActiveBannerView(pref === 'banner' && profile.banner_url ? 'banner' : 'badge');
    }
  }, [profile?.banner_url, profile?.enriched_settings?.banner_preference]);

  function handleBannerClick() {
    if (!profile?.banner_url) return;
    setActiveBannerView(prev => prev === 'badge' ? 'banner' : 'badge');
  }

  async function handleBannerPrefsSave() {
    try {
      const fullSettings = await fetchProfileSettings();
      const updatedBackendSettings = { ...fullSettings, banner_preference: bannerPrefTemp };
      await saveProfileSettings(updatedBackendSettings);
      
      const updatedSettings = { ...(profile.enriched_settings || {}), banner_preference: bannerPrefTemp };
      setProfile(p => ({ ...p, enriched_settings: updatedSettings }));
      setBannerSettingsOpen(false);
      setToast('Settings saved successfully.');
    } catch (e) {
      console.error(e);
      setToast('Failed to save settings.');
    }
  }

  async function handleCloudinaryMockUpload(e) {
    const file = e.target.files?.[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const uploadedUrl = event.target.result; // Use Base64 data URL so it persists for other users

      try {
        const fullSettings = await fetchProfileSettings();
        const updatedBackendSettings = { ...fullSettings, banner_url: uploadedUrl };
        await saveProfileSettings(updatedBackendSettings);
        
        const updatedSettings = { ...(profile.enriched_settings || {}), banner_url: uploadedUrl };
        setProfile(p => ({ ...p, banner_url: uploadedUrl, enriched_settings: updatedSettings }));
        setToast('Banner uploaded successfully!');
      } catch (error) {
        console.error(error);
        setToast('Failed to upload banner.');
      }
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);

    getPublicProfile(username)
      .then((result) => {
        if (!mounted) return null;
        // Check if enriched_settings has a banner_url since it's not in db schema natively
        if (result.enriched_settings?.banner_url && !result.banner_url) {
          result.banner_url = result.enriched_settings.banner_url;
        }
        setProfile(result);
        return getPublicFeedPosts({ limit: 5, userId: result.user_id });
      })
      .then((feed) => {
        if (mounted && feed) setPosts(feed.posts || []);
      })
      .catch((error) => {
        if (mounted && error.response?.status === 404) setNotFound(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [username]);

  useEffect(() => {
    if (!auth.isAuthenticated || !username) return;
    getMyProfile().then(setMyProfile).catch(() => null);
    getFollowStatus(username).then(setIsFollowing).catch(() => null);
    getConnectionStatus(username).then(data => {
      setConnectionStatus(data.status);
      setConnectionId(data.connectionId);
    }).catch(() => null);
  }, [auth.isAuthenticated, username]);

  async function handleFollowClick() {
    if (!auth.isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isFollowing) {
      await unfollowProfile(username);
      setIsFollowing(false);
    } else {
      await followProfile(username);
      setIsFollowing(true);
    }
  }

  async function handleConnect(event) {
    event.preventDefault();
    if (!auth.isAuthenticated) {
      navigate('/login');
      return;
    }
    await sendConnectionRequest(username, connectNote);
    setConnectionStatus('pending_sent');
    setConnectOpen(false);
    setConnectNote('');
    setToast('Connection request sent.');
  }

  async function handleRespondToConnection(action) {
    if (!connectionId) return;
    try {
      await respondToConnection(connectionId, action);
      setConnectionStatus(action === 'accepted' ? 'connected' : 'not_connected');
      if (action === 'declined') {
        setConnectionId(null);
      }
      setToast(`Connection request ${action}.`);
    } catch (e) {
      setToast(`Failed to ${action} request.`);
    }
  }

  async function shareProfile() {
    await navigator.clipboard.writeText(window.location.href);
    setToast('Copied!');
    setTimeout(() => setToast(''), 3000);
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-8">
        <div className="mx-auto max-w-6xl">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
             <div className="lg:col-span-8 space-y-6">
                <div className="h-64 w-full rounded-3xl bg-[var(--panel)] shadow-sm animate-pulse border border-[var(--border)] overflow-hidden">
                   <div className="h-32 bg-[var(--panel-soft)] w-full" />
                   <div className="px-6 flex gap-4 items-end -mt-10">
                      <div className="h-24 w-24 rounded-2xl bg-[var(--border)] border-4 border-[var(--panel)]" />
                      <div className="flex-1 space-y-3 pb-2">
                         <div className="h-6 w-1/3 bg-[var(--panel-soft)] rounded" />
                         <div className="h-4 w-1/4 bg-[var(--panel-soft)] rounded" />
                      </div>
                   </div>
                </div>
                {[1,2].map(i => (
                  <div key={i} className="h-48 w-full rounded-2xl bg-[var(--panel)] shadow-sm border border-[var(--border)] animate-pulse p-6">
                     <div className="h-5 w-1/4 bg-[var(--panel-soft)] rounded mb-4" />
                     <div className="h-20 w-full bg-[var(--panel-soft)] rounded" />
                  </div>
                ))}
             </div>
             <div className="lg:col-span-4 space-y-6">
                {[1,2,3].map(i => (
                  <div key={i} className="h-36 w-full rounded-2xl bg-[var(--panel)] shadow-sm border border-[var(--border)] animate-pulse p-6">
                     <div className="h-5 w-1/3 bg-[var(--panel-soft)] rounded mb-3" />
                     <div className="h-12 w-full bg-[var(--panel-soft)] rounded" />
                  </div>
                ))}
             </div>
           </div>
        </div>
      </main>
    );
  }

  // ── Not found ──
  if (notFound || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-12 text-center shadow-xl max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-6 bg-[var(--danger-soft)] text-red-500 rounded-full flex items-center justify-center">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className="text-3xl font-black text-[var(--text)] tracking-tight">Profile not found</h1>
          <p className="mt-3 text-base text-[var(--muted-strong)]">This user may not exist or their profile is private.</p>
          <Link to="/" className="app-button mt-8 w-full justify-center">Go to Aptico Dashboard</Link>
        </div>
      </main>
    );
  }

  const viewingOwnProfile = auth.isAuthenticated && myProfile?.username === username;
  const canSeeConnections = viewingOwnProfile || connectionStatus === 'connected';
  const readiness = Number(profile.latest_analysis?.confidence_score || 0);
  const es = profile.enriched_settings || {};
  const resiliencePortfolio = profile.resilience_portfolio || null;
  const sectionVis = es.sectionVisibility || {};
  const viewerRel = viewingOwnProfile ? 'self' : (es.viewerRelationship || 'public');
  const topProjects = Array.isArray(es.topProjects) ? es.topProjects : [];
  const publicLinks = [
    (es.linkedin || profile.linkedin) ? { name: 'LinkedIn', url: es.linkedin || profile.linkedin, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.732c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z"/></svg> } : null,
    (es.github || profile.github) ? { name: 'GitHub', url: es.github || profile.github, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> } : null,
    (es.portfolio || profile.portfolio) ? { name: 'Portfolio', url: es.portfolio || profile.portfolio, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /></svg> } : null,
    (es.website || profile.website) ? { name: 'Website', url: es.website || profile.website, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> } : null
  ].filter(Boolean);

  // Determine if a section is visible
  function isSectionVisible(key) {
    const vis = sectionVis[key] || 'everyone';
    if (vis === 'everyone') return true;
    if (vis === 'connections' && (viewerRel === 'self' || viewerRel === 'connected')) return true;
    if (vis === 'only_me' && viewerRel === 'self') return true;
    return false;
  }

  function isSectionLocked(key) {
    const vis = sectionVis[key] || 'everyone';
    if (vis === 'everyone') return false;
    if (vis === 'connections' && viewerRel === 'public') return true;
    if (vis === 'only_me' && viewerRel !== 'self') return true;
    return false;
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-8">
      <style>{`
        @media screen {
          .resume-print-only { display: none !important; }
        }
        @media print {
          .public-profile-screen { display: none !important; }
          .resume-print-only { display: block !important; }
          body, html { background: white !important; margin: 0; padding: 0; }
        }
      `}</style>
      <div className="public-profile-screen mx-auto max-w-6xl space-y-6">
        
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
            <Link
              to="/"
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  e.preventDefault();
                  window.history.back();
                }
              }}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted-strong)] hover:text-[var(--text)] transition-all bg-[var(--panel)]/40 hover:bg-[var(--panel)]/80 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--muted)] shadow-sm hover:shadow-md group"
            >
               <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" autoFocus fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
               Back
            </Link>
            {toast ? <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-5 py-2 text-sm font-black text-[var(--accent-strong)] animate-fade-in-up shadow-lg shadow-[var(--accent)]/10">{toast}</div> : null}
        </div>

        {/* ═════════════ GRID LAYOUT ═════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ═ LEFT COLUMN (MAIN) ═ */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* ════ HEADER CARD ════ */}
                <AnimatedSection>
                  <section className="relative overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--panel)] p-0 shadow-2xl group">
                    <div className="h-48 sm:h-64 relative overflow-hidden group/banner rounded-t-[2.5rem] bg-[var(--panel-soft)]">
                      
                      {/* BANNER FLIP CONTAINER */}
                      <div className="absolute inset-0 z-0 transition-all duration-700 w-full h-full cursor-pointer" onClick={handleBannerClick}>
                         
                         {/* VIEW 1: CUSTOM BANNER PHOTO */}
                         {profile.banner_url && (
                             <div className={`absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out ${activeBannerView === 'banner' ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 pointer-events-none -z-10'}`} style={{ backgroundImage: `url(${profile.banner_url})` }}>
                                 <div className="absolute inset-0 bg-gradient-to-t from-[var(--panel)] via-[var(--panel)]/20 to-transparent opacity-90 pointer-events-none" />
                             </div>
                         )}

                         {/* VIEW 2: BADGE */}
                         <div className={`absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-700 ease-in-out ${activeBannerView === 'badge' || !profile.banner_url ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 pointer-events-none -z-10'}`}>
                              {!profile.banner_url && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none" />}
                              {!profile.banner_url && <div className="absolute inset-0 bg-gradient-to-t from-[var(--panel)] via-[var(--panel)]/40 to-transparent opacity-90 pointer-events-none" />}
                              
                              <img 
                                  src={`${process.env.NEXT_PUBLIC_API_BASE_URL === '/' ? '' : (process.env.NEXT_PUBLIC_API_BASE_URL || '')}/api/badge/${username}.svg`} 
                                  alt="Developer Badge XP" 
                                  onClick={(e) => { e.stopPropagation(); setBadgePopupOpen(true); }}
                                  className="h-full max-h-56 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-transform duration-500 cursor-pointer pointer-events-auto"
                              />
                         </div>
                      </div>

                      {/* BANNER SETTINGS BUTTON */}
                      {viewingOwnProfile && (
                         <div className="absolute top-5 left-5 z-20">
                            <button onClick={() => { setBannerPrefTemp(profile.enriched_settings?.banner_preference || 'badge'); setBannerSettingsOpen(true); }} className="flex items-center gap-2 rounded-xl bg-black/40 backdrop-blur-xl px-4 py-2.5 text-xs font-bold text-white shadow-xl hover:bg-black/60 hover:scale-105 transition-all outline outline-1 outline-white/20">
                               <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                               Banner Settings
                            </button>
                         </div>
                      )}
                      
                      {/* FLIP INDICATOR FOR VISITORS */}
                      {profile.banner_url && (
                         <div className="absolute top-5 right-5 z-10 pointer-events-none">
                             <div className="bg-black/30 backdrop-blur-xl text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-70 flex items-center gap-1.5 shadow-lg border border-white/10">
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15a3 3 0 100-6 3 3 0 000 6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v4m0 0l-2-2m2 2l2-2" /></svg>
                                 Click to Flip
                             </div>
                         </div>
                      )}
                    </div>
                    
                    <div className="px-6 sm:px-12 pb-10 relative -mt-20 sm:-mt-24">
                      <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between w-full">
                        
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-end relative z-10 flex-1 min-w-[300px]">
                          <div className="relative shrink-0 w-max group/avatar">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="h-32 w-32 sm:h-44 sm:w-44 rounded-[2rem] border-[6px] border-[var(--panel)] object-cover shadow-2xl bg-[var(--panel)] transition-transform duration-500 group-hover/avatar:scale-105 group-hover/avatar:-rotate-3" />
                            ) : (
                              <div className="flex h-32 w-32 sm:h-44 sm:w-44 items-center justify-center rounded-[2rem] border-[6px] border-[var(--panel)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-5xl sm:text-6xl font-black text-white shadow-2xl transition-transform duration-500 group-hover/avatar:scale-105 group-hover/avatar:-rotate-3">{initials(profile.name)}</div>
                            )}
                            {es.openToWork && (
                              <div className="absolute -bottom-2 -right-2 flex items-center justify-center rounded-2xl bg-emerald-500 border-[6px] border-[var(--panel)] w-14 h-14 shadow-xl transition-transform hover:scale-110 cursor-help" title="Open to work">
                                <span className="absolute w-full h-full rounded-2xl bg-emerald-500 animate-ping opacity-40"></span>
                                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </div>
                          
                          <div className="pt-2 sm:pb-5 flex-1 min-w-0">
                            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[var(--text)] drop-shadow-md break-words">{profile.name || profile.username}</h1>
                            <p className="mt-2 text-lg sm:text-xl font-bold text-[var(--accent-strong)] leading-snug drop-shadow-sm">{profile.headline || 'Career builder'}</p>
                            {profile.location && <p className="mt-3 text-sm font-bold text-[var(--muted-strong)] flex items-center gap-2"><svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{profile.location}</p>}
                            {(profile.enriched_settings?.equippedStickers?.length > 0 || profile.enriched_settings?.unlockedStickers?.length > 0) && (
                              <div className="mt-6">
                                  <StickerShowcase 
                                    equippedStickers={profile.enriched_settings.equippedStickers || []} 
                                    unlockedStickers={profile.enriched_settings.unlockedStickers || []}
                                    squadRewardHistory={profile.enriched_settings.squadRewardHistory || []}
                                    userName={profile.name || username}
                                    onSeeAll={() => setStickerGalleryOpen(true)}
                                  />
                              </div>
                            )}

                            {(profile.enriched_settings?.squadProofSummary?.currentSquad || profile.enriched_settings?.squadProofSummary?.totalClaimed > 0) && (
                              <div className="mt-5">
                                <SquadProofCard summary={profile.enriched_settings.squadProofSummary} history={profile.enriched_settings.squadRewardHistory || []} />
                                <div className="hidden">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Squad Proof</p>
                                <p className="mt-2 text-sm font-bold leading-6 text-[var(--text)]">
                                  Best monthly finish #{profile.enriched_settings.squadProofSummary.bestRank} · {profile.enriched_settings.squadProofSummary.totalClaimed} verified squad reward{profile.enriched_settings.squadProofSummary.totalClaimed === 1 ? '' : 's'}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
                                  Latest: {profile.enriched_settings.squadProofSummary.latest?.title} earned {profile.enriched_settings.squadProofSummary.latest?.periodLabel || profile.enriched_settings.squadProofSummary.latest?.period} with {profile.enriched_settings.squadProofSummary.latest?.squadName}.
                                </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons Desktop aligned */}
                        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0 w-full sm:w-auto sm:pb-5 mt-4 sm:mt-0">
                          <button type="button" onClick={() => setResumeModalOpen(true)} className="app-button-secondary bg-[var(--panel)]/50 backdrop-blur-md flex-1 lg:flex-none justify-center gap-2 shadow-sm hover:shadow-md transition-all py-3 px-5" title="Export as PDF">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span className="font-bold">Resume</span>
                          </button>
                          {viewingOwnProfile ? (
                            <>
                              <div className="relative flex-1 lg:flex-none flex">
                                <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)} className="app-button-secondary bg-[var(--panel)]/50 backdrop-blur-md shadow-sm hover:shadow-md transition-all py-3 px-4 w-full justify-center">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </button>
                                {dropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />}
                                <div className={`absolute right-0 top-full mt-2 w-48 bg-[var(--panel-strong)] border border-[var(--border)] rounded-xl shadow-2xl transition-all z-50 py-2 ${dropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                                  <Link to="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--panel-soft)] font-bold text-sm transition-colors text-[var(--text)]">
                                    <span className="material-symbols-outlined text-[18px]">edit</span> Edit Profile
                                  </Link>
                                  <button onClick={() => { shareProfile(); setDropdownOpen(false); }} className="flex items-center w-full gap-3 px-4 py-2 hover:bg-[var(--panel-soft)] font-bold text-sm transition-colors text-[var(--text)]">
                                    <span className="material-symbols-outlined text-[18px]">share</span> Share Profile
                                  </button>
                                </div>
                              </div>
                              <button type="button" className="app-button shadow-xl shadow-[var(--accent)]/30 hover:shadow-[var(--accent)]/50 hover:-translate-y-0.5 transition-all font-black py-3 px-8 flex-1 lg:flex-none justify-center" onClick={() => setComposerOpen(true)}>Post Update</button>
                            </>
                          ) : (
                            <>
                              {connectionStatus === 'pending_received' ? (
                                <div className="flex gap-2 flex-1 lg:flex-none">
                                  <button type="button" onClick={() => handleRespondToConnection('accepted')} className="app-button shadow-xl shadow-[var(--accent)]/30 hover:-translate-y-0.5 transition-all font-black flex-1 lg:flex-none justify-center py-3 px-6">Accept</button>
                                  <button type="button" onClick={() => handleRespondToConnection('declined')} className="app-button-secondary bg-[var(--panel)]/50 backdrop-blur-md font-bold flex-1 lg:flex-none justify-center py-3 px-6">Decline</button>
                                </div>
                              ) : (
                                <button type="button" className={`flex-1 lg:flex-none justify-center py-3 px-8 font-black transition-all ${connectionStatus === 'connected' ? 'app-button shadow-xl shadow-[var(--accent)]/30 hover:-translate-y-0.5' : 'app-button-secondary bg-[var(--panel)]/50 backdrop-blur-md shadow-sm hover:shadow-md'}`} disabled={['connected', 'pending_sent'].includes(connectionStatus)} onClick={() => auth.isAuthenticated ? setConnectOpen(true) : navigate('/login')}>
                                  {connectionStatus === 'connected' ? '✓ Connected' : connectionStatus === 'pending_sent' ? 'Pending Request' : 'Connect'}
                                </button>
                              )}
                              <button type="button" onClick={handleFollowClick} className="app-button-secondary bg-[var(--panel)]/50 backdrop-blur-md flex-1 lg:flex-none justify-center font-bold shadow-sm hover:shadow-md transition-all py-3 px-8">{auth.isAuthenticated && isFollowing ? 'Unfollow' : 'Follow'}</button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Stats footer in header */}
                      <div className="mt-10 flex flex-wrap gap-8 sm:gap-12 border-t border-[var(--border)] pt-8">
                        <button 
                          type="button"
                          onClick={() => setListModalState({ isOpen: true, type: 'followers', title: 'Followers', fetchFn: () => getProfileFollowers(username) })}
                          disabled={!isSectionVisible('socialNetwork')}
                          className={`flex flex-col items-start transition-transform group ${isSectionVisible('socialNetwork') ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default opacity-60'}`}
                          title={!isSectionVisible('socialNetwork') ? 'Followers list is private' : ''}
                        >
                          <span className="text-2xl sm:text-3xl font-black text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{profile.follower_count || 0}</span>
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)] mt-1">Followers</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setListModalState({ isOpen: true, type: 'following', title: 'Following', fetchFn: () => getProfileFollowing(username) })}
                          disabled={!isSectionVisible('socialNetwork')}
                          className={`flex flex-col items-start transition-transform group ${isSectionVisible('socialNetwork') ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default opacity-60'}`}
                          title={!isSectionVisible('socialNetwork') ? 'Following list is private' : ''}
                        >
                          <span className="text-2xl sm:text-3xl font-black text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{profile.following_count || 0}</span>
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)] mt-1">Following</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setListModalState({ isOpen: true, type: 'connections', title: 'Connections', fetchFn: () => getProfileConnections(username) })}
                          disabled={!isSectionVisible('socialNetwork')}
                          className={`flex flex-col items-start transition-transform group ${isSectionVisible('socialNetwork') ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default opacity-60'}`}
                          title={!isSectionVisible('socialNetwork') ? 'Connections list is private' : ''}
                        >
                          <span className="text-2xl sm:text-3xl font-black text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{profile.connection_count || 0}</span>
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-strong)] mt-1">Connections</span>
                        </button>
                      </div>
                    </div>
                  </section>
                </AnimatedSection>

                {/* ════ ABOUT ════ */}
                <AnimatedSection delay={80}>
                  {isSectionLocked('about') ? (
                    <SectionCard id="about" title="About" accentColor="var(--accent)" locked lockedMessage={`Connect with ${profile.name || profile.username} to see their about section`} />
                  ) : isSectionVisible('about') ? (
                    <SectionCard id="about" title="About" accentColor="var(--accent)" isEmpty={!es.bio && !es.currentTitle}>
                      {es.bio && (
                        <div className="relative bg-[var(--panel-soft)]/40 rounded-2xl p-6 border border-[var(--border)]/50 shadow-inner hover:border-[var(--accent)]/30 transition-all duration-300">
                          <p className={`text-base leading-relaxed text-[var(--text)] whitespace-pre-wrap font-medium ${!aboutExpanded && es.bio.length > 300 ? 'line-clamp-4' : ''}`}>
                            {es.bio}
                          </p>
                          {es.bio.length > 300 && (
                            <button onClick={() => setAboutExpanded(!aboutExpanded)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--accent-strong)] hover:text-[var(--accent)] transition-colors">
                              {aboutExpanded ? 'Show less' : '...see more'}
                              <svg className={`w-4 h-4 transition-transform duration-300 ${aboutExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          )}
                        </div>
                      )}
                      {(es.currentTitle || es.currentCompany || es.industry || es.yearsExperience || es.currentStatus) && (
                        <div className="mt-6 flex flex-wrap gap-3">
                          {es.currentTitle && <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/60 px-4 py-2 text-sm font-bold text-[var(--text)] backdrop-blur-md shadow-sm hover:border-[var(--accent)]/50 transition-colors">💼 {es.currentTitle}{es.currentCompany ? ` at ${es.currentCompany}` : ''}</span>}
                          {es.industry && <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/60 px-4 py-2 text-sm font-bold text-[var(--text)] backdrop-blur-md shadow-sm hover:border-[var(--accent)]/50 transition-colors">🏢 {es.industry}</span>}
                          {es.yearsExperience && <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-gradient-to-r from-[var(--accent-soft)] to-[var(--panel-soft)] px-4 py-2 text-sm font-black text-[var(--accent-strong)] shadow-sm hover:shadow-md transition-all">⚡ {es.yearsExperience} years exp</span>}
                          {es.currentStatus && <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/60 px-4 py-2 text-sm font-bold text-[var(--text)] backdrop-blur-md shadow-sm hover:border-[var(--accent)]/50 transition-colors">📋 {formatLabel(es.currentStatus)}</span>}
                        </div>
                      )}
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                {/* ════ EXPERIENCE ════ */}
                <AnimatedSection delay={140}>
                  {isSectionLocked('experience') ? (
                    <SectionCard id="experience" title="Experience" accentColor="#0ea5e9" locked lockedMessage="Connect to see experience" />
                  ) : isSectionVisible('experience') ? (
                    <SectionCard id="experience" title="Experience" accentColor="#0ea5e9" isEmpty={!es.experiences?.length} emptyMessage="No experience listed yet.">
                      <div className="relative ml-4 border-l-2 border-[var(--border)] pl-8 space-y-12 py-4">
                        {(es.experiences || []).map((exp, idx) => (
                          <div key={idx} className="relative group">
                            <div className="absolute w-5 h-5 rounded-full bg-[#0ea5e9] -left-[43px] top-1 ring-[6px] ring-[var(--panel)] transition-all duration-300 group-hover:scale-125 group-hover:bg-[#38bdf8] shadow-md" />
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div>
                                <h3 className="text-lg sm:text-xl font-black text-[var(--text)] leading-tight">{exp.title || 'Role'}</h3>
                                <p className="text-sm sm:text-base font-bold text-[#0ea5e9] mt-1">{exp.company || 'Company'}</p>
                              </div>
                              <div className="text-xs text-[var(--muted-strong)] font-bold shrink-0 sm:text-right bg-[var(--panel-soft)]/50 px-3 py-2 rounded-xl mb-2 sm:mb-0 w-max border border-[var(--border)]/50 shadow-sm backdrop-blur-sm">
                                <p className="text-[var(--text)]">{[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' - ') || 'Date not specified'}</p>
                                {exp.location && <p className="mt-1 opacity-80">{exp.location}</p>}
                              </div>
                            </div>
                            {exp.description && <p className="mt-4 text-sm text-[var(--text)] opacity-90 leading-relaxed whitespace-pre-wrap bg-[var(--panel-soft)]/30 p-4 rounded-2xl border border-[var(--border)]/50">{exp.description}</p>}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                {/* ════ EDUCATION ════ */}
                <AnimatedSection delay={200}>
                  {isSectionLocked('education') ? (
                    <SectionCard id="education" title="Education" accentColor="#10b981" locked lockedMessage="Connect to see education" />
                  ) : isSectionVisible('education') ? (
                    <SectionCard id="education" title="Education" accentColor="#10b981" isEmpty={!es.educationEntries?.length} emptyMessage="No education listed yet.">
                      <div className="relative ml-4 border-l-2 border-[var(--border)] pl-8 space-y-12 py-4">
                        {(es.educationEntries || []).map((edu, idx) => (
                          <div key={idx} className="relative group">
                            <div className="absolute w-5 h-5 rounded-full bg-[#10b981] -left-[43px] top-1 ring-[6px] ring-[var(--panel)] transition-all duration-300 group-hover:scale-125 group-hover:bg-[#34d399] shadow-md" />
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div>
                                <h3 className="text-lg sm:text-xl font-black text-[var(--text)] leading-tight">{edu.degree || 'Degree'}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</h3>
                                <p className="text-sm sm:text-base font-bold text-[#10b981] mt-1">{edu.school || 'School'}</p>
                              </div>
                              <div className="text-xs text-[var(--muted-strong)] font-bold shrink-0 sm:text-right bg-[var(--panel-soft)]/50 px-3 py-2 rounded-xl mb-2 sm:mb-0 w-max border border-[var(--border)]/50 shadow-sm backdrop-blur-sm">
                                <p className="text-[var(--text)]">{[edu.startDate, edu.isCurrent ? 'Present' : edu.endDate].filter(Boolean).join(' - ') || 'Date not specified'}</p>
                              </div>
                            </div>
                            {edu.description && <p className="mt-4 text-sm text-[var(--text)] opacity-90 leading-relaxed whitespace-pre-wrap bg-[var(--panel-soft)]/30 p-4 rounded-2xl border border-[var(--border)]/50">{edu.description}</p>}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                {/* ════ LICENSES ════ */}
                <AnimatedSection delay={260}>
                  {isSectionLocked('licenses') ? (
                    <SectionCard id="licenses" title="Licenses & Certifications" accentColor="#eab308" locked lockedMessage="Connect to see certifications" />
                  ) : isSectionVisible('licenses') ? (
                    <SectionCard id="licenses" title="Licenses & Certifications" accentColor="#eab308" isEmpty={!es.licenses?.length} emptyMessage="No licenses or certifications listed yet.">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(es.licenses || []).map((cert, idx) => (
                          <div key={idx} className="flex gap-4 items-start p-5 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/40 hover:border-[#f59e0b]/50 hover:bg-[#f59e0b]/5 hover:shadow-lg transition-all duration-300 group">
                             <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 text-[#f59e0b] border border-[#f59e0b]/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                             </div>
                             <div>
                                <h3 className="text-sm font-black text-[var(--text)] leading-tight group-hover:text-[#f59e0b] transition-colors">{cert.name || 'Certification'}</h3>
                                <p className="text-xs font-bold text-[var(--muted-strong)] mt-1">{cert.issuer || 'Issuer'}</p>
                                {(cert.issueDate || cert.credentialId) && (
                                   <div className="mt-2.5 text-[10px] font-bold text-[var(--muted)] flex flex-wrap gap-2 uppercase tracking-wider">
                                      {cert.issueDate && <span className="bg-[var(--panel)] px-2 py-0.5 rounded-md border border-[var(--border)] shadow-sm">Issued {cert.issueDate}</span>}
                                      {cert.credentialId && <span className="bg-[var(--panel)] px-2 py-0.5 rounded-md border border-[var(--border)] shadow-sm">ID: {cert.credentialId}</span>}
                                   </div>
                                )}
                             </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                {/* ════ HONORS & AWARDS ════ */}
                <AnimatedSection delay={320}>
                  {isSectionLocked('honorsAwards') ? (
                    <SectionCard id="honors" title="Honors & Awards" accentColor="#f59e0b" locked lockedMessage="Connect to see honors" />
                  ) : isSectionVisible('honorsAwards') ? (
                    <SectionCard id="honors" title="Honors & Awards" accentColor="#f59e0b" isEmpty={!es.honorsAwards?.length} emptyMessage="No honors or awards listed yet.">
                      <div className="space-y-4">
                        {(es.honorsAwards || []).map((award, idx) => (
                          <div key={idx} className="flex gap-4 items-start p-4 rounded-xl bg-[var(--panel-soft)]/40 hover:bg-[var(--panel-soft)] transition-colors border border-transparent hover:border-[var(--border)] backdrop-blur-sm group">
                            <div className="shrink-0 mt-0.5 p-2 rounded-xl bg-amber-500/10 text-amber-600 shadow-inner">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-black text-[var(--text)] group-hover:text-amber-500 transition-colors">{award.title || 'Award'}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {award.issuer && <span className="text-xs font-bold text-[var(--accent-strong)]">{award.issuer}</span>}
                                {award.issuer && award.date && <span className="text-[var(--border)]">•</span>}
                                {award.date && <span className="text-xs font-semibold text-[var(--muted)]">{award.date}</span>}
                              </div>
                              {award.description && <p className="text-sm text-[var(--text)] opacity-85 mt-2 leading-relaxed">{award.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                {/* ════ FEATURED ════ */}
                <AnimatedSection delay={335}>
                  {isSectionLocked('topProjects') ? (
                    <SectionCard id="top-projects" title="Top Projects" accentColor="#14b8a6" locked lockedMessage="Connect to see top projects" />
                  ) : isSectionVisible('topProjects') && topProjects.length > 0 ? (
                    <SectionCard id="top-projects" title="Top Projects" accentColor="#14b8a6">
                      <div className="space-y-3">
                        {topProjects.map((project, idx) => (
                          <TopProjectCard key={`${project.title || 'project'}-${idx}`} project={project} onReadMore={setSelectedTopProject} />
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                <AnimatedSection delay={340}>
                  {isSectionLocked('featured') ? (
                    <SectionCard id="featured" title="Featured" accentColor="#f97316" locked lockedMessage={`Connect to see featured`} />
                  ) : isSectionVisible('featured') && (es.projects?.length > 0) ? (
                    <SectionCard id="featured" title="Featured" accentColor="#f97316">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {(es.projects || []).map((item, idx) => (
                          <a key={idx} href={item.link || '#'} target={item.link ? "_blank" : "_self"} rel="noreferrer" className="group flex flex-col p-5 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/40 hover:border-[#f97316]/50 hover:bg-[#f97316]/5 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                            <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#f97316]/10 rounded-full blur-2xl group-hover:bg-[#f97316]/20 transition-all duration-500" />
                            <div className="flex justify-between items-start mb-4 relative z-10">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316]/20 to-[#f97316]/5 text-[#f97316] border border-[#f97316]/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                              </div>
                              {item.link && <svg className="w-5 h-5 text-[var(--muted)] group-hover:text-[#f97316] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>}
                            </div>
                            <div className="flex items-center gap-2 mb-3 relative z-10">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#f97316] bg-[#f97316]/10 px-2.5 py-1 rounded-lg border border-[#f97316]/20">{item.type || 'project'}</span>
                            </div>
                            <h3 className="font-black text-base text-[var(--text)] group-hover:text-[#f97316] transition-colors leading-tight relative z-10">{item.title || 'Untitled'}</h3>
                            {item.description && <p className="mt-2 text-sm font-medium text-[var(--muted-strong)] line-clamp-3 leading-relaxed relative z-10">{item.description}</p>}
                          </a>
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                {/* ════ SKILLS ════ */}
                <AnimatedSection delay={420}>
                  {isSectionLocked('skills') ? (
                    <SectionCard id="skills" title="Skills" accentColor="#ec4899" locked lockedMessage="Connect to see skills" />
                  ) : isSectionVisible('skills') ? (
                    <SectionCard id="skills" title="Skills" accentColor="#ec4899" isEmpty={!es.topSkills?.length && !profile.skills?.length} emptyMessage="No skills listed yet.">
                      
                      {/* Top Skills with precise lines */}
                      {(es.topSkills?.length > 0) && (
                        <div className="space-y-4 mb-6">
                          {es.topSkills.map((skill, idx) => {
                            const level = Math.max(55, 100 - (idx * 15));
                            return (
                              <div key={skill} className="group/skill">
                                <div className="flex justify-between items-baseline mb-1">
                                  <span className="text-sm font-bold text-[var(--text)] group-hover/skill:text-[#ec4899] transition-colors">{skill}</span>
                                </div>
                                <div className="h-1 w-full bg-[var(--border)] rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-[#fbcfe8] to-[#ec4899] rounded-full transition-all duration-1000 ease-out" style={{ width: `${level}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* All skills as pills */}
                      {profile.skills?.length > 0 && (
                        <div>
                          {es.topSkills?.length > 0 && <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-strong)] mb-2.5">Other Skills</p>}
                          <div className="flex flex-wrap gap-1.5">
                            {profile.skills.map((skill) => (
                              <span key={skill} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)]/50 px-2.5 py-1 text-xs font-semibold text-[var(--text)] hover:border-[#ec4899]/50 hover:text-[#ec4899] transition-all cursor-default backdrop-blur-sm">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tools & Languages */}
                      {(es.tools?.length > 0 || es.languages?.length > 0) && (
                        <div className="mt-6 pt-5 border-t border-[var(--border)] space-y-4">
                          {es.tools?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-strong)] mb-2">Tools & Tech Stack</p>
                              <div className="flex flex-wrap gap-1.5">
                                {es.tools.map((t) => <span key={t} className="rounded border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-400">{t}</span>)}
                              </div>
                            </div>
                          )}
                          {es.languages?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-strong)] mb-2">Languages</p>
                              <div className="flex flex-wrap gap-1.5">
                                {es.languages.map((l) => <span key={l} className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{l}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                {/* ════ ACTIVITY ════ */}
                <AnimatedSection delay={460}>
                  {isSectionLocked('activity') ? (
                    <SectionCard id="activity" title="Activity" accentColor="#8b5cf6" locked lockedMessage="Connect to see activity" />
                  ) : isSectionVisible('activity') ? (
                    <SectionCard id="activity" title="Activity" accentColor="#8b5cf6" isEmpty={!posts.length} emptyMessage="No recent activity.">
                      <div className="space-y-3">
                        {posts.map((post) => (
                          <ProfileActivityPost
                            key={post.id}
                            post={post}
                            currentUserId={auth.user?.id}
                            onPostChanged={(next) => setPosts((current) => current.map((item) => item.id === next.id ? next : item))}
                            onDeleted={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
                            onEdit={viewingOwnProfile ? setEditingPost : undefined}
                          />
                        ))}
                        {posts.length >= 5 && <Link to="/home" className="block text-center text-xs font-black uppercase tracking-widest text-[#8b5cf6] hover:text-[var(--text)] transition-colors mt-4 py-2 border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 rounded-xl">View all activity</Link>}
                      </div>
                    </SectionCard>
                  ) : null}
                </AnimatedSection>
                
            </div>

            {/* ═ RIGHT COLUMN (SIDEBAR) ═ */}
            <div className="lg:col-span-4 flex flex-col gap-6">

                <AnimatedSection delay={320}>
                  {isSectionLocked('dashboard') ? (
                    <SectionCard
                      id="dashboard"
                      title="Career Dashboard"
                      accentColor="#0f766e"
                      locked
                      lockedMessage="Connect to see career dashboard insights"
                    />
                  ) : isSectionVisible('dashboard') ? (
                    <SectionCard
                      id="dashboard"
                      title="Career Dashboard"
                      accentColor="#0f766e"
                      isEmpty={
                        !es.profileStrengthNotes &&
                        !profile.latest_analysis?.confidence_score &&
                        !profile.latest_analysis?.target_role &&
                        !(es.preferredWorkModes || []).length
                      }
                      emptyMessage="No dashboard insights have been shared yet."
                    >
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent-soft)]/50 to-[var(--panel)]/50 p-5 backdrop-blur-sm shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent)]/10 rounded-full blur-2xl group-hover:bg-[var(--accent)]/20 transition-all duration-500" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)] relative z-10">Discovery Strength</p>
                          <p className="mt-3 text-sm font-semibold leading-relaxed text-[var(--text)] relative z-10">
                            {es.profileStrengthNotes || 'Profile strength insights are not available yet.'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/40 p-5 backdrop-blur-sm shadow-sm">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Match Score</p>
                              <p className="mt-2 text-4xl font-black tracking-tight text-[var(--text)]">
                                {profile.latest_analysis?.confidence_score ? `${profile.latest_analysis.confidence_score}%` : 'Pending'}
                              </p>
                            </div>
                            <span className="rounded-full border border-[var(--border)] bg-[var(--panel)]/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)] shadow-inner">
                              Latest Analysis
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 border-t border-[var(--border)] pt-4">
                          <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="font-medium text-[var(--muted-strong)]">Target Role</span>
                            <span className="max-w-[160px] text-right font-bold text-[var(--text)]">
                              {profile.latest_analysis?.target_role || es.targetRole || 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="font-medium text-[var(--muted-strong)]">Work Modes</span>
                            <span className="max-w-[160px] text-right font-bold text-[var(--text)]">
                              {(es.preferredWorkModes || []).length ? es.preferredWorkModes.join(', ') : 'Any'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                {/* ════ DIGITAL FOOTPRINT ════ */}
                <AnimatedSection delay={330}>
                  {isSectionLocked('digitalFootprint') ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/40 backdrop-blur-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center opacity-70">
                      <svg className="w-8 h-8 opacity-40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                      <h3 className="text-sm font-bold opacity-80">Connect to see digital footprint</h3>
                    </div>
                  ) : isSectionVisible('digitalFootprint') ? (
                    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/40 backdrop-blur-2xl p-6 shadow-xl relative overflow-hidden group/df">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/5 to-transparent opacity-0 group-hover/df:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted-strong)] mb-5 relative z-10 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                        Digital Footprint
                      </h3>
                      <div className="space-y-3 relative z-10">
                        {publicLinks.length ? (
                          publicLinks.map((link, idx) => {
                            let domain = link.name;
                            return (
                              <a
                                key={idx}
                                href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex flex-col gap-1 p-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/40 hover:border-[#3b82f6]/40 hover:bg-[#3b82f6]/5 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
                              >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3b82f6]/20 group-hover:bg-[#3b82f6] transition-colors" />
                                <div className="flex items-center gap-2 text-[var(--text)] group-hover:text-[#3b82f6] transition-colors">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                  <span className="font-bold text-sm">{domain}</span>
                                </div>
                                <span className="text-xs font-medium text-[var(--muted-strong)] truncate ml-6 opacity-80 group-hover:opacity-100 transition-opacity">{link.url}</span>
                              </a>
                            );
                          })
                        ) : (
                           <div className="p-6 rounded-2xl border border-dashed border-[var(--border)] text-center text-sm text-[var(--muted-strong)] bg-[var(--panel-soft)]/30 backdrop-blur-sm">
                             <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center shadow-inner text-[var(--muted)]">
                               <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /></svg>
                             </div>
                             <p className="font-semibold">Connect your portfolio, GitHub, or LinkedIn to increase visibility.</p>
                           </div>
                        )}
                      </div>
                    </article>
                  ) : null}
                </AnimatedSection>

                <AnimatedSection delay={335}>
                  {isSectionLocked('resiliencePortfolio') ? (
                    <SectionCard
                      id="resilience-portfolio"
                      title="Proof of Resilience"
                      accentColor="#10b981"
                      locked
                      lockedMessage="Connect to see proof of resilience"
                    />
                  ) : isSectionVisible('resiliencePortfolio') ? (
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
                        const resilienceLink = `/u/${username}/resilience`;

                        return (
                          <div className="space-y-5">
                            <Link to={resilienceLink} state={{ activeTab: 'applications' }} className="group block rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--panel-soft)]">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
                                  Daily Streak - {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
                              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 backdrop-blur-sm shadow-sm transition-all hover:border-[var(--muted-strong)]/50 hover:bg-[var(--panel-soft)]">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Total Applications</p>
                                <p className="mt-2 text-2xl font-black text-[var(--text)]">{resiliencePortfolio.stats?.totalApplications || 0}</p>
                              </div>
                              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 backdrop-blur-sm shadow-sm transition-all hover:border-[var(--muted-strong)]/50 hover:bg-[var(--panel-soft)]">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Total Rejections</p>
                                <p className="mt-2 text-2xl font-black text-[var(--text)]">{resiliencePortfolio.stats?.totalRejections || 0}</p>
                              </div>
                              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 backdrop-blur-sm shadow-sm transition-all hover:border-[var(--muted-strong)]/50 hover:bg-[var(--panel-soft)]">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">7-Day Daily Average</p>
                                <p className="mt-2 text-2xl font-black text-[var(--text)]">{resiliencePortfolio.stats?.currentDailyAverage || 0}</p>
                              </div>
                              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 backdrop-blur-sm shadow-sm transition-all hover:border-[var(--muted-strong)]/50 hover:bg-[var(--panel-soft)]">
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
                                emptyLabel="No public application history yet."
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
                                renderMeta={(item) => `${item.stageLabel} · ${item.dateLabel}`}
                                emptyLabel="No public rejection journey yet."
                                baseLink={resilienceLink}
                                activeTab="rejections"
                              />
                            </div>
                          </div>
                        );
                      })() : null}
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

                {/* ════ CURRENTLY WORKING TOWARDS ════ */}
                {profile.latest_analysis && (
                  <AnimatedSection delay={380}>
                    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] dark:border-white/5 bg-[var(--panel)]/70 backdrop-blur-xl p-6 shadow-sm hover:shadow-md hover:border-[var(--accent)]/50 transition-all duration-300 group">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-6 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent-soft)]" />
                        <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">Currently Working Towards</h2>
                      </div>
                      <div className="bg-[var(--panel-soft)]/50 rounded-xl p-4 border border-[var(--border)] group-hover:border-[var(--accent)]/30 transition-colors">
                        <p className="font-black text-[var(--text)] text-sm mb-1">{profile.latest_analysis.target_role || 'Role Analysis'}</p>
                        <div className="flex justify-between items-end mb-1 mt-3">
                           <span className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wider">Readiness</span>
                           <span className="text-sm font-black text-[var(--accent-strong)]">{readiness}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--border)] shadow-inner">
                          <div className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(readiness, 100))}%` }} />
                        </div>
                        {profile.latest_analysis.top_skill_gaps?.length ? (
                           <div className="mt-4 pt-3 border-t border-[var(--border)]/60">
                              <p className="text-[10px] font-bold uppercase text-[var(--muted-strong)] mb-2">Focus Areas</p>
                              <div className="flex flex-wrap gap-1.5">
                                 {profile.latest_analysis.top_skill_gaps.map(gap => (
                                    <span key={gap} className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--warning-soft)] text-[var(--warning-text)] border border-[var(--warning-border)]">{gap}</span>
                                 ))}
                              </div>
                           </div>
                        ) : null}
                      </div>
                    </section>
                  </AnimatedSection>
                )}

                {/* ════ CONNECTIONS ════ */}
                <AnimatedSection delay={500}>
                  <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] dark:border-white/5 bg-[var(--panel)]/70 backdrop-blur-xl p-6 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-6 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                      <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">Connections</h2>
                    </div>
                    <p className="text-xs font-bold text-[var(--muted-strong)] mb-4">{profile.connection_count || 0} connections in network</p>
                    
                    <div className={`grid grid-cols-2 gap-2 ${canSeeConnections ? '' : 'blur-md pointer-events-none'}`}>
                      {(profile.connections_preview || []).slice(0,4).map((connection) => (
                        <Link key={connection.username} to={`/u/${connection.username}`} className="flex flex-col items-center text-center rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-3 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group">
                          <div className="w-10 h-10 rounded-full bg-[var(--border)] mb-2 flex items-center justify-center text-xs font-black text-[var(--text)] shadow-sm">
                            {initials(connection.name || connection.username)}
                          </div>
                          <p className="font-bold text-xs text-[var(--text)] group-hover:text-indigo-600 transition-colors w-full truncate">{connection.name || connection.username}</p>
                          <p className="text-[10px] font-medium text-[var(--muted-strong)] w-full truncate mt-0.5">{connection.headline || 'Career builder'}</p>
                        </Link>
                      ))}
                    </div>
                    
                    {!canSeeConnections && (
                      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-md p-4 text-center shadow-2xl z-10">
                         <svg className="w-6 h-6 mx-auto mb-2 text-[var(--text)] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        <p className="font-bold text-sm text-[var(--text)]">Connect to see {profile.name || profile.username}'s network</p>
                      </div>
                    )}
                  </section>
                </AnimatedSection>
                
            </div>
        </div>

      </div>

      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} onCreated={(post) => setPosts((current) => [post, ...current].slice(0, 5))} />
      <PostComposer
        open={Boolean(editingPost)}
        initialPost={editingPost}
        onClose={() => setEditingPost(null)}
        onUpdated={(post) => {
          setPosts((current) => current.map((item) => item.id === post.id ? post : item));
          setToast('Post updated.');
        }}
      />
      
      {connectOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleConnect} className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)]" />
            <h2 className="text-2xl font-black text-[var(--text)] tracking-tight">Connect with {profile.name || profile.username}</h2>
            <p className="text-sm font-medium text-[var(--muted-strong)] mt-2">Connecting allows you to see their full profile and build your network.</p>
            <textarea className="app-input mt-5 min-h-[120px] w-full resize-none" maxLength={150} value={connectNote} onChange={(event) => setConnectNote(event.target.value)} placeholder="Add a short personal note (optional)" />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="app-button-secondary bg-[var(--panel-soft)]" onClick={() => setConnectOpen(false)}>Cancel</button>
              <button type="submit" className="app-button shadow-lg shadow-[var(--accent)]/30">Send request</button>
            </div>
          </form>
        </div>
      ) : null}



      {/* ════ MODAL: BANNER SETTINGS ════ */}
      {bannerSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in">
           <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-2xl font-black text-[var(--text)] mb-6 text-center tracking-tight">Banner Settings</h2>
              
              <div className="space-y-6">
                 <div>
                     <label className="block text-xs font-bold text-[var(--muted-strong)] uppercase tracking-wider mb-2">Upload Custom Banner</label>
                     <input type="file" onChange={handleCloudinaryMockUpload} className="block w-full text-sm text-[var(--text)] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-[var(--accent)] file:text-white cursor-pointer bg-[var(--panel-soft)] rounded-2xl border border-[var(--border)] p-2" />
                     <p className="text-[10px] font-semibold text-[var(--muted-strong)] mt-2 leading-tight">Images will be stored via Cloudinary backend integrations.</p>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-[var(--muted-strong)] uppercase tracking-wider mb-3">Display Mode</label>
                    <div className="space-y-2">
                       <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] cursor-pointer hover:border-[var(--accent)]/50 transition-colors">
                          <input type="radio" name="bannerPref" value="badge" checked={bannerPrefTemp === 'badge'} onChange={() => setBannerPrefTemp('badge')} className="w-5 h-5 text-[var(--accent)] accent-[var(--accent)]" />
                          <span className="text-sm font-bold text-[var(--text)]">XP Badge Main (Click to Flip)</span>
                       </label>
                       <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] cursor-pointer hover:border-[var(--accent)]/50 transition-colors">
                          <input type="radio" name="bannerPref" value="banner" checked={bannerPrefTemp === 'banner'} onChange={() => setBannerPrefTemp('banner')} className="w-5 h-5 text-[var(--accent)] accent-[var(--accent)]" />
                          <span className="text-sm font-bold text-[var(--text)]">Banner Photo Main (Click to Flip)</span>
                       </label>
                       <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] cursor-pointer hover:border-[var(--accent)]/50 transition-colors">
                          <input type="radio" name="bannerPref" value="slider" checked={bannerPrefTemp === 'slider'} onChange={() => setBannerPrefTemp('slider')} className="w-5 h-5 text-[var(--accent)] accent-[var(--accent)]" />
                          <span className="text-sm font-bold text-[var(--text)]">Automatic Slider</span>
                       </label>
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
                    <button onClick={() => setBannerSettingsOpen(false)} className="app-button-secondary bg-[var(--panel-soft)] px-5">Close</button>
                    <button onClick={handleBannerPrefsSave} className="app-button shadow-lg shadow-[var(--accent)]/30 px-6">Save Layout</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ════ MODAL: XP BADGE POPUP ════ */}
      {badgePopupOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md cursor-pointer animate-fade-in" onClick={() => setBadgePopupOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-2xl relative cursor-default" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setBadgePopupOpen(false)} className="text-[var(--muted-strong)] hover:text-[var(--text)] transition-colors bg-[var(--panel-soft)] rounded-full p-1"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <h2 className="text-2xl font-black text-[var(--text)] text-center mb-1 tracking-tight">Developer Badge</h2>
              <p className="text-xs font-bold text-[var(--accent-strong)] text-center mb-6 uppercase tracking-widest">{profile?.name || username}</p>
              
              <div className="flex justify-center mb-8 relative">
                 <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)] to-[#ec4899] blur-3xl opacity-20 rounded-full" />
                 <img src={`${process.env.NEXT_PUBLIC_API_BASE_URL === '/' ? '' : (process.env.NEXT_PUBLIC_API_BASE_URL || '')}/api/badge/${username}.svg`} alt="Badge" className="h-44 object-contain drop-shadow-2xl relative z-10" />
              </div>
              
              <div className="space-y-4 bg-[var(--panel-soft)]/50 p-5 rounded-2xl border border-[var(--border)] backdrop-blur-sm shadow-inner">
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[var(--muted-strong)] flex items-center gap-1.5"><svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> Current XP</span>
                    <span className="text-base font-black text-[var(--text)]">{profile?.resilience_xp || 0} XP</span>
                 </div>
                 <div className="flex justify-between items-center border-t border-[var(--border)] pt-3">
                    <span className="text-sm font-bold text-[var(--muted-strong)] flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg> Network Rank</span>
                    <span className="text-sm font-black text-[var(--text)]">{profile?.follower_count > 10 ? 'Influencer' : 'Rising Star'}</span>
                 </div>
                 <div className="flex justify-between items-center border-t border-[var(--border)] pt-3">
                    <span className="text-sm font-bold text-[var(--muted-strong)] flex items-center gap-1.5"><svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg> Active Following</span>
                    <span className="text-sm font-black text-[var(--accent-strong)]">{profile?.follower_count || 0}</span>
                 </div>
              </div>
          </div>
        </div>
      )}
      
      {/* ════ MODAL: STICKER GALLERY ════ */}
      {stickerGalleryOpen && (
        <StickerInventoryModal 
          isOpen={stickerGalleryOpen} 
          onClose={() => setStickerGalleryOpen(false)} 
          unlockedStickers={profile?.enriched_settings?.unlockedStickers || []} 
          squadRewardHistory={profile?.enriched_settings?.squadRewardHistory || []}
          userName={profile?.name || username}
        />
      )}

      <div className="resume-print-only bg-white">
         <ResumeTemplate profile={{
            ...profile,
            enriched_settings: {
               ...(profile?.enriched_settings || {}),
               experiences: isSectionVisible('experience') ? profile?.enriched_settings?.experiences : [],
               educationEntries: isSectionVisible('education') ? profile?.enriched_settings?.educationEntries : [],
               licenses: isSectionVisible('licenses') ? profile?.enriched_settings?.licenses : [],
               honorsAwards: isSectionVisible('honorsAwards') ? profile?.enriched_settings?.honorsAwards : [],
               topSkills: isSectionVisible('skills') ? profile?.enriched_settings?.topSkills : [],
               tools: isSectionVisible('skills') ? profile?.enriched_settings?.tools : [],
               languages: isSectionVisible('skills') ? profile?.enriched_settings?.languages : [],
               topProjects: isSectionVisible('topProjects') ? profile?.enriched_settings?.topProjects : []
            }
         }} />
      </div>
      
      <UserListModal 
        isOpen={listModalState.isOpen}
        onClose={() => setListModalState(s => ({ ...s, isOpen: false }))}
        title={listModalState.title}
        fetchData={listModalState.fetchFn}
        emptyMessage={`No ${listModalState.title?.toLowerCase() || 'users'} found.`}
      />

      <ResumeBuilderModal
        open={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        profile={profile}
        educationEntries={profile?.educationEntries || []}
        readonly={!viewingOwnProfile}
      />
      <TopProjectDetailsModal project={selectedTopProject} onClose={() => setSelectedTopProject(null)} />
    </main>
  );
}
