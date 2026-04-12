import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppShell from '../components/AppShell.jsx';
import PostComposer from '../components/PostComposer.jsx';
import {
  addPostComment,
  deleteSocialPost,
  getConnections,
  getFeedPosts,
  getMyProfile,
  getPendingConnections,
  getPostComments,
  likePost,
  respondToConnection,
  searchPeople,
  sendConnectionRequest
} from '../api/socialApi.js';
import { selectAuth } from '../store/authSlice.js';

const filters = [
  ['All', null],
  ['Career Updates', 'career_update'],
  ['Job Tips', 'job_tip'],
  ['Job Shares', 'job_share'],
  ['Analysis', 'analysis_share'],
  ['Questions', 'question']
];

const typeLabels = {
  career_update: ['Career Update', 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'],
  job_tip: ['Job Tip', 'bg-blue-500/10 text-blue-500'],
  job_share: ['Job Share', 'bg-amber-500/10 text-amber-600'],
  analysis_share: ['Analysis', 'bg-teal-500/10 text-teal-600'],
  question: ['Question', 'bg-rose-500/10 text-rose-500']
};

const careerLabels = {
  got_hired: 'Got Hired',
  got_promoted: 'Promoted',
  started_learning: 'Learning',
  completed_course: 'Course Done',
  new_project: 'New Project'
};

function initials(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

function timeAgo(value) {
  if (!value) return 'recently';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Avatar({ user, size = 'h-11 w-11' }) {
  return user?.avatar_url ? (
    <img src={user.avatar_url} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <div className={`${size} flex items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[#003824]`}>
      {initials(user?.name || user?.username)}
    </div>
  );
}

function AnalysisCard({ analysis, isOwn }) {
  if (!analysis) return null;
  const score = Number(analysis.confidence_score || 0);
  const scoreClass = score >= 70 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const gaps = analysis.top_skill_gaps || (analysis.gap_analysis_json?.keywordMismatches || []).slice(0, 3).map((item) => item.keyword).filter(Boolean);

  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
      <p className="font-black text-[var(--text)]">Gap Analysis - {analysis.company_name || 'Role Analysis'}</p>
      <p className={`mt-2 text-sm font-black ${scoreClass}`}>{score}% readiness</p>
      {gaps.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {gaps.map((gap) => <span key={gap} className="app-chip">{gap}</span>)}
        </div>
      ) : null}
      {isOwn ? <Link to="/analysis-history" className="app-button-secondary mt-4 px-3 py-2">View analysis</Link> : null}
    </div>
  );
}

function PostCard({ post, currentUserId, onPostChanged, onDeleted }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const isOwn = post.user_id === currentUserId;
  const [label, className] = typeLabels[post.post_type] || ['Post', 'bg-[var(--panel-soft)] text-[var(--muted-strong)]'];

  async function handleLike() {
    const result = await likePost(post.id);
    onPostChanged({ ...post, likes_count: result.newLikesCount });
  }

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && !comments.length) {
      setLoadingComments(true);
      getPostComments(post.id, { limit: 5 }).then(setComments).finally(() => setLoadingComments(false));
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    const created = await addPostComment(post.id, comment);
    setComments((current) => [...current, created]);
    setComment('');
    onPostChanged({ ...post, comments_count: (post.comments_count || 0) + 1 });
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return;
    await deleteSocialPost(post.id);
    onDeleted(post.id);
  }

  return (
    <article id={`post-${post.id}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Avatar user={post.user} />
          <div className="min-w-0">
            {post.user?.username ? <Link to={`/u/${post.user.username}`} className="font-black text-[var(--text)] hover:text-[var(--accent-strong)]">{post.user?.name || post.user.username}</Link> : <p className="font-black text-[var(--text)]">{post.user?.name || 'Aptico member'}</p>}
            <p className="truncate text-xs text-[var(--muted-strong)]">{post.user?.headline || 'Career builder'} - {timeAgo(post.created_at)}</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{label}</span>
      </div>

      {post.career_update_type ? <span className="mt-4 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent-strong)]">{careerLabels[post.career_update_type] || post.career_update_type}</span> : null}
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text)]">{post.content}</p>

      {post.post_type === 'analysis_share' ? <AnalysisCard analysis={post.analysis} isOwn={isOwn} /> : null}
      {post.post_type === 'job_share' && post.job_data ? (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <p className="font-black text-[var(--text)]">{post.job_data.title}</p>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">{post.job_data.company || 'Company not listed'}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">{post.job_data.location || 'Location flexible'} {post.job_data.jobType ? `- ${post.job_data.jobType}` : ''}</p>
          {post.job_data.ghostScore ? <p className="mt-2 text-xs font-bold text-[var(--accent-strong)]">Ghost score: {post.job_data.ghostScore}</p> : null}
          <a href={post.job_data.applyUrl} target="_blank" rel="noreferrer" className="app-button-secondary mt-4 px-3 py-2">View and Apply</a>
        </div>
      ) : null}
      {post.post_type === 'question' ? <p className="mt-3 text-sm font-semibold text-[var(--muted-strong)]">{post.comments_count || 0} answers</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
        <button type="button" className="app-button-secondary px-3 py-2" onClick={handleLike}>
          <span className="material-symbols-outlined text-[18px]">thumb_up</span>{post.likes_count || 0}
        </button>
        <button type="button" className="app-button-secondary px-3 py-2" onClick={toggleComments}>
          <span className="material-symbols-outlined text-[18px]">chat</span>{post.comments_count || 0}
        </button>
        {isOwn ? <button type="button" className="app-button-secondary px-3 py-2 text-red-500" onClick={handleDelete}><span className="material-symbols-outlined text-[18px]">delete</span>Delete</button> : null}
      </div>

      {commentsOpen ? (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          {loadingComments ? <p className="text-sm text-[var(--muted-strong)]">Loading comments...</p> : null}
          <div className="space-y-3">
            {comments.map((item) => (
              <div key={item.id} className="flex gap-3">
                <Avatar user={item.user} size="h-8 w-8" />
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">{item.user?.name || item.user?.username || 'Member'}</p>
                  <p className="text-sm text-[var(--muted-strong)]">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
          {(post.comments_count || 0) > comments.length ? <button type="button" className="mt-3 text-sm font-bold text-[var(--accent-strong)]" onClick={() => getPostComments(post.id, { limit: 20 }).then(setComments)}>Show all {post.comments_count} comments</button> : null}
          <form onSubmit={submitComment} className="mt-4 flex gap-2">
            <input className="app-input" placeholder="Add a comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={300} />
            <button type="submit" className="app-button">Post</button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export default function HomeFeed() {
  const auth = useSelector(selectAuth);
  const [profile, setProfile] = useState(null);
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState([]);
  const [people, setPeople] = useState([]);
  const [posts, setPosts] = useState([]);
  const [filterType, setFilterType] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [connectUser, setConnectUser] = useState(null);
  const [connectNote, setConnectNote] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => null);
    getConnections().then(setConnections).catch(() => null);
    getPendingConnections().then(setPending).catch(() => null);
    searchPeople().then((rows) => setPeople(rows.slice(0, 4))).catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    getFeedPosts({ limit: 20, offset: 0, filterType })
      .then((result) => {
        setPosts(result.posts || []);
        setHasMore(Boolean(result.hasMore));
        setOffset(20);
      })
      .finally(() => setLoading(false));
  }, [filterType]);

  async function loadMore() {
    const result = await getFeedPosts({ limit: 20, offset, filterType });
    setPosts((current) => [...current, ...(result.posts || [])]);
    setHasMore(Boolean(result.hasMore));
    setOffset((current) => current + 20);
  }

  async function respond(connectionId, action) {
    await respondToConnection(connectionId, action);
    setPending((current) => current.filter((item) => item.id !== connectionId));
  }

  async function submitConnection(event) {
    event.preventDefault();
    await sendConnectionRequest(connectUser.username, connectNote);
    setConnectUser(null);
    setConnectNote('');
    setToast('Connection request sent.');
  }

  const leftCard = (
    <aside className="hidden space-y-4 lg:block lg:w-[20%]">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
        <Avatar user={{ ...auth.user, avatar_url: auth.user?.avatarUrl }} size="h-16 w-16" />
        <h2 className="mt-4 text-xl font-black text-[var(--text)]">{auth.user?.name || profile?.username || 'Aptico member'}</h2>
        <p className="mt-1 text-sm text-[var(--muted-strong)]">{profile?.headline || 'Build your career signal'}</p>
        <p className="mt-4 text-sm font-bold text-[var(--muted-strong)]">{profile?.followerCount || profile?.follower_count || 0} followers</p>
        <p className="text-sm font-bold text-[var(--muted-strong)]">{connections.length} connections</p>
        <div className="mt-5 grid gap-2">
          <Link to="/settings" className="app-button-secondary px-3 py-2">Edit Profile</Link>
          <Link to="/analysis" className="app-button-secondary px-3 py-2">My Analysis</Link>
          <Link to="/jobs" className="app-button-secondary px-3 py-2">Job Search</Link>
        </div>
      </section>
    </aside>
  );

  const rightCard = (
    <aside className="hidden space-y-4 lg:block lg:w-[25%]">
      {pending.length ? (
        <section id="pending-requests" className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="font-black text-[var(--text)]">Connection Requests</h2>
          <div className="mt-4 space-y-3">
            {pending.slice(0, 3).map((request) => (
              <div key={request.id} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                <div className="flex gap-3">
                  <Avatar user={request.user} size="h-9 w-9" />
                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">{request.user?.name || request.user?.username}</p>
                    <p className="text-xs text-[var(--muted-strong)]">{request.user?.headline}</p>
                  </div>
                </div>
                {request.requester_role ? <p className="mt-2 text-xs text-[var(--muted-strong)]">{request.requester_role}</p> : null}
                {request.requester_learning ? <p className="text-xs text-[var(--muted-strong)]">Learning: {request.requester_learning}</p> : null}
                {request.requester_note ? <p className="mt-2 text-xs text-[var(--text)]">{request.requester_note}</p> : null}
                <div className="mt-3 flex gap-2">
                  <button type="button" className="app-button px-3 py-2" onClick={() => respond(request.id, 'accepted')}>Accept</button>
                  <button type="button" className="app-button-secondary px-3 py-2" onClick={() => respond(request.id, 'declined')}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
        <h2 className="font-black text-[var(--text)]">People to Connect With</h2>
        <div className="mt-4 space-y-3">
          {people.map((person) => (
            <div key={person.username} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <Avatar user={person} size="h-9 w-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text)]">{person.name || person.username}</p>
                  <p className="truncate text-xs text-[var(--muted-strong)]">{person.headline || 'Career builder'}</p>
                </div>
              </div>
              <button type="button" className="app-button-secondary px-3 py-2" onClick={() => setConnectUser(person)}>Connect</button>
            </div>
          ))}
        </div>
        <Link to="/people" className="mt-4 inline-flex text-sm font-bold text-[var(--accent-strong)]">See more people</Link>
      </section>
    </aside>
  );

  return (
    <AppShell title="Home" description="Share progress, ask useful questions, and keep your career network warm.">
      {toast ? <div className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] p-3 text-sm font-bold text-[var(--accent-strong)]">{toast}</div> : null}
      <div className="flex gap-5">
        {leftCard}
        <section className="min-w-0 flex-1 space-y-4 lg:w-[55%]">
          <button type="button" onClick={() => setComposerOpen(true)} className="flex w-full items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-left">
            <Avatar user={{ ...auth.user, avatar_url: auth.user?.avatarUrl }} />
            <span className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--muted-strong)]">Share a career update...</span>
          </button>
          <div className="flex gap-2 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
            {filters.map(([label, value]) => (
              <button key={label} type="button" onClick={() => setFilterType(value)} className={filterType === value ? 'app-button whitespace-nowrap px-3 py-2' : 'app-button-secondary whitespace-nowrap px-3 py-2'}>{label}</button>
            ))}
          </div>
          {loading ? (
            <div className="space-y-4">{[0, 1, 2].map((item) => <div key={item} className="h-44 rounded-lg border border-[var(--border)] bg-[var(--panel)]" />)}</div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={auth.user?.id}
                  onPostChanged={(next) => setPosts((current) => current.map((item) => item.id === next.id ? next : item))}
                  onDeleted={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
                />
              ))}
              {!posts.length ? <p className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--muted-strong)]">No posts yet. Share the first useful update.</p> : null}
            </div>
          )}
          {hasMore ? <div className="text-center"><button type="button" className="app-button-secondary" onClick={loadMore}>Load more</button></div> : null}
        </section>
        {rightCard}
      </div>
      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} onCreated={(post) => { setPosts((current) => [post, ...current]); setToast('Posted!'); }} />
      {connectUser ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 p-4">
          <form onSubmit={submitConnection} className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
            <h2 className="text-xl font-black text-[var(--text)]">Connect with {connectUser.name || connectUser.username}</h2>
            <textarea className="app-input mt-4 min-h-24" maxLength={150} placeholder="Add a short note" value={connectNote} onChange={(event) => setConnectNote(event.target.value)} />
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" className="app-button-secondary" onClick={() => setConnectUser(null)}>Cancel</button>
              <button type="submit" className="app-button">Send request</button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}
