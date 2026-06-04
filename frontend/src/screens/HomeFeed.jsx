import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from '@/lib/router-compat.jsx';
import { useSelector } from 'react-redux';
import AppShell from '../components/AppShell.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PostComments from '../components/PostComments.jsx';
import PostComposer from '../components/PostComposer.jsx';
import UserListModal from '../components/UserListModal.jsx';
import {
  deleteSocialPost,
  getConnections,
  getFeedPosts,
  getMyPosts,
  getMyProfile,
  getPostById,
  getPendingConnections,
  getProfileConnections,
  getProfileFollowers,
  getPostLikers,
  likePost,
  respondToConnection,
  searchPeople,
  sendConnectionRequest
} from '../api/socialApi.js';
import { selectAuth } from '../store/authSlice.js';
import { selectAnalysisHistory } from '../store/historySlice.js';

const filters = [
  ['All', null],
  ['Updates', 'career_update'],
  ['Tips', 'job_tip'],
  ['Jobs', 'job_share'],
  ['Analysis', 'analysis_share'],
  ['Questions', 'question']
];

const quickActions = [
  ['career_update', 'emoji_events', 'Update'],
  ['question', 'help', 'Question'],
  ['job_share', 'work', 'Job'],
  ['analysis_share', 'analytics', 'Analysis']
];

const communityPrompts = [
  ['Ask sharper questions', 'Turn a blocker into a useful post for people ahead of you.'],
  ['Share what worked', 'Small tactics around resumes, interviews, and job boards help the feed stay practical.'],
  ['Keep roles moving', 'When you find a promising job, share the context that made it stand out.']
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

function isScheduledFuture(value) {
  return value && new Date(value).getTime() > Date.now();
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

function LoadingPostSkeleton() {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 gap-3">
          <div className="h-11 w-11 rounded-full bg-[var(--panel-soft)]" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-36 rounded bg-[var(--panel-soft)]" />
            <div className="mt-2 h-3 w-52 max-w-full rounded bg-[var(--panel-soft)]" />
          </div>
        </div>
        <div className="h-7 w-20 rounded-full bg-[var(--panel-soft)]" />
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-3 w-full rounded bg-[var(--panel-soft)]" />
        <div className="h-3 w-5/6 rounded bg-[var(--panel-soft)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--panel-soft)]" />
      </div>
      <div className="mt-5 flex gap-2 border-t border-[var(--border)] pt-4">
        <div className="h-9 w-20 rounded-lg bg-[var(--panel-soft)]" />
        <div className="h-9 w-20 rounded-lg bg-[var(--panel-soft)]" />
      </div>
    </article>
  );
}

function EmptyFeedState({ viewMode, onCreate, onAsk }) {
  const isMine = viewMode === 'mine';

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 text-center">
      <span className="material-symbols-outlined text-[34px] text-[var(--accent-strong)]">{isMine ? 'inventory_2' : 'dynamic_feed'}</span>
      <h2 className="mt-3 text-xl font-black text-[var(--text)]">{isMine ? 'Your post shelf is empty' : 'No career posts yet'}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-strong)]">
        {isMine
          ? 'Share an update, question, job, or analysis insight so your useful career activity has a place to live.'
          : 'Start the feed with something practical: a milestone, a job-search question, or a role worth sharing.'}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" className="app-button px-4 py-2" onClick={() => onCreate('career_update')}>
          <span className="material-symbols-outlined text-[18px]">emoji_events</span>
          Share update
        </button>
        <button type="button" className="app-button-secondary px-4 py-2" onClick={onAsk}>
          <span className="material-symbols-outlined text-[18px]">help</span>
          Ask question
        </button>
        <Link to="/people" className="app-button-secondary px-4 py-2">
          <span className="material-symbols-outlined text-[18px]">diversity_3</span>
          Find people
        </Link>
      </div>
    </section>
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

