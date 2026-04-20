import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PostComposer from '../components/PostComposer.jsx';
import {
  followProfile,
  getConnectionStatus,
  getFollowStatus,
  getMyProfile,
  getPublicFeedPosts,
  getPublicProfile,
  sendConnectionRequest,
  unfollowProfile
} from '../api/socialApi.js';
import { saveProfileSettings, fetchProfileSettings } from '../api/profileApi.js';
import { selectAuth } from '../store/authSlice.js';
import ResumeTemplate from '../components/ResumeTemplate.jsx';

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

/* ── Animated Section Wrapper ── */
function AnimatedSection({ children, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 80 + delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div className={`transition-all duration-700 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      {children}
    </div>
  );
}

/* ── Premium Section Card Wrapper ── */
function SectionCard({ id, title, icon, accentColor = 'var(--accent)', children, emptyMessage, isEmpty, locked, lockedMessage, className = '' }) {
  if (locked) {
    return (
      <section id={id} className={`relative overflow-hidden rounded-2xl border border-[var(--border)] dark:border-white/5 bg-[var(--panel)]/70 backdrop-blur-xl p-6 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-6 w-1.5 rounded-full" style={{ background: accentColor, boxShadow: `0 0 12px ${accentColor}80` }} />
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text)] tracking-tight">{title}</h2>
          <svg className="w-5 h-5 text-[var(--muted-strong)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <div className="h-28 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/50 text-sm font-semibold text-[var(--muted-strong)] backdrop-blur-sm">
           <svg className="w-6 h-6 mb-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          {lockedMessage || 'Connect to view this section'}
        </div>
      </section>
    );
  }

  return (
    <section id={id} className={`relative overflow-hidden rounded-2xl border border-[var(--border)] dark:border-white/5 bg-[var(--panel)]/70 backdrop-blur-xl p-6 shadow-sm hover:shadow-md hover:border-[var(--muted-strong)] transition-all duration-300 ${className}`}>
      <div className="flex items-center gap-3 mb-5 relative z-10 w-full">
        <div className="h-6 w-1.5 rounded-full" style={{ background: accentColor, boxShadow: `0 0 12px ${accentColor}80` }} />
        <h2 className="text-lg sm:text-xl font-bold text-[var(--text)] tracking-tight">{title}</h2>
        {icon && <span className="ml-auto text-[var(--muted-strong)]">{icon}</span>}
      </div>
      <div className="relative z-10">
        {isEmpty ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/50">
            <p className="text-sm font-medium text-[var(--muted-strong)]">{emptyMessage || 'Nothing to show yet.'}</p>
          </div>
        ) : children}
      </div>
    </section>
  );
}

