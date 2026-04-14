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
import { selectAuth } from '../store/authSlice.js';

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

/* ── Section Card Wrapper ── */
function SectionCard({ id, title, icon, accentColor = 'var(--accent)', children, emptyMessage, isEmpty, locked, lockedMessage }) {
  if (locked) {
    return (
      <section id={id} className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-6 w-1.5 rounded-full" style={{ background: accentColor }} />
          <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">{title}</h2>
          <svg className="w-4 h-4 text-[var(--muted-strong)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <div className="h-24 flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] text-sm font-semibold text-[var(--muted-strong)]">
          {lockedMessage || 'Connect to view this section'}
        </div>
      </section>
    );
  }

  return (
    <section id={id} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 hover:border-[var(--muted-strong)] transition-colors duration-300">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-6 w-1.5 rounded-full" style={{ background: accentColor }} />
        <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">{title}</h2>
        {icon && <span className="ml-auto text-[var(--muted-strong)]">{icon}</span>}
      </div>
      {isEmpty ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]">
          <p className="text-sm font-medium text-[var(--muted-strong)]">{emptyMessage || 'Nothing to show yet.'}</p>
        </div>
      ) : children}
    </section>
  );
}

/* ── Mini Post Card ── */
function MiniPost({ post }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 transition-all hover:border-[var(--muted-strong)] hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
           <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-[#003824]">
             {String(post.author_name || 'U').charAt(0).toUpperCase()}
           </div>
           <p className="text-xs font-black uppercase text-[var(--accent-strong)]">{String(post.post_type || 'post').replace('_', ' ')}</p>
        </div>
        <p className="text-xs text-[var(--muted)]">{new Date(post.created_at).toLocaleDateString()}</p>
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--text)]">{post.content}</p>
      
      <div className="mt-4 flex items-center gap-4 border-t border-[var(--border)] pt-3">
        <button 
          onClick={() => { setLiked(!liked); setLikesCount(c => liked ? c - 1 : c + 1); }}
          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${liked ? 'text-pink-500' : 'text-[var(--muted-strong)] hover:text-[var(--text)]'}`}
        >
          <svg className={`h-4 w-4 ${liked ? 'fill-current text-pink-500' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={liked ? 1.5 : 2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
        </button>
        <button className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)] transition-colors hover:text-[var(--text)]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);

    getPublicProfile(username)
      .then((result) => {
        if (!mounted) return null;
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
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-10">
        <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
          <div className="h-44 w-full rounded-2xl bg-gradient-to-r from-[var(--border)] to-[var(--panel-soft)]" />
          <div className="-mt-12 px-6 pb-6">
             <div className="flex gap-4 items-end">
                <div className="h-24 w-24 rounded-2xl border-4 border-[var(--panel)] bg-[var(--panel-soft)]" />
                <div className="mb-2 w-full space-y-3">
                   <div className="h-8 w-1/3 rounded bg-[var(--panel-soft)]" />
                   <div className="h-4 w-1/4 rounded bg-[var(--panel-soft)]" />
                </div>
             </div>
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="h-36 w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
               <div className="h-5 w-1/4 rounded bg-[var(--panel-soft)] mb-4" />
               <div className="h-16 w-full rounded-lg bg-[var(--panel-soft)]" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ── Not found ──
  if (notFound || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-10 text-center">
          <h1 className="text-3xl font-black text-[var(--text)]">Profile not found</h1>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">This user may not exist or their profile is private.</p>
          <Link to="/" className="app-button mt-6 inline-block">Go to Aptico</Link>
        </div>
      </main>
    );
  }

  const viewingOwnProfile = auth.isAuthenticated && myProfile?.username === username;
  const canSeeConnections = viewingOwnProfile || connectionStatus === 'connected';
  const readiness = Number(profile.latest_analysis?.confidence_score || 0);
  const es = profile.enriched_settings || {};
  const sectionVis = es.sectionVisibility || {};
  const viewerRel = es.viewerRelationship || 'public';

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
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/" className="text-sm font-bold text-[var(--accent-strong)] hover:underline">← Aptico</Link>
        {toast ? <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-3 text-sm font-bold text-[var(--accent-strong)] animate-fade-in-up">{toast}</div> : null}

        {/* ═════════════ HEADER CARD ═════════════ */}
        <AnimatedSection>
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
            <div className="h-44 bg-gradient-to-br from-purple-600 via-teal-500 to-[var(--accent)] relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15" />
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[var(--panel)] to-transparent opacity-80" />
            </div>
            <div className="px-6 sm:px-8 pb-6 relative -mt-14">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-2xl border-[5px] border-[var(--panel)] object-cover shadow-lg" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-[5px] border-[var(--panel)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-3xl font-black text-white shadow-lg">{initials(profile.name)}</div>
                  )}
                  <div className="pt-2">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text)]">{profile.name || profile.username}</h1>
                    <p className="mt-1 text-lg font-medium text-[var(--accent-strong)]">{profile.headline || 'Career builder'}</p>
                    {profile.location && <p className="mt-2 text-sm text-[var(--muted-strong)] flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{profile.location}</p>}
                    {es.openToWork && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">Open to work</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewingOwnProfile ? (
                    <>
                      <Link to="/settings" className="app-button-secondary">Edit Profile</Link>
                      <button type="button" className="app-button-secondary" onClick={shareProfile}>Share</button>
                      <button type="button" className="app-button" onClick={() => setComposerOpen(true)}>New Post</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={connectionStatus === 'connected' ? 'app-button' : 'app-button-secondary'} disabled={['connected', 'pending_sent'].includes(connectionStatus)} onClick={() => auth.isAuthenticated ? setConnectOpen(true) : navigate('/login')}>
                        {connectionStatus === 'connected' ? '✓ Connected' : connectionStatus === 'pending_sent' ? 'Pending' : connectionStatus === 'pending_received' ? 'Respond' : 'Connect'}
                      </button>
                      <button type="button" onClick={handleFollowClick} className="app-button-secondary">{auth.isAuthenticated && isFollowing ? 'Unfollow' : 'Follow'}</button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1 text-xs font-bold text-[var(--text)]">{profile.follower_count || 0} Followers</span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1 text-xs font-bold text-[var(--text)]">{profile.following_count || 0} Following</span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1 text-xs font-bold text-[var(--text)]">{profile.connection_count || 0} Connections</span>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ═════════════ 1. ABOUT ═════════════ */}
        <AnimatedSection delay={80}>
          {isSectionLocked('about') ? (
            <SectionCard id="about" title="About" accentColor="var(--accent)" locked lockedMessage={`Connect with ${profile.name || profile.username} to see their about section`} />
          ) : isSectionVisible('about') ? (
            <SectionCard id="about" title="About" accentColor="var(--accent)" isEmpty={!es.bio && !es.currentTitle}>
              {es.bio && (
                <div className="relative">
                  <p className={`text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap font-medium ${!aboutExpanded && es.bio.length > 300 ? 'line-clamp-4' : ''}`}>
                    {es.bio}
                  </p>
                  {es.bio.length > 300 && (
                    <button onClick={() => setAboutExpanded(!aboutExpanded)} className="mt-2 text-xs font-bold text-[var(--accent-strong)] hover:underline">
                      {aboutExpanded ? 'Show less' : '...see more'}
                    </button>
                  )}
                </div>
              )}
              {(es.currentTitle || es.currentCompany || es.industry) && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {es.currentTitle && <span className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]">💼 {es.currentTitle}{es.currentCompany ? ` at ${es.currentCompany}` : ''}</span>}
                  {es.industry && <span className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]">🏢 {es.industry}</span>}
                  {es.yearsExperience && <span className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]">⚡ {es.yearsExperience} years experience</span>}
                  {es.currentStatus && <span className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]">📋 {formatLabel(es.currentStatus)}</span>}
                </div>
              )}
            </SectionCard>
          ) : null}
        </AnimatedSection>

        {/* ═════════════ 2. FEATURED ═════════════ */}
        <AnimatedSection delay={140}>
          {isSectionLocked('featured') ? (
            <SectionCard id="featured" title="Featured" accentColor="#f97316" locked lockedMessage={`Connect to see featured content`} />
          ) : isSectionVisible('featured') && (es.featured?.length > 0) ? (
            <SectionCard id="featured" title="Featured" accentColor="#f97316">
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                {es.featured.map((item, idx) => (
                  <a key={idx} href={item.link || '#'} target={item.link ? '_blank' : undefined} rel="noreferrer" className="flex-shrink-0 w-64 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 hover:border-[var(--accent)] hover:shadow-md transition-all snap-start group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--accent-strong)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md">{item.type || 'project'}</span>
                    </div>
                    <h3 className="font-bold text-sm text-[var(--text)] group-hover:text-[var(--accent-strong)] transition-colors line-clamp-1">{item.title || 'Untitled'}</h3>
                    {item.description && <p className="mt-1.5 text-xs text-[var(--muted-strong)] line-clamp-2 leading-relaxed">{item.description}</p>}
                    {item.link && (
                      <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[var(--accent-strong)]">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        View
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </AnimatedSection>

        {/* ═════════════ 3. ACTIVITY (Posts) ═════════════ */}
        <AnimatedSection delay={200}>
          {isSectionLocked('activity') ? (
            <SectionCard id="activity" title="Activity" accentColor="#8b5cf6" locked lockedMessage="Connect to see activity" />
          ) : isSectionVisible('activity') ? (
            <SectionCard id="activity" title="Activity" accentColor="#8b5cf6" isEmpty={!posts.length} emptyMessage="No recent activity.">
              <div className="space-y-3">
                {posts.map((post) => <MiniPost key={post.id} post={post} />)}
                {posts.length >= 5 && <Link to="/home" className="block text-center text-sm font-bold text-[var(--accent-strong)] hover:underline mt-2">See all activity →</Link>}
              </div>
            </SectionCard>
          ) : null}
        </AnimatedSection>

        {/* ═════════════ 4. EXPERIENCE ═════════════ */}
        <AnimatedSection delay={260}>
          {isSectionLocked('experience') ? (
            <SectionCard id="experience" title="Experience" accentColor="#06b6d4" locked lockedMessage="Connect to see experience" />
          ) : isSectionVisible('experience') ? (
            <SectionCard id="experience" title="Experience" accentColor="#06b6d4" isEmpty={!es.experiences?.length} emptyMessage="No experience listed yet.">
              <div className="relative ml-4 border-l-2 border-[var(--border)] pl-6 space-y-6">
                {(es.experiences || []).map((exp, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute w-3 h-3 rounded-full bg-[var(--accent)] -left-[31px] top-1.5 ring-4 ring-[var(--panel)] transition-transform group-hover:scale-125" />
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                      <div>
                        <h3 className="text-base font-bold text-[var(--text)]">{exp.title || 'Role'}</h3>
                        <p className="text-sm font-semibold text-[var(--accent-strong)]">{exp.company || 'Company'}</p>
                      </div>
                      <div className="text-xs text-[var(--muted-strong)] font-medium shrink-0 sm:text-right">
                        <p>{[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' — ') || 'Date not specified'}</p>
                        {exp.location && <p className="mt-0.5">{exp.location}</p>}
                      </div>
                    </div>
                    {exp.description && <p className="mt-2 text-sm text-[var(--text)] opacity-80 leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </AnimatedSection>

        {/* ═════════════ 5. EDUCATION ═════════════ */}
        <AnimatedSection delay={320}>
          {isSectionLocked('education') ? (
            <SectionCard id="education" title="Education" accentColor="#10b981" locked lockedMessage="Connect to see education" />
          ) : isSectionVisible('education') ? (
            <SectionCard id="education" title="Education" accentColor="#10b981" isEmpty={!es.educationEntries?.length} emptyMessage="No education listed yet.">
              <div className="relative ml-4 border-l-2 border-[var(--border)] pl-6 space-y-6">
                {(es.educationEntries || []).map((edu, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute w-3 h-3 rounded-full bg-[#10b981] -left-[31px] top-1.5 ring-4 ring-[var(--panel)] transition-transform group-hover:scale-125" />
                    <div>
                      <h3 className="text-base font-bold text-[var(--text)]">{edu.school || 'Institution'}</h3>
                      <p className="text-sm font-semibold text-[var(--accent-strong)]">{[edu.degree, edu.field].filter(Boolean).join(' in ') || 'Degree not specified'}</p>
                      {(edu.startYear || edu.endYear) && (
                        <p className="mt-1 text-xs font-medium text-[var(--muted-strong)] bg-[var(--panel-soft)] inline-block px-2 py-1 rounded-md">
                          {[edu.startYear, edu.endYear].filter(Boolean).join(' — ')}
                        </p>
                      )}
                      {edu.activities && <p className="mt-2 text-sm text-[var(--text)] opacity-80 italic leading-relaxed">{edu.activities}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </AnimatedSection>

        {/* ═════════════ 6. LICENSES & CERTIFICATIONS ═════════════ */}
        <AnimatedSection delay={380}>
          {isSectionLocked('licenses') ? (
            <SectionCard id="licenses" title="Licenses & Certifications" accentColor="#eab308" locked lockedMessage="Connect to see certifications" />
          ) : isSectionVisible('licenses') ? (
            <SectionCard id="licenses" title="Licenses & Certifications" accentColor="#eab308" isEmpty={!es.licenses?.length} emptyMessage="No licenses or certifications listed yet.">
              <div className="grid gap-3 sm:grid-cols-2">
                {(es.licenses || []).map((lic, idx) => (
                  <div key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 hover:border-[var(--accent)] hover:shadow-sm transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent-strong)] transition-colors">{lic.name || 'Certificate'}</h3>
                        {lic.issuingOrg && <p className="text-xs font-medium text-[var(--muted-strong)] mt-0.5">{lic.issuingOrg}</p>}
                        {lic.issueDate && <p className="text-xs text-[var(--muted)] mt-1">Issued {lic.issueDate}{lic.expiryDate ? ` · Expires ${lic.expiryDate}` : ''}</p>}
                        {lic.credentialId && <p className="text-xs text-[var(--muted)] mt-1">Credential ID: <span className="font-mono font-semibold text-[var(--text)]">{lic.credentialId}</span></p>}
                        {lic.credentialUrl && (
                          <a href={lic.credentialUrl.startsWith('http') ? lic.credentialUrl : `https://${lic.credentialUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-strong)] hover:bg-[var(--accent)]/20 hover:border-[var(--accent)] transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            Show Credential
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </AnimatedSection>

        {/* ═════════════ 7. SKILLS ═════════════ */}
        <AnimatedSection delay={440}>
          {isSectionLocked('skills') ? (
            <SectionCard id="skills" title="Skills" accentColor="#ec4899" locked lockedMessage="Connect to see skills" />
          ) : isSectionVisible('skills') ? (
            <SectionCard id="skills" title="Skills" accentColor="#ec4899" isEmpty={!es.topSkills?.length && !profile.skills?.length} emptyMessage="No skills listed yet.">
              {/* Top Skills with bars */}
              {(es.topSkills?.length > 0) && (
                <div className="space-y-3 mb-5">
                  {es.topSkills.map((skill, idx) => {
                    const level = Math.max(55, 100 - (idx * 10));
                    return (
                      <div key={skill} className="group">
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span className="font-bold text-[var(--text)] group-hover:text-[var(--accent-strong)] transition-colors">{skill}</span>
                          <span className="text-[10px] uppercase font-black text-[var(--muted-strong)] opacity-50">Demonstrated</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--panel-soft)] rounded-full overflow-hidden border border-[var(--border)]">
                          <div className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] rounded-full transition-all duration-1000 ease-out" style={{ width: `${level}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* All skills as chips */}
              {profile.skills?.length > 0 && (
                <div>
                  {es.topSkills?.length > 0 && <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)] mb-3 mt-2">All Skills</p>}
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)] hover:-translate-y-0.5 transition-all cursor-default">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Tools & Languages */}
              {(es.tools?.length > 0 || es.languages?.length > 0) && (
                <div className="mt-5 pt-5 border-t border-[var(--border)] grid gap-4 sm:grid-cols-2">
                  {es.tools?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)] mb-2">Tools & Stack</p>
                      <div className="flex flex-wrap gap-1.5">
                        {es.tools.map((t) => <span key={t} className="rounded-lg bg-[var(--panel-soft)] border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted-strong)]">{t}</span>)}
                      </div>
                    </div>
                  )}
                  {es.languages?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)] mb-2">Languages</p>
                      <div className="flex flex-wrap gap-1.5">
                        {es.languages.map((l) => <span key={l} className="rounded-lg bg-[var(--panel-soft)] border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted-strong)]">{l}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          ) : null}
        </AnimatedSection>

        {/* ═════════════ 8. HONORS & AWARDS ═════════════ */}
        <AnimatedSection delay={500}>
          {isSectionLocked('honorsAwards') ? (
            <SectionCard id="honors" title="Honors & Awards" accentColor="#f59e0b" locked lockedMessage="Connect to see honors & awards" />
          ) : isSectionVisible('honorsAwards') ? (
            <SectionCard id="honors" title="Honors & Awards" accentColor="#f59e0b" isEmpty={!es.honorsAwards?.length} emptyMessage="No honors or awards listed yet.">
              <div className="space-y-3">
                {(es.honorsAwards || []).map((award, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 rounded-xl hover:bg-[var(--panel-soft)] transition-colors border border-transparent hover:border-[var(--border)]">
                    <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-amber-500/10 text-amber-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text)]">{award.title || 'Award'}</h3>
                      {award.issuer && <p className="text-xs font-medium text-[var(--accent-strong)] mt-0.5">{award.issuer}</p>}
                      {award.date && <p className="text-xs text-[var(--muted)] mt-0.5">{award.date}</p>}
                      {award.description && <p className="text-sm text-[var(--text)] opacity-80 mt-1.5 leading-relaxed">{award.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </AnimatedSection>

        {/* ═════════════ CURRENTLY WORKING TOWARDS ═════════════ */}
        {profile.latest_analysis && (
          <AnimatedSection delay={540}>
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-6 w-1.5 rounded-full bg-[var(--accent)]" />
                <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">Currently Working Towards</h2>
              </div>
              <p className="font-bold text-[var(--text)]">Role: {profile.latest_analysis.target_role || 'Role Analysis'}</p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--panel-soft)] border border-[var(--border)]">
                <div className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(readiness, 100))}%` }} />
              </div>
              <p className="mt-2 text-sm font-bold text-[var(--accent-strong)]">Readiness: {readiness}%</p>
              {profile.latest_analysis.top_skill_gaps?.length ? <p className="mt-2 text-sm text-[var(--muted-strong)]">Working on: {profile.latest_analysis.top_skill_gaps.join(', ')}</p> : null}
            </section>
          </AnimatedSection>
        )}

        {/* ═════════════ CONNECTIONS ═════════════ */}
        <AnimatedSection delay={580}>
          <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 w-1.5 rounded-full bg-[#6366f1]" />
              <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">Connections</h2>
            </div>
            <p className="text-sm text-[var(--muted-strong)] mb-4">{profile.connection_count || 0} connections</p>
            <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${canSeeConnections ? '' : 'blur-sm pointer-events-none'}`}>
              {(profile.connections_preview || []).map((connection) => (
                <Link key={connection.username} to={`/u/${connection.username}`} className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 hover:border-[var(--accent)] transition-colors">
                  <p className="font-bold text-sm text-[var(--text)]">{connection.name || connection.username}</p>
                  <p className="truncate text-xs text-[var(--muted-strong)]">{connection.headline || 'Career builder'}</p>
                </Link>
              ))}
            </div>
            {!canSeeConnections && (
              <div className="absolute inset-x-6 bottom-6 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-center font-bold text-sm text-[var(--text)] shadow-lg">
                Connect to see {profile.name || profile.username}'s network
              </div>
            )}
          </section>
        </AnimatedSection>
      </div>

      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} onCreated={(post) => setPosts((current) => [post, ...current].slice(0, 5))} />
      {connectOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <form onSubmit={handleConnect} className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl">
            <h2 className="text-xl font-black text-[var(--text)]">Connect with {profile.name || profile.username}</h2>
            <textarea className="app-input mt-4 min-h-24 w-full" maxLength={150} value={connectNote} onChange={(event) => setConnectNote(event.target.value)} placeholder="Add a short note" />
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" className="app-button-secondary" onClick={() => setConnectOpen(false)}>Cancel</button>
              <button type="submit" className="app-button">Send request</button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
