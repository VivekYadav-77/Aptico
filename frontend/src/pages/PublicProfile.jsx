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

function MiniPost({ post }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase text-[var(--accent-strong)]">{String(post.post_type || 'post').replace('_', ' ')}</p>
        <p className="text-xs text-[var(--muted)]">{new Date(post.created_at).toLocaleDateString()}</p>
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--text)]">{post.content}</p>
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

  if (loading) {
    return <main className="min-h-screen bg-[var(--bg)] px-4 py-10"><div className="mx-auto h-96 max-w-5xl rounded-lg border border-[var(--border)] bg-[var(--panel)]" /></main>;
  }

  if (notFound || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-8 text-center">
          <h1 className="text-3xl font-black text-[var(--text)]">Profile not found</h1>
          <Link to="/" className="app-button mt-5">Go to Aptico</Link>
        </div>
      </main>
    );
  }

  const viewingOwnProfile = auth.isAuthenticated && myProfile?.username === username;
  const canSeeConnections = viewingOwnProfile || connectionStatus === 'connected';
  const readiness = Number(profile.latest_analysis?.confidence_score || 0);

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to="/" className="text-sm font-bold text-[var(--accent-strong)]">Aptico</Link>
        {toast ? <div className="rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] p-3 text-sm font-bold text-[var(--accent-strong)]">{toast}</div> : null}

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
          <div className="h-40 bg-gradient-to-r from-purple-500 via-teal-400 to-[var(--accent)]" />
          <div className="px-6 pb-6">
            <div className="-mt-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full border-4 border-[var(--panel)] object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--panel)] bg-[var(--accent)] text-2xl font-black text-[#003824]">{initials(profile.name)}</div>
                )}
                <div>
                  <h1 className="text-4xl font-black text-[var(--text)]">{profile.name || profile.username}</h1>
                  <p className="mt-2 text-[var(--muted-strong)]">{profile.headline || 'Career builder'}</p>
                  {profile.location ? <p className="mt-2 text-sm text-[var(--muted)]"><span className="material-symbols-outlined text-[16px] align-middle">location_on</span> {profile.location}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {viewingOwnProfile ? (
                  <>
                    <Link to="/settings" className="app-button-secondary">Edit Profile</Link>
                    <button type="button" className="app-button-secondary" onClick={shareProfile}>Share Profile</button>
                    <button type="button" className="app-button" onClick={() => setComposerOpen(true)}>New Post</button>
                  </>
                ) : (
                  <>
                    <button type="button" className={connectionStatus === 'connected' ? 'app-button' : 'app-button-secondary'} disabled={['connected', 'pending_sent'].includes(connectionStatus)} onClick={() => auth.isAuthenticated ? setConnectOpen(true) : navigate('/login')}>
                      {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'pending_sent' ? 'Pending' : connectionStatus === 'pending_received' ? 'Respond' : 'Connect'}
                    </button>
                    <button type="button" onClick={handleFollowClick} className="app-button-secondary">{auth.isAuthenticated && isFollowing ? 'Unfollow' : 'Follow'}</button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="app-chip">{profile.follower_count || 0} Followers</span>
              <span className="app-chip">{profile.following_count || 0} Following</span>
              <span className="app-chip">{profile.connection_count || 0} Connections</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-[var(--text)]">Skills</h2>
            {viewingOwnProfile && (profile.skills?.length || 0) < 5 ? <Link to="/settings" className="text-sm font-bold text-[var(--accent-strong)]">+ Add skills</Link> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.skills?.length ? profile.skills.map((skill) => <span key={skill} className="app-chip">{skill}</span>) : <p className="text-sm text-[var(--muted-strong)]">No skills listed yet.</p>}
          </div>
        </section>

        {profile.latest_analysis ? (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
            <h2 className="text-2xl font-black text-[var(--text)]">Currently Working Towards</h2>
            <p className="mt-4 font-bold text-[var(--text)]">Role: {profile.latest_analysis.target_role || 'Role Analysis'}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--panel-soft)]"><div className="h-full bg-[var(--accent)]" style={{ width: `${Math.max(0, Math.min(readiness, 100))}%` }} /></div>
            <p className="mt-2 text-sm font-bold text-[var(--accent-strong)]">Readiness: {readiness}%</p>
            {profile.latest_analysis.top_skill_gaps?.length ? <p className="mt-3 text-sm text-[var(--muted-strong)]">Working on: {profile.latest_analysis.top_skill_gaps.join(', ')}</p> : null}
          </section>
        ) : null}

        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
          <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-black text-[var(--text)]">Posts</h2>{posts.length >= 5 ? <Link to="/home" className="text-sm font-bold text-[var(--accent-strong)]">See more</Link> : null}</div>
          <div className="mt-4 space-y-3">{posts.length ? posts.map((post) => <MiniPost key={post.id} post={post} />) : <p className="text-sm text-[var(--muted-strong)]">No posts yet.</p>}</div>
        </section>

        <section className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
          <h2 className="text-2xl font-black text-[var(--text)]">Connections</h2>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">{profile.connection_count || 0} connections</p>
          <div className={`mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 ${canSeeConnections ? '' : 'blur-sm'}`}>
            {(profile.connections_preview || []).map((connection) => (
              <Link key={connection.username} to={`/u/${connection.username}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                <p className="font-bold text-[var(--text)]">{connection.name || connection.username}</p>
                <p className="truncate text-xs text-[var(--muted-strong)]">{connection.headline || 'Career builder'}</p>
              </Link>
            ))}
          </div>
          {!canSeeConnections ? <div className="absolute inset-x-6 bottom-6 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-center font-bold text-[var(--text)]">Connect to see {profile.name || profile.username}'s network</div> : null}
        </section>
      </div>

      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} onCreated={(post) => setPosts((current) => [post, ...current].slice(0, 5))} />
      {connectOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
          <form onSubmit={handleConnect} className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
            <h2 className="text-xl font-black text-[var(--text)]">Connect with {profile.name || profile.username}</h2>
            <textarea className="app-input mt-4 min-h-24" maxLength={150} value={connectNote} onChange={(event) => setConnectNote(event.target.value)} placeholder="Add a short note" />
            <div className="mt-4 flex justify-end gap-3"><button type="button" className="app-button-secondary" onClick={() => setConnectOpen(false)}>Cancel</button><button type="submit" className="app-button">Send request</button></div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