/* ── Mini Post Card ── */
function MiniPost({ post }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/60 p-4 transition-all hover:border-[var(--muted-strong)] hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
           <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-[10px] font-black text-white shadow-sm">
             {String(post.author_name || 'U').charAt(0).toUpperCase()}
           </div>
           <p className="text-xs font-black uppercase tracking-wider text-[var(--accent-strong)]">{String(post.post_type || 'post').replace('_', ' ')}</p>
        </div>
        <p className="text-xs font-medium text-[var(--muted)]">{new Date(post.created_at).toLocaleDateString()}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text)]">{post.content}</p>
      
      <div className="mt-4 flex items-center gap-4 border-t border-[var(--border)]/60 pt-3">
        <button 
          onClick={() => { setLiked(!liked); setLikesCount(c => liked ? c - 1 : c + 1); }}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${liked ? 'text-pink-500 scale-105' : 'text-[var(--muted-strong)] hover:text-[var(--text)]'}`}
        >
          <svg className={`h-4 w-4 transition-all ${liked ? 'fill-current text-pink-500' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={liked ? 1.5 : 2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
        </button>
        <button className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)] transition-colors hover:text-[var(--text)]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Comment
        </button>
      </div>
    </article>
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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectNote, setConnectNote] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // Banner & Badge Settings State
  const [activeBannerView, setActiveBannerView] = useState('badge');
  const [bannerSettingsOpen, setBannerSettingsOpen] = useState(false);
  const [badgePopupOpen, setBadgePopupOpen] = useState(false);
  const [bannerPrefTemp, setBannerPrefTemp] = useState('badge');
  
  // Visibility Settings State
  const [visibilitySettingsOpen, setVisibilitySettingsOpen] = useState(false);
  const [visibilityDraft, setVisibilityDraft] = useState({});

  async function handleVisibilitySave() {
    try {
      const fullSettings = await fetchProfileSettings();
      const updatedBackendSettings = { ...fullSettings, sectionVisibility: visibilityDraft };
      await saveProfileSettings(updatedBackendSettings);
      
      const updatedSettings = { ...(profile.enriched_settings || {}), sectionVisibility: visibilityDraft };
      setProfile(p => ({ ...p, enriched_settings: updatedSettings }));
      setVisibilitySettingsOpen(false);
      setToast('Visibility updated successfully.');
    } catch (e) {
      console.error(e);
      setToast('Failed to save visibility settings.');
    }
  }

  function openVisibilitySettings() {
    setVisibilityDraft(profile.enriched_settings?.sectionVisibility || {});
    setVisibilitySettingsOpen(true);
  }
  
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
    getConnectionStatus(username).then(setConnectionStatus).catch(() => null);
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
  const sectionVis = es.sectionVisibility || {};
  const viewerRel = viewingOwnProfile ? 'self' : (es.viewerRelationship || 'public');
  const publicLinks = [
    es.linkedin ? { name: 'LinkedIn', url: es.linkedin, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.732c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z"/></svg> } : null,
    es.github ? { name: 'GitHub', url: es.github, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> } : null,
    es.portfolio ? { name: 'Portfolio', url: es.portfolio, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /></svg> } : null,
    es.website ? { name: 'Website', url: es.website, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> } : null
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
        <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted-strong)] hover:text-[var(--text)] transition-colors bg-[var(--panel)]/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[var(--border)]">
               <svg className="w-4 h-4" autoFocus fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
               Back to Aptico
            </Link>
            {toast ? <div className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-1.5 text-sm font-bold text-[var(--accent-strong)] animate-fade-in-up">{toast}</div> : null}
        </div>

        {/* ═════════════ GRID LAYOUT ═════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ═ LEFT COLUMN (MAIN) ═ */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* ════ HEADER CARD ════ */}
                <AnimatedSection>
                  <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] dark:border-white/5 bg-[var(--panel)] p-0 shadow-lg group">
                    <div className="h-40 sm:h-52 relative overflow-hidden group/banner rounded-t-3xl bg-[var(--panel-soft)]">
                      
                      {/* BANNER FLIP CONTAINER */}
                      <div className="absolute inset-0 z-0 transition-all duration-700 w-full h-full cursor-pointer" onClick={handleBannerClick}>
                         
                         {/* VIEW 1: CUSTOM BANNER PHOTO */}
                         {profile.banner_url && (
                             <div className={`absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out ${activeBannerView === 'banner' ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 pointer-events-none -z-10'}`} style={{ backgroundImage: `url(${profile.banner_url})` }}>
                                 <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[var(--panel)] opacity-80 pointer-events-none" />
                             </div>
                         )}

                         {/* VIEW 2: BADGE (Now completely gradient free and strictly cleanly laid over) */}
                         <div className={`absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-700 ease-in-out ${activeBannerView === 'badge' || !profile.banner_url ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 pointer-events-none -z-10'}`}>
                              {!profile.banner_url && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15 mix-blend-overlay pointer-events-none" />}
                              {!profile.banner_url && <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[var(--panel)] opacity-80 pointer-events-none" />}
                              
                              <img 
                                  src={`${import.meta.env.VITE_API_BASE_URL === '/' ? '' : (import.meta.env.VITE_API_BASE_URL || '')}/api/badge/${username}.svg`} 
                                  alt="Developer Badge XP" 
                                  onClick={(e) => { e.stopPropagation(); setBadgePopupOpen(true); }}
                                  className="h-full max-h-48 w-auto object-contain drop-shadow-2xl hover:-translate-y-1 transition-transform duration-300 cursor-pointer pointer-events-auto filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
                              />
                         </div>
                      </div>

                      {/* BANNER SETTINGS BUTTON */}
                      {viewingOwnProfile && (
                         <div className="absolute top-4 left-4 z-20">
                            <button onClick={() => { setBannerPrefTemp(profile.enriched_settings?.banner_preference || 'badge'); setBannerSettingsOpen(true); }} className="flex items-center gap-2 rounded-xl bg-black/50 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white shadow-lg hover:bg-black/70 hover:scale-105 transition-all outline outline-1 outline-white/20">
                               <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                               Banner Settings
                            </button>
                         </div>
                      )}
                      
                      {/* FLIP INDICATOR FOR VISITORS */}
                      {profile.banner_url && (
                         <div className="absolute top-4 right-4 z-10 pointer-events-none">
                             <div className="bg-black/40 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-60 flex items-center gap-1.5">
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15a3 3 0 100-6 3 3 0 000 6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v4m0 0l-2-2m2 2l2-2" /></svg>
                                 Click to Flip
                             </div>
                         </div>
                      )}
                    </div>
                    
                    <div className="px-6 sm:px-10 pb-8 relative -mt-16 sm:-mt-20">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end relative z-10 w-full">
                          <div className="relative shrink-0 w-max">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="h-28 w-28 sm:h-36 sm:w-36 rounded-3xl border-4 border-[var(--panel)] object-cover shadow-xl bg-[var(--panel)] transition-transform hover:scale-[1.02]" />
                            ) : (
                              <div className="flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-3xl border-4 border-[var(--panel)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-5xl font-black text-white shadow-xl">{initials(profile.name)}</div>
                            )}
                            {es.openToWork && (
                              <div className="absolute -bottom-2 -right-2 flex items-center justify-center rounded-full bg-green-500 border-4 border-[var(--panel)] w-10 h-10 shadow-sm" title="Open to work">
                                <span className="absolute w-full h-full rounded-full bg-green-500 animate-ping opacity-60"></span>
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </div>
                          
                          <div className="pt-2 sm:pb-3 flex-1 min-w-0">
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] truncate">{profile.name || profile.username}</h1>
                            <p className="mt-1 text-base sm:text-lg font-bold text-[var(--accent-strong)] leading-snug">{profile.headline || 'Career builder'}</p>
                            {profile.location && <p className="mt-2 text-sm font-medium text-[var(--muted-strong)] flex items-center gap-1.5"><svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{profile.location}</p>}
                          </div>
                        </div>

                        {/* Action buttons Desktop aligned */}
                        <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0 sm:pb-3 w-full sm:w-auto mt-2 sm:mt-0">
                          <button type="button" onClick={() => window.print()} className="app-button-secondary bg-[var(--panel)]/50 backdrop-blur flex-1 sm:flex-none justify-center gap-1.5" title="Export as PDF">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span className="hidden sm:inline">Resume</span>
                          </button>
                          {viewingOwnProfile ? (
                            <>
                              <button type="button" onClick={openVisibilitySettings} className="app-button-secondary bg-[var(--panel)]/50 backdrop-blur flex-1 sm:flex-none justify-center">Visibility</button>
                              <Link to="/settings" className="app-button-secondary bg-[var(--panel)]/50 backdrop-blur flex-1 sm:flex-none justify-center">Edit</Link>
                              <button type="button" className="app-button-secondary bg-[var(--panel)]/50 backdrop-blur" onClick={shareProfile}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></button>
                              <button type="button" className="app-button shadow-lg shadow-[var(--accent)]/20" onClick={() => setComposerOpen(true)}>Post</button>
                            </>
                          ) : (
                            <>
                              <button type="button" className={`flex-1 sm:flex-none justify-center ${connectionStatus === 'connected' ? 'app-button shadow-lg shadow-[var(--accent)]/20' : 'app-button-secondary bg-[var(--panel)]/50 backdrop-blur'}`} disabled={['connected', 'pending_sent'].includes(connectionStatus)} onClick={() => auth.isAuthenticated ? setConnectOpen(true) : navigate('/login')}>
                                {connectionStatus === 'connected' ? '✓ Connected' : connectionStatus === 'pending_sent' ? 'Pending' : connectionStatus === 'pending_received' ? 'Respond' : 'Connect'}
                              </button>
                              <button type="button" onClick={handleFollowClick} className="app-button-secondary bg-[var(--panel)]/50 backdrop-blur flex-1 sm:flex-none justify-center">{auth.isAuthenticated && isFollowing ? 'Unfollow' : 'Follow'}</button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Stats footer in header */}
                      <div className="mt-8 flex gap-6 sm:gap-8 border-t border-[var(--border)] pt-5">
                        <div className="flex flex-col hover:-translate-y-0.5 transition-transform cursor-default">
                          <span className="text-xl font-black text-[var(--text)]">{profile.follower_count || 0}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">Followers</span>
                        </div>
                        <div className="flex flex-col hover:-translate-y-0.5 transition-transform cursor-default">
                          <span className="text-xl font-black text-[var(--text)]">{profile.following_count || 0}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">Following</span>
                        </div>
                        <div className="flex flex-col hover:-translate-y-0.5 transition-transform cursor-default">
                          <span className="text-xl font-black text-[var(--text)]">{profile.connection_count || 0}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">Connections</span>
                        </div>
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
                        <div className="relative bg-[var(--panel-soft)]/30 rounded-xl p-5 border border-transparent hover:border-[var(--border)] transition-colors">
                          <p className={`text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap font-medium ${!aboutExpanded && es.bio.length > 300 ? 'line-clamp-4' : ''}`}>
                            {es.bio}
                          </p>
                          {es.bio.length > 300 && (
                            <button onClick={() => setAboutExpanded(!aboutExpanded)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--accent-strong)] hover:text-[var(--text)] transition-colors">
                              {aboutExpanded ? 'Show less' : '...see more'}
                            </button>
                          )}
                        </div>
                      )}
                      {(es.currentTitle || es.currentCompany || es.industry || es.yearsExperience || es.currentStatus) && (
                        <div className="mt-5 flex flex-wrap gap-2.5">
                          {es.currentTitle && <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)]/60 px-3 py-1.5 text-xs font-semibold text-[var(--text)] backdrop-blur">💼 {es.currentTitle}{es.currentCompany ? ` at ${es.currentCompany}` : ''}</span>}
                          {es.industry && <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)]/60 px-3 py-1.5 text-xs font-semibold text-[var(--text)] backdrop-blur">🏢 {es.industry}</span>}
                          {es.yearsExperience && <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]">⚡ {es.yearsExperience} years exp</span>}
                          {es.currentStatus && <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)]/60 px-3 py-1.5 text-xs font-semibold text-[var(--text)] backdrop-blur">📋 {formatLabel(es.currentStatus)}</span>}
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
                      <div className="relative ml-2 sm:ml-4 border-l-2 border-[var(--border)] pl-6 sm:pl-8 space-y-8 py-2">
                        {(es.experiences || []).map((exp, idx) => (
                          <div key={idx} className="relative group">
                            <div className="absolute w-4 h-4 rounded-full bg-[#0ea5e9] -left-[33px] sm:-left-[41px] top-1 ring-4 ring-[var(--panel)] transition-all group-hover:scale-125 shadow-sm" />
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div>
                                <h3 className="text-base sm:text-lg font-black text-[var(--text)] leading-tight">{exp.title || 'Role'}</h3>
                                <p className="text-sm font-bold text-[var(--accent-strong)] mt-0.5">{exp.company || 'Company'}</p>
                              </div>
                              <div className="text-xs text-[var(--muted-strong)] font-semibold shrink-0 sm:text-right bg-[var(--panel-soft)]/50 px-2 py-1 rounded-md mb-2 sm:mb-0 w-max">
                                <p>{[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' — ') || 'Date not specified'}</p>
                                {exp.location && <p className="mt-0.5 opacity-80">{exp.location}</p>}
                              </div>
                            </div>
                            {exp.description && <p className="mt-3 text-sm text-[var(--text)] opacity-85 leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
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
                      <div className="relative ml-2 sm:ml-4 border-l-2 border-[var(--border)] pl-6 sm:pl-8 space-y-8 py-2">
                        {(es.educationEntries || []).map((edu, idx) => (
                          <div key={idx} className="relative group">
                            <div className="absolute w-4 h-4 rounded-full bg-[#10b981] -left-[33px] sm:-left-[41px] top-1 ring-4 ring-[var(--panel)] transition-all group-hover:scale-125 shadow-sm" />
                            <div>
                              <h3 className="text-base sm:text-lg font-black text-[var(--text)] leading-tight">{edu.school || 'Institution'}</h3>
                              <p className="text-sm font-bold text-[var(--accent-strong)] mt-0.5">{[edu.degree, edu.field].filter(Boolean).join(' in ') || 'Degree not specified'}</p>
                              {(edu.startYear || edu.endYear) && (
                                <p className="mt-2 text-xs font-semibold text-[var(--muted-strong)] bg-[var(--panel-soft)]/50 inline-block px-2 py-1 rounded-md">
                                  {[edu.startYear, edu.endYear].filter(Boolean).join(' — ')}
                                </p>
                              )}
                              {edu.activities && <p className="mt-3 text-sm text-[var(--text)] opacity-85 italic leading-relaxed border-l-2 border-[var(--border)] pl-3">{edu.activities}</p>}
                            </div>
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
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(es.licenses || []).map((lic, idx) => (
                          <div key={idx} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/40 p-5 hover:border-[#eab308]/50 hover:shadow-md transition-all group relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                               <svg className="w-16 h-16 text-[#eab308]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.5-6.2-4.6-6.2 4.6 2.4-7.5-6.2-4.5h7.6z"/></svg>
                            </div>
                            <div className="relative z-10">
                              <h3 className="text-base font-bold text-[var(--text)] group-hover:text-[#eab308] transition-colors">{lic.name || 'Certificate'}</h3>
                              {lic.issuingOrg && <p className="text-sm font-semibold text-[var(--muted-strong)] mt-1">{lic.issuingOrg}</p>}
                              
                              <div className="mt-3 space-y-1">
                                {lic.issueDate && <p className="text-xs font-medium text-[var(--muted)]">Issued {lic.issueDate}{lic.expiryDate ? ` · Expires ${lic.expiryDate}` : ''}</p>}
                                {lic.credentialId && <p className="text-xs font-medium text-[var(--muted)]">ID: <span className="font-mono text-[var(--text)]">{lic.credentialId}</span></p>}
                              </div>
                              
                              {lic.credentialUrl && (
                                <a href={lic.credentialUrl.startsWith('http') ? lic.credentialUrl : `https://${lic.credentialUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-xs font-bold text-[var(--text)] hover:border-[#eab308]/50 hover:text-[#eab308] transition-all shadow-sm">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                  Show Credential
                                </a>
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
                
            </div>

            {/* ═ RIGHT COLUMN (SIDEBAR) ═ */}
            <div className="lg:col-span-4 flex flex-col gap-6">

                {/* ════ DIGITAL FOOTPRINT ════ */}
                <AnimatedSection delay={330}>
                   {publicLinks.length > 0 && (
                     <SectionCard id="footprint" title="Digital Footprint" accentColor="#14b8a6">
                       <div className="flex flex-col gap-3">
                         {publicLinks.map((link, idx) => (
                           <a key={idx} href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] hover:border-[#14b8a6]/50 hover:bg-[var(--panel-soft)]/50 hover:shadow-sm transition-all group">
                             <div className="text-[var(--muted-strong)] group-hover:text-[#14b8a6] transition-colors">
                               {link.icon}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-bold text-[var(--text)] group-hover:text-[#14b8a6] transition-colors truncate">{link.name}</p>
                               <p className="text-[11px] font-medium text-[var(--muted)] truncate mt-0.5">{link.url.replace(/^https?:\/\/(www\.)?/, '')}</p>
                             </div>
                             <svg className="w-4 h-4 text-[var(--muted)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                           </a>
                         ))}
                       </div>
                     </SectionCard>
                   )}
                </AnimatedSection>

                {/* ════ FEATURED ════ */}
                <AnimatedSection delay={340}>
                  {isSectionLocked('featured') ? (
                    <SectionCard id="featured" title="Featured" accentColor="#f97316" locked lockedMessage={`Connect to see featured`} />
                  ) : isSectionVisible('featured') && (es.featured?.length > 0) ? (
                    <SectionCard id="featured" title="Featured" accentColor="#f97316">
                      <div className="flex flex-col gap-3">
                        {es.featured.map((item, idx) => (
                          <a key={idx} href={item.link || '#'} target={item.link ? '_blank' : undefined} rel="noreferrer" className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 p-4 hover:border-[#f97316]/50 hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                               <svg className="w-24 h-24 text-[#f97316]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>
                            </div>
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#f97316] bg-[#f97316]/10 px-2 py-0.5 rounded-md">{item.type || 'project'}</span>
                            </div>
                            <h3 className="font-bold text-sm text-[var(--text)] group-hover:text-[#f97316] transition-colors leading-tight relative z-10">{item.title || 'Untitled'}</h3>
                            {item.description && <p className="mt-1.5 text-xs font-medium text-[var(--muted-strong)] line-clamp-2 leading-relaxed relative z-10">{item.description}</p>}
                          </a>
                        ))}
                      </div>
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
                        {posts.map((post) => <MiniPost key={post.id} post={post} />)}
                        {posts.length >= 5 && <Link to="/home" className="block text-center text-xs font-black uppercase tracking-widest text-[#8b5cf6] hover:text-[var(--text)] transition-colors mt-4 py-2 border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 rounded-xl">View all activity</Link>}
                      </div>
                    </SectionCard>
                  ) : null}
                </AnimatedSection>

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

      {/* ════ MODAL: VISIBILITY SETTINGS ════ */}
      {visibilitySettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in">
           <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-2xl font-black text-[var(--text)] mb-2 text-center tracking-tight">Visibility Settings</h2>
              <p className="text-sm font-medium text-[var(--muted-strong)] text-center mb-6">Choose who can see different sections of your profile.</p>
              
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                 {['activity', 'skills', 'experience', 'educationEntries', 'licenses', 'honorsAwards'].map(sectionKey => (
                   <div key={sectionKey} className="flex flex-col gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]">
                     <p className="text-sm font-bold text-[var(--text)] capitalize">{sectionKey.replace(/([A-Z])/g, ' $1').trim()}</p>
                     <select 
                       value={visibilityDraft[sectionKey] || 'everyone'}
                       onChange={(e) => setVisibilityDraft({...visibilityDraft, [sectionKey]: e.target.value})}
                       className="app-input text-sm w-full py-2"
                     >
                       <option value="everyone">Everyone</option>
                       <option value="connections">Connections Only</option>
                       <option value="only_me">Only Me</option>
                     </select>
                   </div>
                 ))}
                 
                 <div className="flex flex-col gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] opacity-70">
                   <p className="text-sm font-bold text-[var(--text)]">Core sections</p>
                   <p className="text-xs text-[var(--muted-strong)]">Basic Info, Projects and Bio are always public.</p>
                 </div>
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border)]">
                 <button onClick={() => setVisibilitySettingsOpen(false)} className="app-button-secondary bg-[var(--panel-soft)] px-5">Cancel</button>
                 <button onClick={handleVisibilitySave} className="app-button shadow-lg shadow-[var(--accent)]/30 px-6">Save</button>
              </div>
           </div>
        </div>
      )}

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
                 <img src={`${import.meta.env.VITE_API_BASE_URL === '/' ? '' : (import.meta.env.VITE_API_BASE_URL || '')}/api/badge/${username}.svg`} alt="Badge" className="h-44 object-contain drop-shadow-2xl relative z-10" />
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

      <div className="resume-print-only bg-white">
         <ResumeTemplate profile={{
            ...profile,
            enriched_settings: {
               ...(profile?.enriched_settings || {}),
               experiences: isSectionVisible('experience') ? profile?.enriched_settings?.experiences : [],
               educationEntries: isSectionVisible('educationEntries') ? profile?.enriched_settings?.educationEntries : [],
               licenses: isSectionVisible('licenses') ? profile?.enriched_settings?.licenses : [],
               honorsAwards: isSectionVisible('honorsAwards') ? profile?.enriched_settings?.honorsAwards : [],
               topSkills: isSectionVisible('skills') ? profile?.enriched_settings?.topSkills : [],
               tools: isSectionVisible('skills') ? profile?.enriched_settings?.tools : [],
               languages: isSectionVisible('skills') ? profile?.enriched_settings?.languages : []
            }
         }} />
      </div>
    </main>
  );
}