function PostCard({ post, currentUserId, onPostChanged, onDeleted, onEdit, onShowLikers, focusCommentId = null, highlighted = false }) {
  const [commentsOpen, setCommentsOpen] = useState(Boolean(focusCommentId));
  const [actionError, setActionError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwn = Boolean(post.user_id && currentUserId && String(post.user_id) === String(currentUserId));
  const [label, className] = typeLabels[post.post_type] || ['Post', 'bg-[var(--panel-soft)] text-[var(--muted-strong)]'];

  useEffect(() => {
    if (focusCommentId) setCommentsOpen(true);
  }, [focusCommentId]);

  async function handleLike() {
    setActionError('');
    try {
      const result = await likePost(post.id);
      onPostChanged({ ...post, likes_count: result.newLikesCount, has_liked: result.liked });
    } catch (requestError) {
      setActionError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not like this post.');
    }
  }

  function toggleComments() {
    setCommentsOpen(!commentsOpen);
  }

  async function handleDelete() {
    setActionError('');
    setDeleting(true);
    try {
      await deleteSocialPost(post.id);
      setDeleteOpen(false);
      onDeleted(post.id);
    } catch (requestError) {
      setActionError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not delete this post.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <article id={`post-${post.id}`} className={`rounded-lg border bg-[var(--panel)] p-5 transition-all ${highlighted ? 'border-[var(--accent)] shadow-lg shadow-[var(--accent)]/20 ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Avatar user={post.user} />
          <div className="min-w-0">
            {post.user?.username ? <Link to={`/u/${post.user.username}`} className="font-black text-[var(--text)] hover:text-[var(--accent-strong)]">{post.user?.name || post.user.username}</Link> : <p className="font-black text-[var(--text)]">{post.user?.name || 'Aptico member'}</p>}
            <p className="truncate text-xs text-[var(--muted-strong)]">
              {post.user?.headline || 'Career builder'} - {isScheduledFuture(post.scheduled_at) ? `Scheduled ${new Date(post.scheduled_at).toLocaleString()}` : timeAgo(post.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {isScheduledFuture(post.scheduled_at) ? <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-600">Scheduled</span> : null}
          <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{label}</span>
        </div>
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
        <div className="flex" role="group">
          <button type="button" className={`px-3 py-2 rounded-r-none border-r-0 ${post.has_liked ? 'app-button' : 'app-button-secondary'}`} onClick={handleLike}>
            <span className="material-symbols-outlined text-[18px]">thumb_up</span>
          </button>
          <button type="button" className={`px-3 py-2 rounded-l-none border-l-[rgba(0,0,0,0.1)] ${post.has_liked ? 'app-button' : 'app-button-secondary'}`} onClick={() => onShowLikers?.(post.id)}>
            {post.likes_count || 0}
          </button>
        </div>
        <button type="button" className="app-button-secondary px-3 py-2" onClick={toggleComments}>
          <span className="material-symbols-outlined text-[18px]">chat</span>{post.comments_count || 0}
        </button>
        {isOwn ? <button type="button" className="app-button-secondary px-3 py-2" onClick={() => onEdit?.(post)}><span className="material-symbols-outlined text-[18px]">edit</span>Edit</button> : null}
        {isOwn ? <button type="button" className="app-button-secondary px-3 py-2 text-red-500" onClick={() => setDeleteOpen(true)}><span className="material-symbols-outlined text-[18px]">delete</span>Delete</button> : null}
      </div>
      {actionError ? <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{actionError}</p> : null}

      {commentsOpen ? <PostComments postId={post.id} initialCommentsCount={post.comments_count || 0} focusCommentId={focusCommentId} onCommentAdded={() => onPostChanged({ ...post, comments_count: (post.comments_count || 0) + 1 })} /> : null}
    </article>
    <ConfirmDialog
      open={deleteOpen}
      title="Delete this post?"
      description="This removes the post from your feed, profile activity, and any connected conversations."
      confirmLabel="Delete Post"
      loading={deleting}
      onCancel={() => setDeleteOpen(false)}
      onConfirm={handleDelete}
    />
    </>
  );
}

export default function HomeFeed() {
  const auth = useSelector(selectAuth);
  const analysisHistory = useSelector(selectAnalysisHistory);
  const [searchParams] = useSearchParams();
  const focusedPostId = searchParams.get('postId');
  const focusedCommentId = searchParams.get('commentId');
  const [profile, setProfile] = useState(null);
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState([]);
  const [people, setPeople] = useState([]);
  const [posts, setPosts] = useState([]);
  const [filterType, setFilterType] = useState(null);
  const [viewMode, setViewMode] = useState('feed');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [initialComposerType, setInitialComposerType] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [likersPostId, setLikersPostId] = useState(null);
  const [profileListModal, setProfileListModal] = useState(null);
  const [connectUser, setConnectUser] = useState(null);
  const [connectNote, setConnectNote] = useState('');
  const [toast, setToast] = useState('');
  const [highlightedPostId, setHighlightedPostId] = useState(null);

  const recentAnalyses = useMemo(() => {
    return analysisHistory
      .filter((analysis) => analysis.id)
      .slice(0, 10)
      .map((analysis) => ({
        id: analysis.id,
        company_name: analysis.companyName || analysis.stage1?.companyName || 'Role Analysis',
        companyName: analysis.companyName || analysis.stage1?.companyName || 'Role Analysis',
        confidence_score: analysis.confidenceScore ?? analysis.stage1?.confidenceScore ?? 0,
        confidenceScore: analysis.confidenceScore ?? analysis.stage1?.confidenceScore ?? 0,
        jobTitle: analysis.jobTitle || analysis.stage1?.jobTitle || 'Target Role',
        createdAt: analysis.createdAt
      }));
  }, [analysisHistory]);

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => null);
    getConnections().then(setConnections).catch(() => null);
    getPendingConnections().then(setPending).catch(() => null);
    searchPeople().then((rows) => setPeople(rows.slice(0, 4))).catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    const loader = viewMode === 'mine' ? getMyPosts : getFeedPosts;
    loader({ limit: 20, offset: 0, filterType })
      .then((result) => {
        setPosts(result.posts || []);
        setHasMore(Boolean(result.hasMore));
        setOffset(20);
      })
      .finally(() => setLoading(false));
  }, [filterType, viewMode]);

  useEffect(() => {
    if (!focusedPostId) return;

    let cancelled = false;
    const existing = posts.find((post) => String(post.id) === String(focusedPostId));

    async function ensureFocusedPost() {
      if (!existing) {
        try {
          const post = await getPostById(focusedPostId);
          if (!cancelled && post) {
            setPosts((current) => [post, ...current.filter((item) => String(item.id) !== String(post.id))]);
          }
        } catch {
          if (!cancelled) setToast('Could not load the linked post.');
          return;
        }
      }

      setHighlightedPostId(focusedPostId);
      setTimeout(() => {
        document.getElementById(`post-${focusedPostId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 160);
      setTimeout(() => {
        if (!cancelled) setHighlightedPostId(null);
      }, 3400);
    }

    void ensureFocusedPost();
    return () => {
      cancelled = true;
    };
  }, [focusedPostId, posts]);

  async function loadMore() {
    const loader = viewMode === 'mine' ? getMyPosts : getFeedPosts;
    const result = await loader({ limit: 20, offset, filterType });
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

  function openComposer(type = '') {
    setInitialComposerType(type);
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setInitialComposerType('');
  }

  const profileUsername = profile?.username;

  function openProfileList(type) {
    if (!profileUsername) {
      setToast('Set up your profile before viewing your public network.');
      return;
    }

    setProfileListModal({
      title: type === 'followers' ? 'Followers' : 'Connections',
      fetchData: () => type === 'followers' ? getProfileFollowers(profileUsername) : getProfileConnections(profileUsername),
      emptyMessage: type === 'followers' ? 'No followers yet.' : 'No connections yet.'
    });
  }

  const leftCard = (
    <aside className="w-full space-y-4">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
        <Avatar user={{ ...auth.user, avatar_url: auth.user?.avatarUrl }} size="h-16 w-16" />
        <Link to="/profile" className="mt-4 block text-xl font-black text-[var(--text)] transition hover:text-[var(--accent-strong)]">
          {auth.user?.name || profile?.username || 'Aptico member'}
        </Link>
        <p className="mt-1 text-sm text-[var(--muted-strong)]">{profile?.headline || 'Build your career signal'}</p>
        {!profile?.headline ? (
          <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-xs font-semibold leading-5 text-[var(--muted-strong)]">
            Add a headline so people know what roles, skills, or projects you are building toward.
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openProfileList('followers')}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--panel)]"
          >
            <p className="text-lg font-black text-[var(--text)]">{profile?.followerCount || profile?.follower_count || 0}</p>
            <p className="text-xs font-bold text-[var(--muted-strong)]">Followers</p>
          </button>
          <button
            type="button"
            onClick={() => openProfileList('connections')}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--panel)]"
          >
            <p className="text-lg font-black text-[var(--text)]">{connections.length}</p>
            <p className="text-xs font-bold text-[var(--muted-strong)]">Connections</p>
          </button>
        </div>
        <div className="mt-5 grid gap-2">
          <Link to="/profile" className="app-button-secondary px-3 py-2">
            <span className="material-symbols-outlined text-[18px]">person</span>
            Profile
          </Link>
          <Link to="/analysis" className="app-button-secondary px-3 py-2">
            <span className="material-symbols-outlined text-[18px]">analytics</span>
            Analysis
          </Link>
          <Link to="/jobs" className="app-button-secondary px-3 py-2">
            <span className="material-symbols-outlined text-[18px]">work</span>
            Jobs
          </Link>
        </div>
      </section>
    </aside>
  );

  const rightCard = (
    <aside className="w-full space-y-4">
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
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
        <h2 className="font-black text-[var(--text)]">Career Feed Prompts</h2>
        <div className="mt-4 space-y-3">
          {communityPrompts.map(([title, copy]) => (
            <div key={title} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-3">
              <p className="text-sm font-bold text-[var(--text)]">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );

  return (
    <AppShell title="Career Feed" description="Share career updates, ask useful questions, surface job leads, and turn analysis insights into community momentum.">
      {toast ? <div className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] p-3 text-sm font-bold text-[var(--accent-strong)]">{toast}</div> : null}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="order-2 w-full lg:order-1 lg:w-64 lg:shrink-0">{leftCard}</div>
        <section className="order-1 min-w-0 flex-1 space-y-4 lg:order-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <button type="button" onClick={() => openComposer()} className="flex w-full items-center gap-3 text-left">
              <Avatar user={{ ...auth.user, avatar_url: auth.user?.avatarUrl }} />
              <span className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--muted-strong)]">What would help your career network today?</span>
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {quickActions.map(([type, icon, label]) => (
                <button key={type} type="button" onClick={() => openComposer(type)} className="app-button-secondary justify-center px-3 py-2">
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </section>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2">
            <button type="button" onClick={() => setViewMode('feed')} className={viewMode === 'feed' ? 'app-button py-2' : 'app-button-secondary py-2'}>
              <span className="material-symbols-outlined text-[18px]">dynamic_feed</span>
              Feed
            </button>
            <button type="button" onClick={() => setViewMode('mine')} className={viewMode === 'mine' ? 'app-button py-2' : 'app-button-secondary py-2'}>
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              My Posts
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
            {filters.map(([label, value]) => (
              <button key={label} type="button" onClick={() => setFilterType(value)} className={filterType === value ? 'app-button whitespace-nowrap px-3 py-2' : 'app-button-secondary whitespace-nowrap px-3 py-2'}>{label}</button>
            ))}
          </div>
          {loading ? (
            <div className="space-y-4">{[0, 1, 2].map((item) => <LoadingPostSkeleton key={item} />)}</div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={auth.user?.id}
                  onPostChanged={(next) => setPosts((current) => current.map((item) => item.id === next.id ? next : item))}
                  onDeleted={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
                  onEdit={setEditingPost}
                  onShowLikers={setLikersPostId}
                  focusCommentId={String(post.id) === String(focusedPostId) ? focusedCommentId : null}
                  highlighted={String(post.id) === String(highlightedPostId)}
                />
              ))}
              {!posts.length ? <EmptyFeedState viewMode={viewMode} onCreate={openComposer} onAsk={() => openComposer('question')} /> : null}
            </div>
          )}
          {hasMore ? <div className="text-center"><button type="button" className="app-button-secondary" onClick={loadMore}>Load more</button></div> : null}
        </section>
        <div className="order-3 w-full lg:w-72 lg:shrink-0">{rightCard}</div>
      </div>
      <PostComposer
        open={composerOpen}
        initialPostType={initialComposerType}
        recentAnalyses={recentAnalyses}
        onClose={closeComposer}
        onCreated={(post) => {
          if (viewMode === 'mine' || !isScheduledFuture(post.scheduled_at)) {
            setPosts((current) => [post, ...current]);
          }
          setToast(isScheduledFuture(post.scheduled_at) ? 'Post scheduled.' : 'Posted!');
        }}
      />
      <PostComposer
        open={Boolean(editingPost)}
        initialPost={editingPost}
        onClose={() => setEditingPost(null)}
        onUpdated={(post) => {
          setPosts((current) => current.map((item) => item.id === post.id ? post : item));
          setToast(isScheduledFuture(post.scheduled_at) ? 'Post scheduled.' : 'Post updated.');
        }}
      />
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
      <UserListModal
        isOpen={Boolean(likersPostId)}
        onClose={() => setLikersPostId(null)}
        title="Liked by"
        fetchData={() => getPostLikers(likersPostId)}
        emptyMessage="No one has liked this post yet."
      />
      <UserListModal
        isOpen={Boolean(profileListModal)}
        onClose={() => setProfileListModal(null)}
        title={profileListModal?.title || ''}
        fetchData={profileListModal?.fetchData || (() => Promise.resolve([]))}
        emptyMessage={profileListModal?.emptyMessage}
        actionLabel="Visit"
      />
    </AppShell>
  );
}
